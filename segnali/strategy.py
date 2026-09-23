"""Strategia (variante A): rotazione momentum settimanale su azioni USA.

Tutte le funzioni sono PURE: ricevono i dati e restituiscono una decisione, senza rete né file.
Le stesse funzioni sono usate dal backtest e dal job settimanale, così ciò che testi è ciò che usi.

Formato dei dati: per ogni simbolo un DataFrame con indice di date (senza fuso orario) e colonne
open, high, low, close (prezzi aggiustati per split e dividendi), volume e raw_close (prezzo
effettivamente scambiato quel giorno, serve per quantità e prezzi dei ticket).
"""
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

from .config import Config


# ----------------------------------------------------------------------------------------------
# Indicatori
# ----------------------------------------------------------------------------------------------

def sma(series: pd.Series, days: int) -> pd.Series:
    """Media mobile semplice."""
    return series.rolling(days, min_periods=days).mean()


def atr(df: pd.DataFrame, days: int) -> pd.Series:
    """Average True Range: ampiezza media giornaliera, compresi i gap fra una seduta e l'altra."""
    prev_close = df["close"].shift(1)
    true_range = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return true_range.rolling(days, min_periods=days).mean()


def momentum(close: pd.Series, days: int, skip: int) -> pd.Series:
    """Rendimento su `days` sedute, escludendo le ultime `skip` (riduce l'effetto rimbalzo)."""
    return close.shift(skip) / close.shift(skip + days) - 1


# ----------------------------------------------------------------------------------------------
# Strutture dati
# ----------------------------------------------------------------------------------------------

@dataclass
class Holding:
    """Una posizione aperta, in prezzi reali (non aggiustati)."""
    symbol: str
    qty: int
    entry_price: float
    stop: Optional[float]


@dataclass
class Candidate:
    symbol: str
    rank: int
    momentum: float
    ref_price: float     # ultima chiusura reale
    stop: float          # stop proposto, in prezzo reale
    atr: float           # ATR convertito in prezzo reale


@dataclass
class Decision:
    asof: pd.Timestamp
    market_ok: bool
    ranking: pd.DataFrame                              # tutta la classifica, per i report
    sells: list = field(default_factory=list)          # (simbolo, motivo)
    stop_moves: list = field(default_factory=list)     # (simbolo, nuovo stop, motivo)
    candidates: list = field(default_factory=list)     # Candidate in ordine di classifica
    warnings: list = field(default_factory=list)


# ----------------------------------------------------------------------------------------------
# Classifica e decisione
# ----------------------------------------------------------------------------------------------

def _indicator_row(df: pd.DataFrame, asof: pd.Timestamp, cfg: Config) -> Optional[dict]:
    """Valori degli indicatori alla data `asof`, usando SOLO dati fino a `asof` compreso."""
    hist = df.loc[:asof]
    if hist.empty or hist.index[-1] != asof:
        return None  # nessuna barra quel giorno: dato mancante o titolo sospeso
    needed = max(cfg.SMA_DAYS, cfg.MOMENTUM_DAYS + cfg.SKIP_DAYS + 1, cfg.ATR_DAYS + 1)
    if len(hist) < needed:
        return None
    hist = hist.tail(needed + 1)  # bastano le ultime sedute: stesso risultato, molto più veloce
    close = hist["close"]
    last = hist.iloc[-1]
    raw_factor = last["raw_close"] / last["close"]  # da prezzo aggiustato a prezzo reale
    return {
        "close": float(last["close"]),
        "raw_close": float(last["raw_close"]),
        "sma": float(sma(close, cfg.SMA_DAYS).iloc[-1]),
        "momentum": float(momentum(close, cfg.MOMENTUM_DAYS, cfg.SKIP_DAYS).iloc[-1]),
        "atr_raw": float(atr(hist, cfg.ATR_DAYS).iloc[-1] * raw_factor),
    }


def rank_universe(bars: dict, asof: pd.Timestamp, cfg: Config) -> pd.DataFrame:
    """Classifica l'universo alla data `asof`. Ritorna un DataFrame con una riga per simbolo."""
    rows = []
    for symbol in cfg.UNIVERSE:
        df = bars.get(symbol)
        row = _indicator_row(df, asof, cfg) if df is not None else None
        if row is None:
            rows.append({"symbol": symbol, "eligible": False, "reason": "dati insufficienti"})
            continue
        reasons = []
        if not row["close"] > row["sma"]:
            reasons.append("sotto SMA")
        if row["raw_close"] > cfg.MAX_PRICE_USD:
            reasons.append("prezzo troppo alto")
        if pd.isna(row["momentum"]):
            reasons.append("momentum non calcolabile")
        rows.append({"symbol": symbol, **row, "eligible": not reasons,
                     "reason": ", ".join(reasons) or "ok"})
    columns = ["symbol", "close", "raw_close", "sma", "momentum", "atr_raw", "eligible", "reason"]
    # reindex garantisce tutte le colonne anche quando nessun titolo ha dati sufficienti
    table = pd.DataFrame(rows).reindex(columns=columns).set_index("symbol")
    # rank: posizione fra i titoli ACQUISTABILI (sopra SMA e prezzo entro il tetto).
    eligible = table[table["eligible"]].sort_values("momentum", ascending=False)
    table["rank"] = pd.NA
    table.loc[eligible.index, "rank"] = range(1, len(eligible) + 1)
    # trend_rank: posizione fra i titoli in trend (sopra SMA) a prescindere dal prezzo.
    # Serve per le uscite: un titolo già in portafoglio che supera il tetto di prezzo
    # non va venduto per questo motivo.
    in_trend = table[table["reason"].isin(["ok", "prezzo troppo alto"])]
    in_trend = in_trend.sort_values("momentum", ascending=False)
    table["trend_rank"] = pd.NA
    table.loc[in_trend.index, "trend_rank"] = range(1, len(in_trend) + 1)
    return table.sort_values(["eligible", "momentum"], ascending=[False, False])


