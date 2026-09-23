# 05 — Scenario personale: PC Windows sempre acceso, regime amministrato, capitale ~1.000 €/$, nessun feed a pagamento

> Questo capitolo applica le guide 01–04 alle tue condizioni concrete. Dati di costo raccolti a
> settembre 2026 da fonti pubbliche: tutto ciò che è marcato **[verifica]** va confermato con il
> broker, perché listini e condizioni cambiano. Non è consulenza finanziaria o fiscale.

---

## 0 · Le tue condizioni

| # | Condizione | Conseguenza principale |
|---|---|---|
| 1 | Il bot gira su un **PC Windows sempre acceso**, mai in standby | Va bene sia per Alpaca sia per Directa (che richiede la piattaforma Darwin aperta su Windows). Il PC di casa diventa però l'unico punto di guasto: corrente, rete, aggiornamenti di Windows (§5). |
| 2 | Il **regime amministrato** sarebbe una comodità enorme | Fra i broker italiani con API documentata, l'unico candidato concreto è **Directa** (BG Saxo resta da verificare). Alpaca e IBKR sono in regime dichiarativo. |
| 3 | Capitale iniziale **circa 1.000 €/$**, dopo un paper positivo | Con questo capitale **i costi fissi e le commissioni per ordine decidono tutto**: sono loro, non la strategia, a determinare se il progetto sta in piedi. |
| 4 | Un feed dati completo a pagamento (~$99/mese) è **insostenibile** | Corretto: sarebbe oltre il 100% annuo del capitale. Bisogna vivere con dati gratuiti, e questo spinge verso strategie basate su **barre giornaliere** (§3). |

---

## 1 · Verdetto onesto

**Con 1.000 € il day trading intraday automatico descritto nelle guide 02–03 non è sostenibile
economicamente con un broker italiano in regime amministrato, ed è al limite anche con Alpaca.**
Il problema non è la tecnologia ma l'aritmetica:

- con 1.000 € e rischio dell'1% per trade, il rischio per operazione è **10 €**;
- con il tetto del 25% per posizione, ogni posizione vale circa **250 €**;
- qualsiasi commissione fissa di qualche euro per ordine vale quindi **una frazione enorme del
  rischio** (spesso più di metà del risultato atteso di un trade), e qualsiasi canone mensile vale una
  percentuale annua a due cifre del capitale.

Le tue tre richieste (regime amministrato, capitale basso, esecuzione automatica) **non si possono
avere tutte insieme oggi** a costi sensati. Si possono però averne due su tre, e il §4 propone un
percorso che le raggiunge per gradi.

---

## 2 · I numeri

### 2.1 Costi per broker (fonti pubbliche, settembre 2026)

| Voce | **Alpaca** | **Directa** |
|---|---|---|
| Regime fiscale | Dichiarativo | **Amministrato** |
| Commissioni azioni USA | $0 | circa **$9 per ordine** **[verifica]** |
| Commissioni Borsa Italiana | — (non disponibile) | 3 profili: fisso **5 €**; dinamico da 8 € a 1,5 € secondo la frequenza; variabile 0,19‰ con minimo **1,5 €** e massimo 18 € **[verifica]** |
| ETF senza commissioni | — | Centinaia di ETF/ETC di emittenti partner senza commissioni d'ordine, **con condizioni** (es. per alcuni emittenti ordini minimi da 1.500 €) **[verifica per ogni ETF]** |
| Piattaforma/API | Gratis | Darwin desktop (necessaria per le API): circa **60 €/mese**, dati in tempo reale e storici inclusi; primi 2 mesi gratuiti; dal 3° mese il canone non si paga se nel mese precedente hai generato almeno 200 € di commissioni **[verifica]** |
| Dati | IEX in tempo reale e storico SIP (tranne gli ultimi 15 minuti) gratis | Quotazioni in tempo reale gratuite sulla piattaforma per Borsa Italiana e USA; l'accesso ai dati via API rientra nel canone **[verifica]** |
| Conto demo con API | **Sì** (paper completo) | **No**: le API non si possono attivare su un conto demo; serve un conto reale |
| Stop lato broker | Sì (bracket nativi) | Sì: gli ordini condizionati (stop loss, OCO, OSO) sono gestiti dal server Directa anche a piattaforma chiusa; da verificare quali tipi sono inviabili via API **[verifica]** |
| Cambio EUR/USD | Lo paghi tu al deposito (banca o servizio di cambio) | Per le azioni USA la conversione avviene al cambio LMAX delle 22:00, dichiarato senza spread |

