# 02 — Costruisci il tuo AI Day Trader (versione 2, solo paper)

Un percorso: Claude Code + un conto paper Alpaca gratuito. Circa 60–90 minuti di setup, $0 lato
trading. Questa versione corregge i problemi elencati in [`01-analisi-guida-originale.md`](01-analisi-guida-originale.md)
e **prepara il terreno** per un eventuale passaggio al live (guida [`03-da-paper-a-live.md`](03-da-paper-a-live.md)),
ma in questa fase **il live resta bloccato nel codice**.

> ⚠ **Solo paper trading.** Questa guida non piazza mai un trade reale. Le chiavi API non vanno
> mai in documenti o chat. Un periodo di paper, di qualunque durata, non prova che una strategia sia
> profittevole: prova che le regole reggono e che l'impianto funziona. Non è consulenza finanziaria.

---

## 1 · Cosa costruiamo

Un bot Python, scritto da Claude Code, che:

- ogni mattina alle **9:45 ET** (di solito 15:45 in Italia) analizza un universo fisso di 30 titoli/ETF
  liquidi e sceglie fino a 5 candidati;
- entra solo su rottura del massimo dei primi 15 minuti (strategia *opening range breakout*), fino
  alle 11:30 ET;
- opera su un conto simulato con regole rigide **verificate dal codice e da test**:
  rischio ≤ 1% per trade, controvalore ≤ 25% per posizione, rischio aperto totale entro il budget
  giornaliero, kill switch al 2%, stop lato broker su ogni posizione, zero overnight, rispetto della
  regola PDT;
- **salva il proprio stato su disco**, così un riavvio non azzera kill switch e contatori;
- gira **in automatico** come servizio, con uno script di chiusura indipendente come seconda rete
  di sicurezza e notifiche sul telefono;
- produce log, report giornaliero e metriche cumulative (expectancy, profit factor, drawdown);
- include un **backtest** che usa le stesse funzioni di segnale del bot.

---

## 2 · Cosa ti serve

| Voce | Costo | Link |
|---|---|---|
| Conto Alpaca (Paper) — broker simulato, nessun deposito | Gratis | https://app.alpaca.markets/signup |
| Chiavi API paper — generate nella dashboard paper | Gratis | https://docs.alpaca.markets/docs/paper-trading |
| Dati Alpaca Basic — piano gratuito (feed IEX in tempo reale, SIP storico con ritardo) | Gratis | https://docs.alpaca.markets/docs/about-market-data-api |
| Python 3.11+ | Gratis | https://www.python.org/downloads/ |
| Git | Gratis | https://git-scm.com/downloads |
| Claude Code — richiede piano Claude Pro/Max o crediti API | A pagamento | https://docs.claude.com/en/docs/claude-code |
| (Consigliato) piccolo server Linux/VPS per l'automazione | ~5–10 €/mese | qualsiasi provider |
| (Opzionale) bot Telegram per le notifiche | Gratis | https://core.telegram.org/bots |

✅ L'unica voce obbligatoria a pagamento è Claude Code. Il server è consigliato perché un bot
"automatico" su un portatile che va in standby non è automatico.

---

## 3 · Setup passo per passo

### Passo 1 — Conto e chiavi paper
Crea l'account Alpaca, nella dashboard passa a **Paper** e clicca **Generate API keys**. Copia chiave
e secret in un password manager. Non incollarle in documenti, chat o prompt — **nemmeno a Claude Code**.

### Passo 2 — Scegli il saldo paper (importante)
Alpaca parte con $100.000 paper; dalla dashboard puoi resettare o creare un conto paper con il saldo
che vuoi. **Imposta il saldo uguale al capitale che pensi di usare davvero in live.** Due casi:

- **Capitale previsto < $25.000** → la regola PDT (se ancora in vigore quando leggi, verifica)
  limita il bot a **3 day trade ogni 5 giorni lavorativi**. Il bot v2 la rispetta, ma il campione di
  trade crescerà lentamente: metti in conto molti mesi di test.
