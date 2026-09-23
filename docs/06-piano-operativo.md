# 06 — Piano operativo: segnali settimanali, esecuzione manuale su Directa, 1.000 €

> Questo capitolo sostituisce, **per il tuo caso**, la strategia intraday delle guide 02–03. Le regole
> di sicurezza, il metodo di test e i criteri di valutazione di quelle guide restano validi dove non
> diversamente indicato. Dati raccolti a settembre 2026: ciò che è marcato **[verifica]** va confermato
> con il broker. Non è consulenza finanziaria o fiscale.

---

## 0 · Decisioni prese

| # | Decisione | Conseguenza |
|---|---|---|
| 1 | Regime amministrato, segnali del bot ed **esecuzione manuale** | Broker: **Directa**. Il bot non si collega mai al conto reale: niente chiavi, nessun canone API. |
| 2 | Operazioni di **più giorni su barre giornaliere** | Dati gratuiti sufficienti (barre giornaliere storiche SIP da Alpaca). Nuovo rischio: gap overnight. |
| 3 | Per ora **solo azioni USA**; micro futures su indici se convengono | Micro futures: **non convengono** con 1.000 € (§1). Per l'esposizione all'indice c'è un'alternativa senza leva (§2.3). |
| 4 | Capitale **1.000 €** stabile | Le commissioni per ordine sono il fattore decisivo: la strategia deve fare **pochissimi trade** (§2). |
| 5 | Perdita accettabile: anche tutto il capitale | Propongo comunque limiti formali che fermano l'esperimento prima (§6.3). |
| 6 | Nessun conto Directa, nessun commercialista | Col regime amministrato il commercialista non è necessario per questa attività. Apertura conto al §5. |
| 7 | Windows Pro, **niente UPS**, connessione di riserva sì | Con esecuzione manuale un blackout non è un'emergenza; configurazione al §7. |
| 8 | Tempo **settimanale**; Python lo sai leggere | Strategia a **ribilanciamento settimanale**; codice semplice, con commenti e test leggibili. |

---

## 1 · Micro futures su indici: perché no, con 1.000 €

Il Micro E-mini S&P 500 (MES) vale **$5 per punto** dell'indice, con tick da 0,25 punti ($1,25).

| Grandezza | Valore (con S&P 500 intorno a 6.500 punti, ordine di grandezza) |
|---|---|
| Controvalore di **un** contratto | ~$32.500, cioè circa **30 volte** il tuo capitale |
| Margine iniziale di borsa indicato da CME | ~$1.300 (**più** del tuo capitale) **[verifica, cambia spesso]** |
| Movimento giornaliero "normale" dell'1% | ~65 punti ≈ **$325**, circa il 30% del capitale in un giorno |
| Stop che rischia l'1% del conto (~10 €) | ~2 punti = 0,03%: meno del rumore di pochi secondi |

Non esiste un modo di fare trading con un solo contratto micro rispettando regole di rischio sensate
su 1.000 €. Viola anche la regola "no leva" del progetto. **Esclusi** finché il capitale non è
dell'ordine di decine di migliaia di euro. (Discorso analogo per i micro futures europei, es. sul DAX.)

---

## 2 · I numeri delle azioni USA su Directa con 1.000 €

### 2.1 Il costo
Directa applica circa **$9 per ordine** sui mercati USA, con conversione EUR/USD al cambio LMAX delle
22:00 senza spread dichiarato. Un'operazione completa (acquisto + vendita) costa quindi **~$18**
(circa 15–16 €).

| Round trip all'anno | Commissioni annue | % di 1.000 € |
|---|---|---|
| 4 | ~$72 | **~6%** |
| 6 | ~$108 | **~9%** |
| 12 | ~$216 | **~19%** |
| 24 | ~$432 | **~37%** |

