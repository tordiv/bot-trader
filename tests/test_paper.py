"""Il conto paper: solo modalità paper, niente duplicati, acquisto sempre insieme allo stop."""
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from helpers import small_cfg
from segnali import paper
from segnali.paper import PaperBroker
from segnali.tickets import Ticket


class FakeClient:
    """Imita il TradingClient di alpaca-py quel tanto che basta per i test."""

    def __init__(self, positions=None, orders=None, account_number="PA123"):
        self.positions = positions or []
        self.orders = orders or []
        self.submitted, self.cancelled, self.replaced = [], [], []
        self.account_number = account_number

    def get_account(self):
        return SimpleNamespace(equity="1150", cash="1150", account_number=self.account_number)

    def get_all_positions(self):
        return self.positions

    def get_orders(self, request):
        symbols = request.symbols
        return [o for o in self.orders if o.status == "new" and (not symbols or o.symbol in symbols)]

    def get_order_by_client_id(self, cid):
        for o in self.orders:
            if o.client_order_id == cid:
                return o
        raise LookupError(cid)

    def submit_order(self, request):
        self.submitted.append(request)
        self.orders.append(SimpleNamespace(id=f"id{len(self.orders)}", client_order_id=request.client_order_id,
                                           symbol=request.symbol, side=request.side, type=request.type,
                                           status="new", stop_price=getattr(request, "stop_price", None)))

    def cancel_order_by_id(self, order_id):
        self.cancelled.append(order_id)
        for o in self.orders:
            if o.id == order_id:
                o.status = "canceled"

    def replace_order_by_id(self, order_id, request):
        self.replaced.append((order_id, request.stop_price))


def stop_order(symbol="XYZ", price=69.7, oid="s1"):
    return SimpleNamespace(id=oid, client_order_id=f"{oid}-cid", symbol=symbol, side="sell", type="stop",
                           status="new", stop_price=price)


BUY = Ticket("20261204-01", "BUY", "XYZ", 12, "2026-12-08T22:00+01:00", "prova", limit=74.2, stop=69.7)


def test_refuses_anything_but_paper(monkeypatch):
    monkeypatch.setenv("TRADING_MODE", "live")
    with pytest.raises(RuntimeError, match="Live trading is disabled"):
        paper.check_paper_mode()
    monkeypatch.delenv("TRADING_MODE")
    with pytest.raises(RuntimeError):
        paper.check_paper_mode()


def test_refuses_account_that_is_not_paper(monkeypatch):
    import alpaca.trading.client as tc
    monkeypatch.setenv("TRADING_MODE", "paper")
    monkeypatch.setattr(tc, "TradingClient", lambda *a, **k: FakeClient(account_number="123456"))
    with pytest.raises(RuntimeError, match="non sembra un conto paper"):
        PaperBroker.from_env(small_cfg())


def test_buy_is_sent_with_its_stop_and_never_duplicated():
    client = FakeClient()
    broker = PaperBroker(client, small_cfg())
    broker.submit(BUY)
    broker.submit(BUY)                                   # rilancio del job: nessun duplicato
    assert len(client.submitted) == 1
    req = client.submitted[0]
    assert paper._value(req.order_class) == "oto"
    assert req.stop_loss.stop_price == 69.7 and req.limit_price == 74.2
    assert req.client_order_id == "20261204-01-buy"


def test_buy_without_stop_is_refused():
    broker = PaperBroker(FakeClient(), small_cfg())
    bad = Ticket("x", "BUY", "XYZ", 1, "2026-12-08T22:00+01:00", "prova", limit=10.0, stop=None)
    with pytest.raises(ValueError):
        broker.submit(bad)


def test_sell_cancels_the_stop_first():
    client = FakeClient(orders=[stop_order()])
    broker = PaperBroker(client, small_cfg())
    broker.submit(Ticket("20261218-01", "SELL", "XYZ", 12, "2026-12-22T22:00+01:00", "uscita"))
    assert client.cancelled == ["s1"]
    assert paper._value(client.submitted[0].side) == "sell"


def test_stop_is_only_moved_up():
    client = FakeClient(orders=[stop_order(price=69.7)])
    broker = PaperBroker(client, small_cfg())
    broker.submit(Ticket("a", "MOVE_STOP", "XYZ", 12, "2026-12-22T22:00+01:00", "su", stop=72.0))
    broker.submit(Ticket("b", "MOVE_STOP", "XYZ", 12, "2026-12-22T22:00+01:00", "giù", stop=60.0))
    assert client.replaced == [("s1", 72.0)]


def test_expired_buy_is_cancelled():
    client = FakeClient()
    broker = PaperBroker(client, small_cfg())
    broker.submit(BUY)
    now = datetime(2026, 12, 9, 10, tzinfo=ZoneInfo("Europe/Rome"))
    assert broker.cancel_expired({BUY.id: BUY}, now)
    assert client.cancelled


def test_missing_stop_is_recreated():
    position = SimpleNamespace(symbol="XYZ", qty="12", avg_entry_price="74.0")
    client = FakeClient(positions=[position])
    broker = PaperBroker(client, small_cfg())
    messages = broker.ensure_stops({BUY.id: BUY})
    assert messages and client.submitted[0].stop_price == 69.7