- **Capitale previsto ≥ $25.000** → nessun limite PDT, ma mantieni sempre un margine sopra la soglia
  (una perdita che ti porta sotto $25.000 riattiva il limite).

Gli esempi di questa guida usano $10.000 come l'originale.

### Passo 3 — Cartella del progetto e git
Se hai clonato questo repository sei già a posto (contiene `.gitignore`, `.env.example` e
`.claude/settings.json`). Altrimenti:

```bash
mkdir ai-day-trader && cd ai-day-trader && git init
```

### Passo 4 — Ambiente Python e dipendenze

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install alpaca-py python-dotenv pandas pytest
pip freeze > requirements.txt
```

**Windows (PowerShell)**
```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install alpaca-py python-dotenv pandas pytest
pip freeze > requirements.txt
```

> Ogni volta che apri un nuovo terminale devi riattivare il venv (`source .venv/bin/activate` oppure
> `.venv\Scripts\Activate.ps1`). `requirements.txt` blocca le versioni: in futuro reinstalli con
> `pip install -r requirements.txt` e ottieni esattamente lo stesso ambiente.

### Passo 5 — File `.env` con le chiavi (resta sul tuo computer)

Copia il modello e modificalo con un editor di testo:

```bash
cp .env.example .env        # Windows: Copy-Item .env.example .env
chmod 600 .env              # solo macOS/Linux: leggibile solo dal tuo utente
```

Contenuto atteso (vedi [`.env.example`](../.env.example)):

```
APCA_API_KEY_ID=la-tua-chiave-paper
APCA_API_SECRET_KEY=il-tuo-secret-paper
TRADING_MODE=paper
STARTING_EQUITY=10000
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Verifica che `.env` sia ignorato da git: `git check-ignore .env` deve stampare `.env`.

### Passo 6 — Impedisci a Claude Code di leggere `.env`
Il file [`.claude/settings.json`](../.claude/settings.json) di questo repository contiene regole
`deny` che impediscono a Claude Code di leggere `.env` e i file di segreti. Se parti da zero, crealo
con lo stesso contenuto. È una mitigazione, non una garanzia assoluta: la vera protezione è che
**sulla macchina di sviluppo esistano solo chiavi paper** (le chiavi live vivranno solo sul server,
vedi 03 §5.3).

### Passo 7 — Installa e avvia Claude Code nella cartella
Installa Claude Code seguendo la guida ufficiale (link in §2), poi:

```bash
claude
```

### Passo 8 — Incolla il prompt di costruzione della sezione 4.

---

## 4 · Il prompt di costruzione per Claude Code (v2)

> Copia tutto il blocco e incollalo in Claude Code. È lungo di proposito: ogni riga chiude una falla
> della versione originale.