def market_filter(bars: dict, asof: pd.Timestamp, cfg: Config) -> Optional[bool]:
    """True se l'indice è sopra la sua SMA; None se il dato manca (in quel caso: niente acquisti)."""
    df = bars.get(cfg.SIGNAL_SYMBOL)
    if df is None:
        return None
    hist = df.loc[:asof]
    if len(hist) < cfg.SMA_DAYS or hist.index[-1] != asof:
        return None
    close = hist["close"].tail(cfg.SMA_DAYS)
    return bool(close.iloc[-1] > close.mean())


def decide(bars: dict, asof: pd.Timestamp, holdings: dict, cfg: Config) -> Decision:
    """Decisione settimanale: cosa vendere, dove spostare gli stop, quali titoli comprare.

    `holdings`: {simbolo: Holding}. Il dimensionamento (quante azioni) NON si decide qui ma in
    planner.py, che scorre i candidati in ordine e prende il primo che rispetta i limiti di rischio.
    """
    asof = pd.Timestamp(asof)
    ranking = rank_universe(bars, asof, cfg)
    market = market_filter(bars, asof, cfg)
    decision = Decision(asof=asof, market_ok=bool(market), ranking=ranking)
    if market is None:
        decision.warnings.append(f"Dati di {cfg.SIGNAL_SYMBOL} mancanti al {asof.date()}: nessun acquisto")

    # 1) Vendite: il titolo in portafoglio è uscito dalla parte alta della classifica.
    for symbol, holding in holdings.items():
        if symbol not in ranking.index:
            decision.sells.append((symbol, "fuori dall'universo configurato"))
            continue
        row = ranking.loc[symbol]
        if row["reason"] == "dati insufficienti":
            decision.warnings.append(f"{symbol}: dati mancanti al {asof.date()}, nessuna decisione")
            continue
        if pd.isna(row["trend_rank"]):
            decision.sells.append((symbol, f"non più in trend ({row['reason']})"))
        elif int(row["trend_rank"]) > cfg.EXIT_RANK:
            decision.sells.append((symbol, f"sceso al posto {int(row['trend_rank'])} "
                                           f"(uscita oltre il {cfg.EXIT_RANK})"))

    sold = {s for s, _ in decision.sells}

    # 2) Stop mobile: si alza soltanto, mai si abbassa.
    if cfg.TRAILING_STOP:
        for symbol, holding in holdings.items():
            if symbol in sold or symbol not in ranking.index or holding.stop is None:
                continue
            row = ranking.loc[symbol]
            if pd.isna(row.get("raw_close")) or pd.isna(row.get("atr_raw")):
                continue
            new_stop = round(float(row["raw_close"] - cfg.ATR_MULT * row["atr_raw"]), 2)
            if new_stop > holding.stop * (1 + cfg.MIN_STOP_MOVE_PCT):
                decision.stop_moves.append((symbol, new_stop, f"stop mobile {cfg.ATR_MULT}×ATR"))

    # 3) Candidati all'acquisto, in ordine di classifica (solo se il mercato è sopra la SMA).
    if market:
        eligible = ranking[ranking["eligible"]].sort_values("rank")
        for symbol, row in eligible.iterrows():
            if symbol in holdings:
                continue
            stop = round(float(row["raw_close"] - cfg.ATR_MULT * row["atr_raw"]), 2)
            decision.candidates.append(Candidate(
                symbol=symbol, rank=int(row["rank"]), momentum=float(row["momentum"]),
                ref_price=float(row["raw_close"]), stop=stop, atr=float(row["atr_raw"]),
            ))
    return decision


def weekly_decision_days(calendar: pd.DatetimeIndex) -> pd.DatetimeIndex:
    """Ultimo giorno di borsa di ogni settimana (di solito il venerdì, prima se è festivo)."""
    cal = pd.DatetimeIndex(calendar).sort_values()
    iso = cal.isocalendar()
    keys = list(zip(iso["year"], iso["week"]))
    last = {}
    for day, key in zip(cal, keys):
        last[key] = day
    return pd.DatetimeIndex(sorted(last.values()))
