# 03 — Dal paper al denaro reale: guida dettagliata al passaggio in live automatico

> Questa guida descrive **come** passare, dopo un periodo di test serio, dal conto paper a un conto
> reale con operatività automatica — e soprattutto **quando non farlo**. Presuppone il bot v2 di
> [`02-guida-setup-paper-v2.md`](02-guida-setup-paper-v2.md).
>
> ⚠ **Rischio reale.** Con denaro vero puoi perdere tutto il capitale impiegato, e un bug può far
> perdere più di quanto previsto dalle regole di rischio. La maggior parte delle strategie di day
> trading retail non batte i costi. Niente di questo documento è consulenza finanziaria, legale o
> fiscale: per fiscalità e adempimenti rivolgiti a un commercialista. Usa solo denaro la cui perdita
> totale non cambierebbe la tua vita.

---

## 0 · Tre principi prima di tutto

1. **Il live non è un premio, è la fase successiva dell'esperimento.** Si entra con importi minimi e
   si cresce solo se i numeri lo giustificano. Si torna indietro senza discussioni quando i numeri
   peggiorano.
2. **I criteri si scrivono prima, non dopo.** Le soglie di questa guida vanno copiate in un file
   (`GO_LIVE_CRITERIA.md`) *prima* di guardare i risultati, e non si modificano per "farle passare".
3. **Più lucchetti, non meno.** Ogni automatismo che tocca denaro reale deve avere almeno due
   protezioni indipendenti: una nel bot e una fuori dal bot (lato broker o in un processo separato).

---

## 1 · Mappa delle fasi

| Fase | Obiettivo | Durata minima | Capitale | Rischio/trade | Per uscire serve |
|---|---|---|---|---|---|
| **F0 Backtest** | L'idea ha un edge dopo i costi? | — | — | — | §2.1 superato |
| **F1 Paper supervisionato** | L'impianto funziona? | 2 settimane | saldo paper = capitale live previsto | 1% | 0 violazioni, prove di emergenza superate (02 §5) |
| **F2 Paper automatico su server** | L'edge regge in tempo reale? | 3 mesi **e** campione minimo (§2.2) | idem | 1% | §2.3 tutti ✅ |
| **F3 Preparazione live** | Conto, fisco, infrastruttura, codice | 2–4 settimane (in parallelo a F2) | — | — | checklist §11 parte A |
| **F4 Micro-live** | Il live si comporta come il paper? | 4 settimane **e** ≥ 20 trade | tetto piccolo (es. 20% del previsto) | 0,25% | §7.1 |
| **F5 Live ridotto** | L'edge regge con fill reali? | 2 mesi **e** ≥ 50 trade | 50% | 0,5% | §7.1 |
| **F6 Live pieno** | Operatività a regime | continua | 100% del capitale dedicato | ≤ 1% | revisioni mensili §8 |
| **↩ Ritorno** | Qualcosa non torna | — | — | — | vedi §7.2 |

Con un conto sotto $25.000 soggetto a PDT (3 day trade ogni 5 giorni) le fasi F2, F4 e F5 durano
**molto** di più: 20 trade richiedono circa 7 settimane. È un vincolo reale, non un dettaglio (§3.1).

---

## 2 · Il cancello: quando il paper autorizza il live

### 2.1 Backtest (F0) — criteri minimi
- ☐ ≥ 200 trade simulati su ≥ 12 mesi, costi inclusi.
- ☐ Expectancy **out-of-sample** > 0 dopo i costi, e profit factor OOS ≥ 1,2.
- ☐ Risultato ancora ≥ 0 togliendo i 2 trade migliori.
- ☐ Max drawdown del backtest accettabile per te **in euro** (moltiplicalo per 1,5–2: il live è
  quasi sempre peggio).
- ☐ Nessun parametro "ottimizzato" sull'intero periodo (altrimenti l'OOS non è più OOS).

### 2.2 Quanti trade servono davvero
Per uno schema con target a 2R e stop a 1R (ogni trade vale circa +2R o −1R), la tabella indica
quanti trade servono perché un'expectancy positiva sia distinguibile dal caso (circa 2 errori standard):

