# bot-trader

Materiale per costruire con Claude Code un bot di day trading su Alpaca, testarlo in paper e —
solo dopo un periodo di test serio e criteri scritti in anticipo — passare al denaro reale con
operatività automatica.

> ⚠ Non è consulenza finanziaria, legale o fiscale. Il trading automatico può far perdere tutto il
> capitale impiegato. Le chiavi API non vanno mai in git, in documenti o in chat.

## Documenti

| File | Contenuto |
|---|---|
| [`docs/01-analisi-guida-originale.md`](docs/01-analisi-guida-originale.md) | Analisi della guida "Build Your AI Day Trader — Quick Setup": punti forti, punti deboli (critici / importanti / minori) e dove sono stati corretti. |
| [`docs/02-guida-setup-paper-v2.md`](docs/02-guida-setup-paper-v2.md) | Guida migliorata, solo paper: setup per macOS/Linux e Windows, prompt di costruzione v2 per Claude Code, verifiche, prove di emergenza, automazione, valutazione. |
| [`docs/03-da-paper-a-live.md`](docs/03-da-paper-a-live.md) | Guida dettagliata al passaggio paper → live automatico: fasi, criteri quantitativi, PDT, dati, costi, lucchetti nel codice, server e systemd, runbook, circuit breaker, incidenti, fiscalità per residenti in Italia. |
| [`docs/04-fattibilita-italia-dati-piattaforme.md`](docs/04-fattibilita-italia-dati-piattaforme.md) | Fattibilità reale per una persona fisica residente in Italia (entità Alpaca, fine della regola PDT, ETF USA e PRIIPs, valuta, fisco), limiti del feed dati gratuito e impatto sulla strategia, confronto delle piattaforme compatibili (Alpaca, Interactive Brokers, Directa, BG Saxo, Trading 212). |

## File di supporto

- `.env.example` — modello del file delle chiavi (paper). Copialo in `.env`.
- `.gitignore` — esclude segreti, log, stato e report.
- `.claude/settings.json` — impedisce a Claude Code di leggere `.env` e i file di segreti.

## Percorso consigliato

1. Leggi `01` per capire cosa cambia rispetto alla guida originale.
2. Segui `02` per costruire il bot e testarlo in paper (backtest → paper supervisionato → paper automatico).
3. Se risiedi in Italia, leggi `04` prima di aprire un conto reale: fattibilità, dati e scelta del broker.
4. Solo quando tutte le caselle di `03` §2.3 sono spuntate, segui `03` per il live a fasi.