### 2.2 Cosa costa un trade con 1.000 € (esempi)

Ipotesi: posizione da 250 € (tetto 25%), stop all'1% ⇒ rischio reale **2,50 €** (i tetti riducono il
rischio ben sotto l'1% del conto).

| Scenario | Costo andata+ritorno | Costo in % della posizione | Costo in "R" (unità di rischio) |
|---|---|---|---|
| Alpaca, azione USA | $0 (+ slippage) | ~0,1% (slippage) | ~0,1 R |
| Directa, Borsa Italiana, profilo variabile | 3 € | 1,2% | **1,2 R** |
| Directa, Borsa Italiana, profilo fisso | 10 € | 4% | **4 R** |
| Directa, azione USA | ~$18 | ~7% | **~7 R** |

Una strategia con expectancy lorda di +0,2 R per trade (già ottimistica) **perde denaro con
qualunque costo superiore a 0,2 R**. Su Directa ogni trade intraday partirebbe in perdita di 1–7 R.

### 2.3 Costi fissi annui in % di 1.000 €

| Voce | €/anno | % del capitale |
|---|---|---|
| Feed SIP Alpaca ($99/mese) | ~1.100 € | **~110%** |
| Canone Darwin/API Directa (60 €/mese, dopo i 2 mesi gratuiti) | ~600 € | **~60%** |
| Commercialista per il regime dichiarativo | da stimare | con 1.000 € anche 100 € sono il 10% |

**Conclusione:** su 1.000 € sono tollerabili solo costi fissi **vicini a zero**. Questo esclude oggi
sia il feed a pagamento sia il canone Darwin, a meno che Directa non offra condizioni diverse per chi
usa solo le API (da chiedere, §7).

---

## 3 · Cosa cambia nella strategia

### 3.1 Dal day trading intraday al trading su barre giornaliere
Con capitale piccolo, dati gratuiti e commissioni per ordine, conviene una strategia **a bassa
frequenza su barre giornaliere** (swing o trend following: da pochi giorni a qualche settimana, pochi
trade al mese). Vantaggi specifici per il tuo caso:

| Problema | Con l'intraday (guide 02–03) | Con barre giornaliere |
|---|---|---|
| Feed gratuito | IEX distorce volume, opening range e breakout | Le barre giornaliere storiche SIP sono **gratuite** anche su Alpaca (più vecchie di 15 minuti): nessuna distorsione |
| Commissioni | 1–7 R per trade su Directa | Con target del 5–10% una commissione di 3 € su 250 € pesa molto meno in R, e con ETF senza commissioni può essere zero |
| Numero di trade e fisco | Centinaia di operazioni l'anno | Poche decine: anche in regime dichiarativo il lavoro resta gestibile |
| Carico sul PC di casa | Il bot deve essere perfetto dalle 15:30 alle 22:00 | Il bot decide una volta al giorno; gli stop lato broker lavorano da soli |
| Rischio nuovo | — | **Posizioni overnight**: rischio di gap in apertura (lo stop può essere eseguito molto peggio del livello previsto) |

Le regole di sicurezza delle guide restano valide, con queste modifiche: niente flatten a fine
giornata; stop lato broker **validi più giorni** (GTC o equivalente); rischio per trade più basso per
compensare i gap (es. 0,5–1%); controllo quotidiano che ogni posizione abbia ancora il suo stop.

### 3.2 Il dimensionamento con 1.000 € è grossolano
- Con posizioni da 250 € un'azione da 400 € è **impossibile** da comprare, una da 120 € si compra in
  2 pezzi soltanto: il rischio reale di ogni trade varia molto per effetto degli arrotondamenti.
