"""Backtest della variante A e dei benchmark B (trend sull'indice) e C (buy & hold).

Regole della simulazione, scelte per essere PRUDENTI:
- le decisioni si prendono con la chiusura dell'ultimo giorno di borsa della settimana e si
  eseguono dal giorno di borsa successivo (nessun uso di dati futuri);
- acquisti con ordine limite: eseguiti all'apertura se questa è sotto il limite, al limite se il
  prezzo lo tocca durante la seduta, altrimenti il ticket scade dopo TICKET_VALID_TRADING_DAYS;
- vendite su segnale all'apertura; stop eseguito all'apertura se c'è un gap sotto lo stop,
  altrimenti al livello dello stop; slippage SLIPPAGE per lato; commissioni per ordine;
- nel giorno di acquisto, se il minimo tocca lo stop, si assume che lo stop scatti;
- imposta del 26% trattenuta a ogni vendita in guadagno, con zainetto fiscale (tax.py).

I benchmark B e C sono TEORICI: usano SPY con quote frazionarie per confrontare, non sono
strumenti che puoi comprare (un residente UE di norma non può comprare ETF USA).
"""
import math
from dataclasses import dataclass, field

import pandas as pd

from .config import Config
from .planner import plan_orders
from .strategy import Holding, decide, weekly_decision_days
from .tax import TaxAccount


@dataclass
class _Position:
    symbol: str
    qty: int              # azioni reali
    adj_qty: float        # quantità equivalente nei prezzi aggiustati
    cost: float           # $ spesi, commissione di acquisto compresa
    stop_adj: float
    entry_date: pd.Timestamp
    risk_usd: float


@dataclass
class BacktestResult:
    name: str
    equity: pd.Series
    trades: pd.DataFrame
    tax_paid: float = 0.0
    rejections: int = 0
    notes: list = field(default_factory=list)


def _bar(bars: dict, symbol: str, day):
    df = bars.get(symbol)
    if df is None or day not in df.index:
        return None
    return df.loc[day]


def _raw_factor(bar) -> float:
    return float(bar["raw_close"] / bar["close"])


