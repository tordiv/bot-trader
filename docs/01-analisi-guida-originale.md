# 01 — Analisi della guida originale "Build Your AI Day Trader — Quick Setup"

> Questo documento analizza la guida originale (Claude Code + conto paper Alpaca, 45 minuti, $0),
> ne elenca i punti forti e i punti deboli e, per ogni debolezza, indica la correzione applicata
> nella versione migliorata ([`02-guida-setup-paper-v2.md`](02-guida-setup-paper-v2.md)) o nella guida
> al passaggio al live ([`03-da-paper-a-live.md`](03-da-paper-a-live.md)).
>
> ⚠ Niente di quanto segue è consulenza finanziaria o fiscale.

---

## Verdetto in breve

La guida originale è **ottima come impostazione di sicurezza** (paper only, regole scritte nel codice,
kill switch, bracket order, test, dry-run, frase di conferma esplicita) ma **fragile come progetto di
trading reale**. Contiene alcuni problemi che in paper passano inosservati e che in live costano denaro:

1. **I vincoli del conto non sono considerati.** Quando la guida è stata scritta, la regola PDT
   (Pattern Day Trader) bloccava un conto da $10.000 dopo 3 day trade in 5 giorni, anche in paper, e
   la guida non la cita. La regola è stata poi eliminata (su Alpaca dal 4 giugno 2026, vedi
   [04 §1.3](04-fattibilita-italia-dati-piattaforme.md)), ma il difetto di fondo resta: il bot
   presume invece di leggere dall'API cosa il conto gli permette.
2. **Il dimensionamento delle posizioni non ha un tetto al controvalore**: con uno stop stretto la
   formula chiede più azioni di quante il conto possa comprare (cioè leva), contraddicendo la regola
   "no leverage".
3. **La tempistica della strategia è incoerente**: lo scan è alle 9:35 ma usa la prima barra da 15
   minuti, che finisce alle 9:45; il "volume relativo" confronta 5 minuti di oggi con la media di
   giornate intere.
4. **Nessuno stato persistente**: se il bot si riavvia dimentica il kill switch, i simboli già
   tradati e l'equity di inizio giornata; può anche inviare ordini duplicati.
5. **Non è automatico**: va lanciato a mano ogni mattina da un portatile; se il processo muore gli
   stop "DAY" scadono alla chiusura e la posizione resta aperta overnight senza protezione.
6. **Il criterio di valutazione è statisticamente debole**: "P&L positivo dopo 7 giorni" non dice
   nulla. Manca un backtest e mancano metriche come expectancy, profit factor e drawdown.

---

## Punti forti