| Expectancy reale per trade | Win rate corrispondente | Trade necessari (circa) |
|---|---|---|
| +0,5 R | 50% | ~36 |
| +0,3 R | 43% | ~100 |
| +0,2 R | 40% | ~215 |
| +0,1 R | 37% | ~840 |

Un edge realistico per una strategia intraday retail è nella parte bassa della tabella. Con 100 trade
e win rate osservato del 40%, l'intervallo di confidenza al 95% del win rate va circa dal 30% al 50%:
compatibile sia con una strategia buona sia con una in perdita (il break-even a 2:1 è 33%, più i
costi). **Regola pratica:** non andare in live con meno di 100 trade paper, e considera i risultati
"indicativi" fino a 200+ (sommando backtest coerente e paper).

### 2.3 Checklist del cancello paper → live
Tutte devono essere vere nello stesso momento.

**Affidabilità (non negoziabili)**
- ☐ Ultime 30 sedute consecutive con `RULE VIOLATIONS: NONE`.
- ☐ 100% delle posizioni con stop lato broker per tutta la loro durata.
- ☐ Zero posizioni overnight non volute, zero ordini duplicati.
- ☐ Ultime 20 sedute in automatico **senza interventi manuali** sul server o sul conto.
- ☐ Prove di emergenza (02 §5 punto 6) ripetute **sul server**, e superate.
- ☐ Notifiche e heartbeat testati: hai ricevuto davvero un allarme spegnendo il bot.

**Performance (in paper, dopo i costi simulati)**
- ☐ ≥ 100 trade chiusi (§2.2).
- ☐ Expectancy > 0 e profit factor ≥ 1,2.
- ☐ Max drawdown paper ≤ max drawdown del backtest × 1,5.
- ☐ Win rate e R medio entro ±10 punti / ±0,3 R da quelli del backtest OOS (coerenza).
- ☐ Slippage reale medio misurato ≤ 2× lo slippage ipotizzato (0,05% per lato).
- ☐ Risultato non dipendente da 1–2 giornate eccezionali.

**Personali**
- ☐ Hai scritto in `GO_LIVE_CRITERIA.md` quanto sei disposto a perdere in euro prima di fermarti.
- ☐ Sai spiegare a voce cosa fa il bot in ogni situazione del §9.

Se anche una sola casella è vuota → resta in paper. Non c'è fretta: il mercato ci sarà ancora.

---

## 3 · Vincoli del mondo reale da risolvere prima (F3)

### 3.1 Regola PDT e tipo di conto
- Storicamente negli USA un conto **margin** sotto $25.000 è limitato a 3 day trade in 5 giorni
  lavorativi; oltre, il conto viene marcato "pattern day trader" e bloccato per i day trade.
- FINRA ha proposto di sostituire questa regola con requisiti di margine intraday. **Prima di
  andare live verifica lo stato attuale** sul sito di Alpaca e di FINRA: la tua pianificazione cambia
  radicalmente a seconda della risposta.
- Opzioni se la regola è in vigore:
  1. Capitale ≥ $25.000 con un cuscinetto (es. $30.000), perché una perdita sotto soglia riattiva il
     limite. Il bot deve comunque usare solo `LIVE_CAPITAL_CAP` per il sizing.
  2. Capitale < $25.000 accettando ~3 trade/settimana (il bot v2 lo gestisce già).
  3. Un conto **cash** (se disponibile per il tuo profilo): niente PDT ma vincoli di regolamento
     dei fondi (non puoi riusare lo stesso denaro prima del settlement). Richiede modifiche al
     codice e un nuovo periodo paper.
- In ogni caso il bot non usa mai la leva: anche su conto margin l'esposizione è ≤ equity.

### 3.2 Idoneità e apertura del conto
- Verifica che Alpaca offra conti live ai residenti in Italia e a quali condizioni (tipo di conto,
  commissioni, metodi di deposito).
- Completa la verifica d'identità (KYC) e il modulo fiscale **W-8BEN** (dichiari di non essere
  soggetto fiscale USA: in base al trattato Italia–USA la ritenuta sui dividendi è ridotta; un bot
  intraday di solito non incassa dividendi, ma il modulo è comunque richiesto).
