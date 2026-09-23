"""Dimensionamento delle posizioni e controlli di rischio. Funzioni PURE, senza rete né file."""
import math
from dataclasses import dataclass
from typing import Optional

from .config import Config


@dataclass
class SizeResult:
    qty: int
    risk_usd: float = 0.0
    commission_usd: float = 0.0
    commission_r: float = 0.0
    notional_usd: float = 0.0
    rejected: Optional[str] = None   # motivo del rifiuto, None se il trade è accettato

    @property
    def ok(self) -> bool:
        return self.rejected is None


def round_trip_commission(cfg: Config) -> float:
    """Commissioni di acquisto + vendita."""
    return 2 * cfg.COMMISSION_PER_ORDER_USD


def size_position(equity: float, cash: float, entry: float, stop: Optional[float],
                  cfg: Config) -> SizeResult:
    """Quante azioni comprare rispettando TUTTI i limiti. La quantità è il minimo fra:

    - rischio massimo: (RISK_PER_TRADE_MAX × equity) / (entrata − stop)
    - controvalore massimo: (MAX_POSITION_PCT × equity) / entrata
    - liquidità disponibile, tenendo da parte le commissioni di acquisto e vendita

    Poi rifiuta il trade se le commissioni pesano più di MAX_COMMISSION_R volte il rischio.
    `entry` deve essere il prezzo PEGGIORE possibile (il prezzo limite), non la chiusura.
    """
    if stop is None:
        return SizeResult(0, rejected="nessuno stop: ogni acquisto deve avere uno stop")
    if entry <= 0 or stop <= 0:
        return SizeResult(0, rejected="prezzi non validi")
    if stop >= entry:
        return SizeResult(0, rejected="stop non inferiore al prezzo di entrata")

    risk_per_share = entry - stop
    commission = round_trip_commission(cfg)
    qty_by_risk = math.floor(cfg.RISK_PER_TRADE_MAX * equity / risk_per_share)
    qty_by_notional = math.floor(cfg.MAX_POSITION_PCT * equity / entry)
    qty_by_cash = math.floor(max(cash - commission, 0) / entry)
    qty = min(qty_by_risk, qty_by_notional, qty_by_cash)
    if qty < 1:
        return SizeResult(0, rejected="quantità inferiore a 1 azione con i limiti attuali")

    risk = qty * risk_per_share
    commission_r = commission / risk
    result = SizeResult(qty=qty, risk_usd=round(risk, 2), commission_usd=commission,
                        commission_r=round(commission_r, 3), notional_usd=round(qty * entry, 2))
    if commission_r > cfg.MAX_COMMISSION_R:
        result.rejected = (f"commissioni {commission:.0f} $ = {commission_r:.2f} R "
                           f"(massimo {cfg.MAX_COMMISSION_R:.2f} R)")
    return result


def experiment_state(equity_usd: float, cfg: Config) -> str:
    """Stato dei limiti dell'esperimento: 'ok', 'pausa' (niente acquisti) o 'stop' (fine live)."""
    if equity_usd < cfg.stop_equity_usd:
        return "stop"
    if equity_usd < cfg.pause_equity_usd:
        return "pausa"
    return "ok"
