"""Indicatori corretti, nessun uso di dati futuri, regole di uscita e di stop rispettate."""
import pandas as pd
import pytest

from helpers import small_cfg, trend_bars, universe
from segnali.strategy import Holding, atr, decide, momentum, sma, weekly_decision_days


def test_indicators_known_values():
    s = pd.Series([1.0, 2, 3, 4, 5])
    assert sma(s, 5).iloc[-1] == 3
    assert momentum(s, days=2, skip=1).iloc[-1] == pytest.approx(4 / 2 - 1)
    df = pd.DataFrame({"high": [10, 12, 11], "low": [8, 9, 10], "close": [9, 11, 10.5]})
    # true range: [2, max(3, 3, 1)=3, max(1, 0, 1)=1] → media 2
    assert atr(df, 3).iloc[-1] == pytest.approx(2)


def test_ranking_prefers_strongest_and_market_filter_allows_buys():
    cfg = small_cfg()
    bars = universe()
    d = decide(bars, bars["SPY"].index[-1], {}, cfg)
    assert d.market_ok
    assert [c.symbol for c in d.candidates] == ["AAA", "BBB", "CCC"]
    assert all(c.stop < c.ref_price for c in d.candidates)


def test_no_lookahead():
    """Cambiare i dati DOPO la data di decisione non deve cambiare la decisione."""
    cfg = small_cfg()
    bars = universe(40)
    asof = bars["SPY"].index[25]
    before = decide(bars, asof, {}, cfg)
    altered = {s: df.copy() for s, df in bars.items()}
    for df in altered.values():
        df.loc[df.index > asof, ["open", "high", "low", "close", "raw_close"]] *= 0.3
    after = decide(altered, asof, {}, cfg)
    assert [(c.symbol, c.stop) for c in before.candidates] == [(c.symbol, c.stop) for c in after.candidates]


def test_market_filter_blocks_buys():
    cfg = small_cfg()
    bars = universe()
    bars["SPY"] = trend_bars(40, 400, -0.01)          # indice in discesa
    d = decide(bars, bars["SPY"].index[-1], {}, cfg)
    assert not d.market_ok and d.candidates == []


def test_missing_bar_on_decision_day_means_no_candidate():
    cfg = small_cfg()
    bars = universe()
    asof = bars["SPY"].index[-1]
    bars["AAA"] = bars["AAA"].drop(asof)
    d = decide(bars, asof, {}, cfg)
    assert "AAA" not in [c.symbol for c in d.candidates]


def test_exit_when_rank_falls_beyond_exit_rank():
    cfg = small_cfg(EXIT_RANK=1)
    bars = universe()
    holdings = {"CCC": Holding("CCC", 5, 70.0, 60.0)}   # CCC è il terzo per forza
    d = decide(bars, bars["SPY"].index[-1], holdings, cfg)
    assert [s for s, _ in d.sells] == ["CCC"]


def test_price_cap_does_not_force_exit_of_a_holding():
    cfg = small_cfg(MAX_PRICE_USD=55.0)             # AAA (~75 $) non è più acquistabile
    bars = universe()
    holdings = {"AAA": Holding("AAA", 5, 50.0, 45.0)}
    d = decide(bars, bars["SPY"].index[-1], holdings, cfg)
    assert d.sells == []


def test_trailing_stop_only_moves_up():
    cfg = small_cfg()
    bars = universe()
    asof = bars["SPY"].index[-1]
    low_stop = {"AAA": Holding("AAA", 5, 50.0, 10.0)}
    high_stop = {"AAA": Holding("AAA", 5, 50.0, 1_000.0)}
    assert decide(bars, asof, low_stop, cfg).stop_moves          # sale
    assert decide(bars, asof, high_stop, cfg).stop_moves == []   # mai verso il basso


def test_weekly_decision_days_handle_holiday_friday():
    cal = pd.bdate_range("2026-03-30", "2026-04-10").drop(pd.Timestamp("2026-04-03"))  # Venerdì Santo
    days = list(weekly_decision_days(cal))
    assert pd.Timestamp("2026-04-02") in days and pd.Timestamp("2026-04-10") in days
