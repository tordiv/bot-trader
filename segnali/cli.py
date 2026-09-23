"""Comandi: weekly (ticket del sabato), daily (controlli serali), backtest."""
import argparse
import logging
import os
from datetime import timedelta

import pandas as pd

from . import notifier
from .config import CONFIG, Config
from .data import load_bars
from .ledger import check_against_tickets, load_state
from .logutil import setup
from .planner import plan_orders
from .report import backtest_report, weekly_report, write
from .risk import experiment_state
from .sim import run_benchmark, run_strategy
from .strategy import atr, decide
from .tickets import load_all_tickets, make_tickets, save_tickets, tickets_markdown, ticket_text
from .timeutil import market_today, now_local

log = logging.getLogger("segnali")


def _load_env():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass


def _recent_bars(source: str, cfg: Config) -> dict:
    start = (market_today(cfg) - timedelta(days=cfg.HISTORY_DAYS_LIVE)).isoformat()
    if source == "synthetic":
        start = "2016-01-01"
    return load_bars(source, cfg, start=start)


def _last_prices(bars: dict) -> dict:
    return {s: float(df["raw_close"].iloc[-1]) for s, df in bars.items() if not df.empty}


def _positions(mode: str, cfg: Config, bars: dict):
    """Ritorna (holdings, equity, cash, errori, violazioni, broker_paper_o_None)."""
    if mode == "paper":
        from .paper import PaperBroker
        broker = PaperBroker.from_env(cfg)
        equity, cash = broker.account()
        holdings = broker.holdings()
        violations = [f"{s}: posizione paper SENZA stop" for s, h in holdings.items() if h.stop is None]
        return holdings, equity, cash, [], violations, broker
    if mode == "ledger":
        state = load_state(cfg.LEDGER_FILE)
        violations = list(state.violations) + check_against_tickets(state, load_all_tickets(cfg))
        if state.deposits <= 0:
            log.warning("Registro vuoto o senza versamenti: uso il capitale iniziale di configurazione")
            return state.holdings, cfg.start_equity_usd, cfg.start_equity_usd, state.errors, violations, None
        return state.holdings, state.equity(_last_prices(bars)), state.cash, state.errors, violations, None
    if mode == "none":
        return {}, cfg.start_equity_usd, cfg.start_equity_usd, [], [], None
    raise ValueError(f"Modalità posizioni sconosciuta: {mode}")


def weekly_main(argv=None, cfg: Config = CONFIG) -> int:
    parser = argparse.ArgumentParser(description="Genera i ticket della settimana")
    parser.add_argument("--source", default="alpaca", choices=["alpaca", "csv", "synthetic"])
    parser.add_argument("--positions", default=cfg.POSITIONS_FROM, choices=["paper", "ledger", "none"])
    parser.add_argument("--dry-run", action="store_true", help="mostra i ticket senza salvarli né inviarli")
    parser.add_argument("--submit-paper", action="store_true",
                        help="invia i ticket al conto PAPER (richiede PAPER_SUBMIT_ENABLED=true in .env)")
    args = parser.parse_args(argv)
    _load_env()
    setup(cfg)

    bars = _recent_bars(args.source, cfg)
    spy = bars.get(cfg.SIGNAL_SYMBOL)
    if spy is None or spy.empty:
        log.error("Mancano i dati di %s: impossibile decidere", cfg.SIGNAL_SYMBOL)
        return 2
    asof = spy.index[-1]
    holdings, equity, cash, errors, violations, broker = _positions(args.positions, cfg, bars)
    state = experiment_state(equity, cfg)

    decision = decide(bars, asof, holdings, cfg)
    orders, rejections = plan_orders(decision, holdings, equity, cash, cfg, allow_buys=(state == "ok"))
    if state == "stop":
        orders = [o for o in orders if o.action != "BUY"]
    tickets = make_tickets(orders, asof.date(), equity, cfg)
    header = f"### Ticket per la settimana (dati al {asof.date()})"
    tickets_md = tickets_markdown(tickets, header)
    report = weekly_report(asof, cfg, args.positions, equity, cash, holdings, decision, tickets_md,
                           rejections, violations, errors, state)

    print(report)
    if args.dry_run:
        log.info("DRY RUN: nessun file salvato, nessuna notifica, nessun ordine")
        return 0

    save_tickets(tickets, asof.date(), cfg, tickets_md)
    path = write(report, cfg.REPORTS_DIR, f"weekly-{asof.date()}.md")
    log.info("Report salvato in %s", path)
    summary = [f"Segnali settimanali (dati al {asof.date()}) — equity {equity:,.0f} $ — stato {state.upper()}"]
    summary += [ticket_text(t) for t in tickets] or ["Nessun ordine questa settimana."]
    if violations:
        summary.append("RULE VIOLATIONS:\n" + "\n".join(violations))
    notifier.send("\n\n".join(summary))

    if args.submit_paper:
        if os.getenv("PAPER_SUBMIT_ENABLED", "").lower() != "true":
            log.error("Invio al paper non abilitato: imposta PAPER_SUBMIT_ENABLED=true in .env")
            return 3
        if broker is None:
            from .paper import PaperBroker
            broker = PaperBroker.from_env(cfg)
        for ticket in tickets:
            log.info(broker.submit(ticket))
    return 0


