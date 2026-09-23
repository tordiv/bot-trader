"""Dati costruiti a mano per i test: piccoli, prevedibili, senza rete."""
from dataclasses import replace

import numpy as np
import pandas as pd

from segnali.config import CONFIG


def small_cfg(tmp_path=None, **overrides):
    """Configurazione con finestre corte, così bastano poche decine di barre."""
    base = dict(UNIVERSE=("AAA", "BBB", "CCC"), SMA_DAYS=5, MOMENTUM_DAYS=5, SKIP_DAYS=0,
                ATR_DAYS=3, MAX_PRICE_USD=10_000.0, EXIT_RANK=2)
    if tmp_path is not None:
        base.update(CACHE_DIR=tmp_path / "cache", TICKETS_DIR=tmp_path / "tickets",
                    REPORTS_DIR=tmp_path / "reports", LOGS_DIR=tmp_path / "logs",
                    LEDGER_FILE=tmp_path / "ledger" / "fills.csv")
    base.update(overrides)
    return replace(CONFIG, **base)


def trend_bars(n=40, start_price=100.0, daily=0.01, start="2024-01-01", spread=0.005, raw_factor=1.0):
    """Serie che sale di `daily` al giorno, apertura = chiusura precedente."""
    days = pd.bdate_range(start, periods=n)
    close = start_price * (1 + daily) ** np.arange(n)
    open_ = np.concatenate([[close[0]], close[:-1]])
    high = np.maximum(open_, close) * (1 + spread)
    low = np.minimum(open_, close) * (1 - spread)
    return pd.DataFrame({"open": open_, "high": high, "low": low, "close": close,
                         "volume": 1_000_000, "raw_close": close * raw_factor}, index=days)


def universe(n=40, **kwargs):
    """SPY e tre titoli in salita con forza diversa (AAA il più forte)."""
    return {
        "SPY": trend_bars(n, 400, 0.002),
        "AAA": trend_bars(n, 50, 0.012),
        "BBB": trend_bars(n, 60, 0.008),
        "CCC": trend_bars(n, 70, 0.004),
    }