def run_strategy(bars: dict, cfg: Config, start, end=None, with_tax: bool = True) -> BacktestResult:
    spy = bars[cfg.SIGNAL_SYMBOL]
    calendar = spy.loc[pd.Timestamp(start):pd.Timestamp(end) if end else None].index
    decision_days = set(weekly_decision_days(calendar))
    cash = cfg.start_equity_usd
    comm, slip = cfg.COMMISSION_PER_ORDER_USD, cfg.SLIPPAGE
    positions, pending, trades, equity = {}, [], [], {}
    last_close = {}
    tax = TaxAccount(cfg.TAX_RATE, cfg.TAX_LOSS_CARRY_YEARS)
    rejections = 0

    def close_position(pos: _Position, price: float, day, reason: str):
        nonlocal cash
        proceeds = pos.adj_qty * price - comm
        gain = proceeds - pos.cost
        paid = tax.on_realized(gain, day.year) if with_tax else 0.0
        cash += proceeds - paid
        trades.append({"symbol": pos.symbol, "entry_date": pos.entry_date, "exit_date": day,
                       "qty": pos.qty, "cost": round(pos.cost, 2), "proceeds": round(proceeds, 2),
                       "pnl": round(gain, 2), "tax": paid,
                       "r": round(gain / pos.risk_usd, 3) if pos.risk_usd > 0 else 0.0,
                       "commissions": 2 * comm, "exit_reason": reason})
        del positions[pos.symbol]

    for i, day in enumerate(calendar):
        # 1) Vendite su segnale, all'apertura.
        for order in [o for o in pending if o["action"] == "SELL"]:
            bar = _bar(bars, order["symbol"], day)
            pos = positions.get(order["symbol"])
            if pos is None:
                pending.remove(order)
            elif bar is not None:
                close_position(pos, float(bar["open"]) * (1 - slip), day, order["reason"])
                pending.remove(order)

        # 2) Acquisti con ordine limite.
        entered_today = set()
        for order in [o for o in pending if o["action"] == "BUY"]:
            bar = _bar(bars, order["symbol"], day)
            if bar is None or order["symbol"] in positions:
                if i >= order["expires"] or order["symbol"] in positions:
                    pending.remove(order)
                continue
            f = order["factor"]
            limit_adj = order["limit"] / f
            if bar["open"] <= limit_adj:
                fill = min(float(bar["open"]) * (1 + slip), limit_adj)
            elif bar["low"] <= limit_adj:
                fill = limit_adj
            else:
                if i >= order["expires"]:
                    pending.remove(order)
                continue
            pending.remove(order)
            qty = order["qty"]
            if qty * fill * f + comm > cash:        # gap sfavorevole: riduci la quantità
                qty = math.floor((cash - comm) / (fill * f))
            if qty < 1:
                continue
            adj_qty = qty * f
            cost = adj_qty * fill + comm
            cash -= cost
            stop_adj = order["stop"] / f
            pos = _Position(order["symbol"], qty, adj_qty, cost, stop_adj, day,
                            risk_usd=max(qty * (fill * f - order["stop"]), 0.01))
            positions[pos.symbol] = pos
            entered_today.add(pos.symbol)
            if bar["low"] <= stop_adj:              # prudenza: lo stop può scattare lo stesso giorno
                close_position(pos, min(stop_adj, fill) * (1 - slip), day, "stop (giorno di entrata)")

        # 3) Stop sulle posizioni già aperte.
        for pos in list(positions.values()):
            if pos.symbol in entered_today:
                continue
            bar = _bar(bars, pos.symbol, day)
            if bar is None:
                continue
            if bar["open"] <= pos.stop_adj:
                close_position(pos, float(bar["open"]) * (1 - slip), day, "stop (gap in apertura)")
            elif bar["low"] <= pos.stop_adj:
                close_position(pos, pos.stop_adj * (1 - slip), day, "stop")

        # 4) Valorizzazione a fine giornata.
        for symbol in positions:
            bar = _bar(bars, symbol, day)
            if bar is not None:
                last_close[symbol] = float(bar["close"])
        value = sum(p.adj_qty * last_close.get(s, p.cost / p.adj_qty) for s, p in positions.items())
        equity[day] = cash + value

        # 5) Decisione settimanale, eseguita dal giorno successivo.
        if day in decision_days:
            holdings = {}
            for symbol, pos in positions.items():
                bar = _bar(bars, symbol, day)
                f = _raw_factor(bar) if bar is not None else 1.0
                holdings[symbol] = Holding(symbol, pos.qty, pos.cost / pos.qty, round(pos.stop_adj * f, 2))
            decision = decide(bars, day, holdings, cfg)
            orders, rejected = plan_orders(decision, holdings, equity[day], cash, cfg)
            rejections += len(rejected)
            for order in orders:
                if order.action == "SELL":
                    pending.append({"action": "SELL", "symbol": order.symbol, "reason": order.reason})
                elif order.action == "MOVE_STOP":
                    bar = _bar(bars, order.symbol, day)
                    new_stop_adj = order.stop / _raw_factor(bar)
                    pos = positions[order.symbol]
                    pos.stop_adj = max(pos.stop_adj, new_stop_adj)
                elif order.action == "BUY":
                    bar = _bar(bars, order.symbol, day)
                    pending.append({"action": "BUY", "symbol": order.symbol, "qty": order.qty,
                                    "limit": order.limit, "stop": order.stop,
                                    "factor": _raw_factor(bar),
                                    "expires": i + cfg.TICKET_VALID_TRADING_DAYS})

    trades_df = pd.DataFrame(trades)
    return BacktestResult("A - rotazione azioni USA", pd.Series(equity, name="equity"),
                          trades_df, tax.paid, rejections)