def daily_main(argv=None, cfg: Config = CONFIG) -> int:
    parser = argparse.ArgumentParser(description="Controlli serali dopo la chiusura USA")
    parser.add_argument("--source", default="alpaca", choices=["alpaca", "csv", "synthetic"])
    parser.add_argument("--positions", default=cfg.POSITIONS_FROM, choices=["paper", "ledger", "none"])
    parser.add_argument("--dry-run", action="store_true", help="nessuna notifica e nessuna azione sul paper")
    args = parser.parse_args(argv)
    _load_env()
    setup(cfg)

    bars = _recent_bars(args.source, cfg)
    holdings, equity, cash, errors, violations, broker = _positions(args.positions, cfg, bars)
    messages = [f"ERRORE registro: {e}" for e in errors] + [f"VIOLAZIONE: {v}" for v in violations]

    spy = bars.get(cfg.SIGNAL_SYMBOL)
    if spy is None or (pd.Timestamp(market_today(cfg)) - spy.index[-1]).days > 4:
        messages.append("Dati di mercato non aggiornati da più di 4 giorni: controlla la connessione")

    for symbol, h in holdings.items():
        df = bars.get(symbol)
        if df is None or df.empty:
            messages.append(f"{symbol}: nessun dato recente")
            continue
        last = float(df["raw_close"].iloc[-1])
        if h.stop is None:
            continue  # già tra le violazioni
        if last <= h.stop:
            messages.append(f"{symbol}: chiusura {last:.2f} $ sotto lo stop {h.stop:.2f} $ — lo stop potrebbe "
                            f"essere scattato: verifica sul broker e registra la vendita (ticket_id STOP)")
        else:
            factor = float(df["raw_close"].iloc[-1] / df["close"].iloc[-1])
            dist = float(atr(df.tail(cfg.ATR_DAYS + 1), cfg.ATR_DAYS).iloc[-1]) * factor
            if last - h.stop <= cfg.PROXIMITY_ATR * dist:
                messages.append(f"{symbol}: prezzo {last:.2f} $ vicino allo stop {h.stop:.2f} $ (entro 1 ATR)")

    state = experiment_state(equity, cfg)
    if state != "ok":
        messages.append(f"Limiti dell'esperimento: stato {state.upper()} (equity {equity:,.0f} $)")

    if broker is not None and not args.dry_run:
        tickets = load_all_tickets(cfg)
        messages += broker.cancel_expired(tickets, now_local(cfg))
        messages += broker.ensure_stops(tickets)

    for m in messages:
        log.warning(m)
    if not messages:
        log.info("Controlli serali: tutto in ordine")
    elif not args.dry_run:
        notifier.send("Controlli serali:\n" + "\n".join(messages))
    return 1 if violations else 0


def backtest_main(argv=None, cfg: Config = CONFIG) -> int:
    parser = argparse.ArgumentParser(description="Backtest della variante A con i benchmark B e C")
    parser.add_argument("--source", default="alpaca", choices=["alpaca", "csv", "synthetic"])
    parser.add_argument("--start", default=cfg.BACKTEST_START, help="inizio dei DATI (serve ~1 anno di riscaldamento)")
    parser.add_argument("--end", default=None)
    parser.add_argument("--no-tax", action="store_true", help="non simulare le imposte")
    args = parser.parse_args(argv)
    _load_env()
    setup(cfg)

    bars = load_bars(args.source, cfg, start=args.start, end=args.end)
    spy = bars[cfg.SIGNAL_SYMBOL]
    test_start = spy.index[0] + pd.Timedelta(days=300)   # riscaldamento per SMA a 200 sedute
    with_tax = not args.no_tax
    results = [run_strategy(bars, cfg, test_start, args.end, with_tax),
               run_benchmark(bars, cfg, test_start, args.end, "index_trend", with_tax),
               run_benchmark(bars, cfg, test_start, args.end, "buy_hold", with_tax)]
    calendar = results[0].equity.index
    split = calendar[int(len(calendar) * cfg.IN_SAMPLE_FRACTION)]
    text = backtest_report(results, cfg, split, args.source)
    print(text)
    stamp = pd.Timestamp.now().strftime("%Y-%m-%d")
    path = write(text, cfg.REPORTS_DIR, f"backtest-{args.source}-{stamp}.md")
    pd.concat({r.name: r.equity for r in results}, axis=1).to_csv(cfg.REPORTS_DIR / f"backtest-{args.source}-{stamp}-equity.csv")
    if not results[0].trades.empty:
        results[0].trades.to_csv(cfg.REPORTS_DIR / f"backtest-{args.source}-{stamp}-trades.csv", index=False)
    log.info("Report salvato in %s", path)
    return 0
