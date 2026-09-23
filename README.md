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
| [`docs/05-scenario-personale.md`](docs/05-scenario-personale.md) | Scenario personale: PC Windows sempre acceso, regime amministrato, capitale ~1.000 €/$, niente feed a pagamento. Costi reali Alpaca vs Directa, passaggio a strategie su barre giornaliere, percorso a gradi (paper → segnali con esecuzione manuale su Directa → automazione), configurazione Windows, domande aperte ai broker. |
| [`docs/06-piano-operativo.md`](docs/06-piano-operativo.md) | **Piano operativo scelto**: segnali settimanali su azioni USA con esecuzione manuale su Directa (regime amministrato) e 1.000 €. Perché niente micro futures, numeri delle commissioni, varianti A/B/C da testare in paper, strategia, cancello per il live, routine settimanale e ticket, PC Windows Pro senza UPS, prompt v3 per Claude Code, calendario. |
| [`docs/07-manuale-motore.md`](docs/07-manuale-motore.md) | **Manuale del motore di segnali** (codice in `segnali/`): installazione su Windows, primi passi, fase paper, fase live con registro delle esecuzioni, parametri, cosa dimostrano i test, limiti noti. |

## Motore di segnali (codice)

Implementa il piano di `docs/06`: ogni sabato produce i ticket per la settimana (azioni USA, una
posizione alla volta, stop obbligatorio), ogni sera controlla stop e dati, e durante il test esegue
gli stessi ticket sul conto **paper** Alpaca. Non si collega mai al conto reale.

```powershell
.\windows\install.ps1                          # ambiente, pacchetti, test
python backtest.py --source alpaca              # backtest con dati reali gratuiti
python weekly.py --dry-run --positions none     # ticket di oggi, senza salvare né inviare
```

Istruzioni complete in [`docs/07-manuale-motore.md`](docs/07-manuale-motore.md).

## File di supporto

- `.env.example` — modello del file delle chiavi (paper). Copialo in `.env`.
- `requirements.txt` — pacchetti Python con versioni verificate.
- `ledger/fills.example.csv` — esempio del registro delle esecuzioni manuali.
- `.gitignore` — esclude segreti, log, stato e report.
- `.claude/settings.json` — impedisce a Claude Code di leggere `.env` e i file di segreti.

## Percorso consigliato

1. Leggi `01` per capire cosa cambia rispetto alla guida originale.
2. Segui `02` per costruire il bot e testarlo in paper (backtest → paper supervisionato → paper automatico).
3. Se risiedi in Italia, leggi `04` prima di aprire un conto reale: fattibilità, dati e scelta del broker.
4. Solo quando tutte le caselle di `03` §2.3 sono spuntate, segui `03` per il live a fasi.

> Per lo scenario personale (1.000 €, Directa, esecuzione manuale) il percorso operativo è quello di
> `06`, che sostituisce la strategia intraday di `02`–`03`.