```text
Costruisci in questa cartella un bot di day trading in Python che opera SOLO sul conto PAPER di
Alpaca. Sono un principiante: spiegami le scelte in modo semplice. Usa alpaca-py, python-dotenv,
pandas e pytest (già installati). Le credenziali sono in .env e vanno lette solo dal codice con
python-dotenv: non aprire, leggere, stampare, loggare o copiare mai le chiavi, e non scriverle in
nessun file.

ARCHITETTURA (un file = una responsabilità)
- config.py      tutte le costanti con nome (elencate sotto) + universo di 30 simboli modificabile.
- risk.py        funzioni PURE (nessuna rete): sizing, budget di rischio, kill switch, gate PDT,
                 validazione stop.
- strategy.py    funzioni PURE di segnale (opening range, volume relativo, filtri, breakout),
                 usate SIA dal bot SIA dal backtest.
- scanner.py     costruzione della watchlist usando strategy.py.
- broker.py      l'UNICO file che parla con Alpaca. Ogni ordine passa da una sola funzione
                 submit_bracket() che verifica paper, stop presente, limiti di rischio, e usa un
                 client_order_id deterministico.
- state.py       stato persistente in state/AAAA-MM-GG.json, scrittura atomica (file temporaneo
                 + rename) dopo ogni evento.
- notifier.py    notifiche Telegram se TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID sono presenti in .env,
                 altrimenti solo log. Un errore di notifica non deve mai fermare il bot.
- bot.py         servizio a lunga durata: dorme quando il mercato è chiuso, lavora quando è aperto.
- flatten.py     script INDIPENDENTE da bot.py: cancella tutti gli ordini e chiude tutte le
                 posizioni. Opzione --if-near-close: agisce solo se mancano ≤ 8 minuti alla
                 chiusura della seduta (orario dal clock/calendar Alpaca).
- backtest.py    backtest su barre storiche con le funzioni di strategy.py e risk.py.
- report.py      report giornaliero e metriche cumulative.
- README.md      come avviare, fermare, resettare, leggere i report, in linguaggio semplice.
Tutti gli orari in America/New_York con zoneinfo: mai usare l'ora locale del computer.

COSTANTI (config.py)
RISK_PER_TRADE=0.01, DAILY_LOSS_LIMIT=0.02, MAX_POSITIONS=3, MAX_POSITION_PCT=0.25,
MAX_GROSS_EXPOSURE_PCT=1.0, MIN_STOP_PCT=0.003, MAX_STOP_PCT=0.015, REWARD_RISK=2.0,
ENTRY_BUFFER_PCT=0.001, ENTRY_TIMEOUT_MIN=5, SCAN_TIME="09:45", ENTRY_CUTOFF="11:30",
FLATTEN_MINUTES_BEFORE_CLOSE=10, RVOL_MIN=1.5, BREAKOUT_VOL_MULT=1.2, GAP_MAX_PCT=0.05,
OR_RANGE_MIN_PCT=0.003, OR_RANGE_MAX_PCT=0.03, MIN_PRICE=10, MAX_SPREAD_PCT=0.003,
MAX_DATA_AGE_SEC=90, MAX_ORDERS_PER_DAY=10, MAX_CONSECUTIVE_LOSSES=3, SLIPPAGE=0.0005,
EQUITY_DRIFT_MAX=0.20, RISK_CHECK_SEC=20, DATA_FEED="iex", PDT_EQUITY_THRESHOLD=25000,
PDT_MAX_DAYTRADES=3.

REGOLE DI SICUREZZA — NEL CODICE, CIASCUNA CON ALMENO UN TEST
1. MODALITÀ. Leggi TRADING_MODE da .env. In questa build l'unico valore accettato è "paper":
   qualsiasi altro valore (anche mancante) → rifiuta di partire con
   "Live trading is disabled in this build." TradingClient sempre con paper=True. All'avvio leggi
   l'account e verifica che sia un conto paper (su Alpaca l'account_number paper inizia
   tipicamente con "PA": verifica questa ipotesi e dimmelo). Non deve esistere alcun percorso di
   codice verso un endpoint live.
2. CONTROLLO EQUITY. All'avvio confronta l'equity reale con l'equity di chiusura del giorno
   precedente salvata nello stato (o STARTING_EQUITY al primo avvio). Se differisce più di
   EQUITY_DRIFT_MAX, fermati e chiedimi di controllare il conto. Controlla anche
   trading_blocked e account_blocked: se veri, non operare.
3. SIZING CON TETTI. qty = floor(min(
     (RISK_PER_TRADE × equity) / (entry − stop),
     (MAX_POSITION_PCT × equity) / entry,
     (esposizione lorda residua consentita) / entry )).
   Se qty < 1 → SKIP con motivo. Mai leva, mai buying power margin: il controvalore totale delle
   posizioni non supera MAX_GROSS_EXPOSURE_PCT × equity.
4. BUDGET DI RISCHIO GIORNALIERO. Perdita consentita = DAILY_LOSS_LIMIT × equity di inizio
   giornata (salvata nello stato alla prima esecuzione del giorno, MAI ricalcolata dopo un
   riavvio). Un nuovo trade è permesso solo se:
   perdita già subita oggi + rischio pianificato delle posizioni aperte + rischio del nuovo trade
   ≤ perdita consentita.
5. KILL SWITCH. Ogni RISK_CHECK_SEC secondi calcola P&L realizzato + non realizzato del giorno.
   Se la perdita ≥ DAILY_LOSS_LIMIT × equity di inizio giornata: cancella tutti gli ordini,
   chiudi tutte le posizioni (close_all_positions con cancel_orders=True), scrivi KILL_SWITCH nel
   log, invia notifica, salva il flag nello stato e rifiuta nuove entrate fino alla sessione
   successiva, anche dopo un riavvio. Documenta che il controllo è periodico e che gli stop sono
   ordini a mercato: la perdita effettiva può superare leggermente il 2%.
6. ORDINI. Ogni entrata è un bracket order (OrderClass.BRACKET) con entrata LIMIT al livello di
   breakout × (1 + ENTRY_BUFFER_PCT), stop_loss e take_profit, time_in_force DAY,
   client_order_id = "AAAAMMGG-SIMBOLO-entry". Se non eseguito entro ENTRY_TIMEOUT_MIN → cancella.
   Gestisci i riempimenti parziali leggendo la quantità reale della posizione. Riprova solo gli
   errori di rete, max 3 volte con backoff, e prima di riprovare controlla se l'ordine con quel
   client_order_id esiste già (niente duplicati).
7. RICONCILIAZIONE. All'avvio e a ogni ciclo: ogni posizione aperta deve avere un ordine di stop
   attivo lato broker. Se manca → crea uno stop al livello salvato nello stato (o MAX_STOP_PCT sotto
   il prezzo corrente se sconosciuto), e se non ci riesci chiudi la posizione; in ogni caso
   notifica. Ordini che non riconosci → log e notifica. Posizioni trovate a inizio giornata
   (overnight) → violazione: proteggi, chiudi, notifica.
8. LIMITI. Max MAX_POSITIONS posizioni. Solo long. Niente opzioni, crypto, short, leva.
   Max MAX_ORDERS_PER_DAY ordini di entrata al giorno. Dopo MAX_CONSECUTIVE_LOSSES perdite di fila
   nella giornata, nessuna nuova entrata.
9. PDT. Prima di ogni entrata leggi daytrade_count, pattern_day_trader ed equity dall'account.
   Ogni trade di questo bot è un day trade. Se equity < PDT_EQUITY_THRESHOLD e
   daytrade_count ≥ PDT_MAX_DAYTRADES → nessuna entrata, log "SKIP PDT". Se un ordine viene
   rifiutato per PDT, non riprovarlo. Dimmi se, secondo la documentazione attuale di Alpaca, la
   regola PDT è ancora in vigore e come si applica al conto paper.
10. ORARI. Usa clock e calendar di Alpaca. Nessuna entrata prima di SCAN_TIME né dopo
    ENTRY_CUTOFF. Flatten a (chiusura effettiva della seduta − FLATTEN_MINUTES_BEFORE_CLOSE):
    deve funzionare anche nelle giornate a chiusura anticipata e non fare nulla nei giorni festivi.
11. QUALITÀ DEI DATI. Non entrare se l'ultimo dato ha più di MAX_DATA_AGE_SEC secondi, se lo
    spread bid/ask supera MAX_SPREAD_PCT o se il simbolo risulta sospeso. Log del motivo.
12. ERRORI. Nessuna eccezione deve terminare il servizio in silenzio: log + notifica. Se il ciclo
    fallisce 3 volte di fila con posizioni aperte → esegui il flatten e smetti di aprire posizioni
    per la giornata.
13. SEGNALI DI SISTEMA. Su SIGINT/SIGTERM il bot salva lo stato ed esce senza lasciare ordini
    di entrata pendenti (le posizioni restano protette dai loro stop).

STRATEGIA (opening range breakout, parametri solo in config.py)
- DATI: usa DATA_FEED sia per i dati di oggi sia per la baseline storica, così il confronto è
  omogeneo. Prima di scrivere codice dimmi i limiti del piano gratuito (feed, ritardi, storico,
  rate limit) e come li gestisci.
- SCAN (SCAN_TIME, 9:45 ET): per ogni simbolo dell'universo calcola
  OR_high, OR_low, OR_volume sulla finestra 9:30–9:45;
  RVOL = OR_volume di oggi / media di OR_volume degli ultimi 20 giorni di borsa;
  GAP = open di oggi / close di ieri − 1; SMA20 sulle chiusure giornaliere.
  Filtri: prezzo ≥ MIN_PRICE; close delle 9:45 > open delle 9:30; prezzo > SMA20; |GAP| ≤
  GAP_MAX_PCT; ampiezza OR fra OR_RANGE_MIN_PCT e OR_RANGE_MAX_PCT; RVOL ≥ RVOL_MIN.
  Watchlist = top 5 per RVOL. Scrivi watchlist.csv con tutti i valori calcolati e il motivo di
  inclusione/esclusione per ogni simbolo dell'universo.
- ENTRATA (fra SCAN_TIME ed ENTRY_CUTOFF): quando una barra da 1 minuto CHIUDE sopra OR_high con
  volume ≥ BREAKOUT_VOL_MULT × (OR_volume / 15). Una sola entrata per simbolo al giorno
  (registrata nello stato).
- STOP: OR_low, con distanza dall'entrata limitata fra MIN_STOP_PCT e MAX_STOP_PCT.
- TARGET: REWARD_RISK × distanza dello stop.
- USCITA: solo stop, target, kill switch, flatten di fine giornata.
- COSTI: commissioni $0 ma nel P&L simulato sottrai SLIPPAGE per lato. Registra anche lo
  slippage REALE: differenza fra prezzo del segnale e prezzo eseguito, in basis point.

BACKTEST (backtest.py)
- Usa le stesse funzioni di strategy.py e risk.py (nessuna logica duplicata) su barre da 1 minuto
  dello stesso feed, almeno 12 mesi se disponibili.
- Nessun lookahead: in ogni istante usa solo dati già disponibili in quell'istante.
- Stop e target nella stessa barra → assumi che venga colpito prima lo stop (ipotesi prudente).
- Applica costi, tetti di sizing, max posizioni, kill switch e (opzione --pdt) il vincolo PDT.
- Dividi in in-sample (primi 2/3) e out-of-sample (ultimo 1/3) e mostra le metriche separate.
- Output: numero di trade, win rate, media R, expectancy in R e $, profit factor, max drawdown,
  risultato togliendo i 2 trade migliori, confronto con buy-and-hold SPY nello stesso periodo.

LOG E REPORT
- logs/events.log (con rotazione): ogni decisione, SKIP con motivo, errore, con timestamp ET.
- logs/orders.csv: ogni evento d'ordine (inviato, eseguito, parziale, cancellato, rifiutato).
- logs/trades.csv: un round-trip per riga: data, simbolo, qty, ora/prezzo entrata, ora/prezzo
  uscita, stop, target, rischio pianificato $, R multiplo, P&L lordo, costi simulati, P&L netto,
  motivo di uscita, prezzo del segnale, slippage reale in bp.
- report.py genera reports/AAAA-MM-GG.md: equity iniziale e finale, P&L netto, numero di trade,
  win rate, trade peggiore, kill switch sì/no, entrate saltate per PDT, e metriche CUMULATIVE
  (trade totali, expectancy in R, profit factor, max drawdown, win rate con intervallo di
  confidenza al 95%). Sezione RULE VIOLATIONS calcolata AUTOMATICAMENTE confrontando log e stato
  del broker: ogni posizione aveva uno stop? rischio ≤ limite? posizioni ≤ max? nessuna posizione
  dopo l'orario di flatten? nessun overnight? nessun ordine duplicato? Deve dire NONE o elencare
  ogni violazione. Aggiungi una riga a reports/summary.csv.

TEST (tests/, nessuna chiamata di rete, broker simulato con mock)
Devono dimostrare almeno che: il sizing non supera mai né l'1% di rischio né il 25% di
controvalore né l'esposizione lorda; uno stop più vicino di MIN_STOP_PCT viene allargato; il budget
di rischio blocca il trade che lo sforerebbe; il kill switch scatta esattamente al 2% e non
all'1,99%; il flag del kill switch sopravvive al riavvio (stato ricaricato da disco); il gate PDT
blocca la 4ª entrata; un ordine senza stop viene rifiutato da broker.py; TRADING_MODE diverso da
"paper" impedisce l'avvio; un retry non duplica l'ordine; i segnali di strategy.py non usano dati
futuri; le giornate a chiusura anticipata anticipano il flatten.

PROCESSO
1. Prima di scrivere codice: elenca le tue ipotesi e i limiti del piano dati gratuito; poi procedi.
2. Scrivi il codice, esegui "python -m pytest -q" e mostrami che tutti i test passano.
3. Esegui il backtest e mostrami i risultati così come sono, senza abbellirli. Se la strategia
   perde in out-of-sample dimmelo chiaramente.
4. Esegui "python bot.py --dry-run": fa tutto tranne inviare ordini; mostrami watchlist e cosa
   avrebbe fatto (WOULD BUY ... stop ... target ... qty ... rischio $ ...).
5. Non inviare nessun ordine finché non scrivo: START PAPER TRADING.
6. Dammi i comandi esatti per: avviare il bot, fermarlo, eseguire il flatten manuale, generare il
   report, lanciare il backtest, resettare log e stato per un nuovo test.
7. Crea deploy/bot-trader.service, deploy/flatten-guard.service e deploy/flatten-guard.timer
   (systemd) e spiegami come installarli su un server Linux.

Non inventare dati di mercato, risultati o performance. Se qualcosa non si può fare con il piano
dati gratuito, dimmelo e proponi la soluzione più semplice.
```