- Attiva l'autenticazione a due fattori sull'account.
- Annota l'**account number live**: servirà come lucchetto nel codice (§4).

### 3.3 Valuta
- Il conto opera in USD. Il deposito in EUR comporta una conversione (costo del cambio della tua
  banca o del broker: confrontali).
- Il capitale è esposto al cambio EUR/USD: il P&L in euro può differire molto da quello in dollari.
  Decidi prima se misuri il successo in USD (strategia) o in EUR (tasca tua) — conviene tracciarli
  entrambi.

### 3.4 Dati di mercato: IEX vs SIP
- Il piano gratuito fornisce in tempo reale solo il feed IEX, che vede una piccola parte del volume
  USA. Volume relativo, massimi/minimi della prima barra e breakout possono differire da quelli sul
  feed consolidato (SIP).
- Gli ordini reali vengono eseguiti sul mercato vero, non su IEX: il segnale IEX può anticipare,
  ritardare o inventare un breakout rispetto al mercato reale.
- Opzione consigliata per il live: abbonamento con feed SIP in tempo reale (storicamente circa $99/mese
  per il piano "Algo Trader Plus" di Alpaca — **verifica il prezzo attuale**).
- **Se cambi feed, i segnali cambiano:** rifai backtest e almeno 4 settimane di paper con il nuovo feed
  prima del live.

### 3.5 Costi reali e punto di pareggio
Voci da mettere a bilancio: commissioni (verifica il listino per il tuo tipo di conto), commissioni
regolamentari sulle vendite (piccole ma non zero), cambio valuta, dati, server, tempo del
commercialista, imposte.

**Esempio puramente ipotetico** (numeri di fantasia, non una previsione):

| Voce | Valore |
|---|---|
| Capitale | $10.000 |
| Rischio medio effettivo per trade (dopo i tetti) | ~$70 |
| Expectancy ipotetica | +0,2 R ⇒ +$14/trade |
| Trade/mese con vincolo PDT | ~12 |
| Lordo mensile | ~$168 |
| − dati SIP + server | ~−$110 |
| Netto ante imposte | ~$58 |
| − imposta 26% sulle plusvalenze | ≈ $43/mese |

Morale: con capitale piccolo e vincolo PDT i costi fissi mangiano quasi tutto, anche con un edge
positivo (che resta da dimostrare). Rifai il conto con i tuoi numeri reali del paper **prima** di
spendere un euro.

---

## 4 · Modifiche al codice per il live (F3)

Il bot v2 rifiuta il live per costruzione. Per abilitarlo si aggiunge una modalità live **protetta da
più lucchetti indipendenti**. Il live parte solo se **tutti** sono aperti; ne basta uno chiuso per
bloccare ogni ordine.

| # | Lucchetto | Protegge da |
|---|---|---|
| L1 | `TRADING_MODE=live` nel file d'ambiente del **server** | avvio live per sbaglio in sviluppo |
| L2 | Flag esplicito da riga di comando `--live` | configurazione copiata per errore |
| L3 | File `LIVE_ARMED` con frase di accettazione e **data di scadenza** (max 30 giorni) | live dimenticato acceso; obbliga a una revisione mensile |
| L4 | `account_number` letto dall'API = `LIVE_ACCOUNT_NUMBER` configurato | chiavi del conto sbagliato |
| L5 | Versione del codice = tag git approvato (`APPROVED_VERSION`), working tree pulito | codice modificato e non testato |
| L6 | Nessun file `HALTED` presente | ripartenza dopo un circuit breaker senza revisione |
| L7 | Tetti rigidi **nel codice** (`HARD_LIMITS`), non superabili da config | errori di configurazione ("0.1" invece di "0.01") |

Tetti rigidi consigliati in `HARD_LIMITS` (costanti in `broker.py`, verificati a ogni ordine):
rischio per trade ≤ 1%, perdita giornaliera ≤ 2%, controvalore per ordine ≤ `LIVE_MAX_NOTIONAL`,
capitale usato per il sizing = `min(equity, LIVE_CAPITAL_CAP)`, ordini di entrata ≤ 10/giorno,
prezzo limite entro l'1% dall'ultimo prezzo (protezione "fat finger").