Per confronto, il mercato azionario USA nel lungo periodo ha reso in media, con molta variabilità,
un ordine di grandezza del 7–10% annuo. **Con più di 4–6 operazioni l'anno, le commissioni da sole
si mangiano un rendimento "normale".**

### 2.2 Il nodo fra rischio e commissioni
| Posizione | Stop | Rischio (≈ % del conto) | Commissioni in R |
|---|---|---|---|
| 250 € | 8% | 20 € (2%) | ~0,8 R |
| 500 € | 8% | 40 € (4%) | ~0,4 R |
| 1.000 € (tutto il conto) | 8% | 80 € (8%) | ~0,2 R |

Per portare le commissioni sotto 0,3 R devi mettere in una posizione quasi tutto il capitale e
rischiare il 5–8% per trade: 5 perdite consecutive fanno −25/−35%. Con 1.000 € sulle azioni USA di
Directa **non esiste un compromesso comodo**: o rischi molto per trade, o le commissioni divorano
l'edge. Il backtest (§4) deve dirti se esiste una configurazione che regge **dopo** le commissioni.

### 2.3 Le alternative a costo quasi zero (sempre in regime amministrato)
- **ETF UCITS su indici USA quotati a Milano** (es. su S&P 500 o Nasdaq-100): hanno il KID, quindi
  sono acquistabili, e molti emittenti partner di Directa (iShares, Vanguard, Amundi, Xtrackers/DWS…)
  sono **senza commissioni d'ordine**, con condizioni da verificare per singolo ETF (alcuni richiedono
  ordini minimi, es. 1.500 € per gli ETF Fidelity) **[verifica]**. È il modo corretto di avere
  "l'indice" con 1.000 €, al posto dei micro futures: stessa esposizione, **senza leva**.
- **Attenzione fiscale:** per gli ETF le **plusvalenze** sono redditi di capitale e **non** si
  compensano con le minusvalenze pregresse, mentre le **minusvalenze** sono redditi diversi. Con le
  azioni, invece, guadagni e perdite si compensano fra loro. Per piccoli importi pesa poco, ma va
  saputo **[verifica con Directa]**.
- **Il benchmark onesto:** comprare e tenere un ETF S&P 500 senza commissioni. Se dopo costi e
  imposte il bot non fa meglio di questo, la scelta razionale è non usare il bot.

### 2.4 Proposta: testare in paper due varianti in parallelo
Rispetta la tua scelta (azioni USA) ma ti dà i dati per decidere:

| Variante | Cosa fa | Costi simulati | Perché |
|---|---|---|---|
| **A — Azioni USA** (principale) | Rotazione settimanale su un universo di azioni USA liquide, 1–2 posizioni | $9 per ordine | La tua preferenza |
| **B — Indice via ETF** (controllo) | Filtro di trend settimanale su S&P 500: investito nell'ETF UCITS quando l'indice è sopra la media a 40 settimane, liquidità altrimenti | 0 € (ETF partner) **[verifica]** | Alternativa a costo zero ai micro futures |
| **C — Buy & hold** (benchmark) | Compra e tieni l'ETF | 0 € | Il risultato da battere |

Tutte e tre vengono simulate sugli **stessi dati** con il loro costo reale. Alla fine del paper
scegli con i numeri, non con le preferenze.

---

## 3 · La strategia (variante A) in parole semplici

Scelta perché è semplice da leggere, fa pochi trade e usa solo barre giornaliere/settimanali.

1. **Universo:** 20–30 azioni USA grandi e liquide con prezzo **≤ $150** (così con 450–1.000 € puoi
   comprare più di qualche azione e l'arrotondamento pesa meno). Lista fissa in `config.py`.
2. **Filtro di mercato:** si apre una posizione solo se l'S&P 500 (dati SPY usati **solo come
   segnale**, non per comprarlo) è sopra la sua media mobile a 200 giorni. Altrimenti liquidità.