---

## 5 · Primo test e come capire se funziona

1. **Test** (devono passare tutti):
   ```bash
   python -m pytest -q
   ```
2. **Backtest** — leggilo con occhio critico (vedi §7). Se in out-of-sample la strategia perde dopo
   i costi, non ha senso proseguire con il paper: cambia strategia *prima*.
   ```bash
   python backtest.py
   ```
3. **Dry run** (nessun ordine):
   ```bash
   python bot.py --dry-run
   ```
   Durante la seduta vedrai la watchlist e righe `WOULD BUY …`; fuori orario `MARKET CLOSED`.
4. In un giorno di borsa scrivi a Claude Code `START PAPER TRADING`, poi avvia il bot:
   ```bash
   python bot.py
   ```
5. **Controlli di fine giornata** (tutti devono essere veri):
   - ☐ Dashboard Alpaca → Paper → Orders: ogni entrata è un bracket con gamba di stop.
   - ☐ `logs/trades.csv`: ogni trade ha stop, rischio pianificato ≤ $100 (1% di $10.000) e
     controvalore ≤ $2.500.
   - ☐ Nessuna posizione aperta dopo la chiusura.
   - ☐ `reports/AAAA-MM-GG.md` esiste e dice `RULE VIOLATIONS: NONE`.
6. **Prove di emergenza** (fallo almeno una volta in paper, durante la seduta, con una posizione aperta):
   - ☐ Uccidi il processo (`kill -9`) e riavvialo: stato ricaricato, nessun ordine duplicato,
     posizione ancora protetta.
   - ☐ Esegui `python flatten.py`: ordini cancellati, posizioni chiuse.
   - ☐ Stacca la rete per 2 minuti: il bot registra l'errore, notifica, riprende.
   - ☐ Simula il kill switch abbassando temporaneamente `DAILY_LOSS_LIMIT` (solo in paper!) e
     verifica che dopo il riavvio non riapra posizioni.

