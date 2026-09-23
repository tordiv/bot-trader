"""Ticket: gli ordini proposti, in forma leggibile da te (Markdown/Telegram) e dal programma (JSON)."""
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from .config import Config
from .timeutil import ticket_valid_until

ACTION_LABEL = {"BUY": "ACQUISTA", "SELL": "VENDI", "MOVE_STOP": "SPOSTA STOP"}


@dataclass
class Ticket:
    id: str
    action: str
    symbol: str
    qty: int
    valid_until: str            # ISO, ora italiana
    reason: str
    limit: Optional[float] = None
    stop: Optional[float] = None
    risk_usd: float = 0.0
    risk_pct: float = 0.0
    commission_usd: float = 0.0
    commission_r: float = 0.0


def make_tickets(orders: list, asof, equity_usd: float, cfg: Config) -> list:
    """Da ordini pianificati a ticket numerati. Rifiuta un acquisto senza stop (regola assoluta)."""
    valid = ticket_valid_until(asof, cfg).isoformat(timespec="minutes")
    tickets = []
    for n, order in enumerate(orders, start=1):
        if order.action == "BUY" and (order.stop is None or order.limit is None):
            raise ValueError(f"Acquisto di {order.symbol} senza stop o senza limite: vietato")
        tickets.append(Ticket(
            id=f"{asof:%Y%m%d}-{n:02d}", action=order.action, symbol=order.symbol, qty=order.qty,
            valid_until=valid, reason=order.reason, limit=order.limit, stop=order.stop,
            risk_usd=order.risk_usd,
            risk_pct=round(order.risk_usd / equity_usd, 4) if equity_usd > 0 else 0.0,
            commission_usd=order.commission_usd, commission_r=order.commission_r,
        ))
    return tickets


def _fmt_valid(ticket: Ticket) -> str:
    dt = datetime.fromisoformat(ticket.valid_until)
    giorni = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    return f"{giorni[dt.weekday()]} {dt:%d/%m} ore {dt:%H:%M} (ora italiana)"


def ticket_text(t: Ticket) -> str:
    """Testo del singolo ticket, pensato per essere letto dal telefono."""
    lines = [f"TICKET {t.id}   VALIDO FINO A: {_fmt_valid(t)}",
             f"AZIONE  : {ACTION_LABEL[t.action]}  {t.symbol}"]
    if t.action == "BUY":
        lines += [
            f"QUANTITÀ: {t.qty} azioni (~{t.qty * t.limit:,.0f} $)",
            f"PREZZO  : ordine LIMITE a {t.limit:.2f} $ (non comprare sopra questo prezzo)",
            f"STOP    : appena eseguito, stop loss condizionato a {t.stop:.2f} $ con la validità massima",
            f"RISCHIO : ~{t.risk_usd:.0f} $ ({t.risk_pct:.1%} del conto)   "
            f"COMMISSIONI: {t.commission_usd:.0f} $ = {t.commission_r:.2f} R",
        ]
    elif t.action == "SELL":
        lines += [f"QUANTITÀ: {t.qty} azioni",
                  "PREZZO  : vendi all'apertura (prima CANCELLA lo stop loss esistente)"]
    else:
        lines += [f"NUOVO STOP: {t.stop:.2f} $ su {t.qty} azioni (cancella il vecchio stop e inserisci il nuovo)"]
    lines.append(f"MOTIVO  : {t.reason}")
    return "\n".join(lines)


def tickets_markdown(tickets: list, header: str) -> str:
    if not tickets:
        return f"{header}\n\nNessun ordine questa settimana.\n"
    body = "\n\n".join(f"```\n{ticket_text(t)}\n```" for t in tickets)
    steps = (
        "\n\n**Promemoria:** inserisci subito lo stop dopo ogni acquisto eseguito e registra ogni "
        "esecuzione in `ledger/fills.csv` (anche gli stop inseriti o spostati)."
    )
    return f"{header}\n\n{body}{steps}\n"


def save_tickets(tickets: list, asof, cfg: Config, markdown: str) -> Path:
    cfg.TICKETS_DIR.mkdir(parents=True, exist_ok=True)
    base = cfg.TICKETS_DIR / f"{asof:%Y-%m-%d}"
    base.with_suffix(".md").write_text(markdown, encoding="utf-8")
    base.with_suffix(".json").write_text(
        json.dumps([asdict(t) for t in tickets], indent=2, ensure_ascii=False), encoding="utf-8")
    return base.with_suffix(".md")


def load_tickets(path: Path) -> list:
    return [Ticket(**item) for item in json.loads(Path(path).read_text(encoding="utf-8"))]


def load_all_tickets(cfg: Config) -> dict:
    """Tutti i ticket salvati, indicizzati per id."""
    result = {}
    if cfg.TICKETS_DIR.exists():
        for path in sorted(cfg.TICKETS_DIR.glob("*.json")):
            for t in load_tickets(path):
                result[t.id] = t
    return result