3. **Classifica:** una volta a settimana, dopo la chiusura del venerdì, ordina l'universo per
   rendimento degli ultimi 6 mesi escludendo l'ultima settimana (*momentum*), tenendo solo i titoli
   sopra la propria media a 200 giorni.
4. **Entrata:** compra il primo della classifica (al massimo `MAX_POSITIONS` = 1 o 2).
5. **Uscita:** vendi se il titolo esce dai primi `EXIT_RANK` (es. 8) della classifica — un margine
   ampio evita di cambiare titolo ogni settimana — **oppure** se tocca lo stop.
6. **Stop:** prezzo di entrata − 3 × ATR(20) (volatilità media degli ultimi 20 giorni), inserito come
   **ordine condizionato lato server** su Directa subito dopo l'acquisto.
7. **Controllo economico:** il bot **non propone** un trade se le commissioni stimate superano
   `MAX_COMMISSION_R` (es. 0,35 R) del rischio di quel trade.

Numero atteso di operazioni: poche all'anno. Il backtest dirà quante e con quali risultati.

---

## 4 · Test: cosa cambia con una strategia settimanale

- **Il paper non può produrre una statistica significativa:** con 4–12 trade l'anno servirebbero
  decenni per arrivare ai numeri di 03 §2.2. Il giudizio sull'**edge** viene quindi dal **backtest**,
  e il paper serve a validare **processo, dati, ticket ed esecuzione manuale**.
- **Backtest lungo:** almeno 8–10 anni di barre giornaliere (Alpaca fornisce storico SIP gratuito
  pluriennale, con aggiustamento per split e dividendi), con in-sample/out-of-sample e costi reali
  ($9/ordine per A, 0 € per B).
- **Distorsione di sopravvivenza:** un universo scelto *oggi* contiene solo aziende che sono andate
  bene fino a oggi, e gonfia i risultati del passato. Rimedi: universo fisso scelto con criteri
  semplici, confronto con la variante B (indice, non soffre di questo problema), e diffidenza verso
  risultati molto migliori dell'indice.