**Fermare il bot:** Ctrl+C (o `systemctl stop bot-trader` sul server). Le posizioni restano protette
dai loro stop; per chiudere tutto subito usa `python flatten.py`.

---

## 6 · Automazione (già in paper)

Il bot deve girare in automatico **già durante il paper**: è l'unico modo di testare davvero ciò che
farai in live. Soluzione consigliata: un piccolo server Linux (VPS) con `systemd`.

- `bot-trader.service` — servizio sempre attivo con `Restart=on-failure`; il bot dorme a mercato
  chiuso e si attiva da solo.
- `flatten-guard.timer` — ogni minuto nei giorni feriali fra le 12:00 e le 16:10 ET esegue
  `flatten.py --if-near-close`: se per qualunque motivo il bot non ha chiuso le posizioni, lo fa lui.
- Heartbeat + notifiche: il bot notifica avvio, entrate, uscite, kill switch ed errori.

La configurazione completa (unità systemd, utente dedicato, heartbeat, sicurezza del server) è in
[`03-da-paper-a-live.md`](03-da-paper-a-live.md) §5. Su un computer personale è accettabile per i
primi giorni, purché con standby disattivato durante la seduta (15:30–22:00 in Italia, 14:30–21:00
nelle settimane in cui l'ora legale USA ed europea non coincidono).

---

## 7 · Routine e valutazione

**Ogni giorno (5–10 minuti, dopo la chiusura):** leggi il report, verifica `RULE VIOLATIONS: NONE`,
guarda le notifiche di errore. Durante la seduta non fare nulla: il codice applica le regole.

**Ogni settimana:** confronta metriche paper con quelle del backtest; annota qualsiasi anomalia in
`JOURNAL.md`. Puoi incollare il report in Claude Code per un'analisi, ma **non cambiare regole o
parametri durante un periodo di test**: ogni modifica va annotata in `CHANGELOG.md` e fa ripartire il
conteggio (backtest → paper).

**Dopo 7 giorni di borsa** (verifica tecnica, non di profittabilità):

| Risultato | Decisione |
|---|---|
| Zero violazioni, zero errori non gestiti, prove di emergenza superate | Impianto OK → prosegui il paper per raccogliere un campione statistico |
| Qualsiasi violazione di regola o posizione senza stop | **Fermati.** Correggi il bug, aggiungi un test che lo riproduca, riparti da zero |
| Errori ripetuti di dati/API | Riduci universo o frequenza di polling, poi riparti |

**Il P&L dei primi 7 giorni non conta** in nessuna direzione. Il vero "cancello" per il live richiede
mesi e centinaia di trade: criteri completi in [`03-da-paper-a-live.md`](03-da-paper-a-live.md) §2.

---

## 8 · Problemi comuni

| Problema | Soluzione |
|---|---|
| `401 Unauthorized` / `forbidden` | Chiavi del conto sbagliato: generale sotto **Paper** nella dashboard e verifica `.env`. |
| Ordini rifiutati per "pattern day trading" | Limite PDT raggiunto (conto < $25.000). Comportamento atteso: il bot deve registrare `SKIP PDT` e non riprovare. Vedi §3 passo 2. |
| Ordini rifiutati per "insufficient buying power" | Il sizing ignora un tetto: è un bug (regola 3). Aggiungi un test che lo riproduca. |
| Nessun trade per giorni | Spesso corretto: nessun simbolo ha superato i filtri. Controlla i motivi in `watchlist.csv` e gli `SKIP` in `logs/events.log`. |
| Errori di dati o barre mancanti | Il piano gratuito ha limiti: verifica `DATA_FEED="iex"`, riduci l'universo o la frequenza di polling. |
| `No module named pytest` | Venv non attivo o pytest non installato: riattiva il venv e `pip install -r requirements.txt`. |
| Orari sbagliati di un'ora | Il codice usa l'ora locale invece di `America/New_York`: è un bug. |

Link: Alpaca paper trading https://docs.alpaca.markets/docs/paper-trading · alpaca-py https://pypi.org/project/alpaca-py/ ·
Alpaca market data https://docs.alpaca.markets/docs/about-market-data-api · Claude Code https://docs.claude.com/en/docs/claude-code
