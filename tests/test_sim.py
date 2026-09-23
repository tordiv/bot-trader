"""Backtest prudente: gap sotto lo stop al prezzo peggiore, niente dati futuri, costi applicati."""
import pandas as pd
import pytest

from helpers import small_cfg, trend_bars
from segnali.sim import metrics, run_benchmark, run_strategy


def _one_stock(n=60, gap_day=None):
    bars = {"SPY": trend_bars(n, 400, 0.002), "AAA": trend_bars(n, 50, 0.01)}
    if gap_day is not None:
        df = bars["AAA"]
        d = df.index[gap_day]
        prev = df["close"].iloc[gap_day - 1]
        df.loc[d, ["open", "high", "low", "close", "raw_close"]] = [prev * 0.5, prev * 0.52, prev * 0.48,
                                                                   prev * 0.5, prev * 0.5]
        after = df.index > d
        df.loc[after, ["open", "high", "low", "close", "raw_close"]] *= 0.5
    return bars


def _cfg(**kw):
    base = dict(UNIVERSE=("AAA",), COMMISSION_PER_ORDER_USD=0.0, MAX_COMMISSION_R=10.0, EXIT_RANK=5)
    base.update(kw)
    return small_cfg(**base)


def test_gap_below_stop_exits_at_open_price():
    cfg = _cfg()
    bars = _one_stock(gap_day=40)
    res = run_strategy(bars, cfg, bars["SPY"].index[0], with_tax=False)
    gap = res.trades[res.trades["exit_reason"] == "stop (gap in apertura)"]
    assert len(gap) == 1
    day = gap.iloc[0]["exit_date"]
    assert day == bars["AAA"].index[40]
    open_price = bars["AAA"].loc[day, "open"]
    trade = gap.iloc[0]
    assert trade["proceeds"] == pytest.approx(trade["qty"] * open_price * (1 - cfg.SLIPPAGE), abs=0.01)


def test_commissions_reduce_equity():
    bars = _one_stock(gap_day=40)
    free = run_strategy(bars, _cfg(), bars["SPY"].index[0], with_tax=False)
    paid = run_strategy(bars, _cfg(COMMISSION_PER_ORDER_USD=9.0), bars["SPY"].index[0], with_tax=False)
    assert paid.equity.iloc[-1] < free.equity.iloc[-1]


def test_no_lookahead_in_backtest():
    bars = _one_stock(n=60)
    cfg = _cfg()
    cut = bars["SPY"].index[45]
    base = run_strategy(bars, cfg, bars["SPY"].index[0], with_tax=False)
    altered = {s: df.copy() for s, df in bars.items()}
    for df in altered.values():
        df.loc[df.index > cut, ["open", "high", "low", "close", "raw_close"]] *= 0.2
    changed = run_strategy(altered, cfg, bars["SPY"].index[0], with_tax=False)
    pd.testing.assert_series_equal(base.equity.loc[:cut], changed.equity.loc[:cut])


def test_limit_not_reached_means_no_trade():
    """Prima decisione venerdì (indice 9); dal lunedì i prezzi saltano del 50% sopra il limite."""
    cfg = _cfg()
    normal = _one_stock(n=60)
    jumped = _one_stock(n=60)
    df = jumped["AAA"]
    df.loc[df.index[10]:, ["open", "high", "low", "close", "raw_close"]] *= 1.5
    end = df.index[12]
    with_fill = run_strategy(normal, cfg, df.index[0], end=end, with_tax=False)
    no_fill = run_strategy(jumped, cfg, df.index[0], end=end, with_tax=False)
    start_equity = cfg.start_equity_usd
    assert with_fill.equity.iloc[-1] != pytest.approx(start_equity)    # controllo: qui si compra
    assert no_fill.equity.iloc[-1] == pytest.approx(start_equity)      # limite mai toccato: resta liquido


def test_benchmarks_run_and_metrics():
    bars = _one_stock(n=300)
    cfg = _cfg(INDEX_SMA_WEEKS=4)
    for kind in ("buy_hold", "index_trend"):
        res = run_benchmark(bars, cfg, bars["SPY"].index[0], kind=kind)
        m = metrics(res)
        assert m["equity_finale"] > 0
        assert -1 <= m["max_drawdown"] <= 0