- **Paper:** conto Alpaca paper con **$1.000** (o l'equivalente di 1.000 €). Il bot esegue sul paper
  gli stessi ticket che manderebbe a te, sottraendo nei report le commissioni Directa simulate.

**Cancello per andare live (sostituisce 03 §2.3 per questo scenario):**
- ☐ Backtest ≥ 8 anni: variante scelta con rendimento **netto** (costi inclusi) > buy & hold o, a
  parità, drawdown massimo molto inferiore; risultato OOS coerente con l'in-sample.
- ☐ Almeno 3 mesi di paper **e** almeno 6 ticket generati, zero violazioni di regola.
- ☐ Almeno 4 settimane in cui hai eseguito **a mano sul conto demo Directa** i ticket del bot (il demo
  dura 15 giorni: usalo alla fine del paper), cronometrando quanto tempo ti serve.
- ☐ Hai ricevuto risposta scritta da Directa alle domande del §5.3.

---

## 5 · Directa: apertura e verifiche

### 5.1 Apertura del conto
- Apertura online con documento e codice fiscale; il regime amministrato è quello predefinito per i
  residenti in Italia. Directa dichiara zero spese di apertura e di gestione del conto **[verifica]**.
- Abilita i **mercati USA** e compila il modulo **W-8BEN** (richiesto per le azioni USA: riduce la
  ritenuta USA sui dividendi al 15%).
- **Non** ti serve la piattaforma Darwin desktop a pagamento: per inserire gli ordini a mano bastano le
  piattaforme gratuite (web/app) **[verifica quali consentono ordini condizionati sugli USA]**.
- Imposta di bollo sugli strumenti finanziari: 0,2% annuo del valore, cioè circa 2 € su 1.000 € **[verifica]**.
- Profilo commissionale: sugli USA la tariffa di ~$9 per ordine è indicata come fissa; per gli ETF
  partner conta la gratuità; per eventuali ETF non partner su Borsa Italiana il profilo "variabile"
  (minimo 1,5 €) è in genere il più economico per ordini piccoli **[verifica]**.

### 5.2 Fisco in regime amministrato (cosa fa Directa per te)
- Calcola e versa il 26% sulle plusvalenze realizzate, tiene lo **zainetto fiscale** delle
  minusvalenze (compensabili entro 4 anni con plusvalenze della stessa natura).
- Conversioni di valuta e controvalori in euro sono a suo carico: tu non devi compilare RT né RW per
  questo conto.
- Resta utile che il bot stimi l'impatto fiscale nei report, per confrontare le varianti al netto
  delle imposte.

### 5.3 Domande da fare a Directa prima di aprire (priorità in ordine)
1. **Gli stop loss sulle azioni USA possono avere validità di più giorni o fino a revoca?** Se scadono
   ogni sera, con il tuo tempo settimanale non puoi reinserirli ogni giorno: sarebbe un blocco per
   questo piano. Nota: sugli USA lo stop di Directa scatta sul **bid**, non sull'ultimo prezzo.
2. Posso inserire gli ordini (limite e condizionati) **fuori orario**, ad esempio nel weekend, perché
   entrino all'apertura del lunedì? Directa indica che condizionati e ordini multigiorno partecipano
   solo alla sessione regolare (15:30–22:00).
3. Quali ordini condizionati (stop loss, OCO, OSO) sono disponibili sugli USA dalle piattaforme
   gratuite?
4. Quali ETF UCITS su S&P 500/Nasdaq-100 sono a commissioni zero **in acquisto e in vendita**, con
   quali importi minimi, e ci sono limiti di frequenza?
5. Commissione esatta su un ordine USA da ~$500, e come viene mostrato il cambio applicato.

---

## 6 · Routine settimanale ed esecuzione manuale

### 6.1 Cosa fa il bot, da solo, sul PC
| Quando (ora italiana) | Attività | Uscita |
|---|---|---|
| Ogni giorno feriale alle **22:45** | Aggiorna i dati, controlla le posizioni (dal tuo registro), verifica che il prezzo non sia vicino allo stop, riconcilia con il paper | Notifica solo se c'è qualcosa da fare (es. stop eseguito, dati mancanti) |
| Ogni **sabato alle 9:00** | Calcola la classifica, genera i **ticket** della settimana e il report | `tickets/AAAA-MM-GG.md` + messaggio Telegram |
| Sempre | Se un'esecuzione salta (PC spento), la recupera alla successiva: i job sono idempotenti | — |

In fase P2 il PC **non** deve essere acceso 24 ore su 24: basta che lo sia agli orari dei job, o che
recuperi appena riacceso.

### 6.2 Il ticket
Ogni ordine proposto è un ticket leggibile anche dal telefono, per esempio:

```
TICKET 2026-11-14-01   VARIANTE A   VALIDO FINO A: martedì 18/11 ore 22:00
AZIONE : ACQUISTA  XYZ  (NASDAQ)
QUANTITÀ: 12 azioni  (~890 $)
PREZZO : limite 74,20 $  (non inseguire: se l'apertura è sopra 75,70 $ non comprare)
STOP   : condizionato stop loss a 69,70 $  (validità: la massima consentita)
RISCHIO: ~54 $ ≈ 4,6% del conto   COMMISSIONI STIMATE: 18 $ ≈ 0,33 R (limite 0,35 R)
MOTIVO : 1° per momentum a 6 mesi, sopra SMA200, filtro di mercato positivo
```

### 6.3 La tua settimana (circa 20–30 minuti)
1. **Sabato o domenica:** leggi il report e i ticket (5 minuti).
2. **Lunedì dalle 15:30 (o nel weekend, se Directa lo consente):** inserisci gli ordini limite dei
   ticket.
3. **Appena eseguito l'acquisto:** inserisci **subito** lo stop condizionato. Una posizione senza stop
   è la violazione più grave del sistema.
4. **Registra ogni esecuzione** in `ledger/fills.csv` (data, simbolo, lato, quantità, prezzo,
   commissione): il bot conosce le tue posizioni **solo** da questo file. Il bot controlla che il
   file sia coerente (quantità, stop presenti) e ti avvisa se non lo è.
5. **Venerdì o sabato:** confronta il registro con l'estratto Directa (2 minuti).

Limiti di esperimento (proposti, perché "anche tutto" non è un piano):
- equity < 800 € (−20%) → pausa, revisione, niente nuovi ticket finché non decidi;
- equity < 650 € (−35%) → fine della fase live e ritorno al paper;
- una posizione rimasta senza stop per più di un giorno → violazione: revisione del processo.

---

## 7 · Il PC Windows Pro senza UPS

Integra 05 §5 con queste impostazioni:
- **Aggiornamenti** (Windows Pro, `gpedit.msc` → Configurazione computer → Modelli amministrativi →
  Componenti di Windows → Windows Update): "Configura Aggiornamenti automatici" con installazione
  pianificata il **sabato a mezzogiorno** (dopo il job delle 9:00) e "Nessun riavvio automatico con
  utenti connessi".
- **Senza UPS:** nel BIOS/UEFI attiva il riavvio al ritorno della corrente; il bot riparte
  dall'Utilità di pianificazione e recupera i job persi. Con esecuzione manuale un blackout non tocca
  il conto: gli stop sono sul server Directa. L'UPS diventa importante solo se in futuro passerai
  all'automazione completa.
- **Connessione di riserva:** configurala come rete secondaria automatica; il bot deve solo poter
  scaricare i dati e mandare notifiche.
- **Pianificazione dei job:**
  ```powershell
  schtasks /Create /TN "BotSignals-Daily" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 22:45 /RU trader /RP * `
    /TR "C:\bot-trader\.venv\Scripts\python.exe C:\bot-trader\daily.py"
  schtasks /Create /TN "BotSignals-Weekly" /SC WEEKLY /D SAT /ST 09:00 /RU trader /RP * `
    /TR "C:\bot-trader\.venv\Scripts\python.exe C:\bot-trader\weekly.py"
  ```
  Nelle proprietà di ogni attività attiva "Esegui l'attività il prima possibile dopo un avvio
  pianificato mancato".

---

## 8 · Prompt per Claude Code (v3: motore di segnali settimanali)

Da usare in una cartella nuova (o in un branch separato) al posto del prompt intraday di 02 §4.
Le chiavi Alpaca sono **paper** e servono solo per dati e simulazione.

```text
Costruisci in questa cartella un "motore di segnali" in Python per una strategia settimanale su
azioni USA. So leggere Python ma non modificarlo: scrivi codice semplice, funzioni brevi, commenti in
italiano che spiegano il PERCHÉ, e test leggibili. Usa alpaca-py, python-dotenv, pandas, pytest.
Credenziali Alpaca PAPER in .env, lette solo dal codice: non aprire, stampare o copiare mai .env.

SCOPO E LIMITI
- Il programma NON invia mai ordini a un conto reale. Il conto reale è presso un broker italiano
  (Directa) e gli ordini li inserisco io a mano. Non deve esistere codice che si colleghi a Directa.
- Alpaca serve per: (1) dati storici giornalieri (feed SIP storico, barre aggiustate per split e
  dividendi); (2) esecuzione simulata sul conto PAPER degli stessi ticket, come riferimento.
  TradingClient sempre con paper=True; se TRADING_MODE in .env non è "paper" rifiuta di partire.

FILE
- config.py: tutte le costanti (sotto) e l'universo di 25 azioni USA liquide con prezzo ≤ 150 $;
  SIGNAL_SYMBOL="SPY" usato solo come filtro di mercato.
- data.py: scarica e mette in cache (data/cache/) barre giornaliere; controlla buchi, date mancanti,
  prezzi ≤ 0; nessun dato inventato.
- strategy.py: funzioni PURE per le varianti:
  A) rotazione momentum: filtro di mercato SPY > SMA200; classifica per rendimento 126 giorni
     escludendo gli ultimi 5; ammessi solo titoli sopra SMA200; entra nel primo (fino a
     MAX_POSITIONS); esci se esce dai primi EXIT_RANK o se tocca lo stop; stop = entrata − 3×ATR20.
  B) trend su indice: investito se la chiusura settimanale di SPY è sopra la media a 40 settimane,
     altrimenti liquidità (in live verrà eseguita con un ETF UCITS equivalente).
  C) buy & hold (benchmark).
- risk.py: funzioni PURE di sizing: qty = floor(min(rischio_max / (entrata − stop),
  MAX_POSITION_PCT × equity / entrata, liquidità / entrata)); commissione stimata = 2 ×
  COMMISSION_PER_ORDER_USD; se commissione / rischio > MAX_COMMISSION_R → nessun ticket, con motivo.
  Se qty < 1 → nessun ticket.
- ledger.py: legge ledger/fills.csv (le mie esecuzioni manuali) e ricostruisce posizioni, prezzo
  medio, commissioni pagate, stop attivi. Valida il file e segnala incoerenze in modo chiaro.
- tickets.py: genera tickets/AAAA-MM-GG.md con, per ogni ordine: id, variante, azione, simbolo e
  mercato, quantità, prezzo limite, prezzo massimo oltre il quale non comprare, stop, validità del
  ticket (fino al martedì successivo alle 22:00 ora italiana), rischio in $ e % del conto,
  commissioni stimate in $ e in R, motivo. Include anche i ticket di VENDITA e di spostamento stop.
- notifier.py: invia i ticket via Telegram se configurato; un errore di notifica non blocca nulla.
- paper.py: esegue su Alpaca PAPER gli stessi ticket (entrata limit + stop GTC separato), con
  client_order_id deterministico e controllo anti-duplicati; riconcilia posizioni paper e ticket.
- daily.py (giorni feriali dopo la chiusura USA): aggiorna i dati, controlla ledger e paper, avvisa
  se una posizione non ha stop registrato, se il prezzo è entro 1×ATR dallo stop, o se dati mancano.
- weekly.py (sabato): classifica, ticket, report.
- backtest.py: usa le stesse funzioni di strategy.py e risk.py; ≥ 8 anni; nessun lookahead
  (decisioni col venerdì chiuso, esecuzione all'apertura del lunedì con slippage 0,1%); stop
  eseguito al peggiore fra prezzo di stop e apertura in caso di gap; costi: variante A
  COMMISSION_PER_ORDER_USD per ordine, B e C zero; in-sample/out-of-sample; risultati anche al netto
  di un'imposta del 26% sui guadagni realizzati (stima semplificata, dichiarata come tale).
  Output: CAGR, max drawdown, numero di trade/anno, % vincenti, R medio, commissioni totali,
  confronto A/B/C, e un avviso sul bias di sopravvivenza dell'universo.
- report.py: report settimanale in reports/: equity paper e "reale" (da ledger), trade, commissioni,
  distanza dai limiti di esperimento (equity < EXPERIMENT_PAUSE_EQUITY o < EXPERIMENT_STOP_EQUITY),
  sezione RULE VIOLATIONS (posizioni senza stop, ticket eseguiti fuori dai limiti di prezzo,
  incoerenze del ledger): deve dire NONE o elencarle.
- windows/: file .ps1 e istruzioni per registrare daily.py e weekly.py nell'Utilità di
  pianificazione, con recupero delle esecuzioni mancate.
- README.md in italiano semplice.

COSTANTI
START_EQUITY_EUR=1000, MAX_POSITIONS=1, MAX_POSITION_PCT=0.95, RISK_PER_TRADE_MAX=0.05,
EXIT_RANK=8, ATR_MULT=3, MOMENTUM_DAYS=126, SKIP_DAYS=5, SMA_DAYS=200, INDEX_SMA_WEEKS=40,
COMMISSION_PER_ORDER_USD=9.0, MAX_COMMISSION_R=0.35, SLIPPAGE=0.001, MAX_PRICE_USD=150,
EXPERIMENT_PAUSE_EQUITY=800, EXPERIMENT_STOP_EQUITY=650, TIMEZONE_MARKET="America/New_York",
TIMEZONE_LOCAL="Europe/Rome". Tutto in config.py, nessun numero "magico" nel codice.

TEST (nessuna rete, dati sintetici)
Dimostrano che: il sizing non supera mai né il rischio massimo né la liquidità; un trade con
commissioni oltre MAX_COMMISSION_R non genera ticket; nessun ticket di acquisto senza stop; la
classifica non usa dati futuri; il filtro di mercato blocca gli acquisti; il ledger rileva una
posizione senza stop; paper.py non duplica ordini; i gap oltre lo stop nel backtest sono eseguiti al
prezzo peggiore; gli orari sono gestiti con i fusi corretti anche nelle settimane con ora legale
non allineata fra USA ed Europa.

PROCESSO
1. Elenca ipotesi e limiti dei dati gratuiti prima di scrivere codice.
2. Scrivi il codice e mostrami "python -m pytest -q" tutto verde.
3. Esegui il backtest e mostrami A, B e C così come sono, senza abbellirli.
4. Esegui weekly.py in modalità --dry-run e mostrami i ticket che produrrebbe.
5. Non inviare ordini nemmeno al paper finché non scrivo: START PAPER.
Non inventare dati o risultati.
```

---

## 9 · Calendario indicativo

| Periodo | Fase | Cosa fai |
|---|---|---|
| Settimane 1–2 | Costruzione | Prompt v3, test, backtest A/B/C. Se A perde contro B e C dopo i costi, lo sai subito. |
| Mesi 1–3 (almeno) | Paper | Ticket settimanali eseguiti in automatico su Alpaca paper; tu leggi i ticket come se fossero reali. |
| Nel frattempo | Directa | Domande del §5.3, poi apertura del conto (senza versare, o versando poco). |
| Ultime 2 settimane di paper | Prova manuale | Conto demo Directa: esegui a mano i ticket reali del bot. |
| Poi | Live P2 | 1.000 € su Directa, variante scelta dai numeri, limiti del §6.3. |
| Ogni mese | Revisione | Report, confronto con benchmark, nessuna modifica di regole "a caldo". |

---

## Fonti (settembre 2026)
- CME Group, Micro E-mini S&P 500 (specifiche e margini): https://www.cmegroup.com/markets/equities/sp/micro-e-mini-sandp-500.margins.html · https://www.cmegroup.com/markets/equities/micro-emini-equity.html
- Directa, condizioni di trading sui mercati USA (commissioni, cambio, orari, stop sul bid): https://www.directa.it/help-supporto/condizioni-e-mercati/condizioni-di-trading-sui-mercati-usa
- Directa, ordini condizionati e validità: https://www.directa.it/help-supporto/ordini/ordini-condizionati-validita · https://www.directa.it/help-supporto/ordini/ordini-condizionati-o-stop-order
- Directa, strumenti a commissione zero: https://www.directa.it/prodotti-strumenti-finanziari/strumenti-commissione-zero
- Directa, condizioni di tenuta conto: https://www.directa.it/help-supporto/conto-directa/condizioni-di-tenuta-conto
- Directa, conto demo: https://www.directa.it/conto-directa/demo
- Borsa&Finanza, ETF Fidelity su Directa (soglia minima): https://borsaefinanza.it/fidelity-porta-i-suoi-etf-su-directa-sim-senza-commissioni/