### 4.1 Prompt per Claude Code: aggiunta della modalità live (senza attivarla)

Da eseguire **sulla macchina di sviluppo, che ha solo chiavi paper**. Claude Code scrive e testa il
codice con broker simulati; non deve mai eseguire il bot in live né vedere chiavi live.

```text
Aggiungi al bot esistente una modalità LIVE, senza attivarla. Non eseguire mai il bot in modalità
live, non creare né leggere file con chiavi live: su questa macchina esistono solo chiavi paper.
Tutto va verificato con test e broker simulati (mock), senza chiamate di rete.

1. LUCCHETTI. La modalità live si attiva solo se TUTTE le condizioni sono vere; altrimenti il bot
   si rifiuta di partire e spiega QUALE condizione manca:
   a) TRADING_MODE=live nelle variabili d'ambiente;
   b) flag --live sulla riga di comando;
   c) file LIVE_ARMED nella DATA_DIR contenente la frase
      "ACCETTO IL RISCHIO DI PERDERE DENARO REALE" e una data di scadenza AAAA-MM-GG non oltre
      30 giorni dalla sua creazione; se scaduto → rifiuta;
   d) account_number restituito dall'API uguale a LIVE_ACCOUNT_NUMBER;
   e) versione del codice (git describe --tags) uguale ad APPROVED_VERSION e nessuna modifica
      locale non committata;
   f) nessun file HALTED nella DATA_DIR.
   In paper il comportamento attuale resta identico.
2. HARD_LIMITS in broker.py: costanti nel codice, non sovrascrivibili da config o variabili
   d'ambiente. submit_bracket() rifiuta qualsiasi ordine che le violi, anche se il resto del
   codice sbaglia: rischio ≤ 1% del capitale di sizing, controvalore ≤ LIVE_MAX_NOTIONAL,
   capitale di sizing = min(equity, LIVE_CAPITAL_CAP), max 10 entrate al giorno, prezzo limite
   entro l'1% dall'ultimo prezzo, stop obbligatorio.
3. FASI. LIVE_PHASE ∈ {micro, reduced, full} con moltiplicatore del rischio 0.25 / 0.5 / 1.0 e
   limite di perdita giornaliera 1% / 1,5% / 2%. Il valore va loggato a ogni avvio e in ogni report.
4. CIRCUIT BREAKER PERSISTENTI: perdita settimanale ≥ WEEKLY_LOSS_LIMIT (4%) → nessuna entrata
   fino alla settimana successiva; drawdown dal massimo di equity ≥ MAX_DRAWDOWN (8%) → flatten e
   creazione del file HALTED, che solo io posso rimuovere a mano; qualsiasi RULE VIOLATION in live
   → flatten e HALTED. Tutti notificati.
5. PERCORSI SEPARATI. DATA_DIR configurabile, così istanza paper e istanza live scrivono in
   cartelle diverse. I report live mostrano sempre "LIVE" nell'intestazione.
6. CONFRONTO CON IL PAPER. Aggiungi compare.py che, dati i trades.csv dell'istanza live e di
   un'istanza paper che gira in parallelo con la stessa versione, produce un report: segnali
   uguali/diversi, differenza di prezzo di entrata e uscita (bp), differenza di P&L in R.
7. RICONCILIAZIONE. Aggiungi reconcile.py: confronta trades.csv/orders.csv con ordini e fill
   restituiti dall'API del broker per la giornata e segnala ogni discrepanza (quantità, prezzi,
   ordini mancanti, posizioni residue, ordini aperti).
8. flatten.py deve funzionare anche in live: verifica solo il lucchetto (d) (account number) e
   NON richiede gli altri, perché chiudere posizioni riduce il rischio. Se viene eseguito a
   mercato chiuso con posizioni aperte, non invia ordini ma notifica un allarme.
9. TEST: per ogni lucchetto un test che dimostri che se manca SOLO quello non parte alcun ordine
   live; test per ogni HARD_LIMIT; test per i circuit breaker e la persistenza di HALTED; test che
   flatten.py funzioni con i lucchetti chiusi ma account number corretto.
10. Aggiorna README.md con una sezione "Modalità live" e i file systemd in deploy/ per due istanze
    (bot-trader-paper e bot-trader-live) con file d'ambiente e DATA_DIR separati.
Mostrami i test che passano e un riepilogo di tutti i lucchetti.
```

