"""Registro delle tue esecuzioni manuali (ledger/fills.csv).

In live il bot conosce le tue posizioni SOLO da questo file: se non registri un'esecuzione, il bot
non la vede. Colonne (una riga per evento, importi in dollari):

    date,action,symbol,qty,price_usd,commission_usd,ticket_id,note

Azioni ammesse:
    DEPOSIT      versamento: price_usd = importo in $ (controvalore mostrato dal broker)
    WITHDRAW     prelievo:   price_usd = importo in $
    BUY / SELL   esecuzione: qty, price_usd, commission_usd, ticket_id del ticket eseguito
                 (per una vendita causata dallo stop del broker scrivi ticket_id = STOP)
    STOP         stop inserito o spostato: price_usd = livello dello stop
    STOP_CANCEL  stop cancellato (ad es. prima di una vendita)
    DIVIDEND     dividendo netto accreditato: price_usd = importo in $
    TAX          imposta trattenuta dal broker: price_usd = importo in $ (positivo)
    CASH_ADJUST  correzione per allinearsi al saldo del broker (cambio, arrotondamenti): ± importo
"""
import csv
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from .strategy import Holding

COLUMNS = ["date", "action", "symbol", "qty", "price_usd", "commission_usd", "ticket_id", "note"]
ACTIONS = {"DEPOSIT", "WITHDRAW", "BUY", "SELL", "STOP", "STOP_CANCEL", "DIVIDEND", "TAX", "CASH_ADJUST"}


@dataclass
class _Lot:
    qty: int = 0
    cost: float = 0.0          # costo totale, commissioni di acquisto comprese
    stop: float = None

    @property
    def avg(self) -> float:
        return self.cost / self.qty if self.qty else 0.0


@dataclass
class LedgerState:
    cash: float = 0.0
    lots: dict = field(default_factory=dict)
    realized_pnl: float = 0.0
    commissions: float = 0.0
    deposits: float = 0.0
    taxes: float = 0.0
    errors: list = field(default_factory=list)      # righe non valide: vanno corrette
    violations: list = field(default_factory=list)  # regole violate: vanno comunicate nei report
    fills: list = field(default_factory=list)       # righe BUY/SELL valide

    @property
    def holdings(self) -> dict:
        return {s: Holding(s, lot.qty, round(lot.avg, 4), lot.stop)
                for s, lot in self.lots.items() if lot.qty > 0}

    def equity(self, prices: dict) -> float:
        value = 0.0
        for symbol, lot in self.lots.items():
            price = prices.get(symbol)
            value += lot.qty * (price if price is not None else lot.avg)
        return round(self.cash + value, 2)


def _num(value, name, line, errors, default=0.0):
    if value is None or str(value).strip() == "":
        return default
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        errors.append(f"riga {line}: {name} non numerico ({value!r})")
        return None


