"""Dati di mercato: download da Alpaca (piano gratuito), cache su disco, controlli di qualità.

Barre GIORNALIERE storiche dal feed SIP: il piano gratuito le consente tranne gli ultimi 15 minuti,
quindi si scaricano solo dopo la chiusura. Si scaricano due serie:
- prezzi aggiustati per split e dividendi (per indicatori e rendimenti);
- prezzi reali (raw_close), per quantità e prezzi dei ticket.
Nessun dato viene inventato: se manca, lo si segnala.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from .config import Config

log = logging.getLogger(__name__)

PRICE_COLUMNS = ["open", "high", "low", "close", "volume", "raw_close"]


def validate_bars(df: pd.DataFrame, symbol: str) -> list:
    """Controlli di base. Ritorna la lista dei problemi (vuota se tutto ok)."""
    problems = []
    if df.empty:
        return [f"{symbol}: nessun dato"]
    if not df.index.is_monotonic_increasing:
        problems.append(f"{symbol}: date non in ordine")
    if df.index.has_duplicates:
        problems.append(f"{symbol}: date duplicate")
    prices = df[["open", "high", "low", "close", "raw_close"]]
    if (prices <= 0).any().any() or prices.isna().any().any():
        problems.append(f"{symbol}: prezzi nulli, negativi o mancanti")
    if (df["high"] < df["low"]).any():
        problems.append(f"{symbol}: massimo inferiore al minimo")
    gaps = df.index.to_series().diff().dt.days
    if (gaps > 7).any():
        worst = gaps.idxmax()
        problems.append(f"{symbol}: buco di {int(gaps.max())} giorni prima del {worst.date()}")
    return problems


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Indice = data di New York senza fuso orario; colonne standard."""
    idx = pd.DatetimeIndex(df.index)
    if idx.tz is not None:
        idx = idx.tz_convert("America/New_York").tz_localize(None)
    df = df.copy()
    df.index = idx.normalize()
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df[PRICE_COLUMNS]


class CsvData:
    """Legge file SIMBOLO.csv (date,open,high,low,close,volume[,raw_close]) da una cartella.

    Serve per lavorare offline sulla cache o con dati di un'altra fonte. Se raw_close manca,
    si assume uguale a close (dati non aggiustati).
    """

    def __init__(self, folder: Path):
        self.folder = Path(folder)

    def get_bars(self, symbols, start=None, end=None) -> dict:
        result = {}
        for symbol in symbols:
            path = self.folder / f"{symbol}.csv"
            if not path.exists():
                log.warning("File mancante: %s", path)
                continue
            df = pd.read_csv(path, parse_dates=["date"], index_col="date")
            if "raw_close" not in df.columns:
                df["raw_close"] = df["close"]
            df = _normalize(df)
            if start is not None:
                df = df.loc[pd.Timestamp(start):]
            if end is not None:
                df = df.loc[:pd.Timestamp(end)]
            result[symbol] = df
        return result


class AlpacaData:
    """Barre giornaliere da Alpaca con le chiavi PAPER (i dati non richiedono un conto reale)."""

    def __init__(self, cfg: Config):
        from alpaca.data.historical import StockHistoricalDataClient  # import solo se serve

        key, secret = os.getenv("APCA_API_KEY_ID"), os.getenv("APCA_API_SECRET_KEY")
        if not key or not secret:
            raise RuntimeError("Chiavi Alpaca mancanti in .env (APCA_API_KEY_ID, APCA_API_SECRET_KEY)")
        self.client = StockHistoricalDataClient(key, secret)
        self.cfg = cfg

    def _download(self, symbols, start, end, adjustment) -> pd.DataFrame:
        from alpaca.data.enums import Adjustment, DataFeed
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame

        request = StockBarsRequest(
            symbol_or_symbols=list(symbols), timeframe=TimeFrame.Day,
            start=start, end=end, adjustment=Adjustment(adjustment), feed=DataFeed(self.cfg.DATA_FEED),
        )
        return self.client.get_stock_bars(request).df   # una sola richiesta per tutti i simboli

    def get_bars(self, symbols, start, end=None) -> dict:
        # Il piano gratuito non consente gli ultimi 15 minuti del feed SIP: ci teniamo larghi.
        latest = datetime.now(timezone.utc) - timedelta(minutes=20)
        end = min(pd.Timestamp(end, tz="UTC"), pd.Timestamp(latest)) if end else pd.Timestamp(latest)
        start = pd.Timestamp(start, tz="UTC")
        adjusted = self._download(symbols, start, end, "all")
        raw = self._download(symbols, start, end, "raw")
        result = {}
        for symbol in symbols:
            if symbol not in adjusted.index.get_level_values(0):
                log.warning("Nessun dato da Alpaca per %s", symbol)
                continue
            adj = adjusted.xs(symbol, level=0)
            df = adj[["open", "high", "low", "close", "volume"]].copy()
            df["raw_close"] = raw.xs(symbol, level=0)["close"].reindex(adj.index)
            result[symbol] = _normalize(df)
        return result


def save_cache(bars: dict, folder: Path) -> None:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for symbol, df in bars.items():
        out = df.copy()
        out.index.name = "date"
        out.to_csv(folder / f"{symbol}.csv")


def load_bars(source: str, cfg: Config, start, end=None) -> dict:
    """Punto unico per ottenere i dati: 'alpaca' (e aggiorna la cache), 'csv' (dalla cache)
    o 'synthetic' (dati finti per prove tecniche, MAI per giudicare la strategia)."""
    symbols = cfg.all_symbols
    if source == "alpaca":
        bars = AlpacaData(cfg).get_bars(symbols, start, end)
        save_cache(bars, cfg.CACHE_DIR)
    elif source == "csv":
        bars = CsvData(cfg.CACHE_DIR).get_bars(symbols, start, end)
    elif source == "synthetic":
        from .synthetic import synthetic_universe
        bars = synthetic_universe(symbols, start=start, end=end)
    else:
        raise ValueError(f"Fonte dati sconosciuta: {source}")
    for symbol, df in bars.items():
        for problem in validate_bars(df, symbol):
            log.warning(problem)
    missing = [s for s in symbols if s not in bars]
    if missing:
        log.warning("Simboli senza dati: %s", ", ".join(missing))
    return bars