Dopo questa modifica: nuova versione → test → **almeno 2 settimane di paper** con il nuovo codice
(in modalità paper) prima di usarla in live.

---

## 5 · Infrastruttura per l'operatività automatica

### 5.1 Il server
- VPS Linux (una distribuzione LTS), preferibilmente in un data center USA costa (latenza minore,
  nessuna dipendenza dal tuo PC o dalla tua linea di casa).
- Accesso solo con chiave SSH, login root disabilitato, firewall che lascia aperto solo SSH,
  aggiornamenti di sicurezza automatici.
- Orologio sincronizzato (NTP attivo: `timedatectl status` deve dire `System clock synchronized: yes`).
- Utente dedicato senza privilegi, ad esempio `trader`.
- Struttura consigliata:
  ```
  /opt/bot-trader/releases/v1.2.0/     codice di una versione (con il suo .venv)
  /opt/bot-trader/current  ->  releases/v1.2.0   (link simbolico)
  /opt/bot-trader/data/paper/          stato, log, report dell'istanza paper
  /opt/bot-trader/data/live/           stato, log, report dell'istanza live
  /etc/bot-trader/paper.env            chiavi paper   (root:trader, permessi 640)
  /etc/bot-trader/live.env             chiavi live    (root:trader, permessi 640)
  ```

### 5.2 Servizi systemd
**`/etc/systemd/system/bot-trader-live.service`**
```ini
[Unit]
Description=Bot trader - istanza LIVE
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=600
StartLimitBurst=5

[Service]
Type=simple
User=trader
WorkingDirectory=/opt/bot-trader/current
EnvironmentFile=/etc/bot-trader/live.env
Environment=DATA_DIR=/opt/bot-trader/data/live
ExecStart=/opt/bot-trader/current/.venv/bin/python bot.py --live
Restart=on-failure
RestartSec=30
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/bot-trader/data/live

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/flatten-guard-live.service`**
```ini
[Unit]
Description=Flatten di sicurezza indipendente - LIVE

[Service]
Type=oneshot
User=trader
WorkingDirectory=/opt/bot-trader/current
EnvironmentFile=/etc/bot-trader/live.env
Environment=DATA_DIR=/opt/bot-trader/data/live
ExecStart=/opt/bot-trader/current/.venv/bin/python flatten.py --if-near-close --live
```

**`/etc/systemd/system/flatten-guard-live.timer`**
```ini
[Unit]
Description=Esegue il flatten di sicurezza ogni minuto nel pomeriggio di New York

[Timer]
OnCalendar=Mon..Fri *-*-* 12..16:*:00 America/New_York
AccuracySec=1s

[Install]
WantedBy=timers.target
```