def read_rows(path: Path) -> list:
    path = Path(path)
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def build_state(rows: list) -> LedgerState:
    """Ricostruisce cassa, posizioni, stop e risultato realizzato dalle righe del registro."""
    st = LedgerState()
    parsed = []
    for line, row in enumerate(rows, start=2):   # riga 1 = intestazione
        action = (row.get("action") or "").strip().upper()
        if action not in ACTIONS:
            st.errors.append(f"riga {line}: azione sconosciuta {action!r}")
            continue
        try:
            day = date.fromisoformat((row.get("date") or "").strip())
        except ValueError:
            st.errors.append(f"riga {line}: data non valida {row.get('date')!r} (formato AAAA-MM-GG)")
            continue
        parsed.append((day, line, action, row))
    parsed.sort(key=lambda x: (x[0], x[1]))

    for day, line, action, row in parsed:
        symbol = (row.get("symbol") or "").strip().upper()
        qty = _num(row.get("qty"), "qty", line, st.errors)
        price = _num(row.get("price_usd"), "price_usd", line, st.errors)
        commission = _num(row.get("commission_usd"), "commission_usd", line, st.errors)
        if None in (qty, price, commission):
            continue
        qty = int(qty)

        if action in ("DEPOSIT", "WITHDRAW", "DIVIDEND", "TAX", "CASH_ADJUST"):
            sign = {"DEPOSIT": 1, "WITHDRAW": -1, "DIVIDEND": 1, "TAX": -1, "CASH_ADJUST": 1}[action]
            st.cash += sign * price
            if action == "DEPOSIT":
                st.deposits += price
            if action == "WITHDRAW":
                st.deposits -= price
            if action == "TAX":
                st.taxes += price
            continue

        if not symbol:
            st.errors.append(f"riga {line}: simbolo mancante")
            continue
        lot = st.lots.setdefault(symbol, _Lot())

        if action == "BUY":
            if qty <= 0 or price <= 0:
                st.errors.append(f"riga {line}: BUY con quantità o prezzo non positivi")
                continue
            lot.qty += qty
            lot.cost += qty * price + commission
            st.cash -= qty * price + commission
            st.commissions += commission
            st.fills.append({"date": day, "line": line, "action": action, "symbol": symbol,
                             "qty": qty, "price": price, "ticket_id": (row.get("ticket_id") or "").strip()})
        elif action == "SELL":
            if qty <= 0 or qty > lot.qty:
                st.errors.append(f"riga {line}: vendita di {qty} {symbol} ma in portafoglio ce ne sono {lot.qty}")
                continue
            avg = lot.avg
            proceeds = qty * price - commission
            st.realized_pnl += proceeds - avg * qty
            st.cash += proceeds
            st.commissions += commission
            lot.cost -= avg * qty
            lot.qty -= qty
            if lot.qty == 0:
                lot.cost, lot.stop = 0.0, None
            st.fills.append({"date": day, "line": line, "action": action, "symbol": symbol,
                             "qty": qty, "price": price, "ticket_id": (row.get("ticket_id") or "").strip()})
        elif action == "STOP":
            if lot.qty == 0:
                st.errors.append(f"riga {line}: stop su {symbol} che non è in portafoglio")
                continue
            if price <= 0:
                st.errors.append(f"riga {line}: livello di stop non valido")
                continue
            lot.stop = price
        elif action == "STOP_CANCEL":
            lot.stop = None

    if st.cash < -0.01:
        st.errors.append(f"la cassa risulta negativa ({st.cash:.2f} $): manca un versamento o c'è un errore")
    for symbol, lot in st.lots.items():
        if lot.qty > 0 and lot.stop is None:
            st.violations.append(f"{symbol}: posizione di {lot.qty} azioni SENZA stop registrato")
    st.cash = round(st.cash, 2)
    st.realized_pnl = round(st.realized_pnl, 2)
    return st


def check_against_tickets(state: LedgerState, tickets: dict) -> list:
    """Confronta le esecuzioni con i ticket: prezzo sopra il limite o quantità diverse sono violazioni."""
    problems = []
    for fill in state.fills:
        tid = fill["ticket_id"]
        if fill["action"] == "SELL" and tid.upper() == "STOP":
            continue  # vendita causata dallo stop del broker: non ha un ticket
        if not tid:
            problems.append(f"riga {fill['line']}: {fill['action']} {fill['symbol']} senza ticket_id")
            continue
        ticket = tickets.get(tid)
        if ticket is None:
            problems.append(f"riga {fill['line']}: ticket {tid} non trovato")
            continue
        if ticket.symbol != fill["symbol"] or ticket.action != fill["action"]:
            problems.append(f"riga {fill['line']}: l'esecuzione non corrisponde al ticket {tid}")
        if fill["action"] == "BUY" and ticket.limit is not None and fill["price"] > ticket.limit + 0.005:
            problems.append(f"riga {fill['line']}: {fill['symbol']} comprato a {fill['price']:.2f} $, "
                            f"sopra il limite {ticket.limit:.2f} $ del ticket {tid}")
        if fill["qty"] > ticket.qty:
            problems.append(f"riga {fill['line']}: quantità {fill['qty']} superiore a {ticket.qty} del ticket {tid}")
    return problems


def load_state(path: Path) -> LedgerState:
    return build_state(read_rows(path))
