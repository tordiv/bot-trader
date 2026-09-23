"""Trasforma una decisione della strategia in ordini concreti (quantità, limite, stop).

Usato sia dal backtest sia dal job settimanale: la logica è una sola.
"""
from dataclasses import dataclass
from typing import Optional

from .config import Config
from .risk import size_position
from .strategy import Decision


@dataclass
class PlannedOrder:
    action: str                 # "BUY", "SELL" o "MOVE_STOP"
    symbol: str
    qty: int
    reason: str
    limit: Optional[float] = None
    stop: Optional[float] = None
    risk_usd: float = 0.0
    commission_usd: float = 0.0
    commission_r: float = 0.0


def plan_orders(decision: Decision, holdings: dict, equity: float, cash: float, cfg: Config,
                allow_buys: bool = True):
    """Ritorna (ordini, rifiuti). I rifiuti spiegano perché un candidato non è diventato ticket.

    - Vendite e spostamenti di stop vengono sempre proposti.
    - Gli acquisti solo se `allow_buys` (False quando l'esperimento è in pausa) e se c'è posto.
    - Per gli acquisti si scorre la classifica e si prende il primo candidato che rispetta
      TUTTI i limiti di risk.size_position.
    """
    orders, rejections = [], []

    for symbol, reason in decision.sells:
        holding = holdings[symbol]
        orders.append(PlannedOrder("SELL", symbol, holding.qty, reason,
                                   commission_usd=cfg.COMMISSION_PER_ORDER_USD))
    for symbol, new_stop, reason in decision.stop_moves:
        orders.append(PlannedOrder("MOVE_STOP", symbol, holdings[symbol].qty, reason, stop=new_stop))

    if not allow_buys:
        if decision.candidates:
            rejections.append(("*", "acquisti sospesi: limite di pausa dell'esperimento"))
        return orders, rejections

    sold = {o.symbol for o in orders if o.action == "SELL"}
    slots = cfg.MAX_POSITIONS - (len(holdings) - len(sold))
    # La liquidità disponibile include il ricavato stimato delle vendite (all'ultima chiusura).
    ranking = decision.ranking
    available = cash
    for symbol in sold:
        price = ranking.at[symbol, "raw_close"] if symbol in ranking.index else None
        if price is not None and price == price:  # esclude NaN
            available += holdings[symbol].qty * float(price) - cfg.COMMISSION_PER_ORDER_USD

    for cand in decision.candidates:
        if slots <= 0:
            break
        limit = round(cand.ref_price * (1 + cfg.LIMIT_BUFFER_PCT), 2)
        size = size_position(equity, available, limit, cand.stop, cfg)
        if not size.ok:
            rejections.append((cand.symbol, size.rejected))
            continue
        orders.append(PlannedOrder(
            "BUY", cand.symbol, size.qty,
            reason=f"{cand.rank}° per momentum ({cand.momentum:+.1%}), sopra SMA{cfg.SMA_DAYS}, "
                   f"mercato positivo",
            limit=limit, stop=cand.stop, risk_usd=size.risk_usd,
            commission_usd=size.commission_usd, commission_r=size.commission_r,
        ))
        available -= size.notional_usd + cfg.COMMISSION_PER_ORDER_USD
        slots -= 1
    return orders, rejections
