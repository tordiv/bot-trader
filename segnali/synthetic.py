"""Dati FINTI generati a caso, per provare che il codice funziona senza connessione.

⚠ I risultati ottenuti con questi dati non dicono NULLA sulla strategia: servono solo a verificare
che il programma giri dall'inizio alla fine.
"""
import numpy as np
import pandas as pd


def synthetic_bars(seed: int, start="2016-01-01", end="2026-06-30", start_price=None,
                   drift=0.0003, vol=0.018) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    days = pd.bdate_range(start, end)
    price0 = start_price or float(rng.uniform(20, 140))
    rets = rng.normal(drift, vol, len(days))
    close = price0 * np.exp(np.cumsum(rets))
    open_ = close * np.exp(rng.normal(0, vol / 3, len(days)))
    high = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0, vol / 2, len(days))))
    low = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0, vol / 2, len(days))))
    return pd.DataFrame({"open": open_, "high": high, "low": low, "close": close,
                         "volume": rng.integers(1_000_000, 5_000_000, len(days)),
                         "raw_close": close}, index=days)


def synthetic_universe(symbols, start="2016-01-01", end=None) -> dict:
    end = end or "2026-06-30"
    bars = {}
    for i, symbol in enumerate(symbols):
        bars[symbol] = synthetic_bars(seed=i + 1, start=start, end=end,
                                      drift=0.0002 + 0.0001 * (i % 5))
    return bars
