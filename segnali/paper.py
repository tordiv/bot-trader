"""Esecuzione dei ticket sul conto PAPER di Alpaca, come riferimento per il periodo di test.

Questo è l'UNICO file che invia ordini, e solo al conto paper:
- il client viene sempre creato con paper=True;
- se TRADING_MODE in .env non è "paper", il programma rifiuta di partire;
- ogni ordine ha un client_order_id derivato dal ticket: rilanciare il job non duplica gli ordini;
- un acquisto parte sempre insieme al suo stop (ordine OTO: lo stop si attiva appena l'acquisto
  è eseguito), così la posizione paper non resta mai scoperta.
Non esiste alcun collegamento con il conto reale (Directa).
"""
import logging
import os
from datetime import datetime

from .config import Config
from .strategy import Holding
from .tickets import Ticket

log = logging.getLogger(__name__)

LIVE_DISABLED = "Live trading is disabled in this build. TRADING_MODE deve essere 'paper'."
OPEN_STATES = {"new", "accepted", "pending_new", "partially_filled", "held", "accepted_for_bidding"}


def _value(x) -> str:
    """Valore testuale di un enum di alpaca-py (o di una stringa nei test)."""
    return str(getattr(x, "value", x)).lower()


def check_paper_mode() -> None:
    if os.getenv("TRADING_MODE", "").strip().lower() != "paper":
        raise RuntimeError(LIVE_DISABLED)


