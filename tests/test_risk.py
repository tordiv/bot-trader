"""Il dimensionamento non deve mai superare i limiti, e i trade antieconomici vanno scartati."""
import itertools

import pytest

from helpers import small_cfg
from segnali.risk import experiment_state, size_position


def test_sizing_never_exceeds_any_limit():
    cfg = small_cfg(COMMISSION_PER_ORDER_USD=0.0)
    for equity, cash, entry, stop_pct in itertools.product(
            [500, 1150, 5000], [100, 600, 1150, 5000], [5, 37.5, 74.2, 149.9], [0.01, 0.05, 0.2]):
        stop = entry * (1 - stop_pct)
        r = size_position(equity, cash, entry, stop, cfg)
        if not r.ok:
            continue
        assert r.qty >= 1
        assert r.qty * (entry - stop) <= cfg.RISK_PER_TRADE_MAX * equity + 1e-9
        assert r.qty * entry <= cfg.MAX_POSITION_PCT * equity + 1e-9
        assert r.qty * entry <= cash + 1e-9


def test_cash_keeps_room_for_both_commissions():
    cfg = small_cfg()
    r = size_position(equity=10_000, cash=1000, entry=99, stop=90, cfg=cfg)
    assert r.qty * 99 + 2 * cfg.COMMISSION_PER_ORDER_USD <= 1000


@pytest.mark.parametrize("stop", [None, 100, 101])
def test_invalid_stop_is_rejected(stop):
    r = size_position(1150, 1150, 100, stop, small_cfg())
    assert not r.ok and r.qty == 0


def test_commissions_too_heavy_are_rejected():
    cfg = small_cfg()                       # 9 $ per ordine = 18 $ andata e ritorno
    r = size_position(1150, 1150, 100, 99, cfg)   # rischio 1 $/azione × 10 azioni = 10 $
    assert not r.ok and "commissioni" in r.rejected
    assert r.commission_r == pytest.approx(18 / r.risk_usd, rel=1e-3)


def test_commissions_acceptable_are_accepted():
    cfg = small_cfg()
    r = size_position(1150, 1150, 100, 94, cfg)   # 10 azioni (tetto del 95%) × 6 $ = 60 $... limitato a 57,5 $
    assert r.ok
    assert r.commission_r <= cfg.MAX_COMMISSION_R


def test_quantity_below_one_is_rejected():
    r = size_position(1150, 1150, 5000, 4000, small_cfg())
    assert not r.ok and "inferiore a 1" in r.rejected


def test_experiment_limits():
    cfg = small_cfg()
    assert experiment_state(cfg.start_equity_usd, cfg) == "ok"
    assert experiment_state(cfg.pause_equity_usd - 1, cfg) == "pausa"
    assert experiment_state(cfg.stop_equity_usd - 1, cfg) == "stop"