- Rimedi: massimo 1–2 posizioni aperte (tetto per posizione 50%), universo filtrato per prezzo
  (`MAX_PRICE`), oppure ETF con prezzo unitario basso. Le azioni frazionarie in genere non sono
  utilizzabili con ordini bracket **[verifica]**.
- Le metriche del paper vanno calcolate **con lo stesso capitale e gli stessi arrotondamenti** del
  live: un paper a $10.000 non dice nulla su un live a 1.000 €. Reimposta il conto paper Alpaca a
  $1.000 (o all'equivalente in dollari).

### 3.3 Mercati: USA o Italia?
- **Alpaca:** solo mercati USA; probabilmente solo azioni (ETF USA forse bloccati per un residente UE,
  04 §1.4).
- **Directa:** anche Borsa Italiana, compresi ETF UCITS quotati a Milano (con KID, quindi acquistabili)
  e ETF senza commissioni. Per un capitale piccolo in regime amministrato è il terreno più economico.
- La **Tobin tax** italiana riguarda le azioni di società italiane (non gli ETF): per le operazioni che
  apri e chiudi nella stessa giornata di norma non si applica, per quelle multi-giorno sì **[verifica]**.

---

## 4 · Percorso consigliato per gradi

| Fase | Cosa | Broker | Costo | Obiettivo |
|---|---|---|---|---|
| **P1** (ora) | Costruzione, backtest e paper della strategia (intraday v2 e/o variante su barre giornaliere) | Alpaca paper con saldo **$1.000** | 0 € | Capire se esiste un edge **alle tue dimensioni**, dopo i costi |
| **P2** | "Segnali automatici, esecuzione manuale": il bot calcola i segnali e ti manda su Telegram ordine, quantità, stop e target; tu inserisci l'ordine con lo stop condizionato nell'app o su Darwin | **Directa** (regime amministrato) | Solo commissioni (zero con gli ETF idonei); nessun canone API | Verificare fill, costi e disciplina reali con denaro vero, a regime amministrato, senza costi fissi |
| **P3** | Automazione completa via API | Directa (API) | Canone Darwin ~60 €/mese **[verifica]** | Solo quando il canone pesa al massimo il 2–3% annuo del capitale, cioè **da circa 25.000–35.000 €** in su, oppure se Directa offre condizioni diverse |
| **P3 alternativa** | Automazione completa a costo zero | Alpaca live | 0 € di commissioni e canoni; regime dichiarativo | Se decidi che il lavoro fiscale del dichiarativo è accettabile (si alleggerisce con il report fiscale automatico del §6) |

Perché questo ordine:
- **P1** è gratis e serve comunque: nessun broker e nessun regime fiscale salva una strategia senza edge.
- **P2** ti dà subito il regime amministrato e il denaro reale senza pagare il canone. Con pochi trade
  al mese (strategia su barre giornaliere) l'esecuzione manuale richiede qualche minuto a settimana,
  e la protezione resta automatica perché gli stop condizionati sono sul server Directa.
- **P3** arriva quando il capitale o i risultati giustificano il costo fisso.

> ⚠ In P2 il bot **non** si collega al conto Directa: niente chiavi, niente ordini automatici. Tutte
> le regole di rischio restano calcolate dal bot, ma l'ultimo passo lo fai tu. Registra ogni ordine
> che inserisci (orario, prezzo eseguito) per confrontarlo con il segnale.

---

## 5 · PC Windows sempre acceso: configurazione (sostituisce 03 §5.1–5.2)

### 5.1 Alimentazione e riavvii
```powershell
# PowerShell come amministratore: niente sospensione né ibernazione con alimentazione di rete
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change disk-timeout-ac 0
powercfg /hibernate off
```
- Nel BIOS/UEFI attiva il riavvio automatico al ritorno della corrente ("Restore on AC power loss").
- **Gruppo di continuità (UPS):** con il PC di casa è la protezione più economica contro i micro-blackout.
- Disattiva la sospensione selettiva USB e dei dischi (Opzioni risparmio energia → impostazioni avanzate).

### 5.2 Windows Update (la causa più probabile di un fermo)
- Imposta le **ore di attività** (Impostazioni → Windows Update → Opzioni avanzate) da 14:00 a 23:00:
  copre la seduta USA anche nelle settimane in cui l'ora legale USA ed europea non coincidono.
- Metti in pausa gli aggiornamenti nelle settimane critiche (primo live, cambi di fase) e fai gli
  aggiornamenti a mercato chiuso, nel weekend.
- Con Windows **Pro** puoi usare i criteri di gruppo per impedire riavvii automatici con utente
  collegato; con Windows **Home** le opzioni sono più limitate.

### 5.3 Avvio automatico del bot
Il bot va avviato da uno script che lo **riavvia se termina** (equivalente di `Restart=on-failure`):

**`C:\bot-trader\run_bot.ps1`**
```powershell
Set-Location C:\bot-trader
while ($true) {
    & .\.venv\Scripts\python.exe bot.py
    Add-Content -Path logs\restarts.log -Value "$(Get-Date -Format s) bot terminato con codice $LASTEXITCODE, riavvio fra 30 s"
    Start-Sleep -Seconds 30
}
```

Registrazione nell'Utilità di pianificazione (PowerShell come amministratore, utente dedicato `trader`):
```powershell
# Bot: all'avvio del PC
schtasks /Create /TN "BotTrader" /SC ONSTART /RU trader /RP * /RL LIMITED `
  /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\bot-trader\run_bot.ps1"

# Flatten di sicurezza indipendente: ogni minuto dalle 18:00 alle 22:15 ora italiana.
# Lo script verifica da solo, tramite il clock del broker, se mancano ≤ 8 minuti alla chiusura.
schtasks /Create /TN "FlattenGuard" /SC MINUTE /MO 1 /ST 18:00 /ET 22:15 /RU trader /RP * `
  /TR "C:\bot-trader\.venv\Scripts\python.exe C:\bot-trader\flatten.py --if-near-close"
```
- Per una strategia su barre giornaliere il flatten guard non serve; serve invece un controllo
  quotidiano "ogni posizione ha il suo stop valido" (lo fa il bot all'avvio e dopo l'apertura).
- **Darwin (Directa, fase P3)** è un'applicazione con interfaccia grafica: richiede una sessione utente
  aperta e il login. Dopo un riavvio del PC serve l'accesso automatico dell'utente (comodo ma meno
  sicuro: proteggi il PC con BitLocker e un account dedicato) e l'avvio automatico di Darwin. Il bot deve
  rilevare quando le porte locali di Darwin non rispondono e notificarlo.

### 5.4 Rete, orologio, accesso remoto, sicurezza
- **Rete di riserva:** un router 4G/5G o l'hotspot del telefono come seconda connessione; senza, un
  guasto della linea di casa lascia il bot cieco (gli stop lato broker restano attivi).
- **Orologio:** `w32tm /resync` e sincronizzazione automatica attiva; il bot deve comunque usare il
  clock del broker e il fuso `America/New_York` per le decisioni.
- **Heartbeat esterno (indispensabile):** con un PC di casa, l'unico modo di sapere che è spento è un
  servizio esterno che ti avvisa quando il bot smette di "pingare" (03 §5.4).
- **Accesso remoto** dal telefono per poter chiudere tutto anche fuori casa (anche solo l'app del
  broker basta per un'emergenza).
- Account Windows dedicato senza privilegi di amministratore, BitLocker attivo, antivirus aggiornato
  (escludi la cartella dei log dalla scansione in tempo reale se rallenta il bot), chiavi in un file
  leggibile solo dall'utente `trader`.
- Evita di usare lo stesso PC per giochi o carichi pesanti durante la seduta.

---

## 6 · Se scegli Alpaca live (P3 alternativa): alleggerire il regime dichiarativo

Chiedi a Claude Code di aggiungere un `tax_report.py` che, da `trades.csv` e dai documenti del broker,
produca per l'anno fiscale:
- ogni operazione chiusa con data, quantità, prezzo in USD, **cambio di riferimento del giorno** e
  controvalore in euro di acquisto e vendita;
- plusvalenze e minusvalenze in euro, totale annuo, riporto delle minusvalenze;
- valore di inizio e fine anno delle attività estere e giorni di detenzione (utili per RW/IVAFE);
- un CSV da consegnare al commercialista.

Non sostituisce il commercialista (che deve validare metodo, cambi e compilazione), ma riduce il suo
lavoro — e quindi il suo costo — a poco più di un controllo. Verifica con lui **prima** quali cambi
usare e quali documenti del broker fanno fede.

---

## 7 · Domande aperte da girare ai broker

**A Directa:**
1. Le API (porte locali di Darwin) richiedono per forza il canone Darwin desktop da ~60 €/mese, o esiste
   un profilo più economico per chi usa solo le API? Il canone si azzera anche con condizioni diverse
   dai 200 € di commissioni mensili?
2. Via API posso inviare ordini condizionati lato server (stop loss, OCO, OSO) con validità di più
   giorni? Restano attivi se Darwin si chiude o il PC si spegne?
3. Quali ETF sono a commissioni zero **anche in vendita**, e con quali importi minimi? Ci sono limiti
   al numero di operazioni o all'operatività intraday per mantenere la gratuità?
4. È ammesso l'uso delle API per un trading system personale, e cosa prevede l'accordo da firmare?
5. Commissione effettiva per un ordine su azioni USA di circa $250, e come funziona il cambio.

**Ad Alpaca:** le domande di 04 §1.6, più: con equity di circa $1.000 posso usare ordini bracket con
durata GTC, e con quali limiti? Le azioni frazionarie sono compatibili con gli ordini bracket?

---

## 8 · Riepilogo

| Obiettivo | Oggi con 1.000 € |
|---|---|
| Regime amministrato + costi quasi zero | ✅ Directa, esecuzione **manuale** su segnali del bot (P2), meglio con ETF senza commissioni e strategia su barre giornaliere |
| Automazione completa + costi quasi zero | ✅ Alpaca live, ma regime **dichiarativo** (P3 alternativa) |
| Automazione completa + regime amministrato | ⚠️ Directa via API: tecnicamente possibile sul tuo PC Windows, ma il canone (~60% annuo del capitale) la rende sensata solo con capitali molto più alti o condizioni diverse **[verifica]** |
| Day trading intraday redditizio con 1.000 € | ❌ Improbabile con qualsiasi broker: pesano i costi e gli arrotondamenti |

---

## Fonti (settembre 2026)
- Directa, commissioni per mercato e profili: https://www.directa.it/help-supporto/condizioni-e-mercati/tutte-le-commissioni-per-mercato · https://www.directa.it/commissioni
- Directa, condizioni di trading sui mercati USA: https://www.directa.it/help-supporto/condizioni-e-mercati/condizioni-di-trading-sui-mercati-usa
- Directa, Trading API e costi: https://www.directa.it/conto-directa/piattaforme/darwin/trading-api · https://www.directa.it/help-supporto/piattaforme/api
- Directa, strumenti a commissione zero: https://www.directa.it/prodotti-strumenti-finanziari/strumenti-commissione-zero
- Directa, conto demo: https://www.directa.it/conto-directa/demo
- Directa, stop loss e ordini condizionati: https://www.directa.it/help-supporto/operativita-avanzata/stop-loss-e-stop-all-come-funzionano · https://www.directa.it/pub2/it/help/100/7.html
- Borsa&Finanza, ETF Fidelity su Directa (soglia minima d'ordine): https://borsaefinanza.it/fidelity-porta-i-suoi-etf-su-directa-sim-senza-commissioni/
- Rankia, recensione Directa 2026: https://rankia.it/analisi-di-directa-pro-e-contro-regolamento-prodotti-e-commissione/
- AmicoBot, Directa e trading automatico: https://amicobot.it/blog/recensioni-broker-directa/
- Alpaca, dati di mercato: https://docs.alpaca.markets/us/docs/about-market-data-api
