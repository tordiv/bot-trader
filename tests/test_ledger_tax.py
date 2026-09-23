"""Registro delle esecuzioni manuali e stima fiscale."""
import pytest

from segnali.ledger import build_state, check_against_tickets
from segnali.tax import TaxAccount
from segnali.tickets import Ticket


def row(date, action, symbol="", qty="", price="", commission="", ticket=""):
    return {"date": date, "action": action, "symbol": symbol, "qty": qty, "price_usd": price,
            "commission_usd": commission, "ticket_id": ticket, "note": ""}


BASE = [row("2026-12-01", "DEPOSIT", price="1150"),
        row("2026-12-07", "BUY", "XYZ", "10", "74", "9", "20261204-01"),
        row("2026-12-07", "STOP", "XYZ", price="69.7")]


def test_positions_cash_and_stop():
    st = build_state(BASE)
    assert st.errors == [] and st.violations == []
    assert st.cash == pytest.approx(1150 - 740 - 9)
    h = st.holdings["XYZ"]
    assert h.qty == 10 and h.stop == 69.7 and h.entry_price == pytest.approx(74.9)
    assert st.equity({"XYZ": 80}) == pytest.approx(st.cash + 800)


def test_sell_realizes_pnl_including_commissions():
    st = build_state(BASE + [row("2026-12-20", "SELL", "XYZ", "10", "80", "9", "20261218-01")])
    assert st.realized_pnl == pytest.approx(800 - 9 - 749)
    assert "XYZ" not in st.holdings


def test_position_without_stop_is_a_violation():
    st = build_state(BASE[:2])
    assert any("SENZA stop" in v for v in st.violations)


def test_invalid_rows_are_reported():
    st = build_state(BASE + [row("2026-13-01", "BUY", "XYZ", "1", "1"),
                             row("2026-12-08", "SELL", "XYZ", "50", "70", "9"),
                             row("2026-12-08", "BOH", "XYZ")])
    assert len(st.errors) == 3
    assert st.holdings["XYZ"].qty == 10


def test_fills_checked_against_tickets():
    tickets = {"20261204-01": Ticket("20261204-01", "BUY", "XYZ", 8, "2026-12-08T22:00+01:00", "x",
                                     limit=73.5, stop=69.7)}
    st = build_state(BASE + [row("2026-12-20", "SELL", "XYZ", "10", "65", "9", "STOP")])
    problems = check_against_tickets(st, tickets)
    assert any("sopra il limite" in p for p in problems)
    assert any("superiore" in p for p in problems)
    assert not any("STOP" in p for p in problems)     # la vendita da stop non richiede ticket


def test_tax_with_loss_carryforward_and_expiry():
    tax = TaxAccount(0.26, 4)
    assert tax.on_realized(-100, 2026) == 0
    assert tax.on_realized(60, 2027) == 0          # compensata dallo zainetto
    assert tax.carried_losses == 40
    assert tax.on_realized(100, 2031) == 26.0      # la perdita del 2026 è scaduta a fine 2030
