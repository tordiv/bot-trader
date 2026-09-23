"""Report in Markdown: settimanale (ticket e stato del conto) e backtest."""
import math
from pathlib import Path

import pandas as pd

from .config import Config

SURVIVORSHIP = ("⚠ **Bias di sopravvivenza:** l'universo è una lista di aziende scelte oggi, quindi "
                "\"sopravvissute\". Nel passato il risultato della variante A è probabilmente migliore di "
                "quanto sarebbe stato davvero. Diffida di risultati molto migliori dell'indice.")


def _pct(x) -> str:
    return "n/d" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:+.1%}"


def _num(x, digits=2) -> str:
    return "n/d" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:,.{digits}f}"


def weekly_report(asof, cfg: Config, source: str, equity_usd: float, cash_usd: float, holdings: dict,
                  decision, tickets_md: str, rejections: list, violations: list, errors: list,
                  exp_state: str, extra: list = None) -> str:
    equity_eur = equity_usd / cfg.EURUSD
    lines = [
        f"# Report settimanale — dati al {pd.Timestamp(asof).date()}",
        "",
        f"- Posizioni lette da: **{source}**",
        f"- Equity: **{equity_usd:,.2f} $** (≈ {equity_eur:,.0f} € al cambio {cfg.EURUSD}) · liquidità {cash_usd:,.2f} $",
        f"- Filtro di mercato ({cfg.SIGNAL_SYMBOL} sopra SMA{cfg.SMA_DAYS}): "
        f"**{'positivo' if decision.market_ok else 'NEGATIVO: nessun acquisto'}**",
        f"- Limiti dell'esperimento: pausa sotto {cfg.EXPERIMENT_PAUSE_EQUITY_EUR:.0f} €, "
        f"stop sotto {cfg.EXPERIMENT_STOP_EQUITY_EUR:.0f} € → stato **{exp_state.upper()}**",
    ]
    if exp_state == "stop":
        lines.append("- 🛑 **Limite di stop raggiunto: fine della fase live, ritorno al paper.** "
                     "Vengono proposte solo vendite.")
    elif exp_state == "pausa":
        lines.append("- ⏸ **Limite di pausa raggiunto: nessun nuovo acquisto finché non decidi.**")

    lines += ["", "## Posizioni", ""]
    if holdings:
        lines += ["| Simbolo | Quantità | Prezzo medio $ | Stop $ |", "|---|---|---|---|"]
        for h in holdings.values():
            lines.append(f"| {h.symbol} | {h.qty} | {h.entry_price:.2f} | "
                         f"{'**MANCANTE**' if h.stop is None else f'{h.stop:.2f}'} |")
    else:
        lines.append("Nessuna posizione aperta.")

    lines += ["", "## Ticket", "", tickets_md]

    if rejections:
        lines += ["## Candidati scartati", ""]
        lines += [f"- {s}: {why}" for s, why in rejections]
        lines.append("")

    lines += ["## Classifica (primi 10 acquistabili)", "",
              "| Posto | Simbolo | Momentum | Prezzo $ | Stop proposto $ |", "|---|---|---|---|---|"]
    ranked = decision.ranking.dropna(subset=["rank"]).sort_values("rank").head(10)
    for symbol, row in ranked.iterrows():
        stop = row["raw_close"] - cfg.ATR_MULT * row["atr_raw"]
        lines.append(f"| {int(row['rank'])} | {symbol} | {_pct(row['momentum'])} | "
                     f"{row['raw_close']:.2f} | {stop:.2f} |")
    excluded = decision.ranking[~decision.ranking["eligible"]]
    if not excluded.empty:
        lines += ["", "Esclusi: " + "; ".join(f"{s} ({r})" for s, r in excluded["reason"].items())]

    lines += ["", "## RULE VIOLATIONS", ""]
    lines += [f"- {v}" for v in violations] if violations else ["NONE"]
    if errors or (extra or []) or decision.warnings:
        lines += ["", "## Avvisi ed errori da correggere", ""]
        lines += [f"- {e}" for e in list(errors) + list(decision.warnings) + list(extra or [])]
    return "\n".join(lines) + "\n"


def backtest_report(results: list, cfg: Config, split, source: str) -> str:
    from .sim import metrics

    header = ["# Backtest", ""]
    if source == "synthetic":
        header += ["> 🚫 **DATI SINTETICI (casuali).** Questo report verifica solo che il programma funzioni: "
                   "i numeri NON dicono nulla sulla strategia.", ""]
    header += [SURVIVORSHIP, "",
               f"Capitale iniziale {cfg.start_equity_usd:,.0f} $ ({cfg.START_EQUITY_EUR:.0f} € a {cfg.EURUSD}); "
               f"commissioni {cfg.COMMISSION_PER_ORDER_USD:.0f} $ per ordine (A) e "
               f"{cfg.BENCHMARK_COMMISSION_USD:.0f} $ (B, C); slippage {cfg.SLIPPAGE:.1%} per lato; "
               f"imposta {cfg.TAX_RATE:.0%} sulle plusvalenze realizzate (stima).", "",
               "B e C sono **teorici** (SPY con quote frazionarie): servono come metro di paragone.", ""]
    rows = []
    for res in results:
        for label, start, end in (("totale", None, None), ("in-sample", None, split), ("out-of-sample", split, None)):
            m = metrics(res, start, end)
            if not m:
                continue
            rows.append(f"| {res.name} | {label} | {m['inizio']} → {m['fine']} | {_num(m['equity_finale'])} | "
                        f"{_pct(m['CAGR'])} | {_pct(m['max_drawdown'])} | {m['trade']} | {_num(m['trade_anno'], 1)} | "
                        f"{_pct(m['vincenti']) if m['trade'] else 'n/d'} | {_num(m['R_medio'])} | "
                        f"{_num(m['commissioni'], 0)} | {_num(m['imposte'], 0)} |")
    table = ["| Variante | Periodo | Date | Equity finale $ | CAGR | Max drawdown | Trade | Trade/anno | "
             "Vincenti | R medio | Commissioni $ | Imposte $ |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|"] + rows
    notes = []
    for res in results:
        if res.rejections:
            notes.append(f"- {res.name}: {res.rejections} candidati scartati dai limiti di rischio/commissioni")
        notes += [f"- {res.name}: {n}" for n in res.notes]
        eq = res.equity
        pause = eq[eq < cfg.pause_equity_usd]
        if not pause.empty and res.name.startswith("A"):
            notes.append(f"- {res.name}: il limite di PAUSA ({cfg.EXPERIMENT_PAUSE_EQUITY_EUR:.0f} €) "
                         f"sarebbe scattato il {pause.index[0].date()}")
    return "\n".join(header + table + ([""] + notes if notes else [])) + "\n"


def write(text: str, folder: Path, name: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name
    path.write_text(text, encoding="utf-8")
    return path