| # | Punto forte | Perché è importante |
|---|---|---|
| F1 | **Paper only, costo $0** lato trading | Si impara l'intera catena (dati → segnale → ordine → log → report) senza rischiare nulla. |
| F2 | **Regole di rischio "nel codice, non nei commenti"** | È il principio più importante di tutto il trading automatico: una regola che non è verificata dal codice non esiste. |
| F3 | **Un solo modulo parla col broker (`broker.py`)** con asserzioni (paper, stop presente) | Crea un unico punto di controllo: tutte le garanzie si verificano in un posto solo. |
| F4 | **Bracket order con stop lato broker** | Lo stop vive sul server del broker, non nel tuo processo: se il bot muore, lo stop resta attivo (fino alla scadenza dell'ordine). |
| F5 | **Kill switch giornaliero al 2%** | Limita il danno di una giornata anomala o di un bug. |
| F6 | **Rischio fisso per trade (1%)** con formula esplicita | Dimensionamento corretto in linea di principio (va solo aggiunto un tetto al controvalore). |
| F7 | **Chiusura prima della fine della seduta, niente overnight** | Elimina il rischio gap notturno, coerente con una strategia intraday. |
| F8 | **Unit test obbligatori su `risk.py`** e funzioni pure | Rende verificabili le regole più critiche. |
| F9 | **Modalità `--dry-run` e frase `START PAPER TRADING`** | Separano "costruire" da "eseguire": nessun ordine parte per sbaglio. |
| F10 | **Slippage simulato (0,05% per lato)** | Almeno una stima dei costi reali: molte guide la omettono. |
| F11 | **Sezione RULE VIOLATIONS nel report** | Obbliga a controllare le regole ogni giorno, non solo il P&L. |
| F12 | **Chiavi fuori da documenti e chat, `.env` in `.gitignore`** | Buona igiene di base dei segreti. |
| F13 | **"Non inventare dati" + elenco delle ipotesi prima del codice** | Riduce il rischio che l'AI "allucini" risultati o capacità del piano dati gratuito. |
| F14 | **Onestà intellettuale**: "7 giorni non provano la profittabilità" | Imposta aspettative corrette. |
| F15 | **"Nessun trade è spesso il comportamento corretto"** | Evita che il principiante forzi il sistema. |
| F16 | **"Non cambiare le regole durante il test"** | Evita l'overfitting in corsa. |

---

## Punti deboli

Classificati per gravità. **Critico** = può causare perdite reali, blocchi del conto o risultati
completamente fuorvianti. **Importante** = degrada seriamente l'affidabilità. **Minore** = rifinitura.

### Critici

#### C1 — Vincoli del conto (PDT, margine, strumenti negoziabili) non considerati
- **Problema (all'epoca della guida).** Negli USA un conto *margin* con equity sotto $25.000 poteva
  fare al massimo 3 day trade in 5 giorni lavorativi, e Alpaca applicava il controllo anche ai conti
  paper. Ogni trade di questo bot è per costruzione un day trade: con $10.000 il bot avrebbe fatto
  circa 3 trade a settimana e dal 4° avrebbe ricevuto ordini rifiutati che la guida non spiega.
- **Situazione a settembre 2026.** La SEC ha approvato l'eliminazione della regola PDT; FINRA l'ha resa
  efficace dal 4 giugno 2026 con un periodo transitorio per i broker fino al 20 ottobre 2027. Alpaca
  applica il nuovo *Intraday Margin Framework* dal 4 giugno 2026: niente conteggio dei day trade, niente
  minimo di $25.000 (dettagli in [04 §1.3](04-fattibilita-italia-dati-piattaforme.md)). Altri broker
  potrebbero adeguarsi più tardi.
- **Perché resta un punto critico.** Il bot deve comunque **leggere dall'API** cosa il conto gli
  permette invece di presumerlo: stato del conto (`trading_blocked`, `account_blocked`), eventuali
  vincoli di day trading ancora presenti su altri broker, e — per un residente UE — quali strumenti
  sono davvero negoziabili (molti ETF USA possono essere bloccati dal regolamento PRIIPs, 04 §1.4).
- **Correzione.** Il bot v2 controlla stato del conto e negoziabilità di ogni simbolo all'avvio,
  tratta ogni rifiuto per motivi di margine o day trading come errore bloccante (nessun retry) e ha un
  gate PDT configurabile (`PDT_GATE_ENABLED`), disattivato per Alpaca e da riattivare solo su un
  broker che applichi ancora la vecchia regola.

#### C2 — Dimensionamento senza tetto al controvalore (leva implicita)
- **Problema.** `qty = (1% equity) / (entry − stop)`. Con $10.000, rischio $100, titolo da $200 e
  stop allo 0,3% ($0,60) → 166 azioni = **$33.200** di controvalore, 3,3 volte il conto.
- **Conseguenza.** L'ordine viene rifiutato (buying power insufficiente) oppure, su conto margin, usa
  leva — in contraddizione con la regola 6 "no leverage". Con 3 posizioni il problema si moltiplica.
- **Correzione.** Tre limiti aggiuntivi: distanza minima dello stop (`MIN_STOP_PCT`), controvalore
  massimo per posizione (`MAX_POSITION_PCT`, es. 25% dell'equity) ed esposizione lorda totale
  ≤ 100% dell'equity. La quantità è il **minimo** fra i tre calcoli; se è < 1 il trade viene saltato.

#### C3 — Tempistica e definizioni della strategia incoerenti
- **Problema.**
  - Lo scan alle 9:35 usa "la prima barra da 15 minuti", che si completa alle 9:45.
  - Il volume relativo alle 9:35 confrontato con la media *giornaliera* a 20 giorni è sempre
    bassissimo e non ordina nulla di utile: bisogna confrontare lo stesso intervallo orario.
  - Il "gap %" viene calcolato ma non usato in nessun filtro.
  - "Volume sopra la media" in entrata non è definito (media di cosa?).
  - Non c'è un orario limite per le nuove entrate: un breakout alle 15:40 ha 10 minuti di vita.
- **Correzione.** Scan alle 9:45 ET, volume relativo = volume 9:30–9:45 di oggi / media dello stesso
  intervallo nei 20 giorni precedenti (stesso feed dati), filtro sul gap, definizioni numeriche per
  ogni soglia, finestra di entrata 9:45–11:30 ET.

#### C4 — Rischio aggregato superiore al kill switch; kill switch non "istantaneo"
- **Problema.** 3 posizioni × 1% = 3% di rischio pianificato aperto, maggiore del limite giornaliero
  del 2%. Inoltre il loop gira una volta al minuto: il kill switch scatta al primo controllo *dopo*
  il superamento, non "nell'istante". Gli stop sono ordini a mercato: in un movimento veloce l'uscita
  può avvenire ben oltre il prezzo di stop.
- **Correzione.** Regola di **budget di rischio residuo**: la somma del rischio pianificato delle
  posizioni aperte più quello del nuovo trade non può superare la perdita ancora consentita nella
  giornata. Controllo del rischio ogni 15–20 secondi (sotto i limiti di rate dell'API) e
  documentazione esplicita che il kill switch è una rete di sicurezza, non una garanzia.

#### C5 — Nessuno stato persistente, nessuna idempotenza
- **Problema.** Kill switch, "una entrata per simbolo al giorno" ed equity di inizio giornata vivono
  in memoria. Dopo un crash o un Ctrl+C e riavvio il bot può: riprendere a tradare dopo il kill
  switch, rientrare sullo stesso simbolo, ricalcolare l'equity di partenza sul valore già in perdita
  (spostando la soglia del 2%). Senza `client_order_id` deterministico, un retry di rete può
  duplicare un ordine.
- **Correzione.** `state/AAAA-MM-GG.json` scritto in modo atomico dopo ogni evento; `client_order_id`
  derivato da data+simbolo+tipo; riconciliazione con il broker a ogni avvio e a ogni ciclo.

#### C6 — "Automatico" solo a metà, e con un buco di protezione
- **Problema.** Il bot va avviato a mano alle 9:25 ET (15:25 in Italia) da un portatile, che può
  andare in standby o perdere la rete. Se il processo muore con posizioni aperte, gli ordini bracket
  con durata `DAY` **scadono alla chiusura**: la posizione resta aperta overnight senza stop. La
  guida dice solo "chiudile dalla dashboard".
- **Correzione.** Già in paper: servizio sempre attivo gestito da `systemd` su un server (VPS),
  riavvio automatico, **script di flatten indipendente** (`flatten.py`) pianificato separatamente,
  heartbeat e notifiche. All'avvio il bot protegge o chiude ogni posizione trovata senza stop.

### Importanti

#### I1 — Nessun backtest prima del paper
Andare direttamente in paper significa aspettare mesi per scoprire che la strategia non ha edge. Un
backtest (con le **stesse funzioni** di segnale usate dal bot, costi inclusi, separazione
in-sample/out-of-sample) scarta in un pomeriggio le idee che non funzionano. **Correzione:**
`backtest.py` obbligatorio; il paper serve a validare *l'esecuzione*, il backtest *l'idea*.

#### I2 — Criteri di valutazione statisticamente inconsistenti
7 giorni con 3–10 trade non distinguono una strategia vincente da una perdente: con uno schema 2:1
servono **centinaia** di trade per separare un edge piccolo dal caso (tabella in 03 §2.2). La tabella
decisionale originale usa solo il segno del P&L. **Correzione:** metriche (expectancy in R, profit
factor, max drawdown, win rate con intervallo di confidenza, rimozione dei 2 trade migliori) e soglie
minime di campione.

#### I3 — Dati IEX: rappresentativi solo in parte
Il piano gratuito usa in tempo reale il feed **IEX**, che copre una piccola frazione del volume
consolidato USA. Volumi, massimi e minimi di barra differiscono da quelli "veri" (SIP). Confrontare
il volume IEX di oggi con una media storica SIP darebbe un volume relativo falso. **Correzione:**
usare **lo stesso feed** sia per oggi sia per la baseline; in live valutare il feed SIP a pagamento
(03 §3.4).

#### I4 — I riempimenti del paper sono ottimistici
Il simulatore paper non modella impatto di mercato, posizione in coda, latenza reale né tutte le
commissioni regolamentari. Lo 0,05% per lato è plausibile su titoli molto liquidi per ordini limite,
meno per stop a mercato in movimenti veloci. **Correzione:** registrare per ogni ordine il prezzo del
segnale e il prezzo eseguito (slippage misurato), e nel live confrontare con un'istanza paper
parallela (03 §8.1).

#### I5 — Tipo di ordine di entrata non specificato
"Compra quando rompe il massimo" con un ordine a mercato dopo la chiusura della barra significa
inseguire il prezzo. **Correzione:** entrata bracket con ordine **limit** a livello di rottura +
piccolo buffer (0,1%), cancellato se non eseguito entro 5 minuti; gestione dei riempimenti parziali.

#### I6 — Casi operativi mancanti
Giornate a orario ridotto (chiusura alle 13:00 ET), festività, fuso orario (il bot deve ragionare in
`America/New_York`, non nell'ora del PC: in Italia il cambio dell'ora legale non coincide con quello
USA per alcune settimane l'anno, e l'apertura passa dalle 15:30 alle 14:30), sospensioni (halt) dei
titoli, limiti di rate dell'API, dati vecchi o spread anomali. **Correzione:** tutti gestiti
esplicitamente nel prompt v2.

#### I7 — Setup incompleto o non funzionante
- `pytest` non viene installato ma il §5 lo usa → `No module named pytest`.
- Il comando `printf` del passo 5 non esiste in PowerShell: su Windows il passo fallisce.
- `.gitignore` viene creato ma il repository git non viene inizializzato.
- Nessun `requirements.txt` con versioni bloccate: fra qualche mese l'SDK può cambiare.
- Non spiega come installare Claude Code né che il venv va riattivato ogni volta.

**Correzione:** setup riscritto per macOS/Linux e Windows separatamente (02 §3).

#### I8 — Claude Code può leggere `.env`
Claude Code, lavorando nella cartella, può leggere qualsiasi file, incluso `.env`. **Correzione:**
regole `deny` in `.claude/settings.json` (incluse in questo repository), permessi `600` su `.env`,
e soprattutto: **le chiavi live non devono mai stare sulla macchina di sviluppo** (03 §5.3).

#### I9 — Report e log con granularità sbagliata
`trades.csv` "una riga per fill" con "result $" è ambiguo: il risultato esiste solo a posizione
chiusa. Mancano drawdown, expectancy, profit factor, R multiplo, confronto con un benchmark.
**Correzione:** `orders.csv` (ogni evento d'ordine) + `trades.csv` (un round-trip per riga) +
metriche cumulative nel report.

#### I10 — Nessuna notifica e nessun heartbeat
Se il bot si blocca alle 10:05 lo scopri la sera. **Correzione:** notifiche (es. Telegram/email)
per avvio, entrate, uscite, kill switch, errori; heartbeat verso un servizio "dead man's switch".

### Minori

| # | Problema | Correzione |
|---|---|---|
| M1 | `APCA_API_BASE_URL` in `.env` non è usato da `alpaca-py` (conta `paper=True`): innocuo ma fuorviante, e in live potrebbe dare un falso senso di controllo. | Variabile `TRADING_MODE` esplicita, verifica del tipo di conto tramite API. |
| M2 | Saldo paper fissato a $10.000 a prescindere. | Impostare il saldo paper **uguale al capitale che userai davvero in live**, così le metriche e i vincoli del conto sono realistici. |
| M3 | "Incolla il report in Claude e chiedi cosa cambiare" ogni sera invita all'overfitting. | Registro delle modifiche (`CHANGELOG.md`); ogni modifica di strategia riparte dal backtest e da un nuovo periodo paper. |
| M4 | Nessun controllo di stato del conto (`trading_blocked`, `account_blocked`). | Controllo all'avvio e a ogni ciclo. |
| M5 | Strategia ORB (opening range breakout) molto nota e affollata; nessuna evidenza di edge. | Il backtest diventa il filtro d'ingresso; la guida lo dichiara apertamente. |
| M6 | Nessun cenno a fiscalità, residenza, valuta per chi opera dall'Italia. | Sezione dedicata in 03 §10. |
| M7 | Il controllo "equity ±20%" non ha senso dopo settimane di test (l'equity cambia). | Confronto con l'equity di chiusura del giorno precedente salvata nello stato, con soglia configurabile. |

---

## Mappa delle correzioni

| Debolezza | Dove è corretta |
|---|---|
| C1 Vincoli del conto | 02 §3 (saldo paper), prompt v2 regola 9, 03 §3.1, 04 §1 |
| C2 Leva implicita | Prompt v2 regola 3 |
| C3 Tempistica | Prompt v2 sezione STRATEGIA |
| C4 Rischio aggregato | Prompt v2 regole 4–5 |
| C5 Stato/idempotenza | Prompt v2 regole 6–7, `state.py` |
| C6 Automazione | 02 §6, 03 §5 |
| I1–I2 Backtest e metriche | Prompt v2 `backtest.py`, 02 §7, 03 §2 |
| I3–I4 Dati e fill | 03 §3.4, §8.1 |
| I5–I6 Ordini e casi operativi | Prompt v2 regole 6, 10–13 |
| I7–I8 Setup e sicurezza | 02 §3, `.claude/settings.json`, 03 §5.3 |
| I9–I10 Report e notifiche | Prompt v2 sezioni LOG/REPORT, `notifier.py` |