def _weekly_trend_signal(spy: pd.DataFrame, cfg: Config) -> pd.Series:
    """True/False per ogni giorno di decisione: chiusura settimanale sopra la media a N settimane."""
    days = weekly_decision_days(spy.index)
    weekly = spy.loc[days, "close"]
    return weekly > weekly.rolling(cfg.INDEX_SMA_WEEKS, min_periods=cfg.INDEX_SMA_WEEKS).mean()


def run_benchmark(bars: dict, cfg: Config, start, end=None, kind: str = "buy_hold",
                  with_tax: bool = True) -> BacktestResult:
    """B = 'index_trend' (investito sopra la media a 40 settimane), C = 'buy_hold'."""
    spy = bars[cfg.SIGNAL_SYMBOL]
    calendar = spy.loc[pd.Timestamp(start):pd.Timestamp(end) if end else None].index
    signal = _weekly_trend_signal(spy, cfg) if kind == "index_trend" else None
    cash, units, cost_basis = cfg.start_equity_usd, 0.0, 0.0
    comm, slip = cfg.BENCHMARK_COMMISSION_USD, cfg.SLIPPAGE
    tax = TaxAccount(cfg.TAX_RATE, cfg.TAX_LOSS_CARRY_YEARS)
    want_in = kind == "buy_hold"
    trades, equity = [], {}
    entry_day = None
    for day in calendar:
        bar = spy.loc[day]
        if want_in and units == 0 and cash > comm:
            price = float(bar["open"]) * (1 + slip)
            units = (cash - comm) / price
            cost_basis, cash, entry_day = cash, 0.0, day
        elif not want_in and units > 0:
            proceeds = units * float(bar["open"]) * (1 - slip) - comm
            gain = proceeds - cost_basis
            paid = tax.on_realized(gain, day.year) if with_tax else 0.0
            trades.append({"entry_date": entry_day, "exit_date": day, "pnl": round(gain, 2),
                           "tax": paid, "commissions": 2 * comm, "r": float("nan")})
            cash, units = proceeds - paid, 0.0
        equity[day] = cash + units * float(bar["close"])
        if signal is not None and day in signal.index and not pd.isna(signal.loc[day]):
            want_in = bool(signal.loc[day])
    name = "B - trend sull'indice (teorico)" if kind == "index_trend" else "C - buy & hold (teorico)"
    result = BacktestResult(name, pd.Series(equity, name="equity"), pd.DataFrame(trades), tax.paid)
    if kind == "buy_hold":
        result.notes.append("imposte non calcolate sulla plusvalenza non realizzata a fine periodo")
    return result


def metrics(result: BacktestResult, start=None, end=None) -> dict:
    """Metriche su tutto il periodo o su un segmento [start, end)."""
    eq = result.equity
    if start is not None:
        eq = eq.loc[pd.Timestamp(start):]
    if end is not None:
        eq = eq.loc[:pd.Timestamp(end) - pd.Timedelta(days=1)]
    if len(eq) < 2:
        return {}
    trades = result.trades
    if not trades.empty:
        mask = pd.Series(True, index=trades.index)
        if start is not None:
            mask &= trades["exit_date"] >= pd.Timestamp(start)
        if end is not None:
            mask &= trades["exit_date"] < pd.Timestamp(end)
        trades = trades[mask]
    years = max((eq.index[-1] - eq.index[0]).days / 365.25, 1e-9)
    drawdown = (eq / eq.cummax() - 1).min()
    n = len(trades)
    return {
        "inizio": eq.index[0].date(), "fine": eq.index[-1].date(),
        "equity_iniziale": round(float(eq.iloc[0]), 2), "equity_finale": round(float(eq.iloc[-1]), 2),
        "CAGR": (eq.iloc[-1] / eq.iloc[0]) ** (1 / years) - 1,
        "max_drawdown": float(drawdown),
        "trade": n, "trade_anno": n / years,
        "vincenti": float((trades["pnl"] > 0).mean()) if n else float("nan"),
        "R_medio": float(trades["r"].mean()) if n and "r" in trades else float("nan"),
        "commissioni": float(trades["commissions"].sum()) if n else 0.0,
        "imposte": float(trades["tax"].sum()) if n else 0.0,
    }