class PaperBroker:
    def __init__(self, client, cfg: Config):
        self.client = client
        self.cfg = cfg

    @classmethod
    def from_env(cls, cfg: Config) -> "PaperBroker":
        check_paper_mode()
        from alpaca.trading.client import TradingClient
        client = TradingClient(os.getenv("APCA_API_KEY_ID"), os.getenv("APCA_API_SECRET_KEY"), paper=True)
        broker = cls(client, cfg)
        number = str(getattr(broker.client.get_account(), "account_number", ""))
        if not number.upper().startswith("PA"):
            raise RuntimeError(f"Il conto {number!r} non sembra un conto paper: mi fermo.")
        return broker

    # --- Lettura -----------------------------------------------------------------------------

    def account(self) -> tuple:
        acc = self.client.get_account()
        return float(acc.equity), float(acc.cash)

    def open_orders(self, symbol=None) -> list:
        from alpaca.trading.enums import QueryOrderStatus
        from alpaca.trading.requests import GetOrdersRequest
        request = GetOrdersRequest(status=QueryOrderStatus.OPEN, nested=False,
                                   symbols=[symbol] if symbol else None)
        return list(self.client.get_orders(request))

    def stop_orders(self, symbol=None) -> list:
        return [o for o in self.open_orders(symbol)
                if _value(o.side) == "sell" and _value(o.type) in ("stop", "stop_limit")]

    def holdings(self) -> dict:
        stops = {}
        for order in self.stop_orders():
            stops[order.symbol] = max(stops.get(order.symbol, 0.0), float(order.stop_price))
        result = {}
        for p in self.client.get_all_positions():
            qty = int(float(p.qty))
            if qty > 0:
                result[p.symbol] = Holding(p.symbol, qty, float(p.avg_entry_price), stops.get(p.symbol))
        return result

    def _exists(self, client_order_id: str) -> bool:
        try:
            self.client.get_order_by_client_id(client_order_id)
            return True
        except Exception as exc:  # 404 = ordine inesistente; altri errori vanno segnalati
            if getattr(exc, "status_code", None) == 404 or isinstance(exc, LookupError):
                return False
            raise

    # --- Scrittura ---------------------------------------------------------------------------

    def submit(self, ticket: Ticket) -> str:
        """Invia un ticket al conto paper. Ritorna una riga di esito per il log."""
        from alpaca.trading.enums import OrderClass, OrderSide, TimeInForce
        from alpaca.trading.requests import (LimitOrderRequest, MarketOrderRequest,
                                             ReplaceOrderRequest, StopLossRequest, StopOrderRequest)

        if ticket.action == "BUY":
            if ticket.stop is None or ticket.limit is None:
                raise ValueError(f"Ticket {ticket.id}: acquisto senza stop o limite, rifiutato")
            cid = f"{ticket.id}-buy"
            if self._exists(cid):
                return f"{cid}: già inviato, salto"
            self.client.submit_order(LimitOrderRequest(
                symbol=ticket.symbol, qty=ticket.qty, side=OrderSide.BUY,
                time_in_force=TimeInForce.GTC, limit_price=ticket.limit,
                order_class=OrderClass.OTO, stop_loss=StopLossRequest(stop_price=ticket.stop),
                client_order_id=cid))
            return f"{cid}: acquisto {ticket.qty} {ticket.symbol} limite {ticket.limit} stop {ticket.stop}"

        if ticket.action == "SELL":
            cid = f"{ticket.id}-sell"
            if self._exists(cid):
                return f"{cid}: già inviato, salto"
            for order in self.stop_orders(ticket.symbol):      # lo stop blocca le azioni: va tolto
                self.client.cancel_order_by_id(order.id)
            self.client.submit_order(MarketOrderRequest(
                symbol=ticket.symbol, qty=ticket.qty, side=OrderSide.SELL,
                time_in_force=TimeInForce.DAY, client_order_id=cid))
            return f"{cid}: vendita {ticket.qty} {ticket.symbol} all'apertura"

        if ticket.action == "MOVE_STOP":
            stops = self.stop_orders(ticket.symbol)
            if stops:
                current = stops[0]
                if float(current.stop_price) >= ticket.stop:
                    return f"{ticket.id}: stop attuale {current.stop_price} già ≥ {ticket.stop}, invariato"
                self.client.replace_order_by_id(current.id, ReplaceOrderRequest(stop_price=ticket.stop))
                return f"{ticket.id}: stop {ticket.symbol} alzato a {ticket.stop}"
            cid = f"{ticket.id}-stop"
            if self._exists(cid):
                return f"{cid}: già inviato, salto"
            self.client.submit_order(StopOrderRequest(
                symbol=ticket.symbol, qty=ticket.qty, side=OrderSide.SELL,
                time_in_force=TimeInForce.GTC, stop_price=ticket.stop, client_order_id=cid))
            return f"{cid}: nuovo stop {ticket.symbol} a {ticket.stop}"

        raise ValueError(f"Azione sconosciuta: {ticket.action}")

    def cancel_expired(self, tickets: dict, now: datetime) -> list:
        """Cancella gli acquisti paper non eseguiti dopo la scadenza del ticket."""
        messages = []
        for ticket in tickets.values():
            if ticket.action != "BUY" or datetime.fromisoformat(ticket.valid_until) > now:
                continue
            cid = f"{ticket.id}-buy"
            try:
                order = self.client.get_order_by_client_id(cid)
            except Exception as exc:
                if getattr(exc, "status_code", None) == 404 or isinstance(exc, LookupError):
                    continue
                raise
            if _value(order.status) in OPEN_STATES:
                self.client.cancel_order_by_id(order.id)
                messages.append(f"{cid}: scaduto e cancellato")
        return messages

    def ensure_stops(self, tickets: dict) -> list:
        """Ogni posizione paper deve avere uno stop. Se manca, lo ricrea dall'ultimo ticket."""
        from alpaca.trading.enums import OrderSide, TimeInForce
        from alpaca.trading.requests import StopOrderRequest

        messages = []
        for symbol, holding in self.holdings().items():
            if holding.stop is not None:
                continue
            levels = [t.stop for t in sorted(tickets.values(), key=lambda t: t.id)
                      if t.symbol == symbol and t.stop is not None and t.action in ("BUY", "MOVE_STOP")]
            stop = levels[-1] if levels else round(holding.entry_price * 0.9, 2)
            self.client.submit_order(StopOrderRequest(
                symbol=symbol, qty=holding.qty, side=OrderSide.SELL,
                time_in_force=TimeInForce.GTC, stop_price=stop))
            messages.append(f"VIOLAZIONE: {symbol} era senza stop nel paper, stop ricreato a {stop}")
        return messages