Attivazione:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bot-trader-paper.service bot-trader-live.service
sudo systemctl enable --now flatten-guard-paper.timer flatten-guard-live.timer
systemctl list-timers | grep flatten       # verifica i prossimi orari
journalctl -u bot-trader-live -f           # log in tempo reale
```

L'istanza **paper** (`bot-trader-paper`) è identica ma usa `paper.env`, `DATA_DIR=.../data/paper` e
nessun `--live`. Resta accesa **per sempre** accanto al live: è il tuo gruppo di controllo (§8.1).

### 5.3 Segreti
- Le chiavi live esistono **solo** in `/etc/bot-trader/live.env` sul server: mai sul portatile, mai
  in git, mai in una chat o in un prompt, mai visibili a Claude Code.
- Genera chiavi live dedicate al bot; ruotale ogni 90 giorni e subito se sospetti una fuga.
- Autenticazione a due fattori sul conto Alpaca e sull'email collegata.
- Alla fine dell'esperimento: revoca le chiavi dalla dashboard.

### 5.4 Heartbeat e notifiche
- **Heartbeat ("dead man's switch")**: durante la seduta il bot chiama ogni minuto un URL di un
  servizio di monitoraggio (es. Healthchecks.io o equivalente). Se non arriva un ping per 5 minuti il
  servizio ti manda email/SMS. È l'unico modo di sapere che il bot è *morto*: un bot morto non manda
  notifiche.
- **Notifiche del bot** (Telegram): avvio con modalità/fase/versione, watchlist, ogni entrata e
  uscita, SKIP rilevanti, kill switch, circuit breaker, errori, riepilogo di fine giornata.
- Testa entrambe: ferma il servizio durante la seduta paper e verifica che l'allarme arrivi.

### 5.5 Rilasci e gestione delle modifiche
- Ogni versione eseguita in live è un **tag git** (`v1.2.0`) che ha passato test + periodo paper.
- Deploy solo a mercato chiuso: nuova cartella in `releases/`, `pip install -r requirements.txt`,
  test, poi cambio del link `current` e `systemctl restart`. Rollback = rimettere il link precedente.
- Aggiorna `APPROVED_VERSION` in `live.env` solo dopo il periodo paper della nuova versione.
- Registra ogni modifica in `CHANGELOG.md` con motivo e data. Una modifica di **strategia** (non un
  bugfix) riporta al backtest e a F2.

### 5.6 Backup
Copia giornaliera di `/opt/bot-trader/data/` fuori dal server. Ti serve per diagnosi, per il
confronto live/paper e **per la dichiarazione dei redditi** (§10).

---

## 6 · Il primo giorno live (runbook)

### Il giorno prima (T−1), a mercato chiuso
- ☐ Conto live finanziato; W-8BEN accettato; 2FA attivo.
- ☐ `live.env` sul server con chiavi live, `LIVE_ACCOUNT_NUMBER`, `APPROVED_VERSION`,
  `LIVE_PHASE=micro`, `LIVE_CAPITAL_CAP` e `LIVE_MAX_NOTIONAL` piccoli.
- ☐ Sul server, nella release approvata: `python -m pytest -q` tutto verde.
- ☐ `python bot.py --live --dry-run`: stampa l'account number corretto, la fase `micro`, il capitale
  di sizing uguale al tetto e dimensioni di posizione coerenti. **Nessun ordine inviato.**
- ☐ `LIVE_ARMED` creato con scadenza a 30 giorni.
- ☐ Istanza paper attiva con la stessa versione.
- ☐ Timer di flatten attivi (`systemctl list-timers`), heartbeat e Telegram testati.
- ☐ App Alpaca sul telefono con accesso al conto live: sai dove si chiudono tutte le posizioni a mano.

### Il giorno stesso
- Prima dell'apertura (in Italia di solito 15:00–15:30): controlla la notifica di avvio del bot live
  (modalità LIVE, fase micro, versione giusta).
- Durante i primi giorni **resta presente per l'intera seduta**: osservi, non intervieni. Intervieni
  solo se il bot viola una regola o si comporta in modo non previsto dal §9 — e in quel caso con
  `flatten.py` / app, poi `HALTED`.
- Non modificare nulla durante la seduta. Mai.

### Dopo la chiusura: riconciliazione (obbligatoria ogni giorno per le prime 4 settimane)
```bash
python reconcile.py      # log del bot vs fill reali del broker
python compare.py        # live vs paper parallelo
python report.py
```
- ☐ Zero posizioni e zero ordini aperti sul broker.
- ☐ Stessi trade in `trades.csv` e nel broker: quantità, prezzi, orari.
- ☐ Variazione di equity del broker ≈ P&L del bot (differenze = commissioni/fee: annotale).
- ☐ Live vs paper: stessi segnali? Differenza di slippage? Annota in `JOURNAL.md`.
- ☐ `RULE VIOLATIONS: NONE`.

Qualsiasi discrepanza non spiegata → crea il file `HALTED` e non ripartire finché non l'hai capita.

---

## 7 · Crescere e tornare indietro

### 7.1 Passaggio di fase (F4 → F5 → F6)
Si sale di **una** fase alla volta solo se, nella fase corrente:
- ☐ durata minima e numero minimo di trade raggiunti (tabella §1);
- ☐ zero violazioni e zero discrepanze non spiegate in riconciliazione;
- ☐ slippage reale medio ≤ 2× l'ipotesi e differenza media live–paper ≤ 0,15 R per trade;
- ☐ expectancy della fase non negativa (non si chiede che sia significativa: il campione è piccolo,
  si chiede che non contraddica il paper);
- ☐ nessun circuit breaker settimanale o di drawdown scattato.

Salire di fase = modificare `LIVE_PHASE` e i tetti in `live.env` a mercato chiuso, annotandolo nel
`CHANGELOG.md`. Mai aumentare più di una leva alla volta (rischio *oppure* capitale).

### 7.2 Circuit breaker e regole di ritorno

| Evento | Azione automatica | Azione tua |
|---|---|---|
| Perdita giornaliera ≥ limite di fase | Kill switch: flatten, stop per la giornata | Leggi il report; nessuna modifica |
| Perdita settimanale ≥ 4% | Nessuna entrata fino a lunedì | Revisione settimanale anticipata |
| Drawdown dal massimo ≥ 8% | Flatten + `HALTED` | **Ritorno a F2 (paper)** e analisi |
| Qualsiasi violazione di regola in live | Flatten + `HALTED` | Bug: test che lo riproduce, fix, 2 settimane di paper |
| Discrepanza di riconciliazione non spiegata | — | Crea `HALTED` finché non è spiegata |
| 5 sedute consecutive in perdita | — | Scendi di una fase |
| Expectancy mobile sugli ultimi 50 trade < 0 | — | Scendi di una fase; se persiste, ritorno a F2 |
| Drawdown live > 1,5× max drawdown del backtest | — | Ritorno a F2: la strategia potrebbe aver perso l'edge |
| Slippage medio > 2× l'ipotesi per 20 trade | — | Scendi di una fase, rivedi tipo di ordine e universo |

La soglia di perdita totale scritta in `GO_LIVE_CRITERIA.md` è definitiva: raggiunta quella,
l'esperimento live finisce.

---

## 8 · Monitoraggio continuo

### 8.1 L'istanza paper come gruppo di controllo
Paper e live girano con la stessa versione e gli stessi segnali. Le differenze misurano il costo
dell'esecuzione reale (*implementation shortfall*):
- live peggio del paper di poco e in modo stabile → normale (fill reali);
- live molto peggio → problema di esecuzione (liquidità, tipo d'ordine, feed dati);
- segnali diversi → problema di dati o di stato: indaga subito.

### 8.2 Revisione settimanale (20 minuti)
Trade, expectancy in R, profit factor, drawdown, slippage, confronto con paper, errori, SKIP
(soprattutto PDT e qualità dei dati). Annota in `JOURNAL.md`. Nessuna modifica di parametri.

### 8.3 Revisione mensile (1 ora)
- Rinnova `LIVE_ARMED` **solo** dopo aver completato la revisione (è per questo che scade).
- Metriche cumulative per fase; decisione su §7.1/§7.2.
- Ruota le chiavi se sono passati 90 giorni.
- Controlla aggiornamenti di sicurezza del server e dell'SDK (mai aggiornare l'SDK direttamente in
  live: nuova release → test → paper).

---

## 9 · Runbook degli incidenti

| Situazione | Cosa fa il sistema | Cosa fai tu |
|---|---|---|
| Il bot crasha con posizioni aperte | systemd lo riavvia; al riavvio riconcilia e verifica gli stop; gli stop lato broker restano attivi | Controlla la notifica di riavvio; se riavvii ripetuti → `HALTED` + `flatten.py` |
| Il server è irraggiungibile | Gli stop bracket restano sul broker fino a fine giornata; l'heartbeat ti avvisa | Dall'app Alpaca chiudi le posizioni prima della chiusura; indaga dopo |
| API Alpaca non raggiungibile | Retry con backoff, nessuna nuova entrata, notifica | Verifica la pagina di stato di Alpaca; se non si risolve entro la chiusura, chiudi dall'app |
| Kill switch scattato | Flatten, stop per la giornata | Leggi il report; niente modifiche "a caldo" |
| Posizione sconosciuta sul conto | Stop di protezione + notifica | Capisci da dove arriva (ordine manuale? bug?) prima di ripartire |
| Quantità eseguita diversa dal previsto | Riconciliazione la segnala | `HALTED` finché non è spiegata |
| Ordine rifiutato per PDT | `SKIP PDT`, nessun retry | Nessuna azione; se inatteso, verifica `daytrade_count` |
| Conto bloccato (`trading_blocked`) | Nessuna entrata, notifica | Contatta il supporto del broker |
| Dati vecchi o spread anomali | Nessuna entrata sul simbolo | Se sistematico, rivedi feed e universo |
| Posizione ancora aperta dopo la chiusura | `flatten.py` a mercato chiuso non invia ordini ma allarma | Decidi tu all'apertura successiva; il bot all'avvio la tratta come violazione |
| Chiavi possibilmente esposte | — | Revoca immediata dalla dashboard, nuove chiavi, controlla gli ordini recenti |

---

## 10 · Fiscalità per un residente in Italia (orientativa)

> Indicazioni generali per orientarti nel colloquio con un commercialista, **non** una consulenza.
> Le norme cambiano: verifica sempre con un professionista.

- **Regime dichiarativo.** Un broker estero di norma non agisce da sostituto d'imposta: le imposte
  si calcolano e si versano tu, con la dichiarazione dei redditi.
- **Plusvalenze** (redditi diversi di natura finanziaria): tassate di norma al 26%, da indicare nel
  quadro RT. Le minusvalenze sono in genere compensabili con plusvalenze della stessa natura entro
  i 4 anni successivi.
- **Conversione in euro.** Costo e corrispettivo vanno convertiti in euro ai cambi delle rispettive
  date: con centinaia di trade serve un export ordinato (è uno dei motivi del backup §5.6). Chiedi
  al commercialista anche come trattare la liquidità in dollari e le eventuali differenze di cambio.
- **Monitoraggio fiscale (quadro RW) e IVAFE.** Le attività finanziarie detenute all'estero vanno
  dichiarate e sono soggette in genere a un'imposta patrimoniale (IVAFE).
- **W-8BEN** (§3.2) per il trattamento fiscale lato USA.
- Chiedi esplicitamente se, per frequenza e volumi, l'attività possa essere inquadrata
  diversamente (ad esempio come attività d'impresa) e quali conseguenze avrebbe.
- **Costo pratico:** metti a bilancio il compenso del commercialista nel calcolo del §3.5.

---

## 11 · Checklist finale

### Parte A — Preparazione (F3)
- ☐ Stato della regola PDT verificato; scelta capitale/tipo di conto fatta (§3.1)
- ☐ Conto live aperto, KYC e W-8BEN completati, 2FA attivo (§3.2)
- ☐ Strategia sul cambio EUR/USD decisa (§3.3)
- ☐ Decisione sul feed dati presa; se cambiato, backtest e paper rifatti (§3.4)
- ☐ Conto dei costi con i tuoi numeri: il punto di pareggio è plausibile (§3.5)
- ☐ Modalità live con lucchetti L1–L7 implementata, testata e passata in paper (§4)
- ☐ Server configurato, systemd attivo, flatten guard attivo, heartbeat e notifiche testati (§5)
- ☐ Chiavi live solo sul server (§5.3)
- ☐ Commercialista informato (§10)
- ☐ `GO_LIVE_CRITERIA.md` scritto, con la perdita massima accettabile in euro

### Parte B — Cancello (fine F2)
- ☐ Tutte le caselle del §2.3 spuntate

### Parte C — Primo giorno (F4)
- ☐ Runbook §6 "Il giorno prima" completato
- ☐ Fase `micro`, tetti piccoli, `LIVE_ARMED` valido

### Parte D — Ogni giorno in live
- ☐ Notifica di avvio corretta · ☐ riconciliazione · ☐ confronto con paper · ☐ `RULE VIOLATIONS: NONE`

### Parte E — Ogni mese
- ☐ Revisione §8.3 · ☐ decisione di fase §7 · ☐ rinnovo `LIVE_ARMED` · ☐ rotazione chiavi se dovuta

---

**Ultima regola.** Se in qualsiasi momento non sai spiegare perché il bot ha fatto una certa cosa,
il bot si ferma finché non lo sai spiegare. In automatico non vuol dire senza supervisione.
