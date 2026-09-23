"""Dalla decisione ai ticket: posti disponibili, candidati scartati, stop obbligatorio, scadenze."""
from datetime import date

import pytest

from helpers import small_cfg, universe
from segnali.planner import PlannedOrder, plan_orders
from segnali.strategy import Holding, decide
from segnali.tickets import load_tickets, make_tickets, save_tickets, tickets_markdown
from segnali.timeutil import ticket_valid_until


def _decision(cfg, holdings=None):
    bars = universe()
    return decide(bars, bars["SPY"].index[-1], holdings or {}, cfg)


def test_buys_limited_to_free_slots():
    cfg = small_cfg(COMMISSION_PER_ORDER_USD=0.0, MAX_POSITIONS=1)
    orders, _ = plan_orders(_decision(cfg), {}, 1150, 1150, cfg)
    buys = [o for o in orders if o.action == "BUY"]
    assert len(buys) == 1 and buys[0].symbol == "AAA"
    assert buys[0].stop is not None and buys[0].limit > buys[0].stop


def test_rejected_candidate_moves_to_next():
    cfg = small_cfg(COMMISSION_PER_ORDER_USD=0.0, MAX_PRICE_USD=10_000.0)
    d = _decision(cfg)
    d.candidates[0].stop = d.candidates[0].ref_price * 2    # stop assurdo sul primo: va scartato
    orders, rejections = plan_orders(d, {}, 1150, 1150, cfg)
    assert rejections and rejections[0][0] == "AAA"
    assert [o.symbol for o in orders if o.action == "BUY"] == ["BBB"]


def test_pause_blocks_buys_but_keeps_sells():
    cfg = small_cfg(EXIT_RANK=1)
    holdings = {"CCC": Holding("CCC", 5, 70.0, 60.0)}
    orders, rejections = plan_orders(_decision(cfg, holdings), holdings, 1150, 100, cfg, allow_buys=False)
    assert [o.action for o in orders if o.action != "MOVE_STOP"] == ["SELL"]
    assert rejections


def test_sale_proceeds_count_as_available_cash():
    cfg = small_cfg(COMMISSION_PER_ORDER_USD=0.0, EXIT_RANK=1)
    holdings = {"CCC": Holding("CCC", 12, 70.0, 60.0)}
    orders, _ = plan_orders(_decision(cfg, holdings), holdings, 1150, 0, cfg)   # zero liquidità
    assert any(o.action == "BUY" for o in orders)


def test_buy_ticket_without_stop_is_forbidden():
    cfg = small_cfg()
    with pytest.raises(ValueError):
        make_tickets([PlannedOrder("BUY", "AAA", 3, "prova", limit=10.0, stop=None)], date(2026, 4, 10), 1150, cfg)


def test_ticket_expiry_in_italian_time_with_dst_mismatch():
    cfg = small_cfg()
    # Venerdì 13/3/2026: New York è già in ora legale, l'Italia no → chiusura alle 21:00 italiane.
    mismatch = ticket_valid_until(date(2026, 3, 13), cfg)
    assert (mismatch.date(), mismatch.hour) == (date(2026, 3, 17), 21)
    normal = ticket_valid_until(date(2026, 4, 10), cfg)
    assert (normal.date(), normal.hour) == (date(2026, 4, 14), 22)


def test_tickets_roundtrip(tmp_path):
    cfg = small_cfg(tmp_path)
    tickets = make_tickets([PlannedOrder("BUY", "AAA", 3, "prova", limit=10.0, stop=9.0, risk_usd=3.0)],
                           date(2026, 4, 10), 1150, cfg)
    md = tickets_markdown(tickets, "### Prova")
    assert "ACQUISTA" in md and "stop loss" in md
    save_tickets(tickets, date(2026, 4, 10), cfg, md)
    loaded = load_tickets(cfg.TICKETS_DIR / "2026-04-10.json")
    assert loaded == tickets and loaded[0].id == "20260410-01"
