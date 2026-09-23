# 04 — Fattibilità reale per una persona fisica residente in Italia, limiti del feed gratuito e piattaforme compatibili

> Aggiornato a **settembre 2026** con le informazioni pubbliche disponibili (fonti in fondo).
> Condizioni commerciali, regole e prezzi cambiano spesso: tutto ciò che è marcato **[verifica]**
> va confermato con il broker prima di aprire il conto o versare denaro.
> Non è consulenza finanziaria, legale o fiscale.

---

## 0 · In sintesi

| Domanda | Risposta breve |
|---|---|
| Una persona fisica residente in Italia può usare questo bot in live? | **Sì, tecnicamente e legalmente è fattibile**: Alpaca è indicato come disponibile per l'Italia per il trading via API su mercati USA. |
| La regola PDT ($25.000) è ancora un ostacolo? | **Non su Alpaca.** La SEC ha approvato l'eliminazione il 14/04/2026; FINRA l'ha resa efficace dal **4 giugno 2026** (con tempo per i broker fino al 20/10/2027). Alpaca applica il nuovo *Intraday Margin Framework* dal 4 giugno 2026. |
| Il feed dati gratuito basta? | **Per imparare e testare sì, per il live con questa strategia è debole**: vede circa il 2,5% del volume USA. Per il live valuta il feed SIP (circa $99/mese su Alpaca). |
| Qual è la fatica maggiore per un italiano? | **Il fisco**: con un broker estero sei in regime dichiarativo e devi dichiarare ogni operazione convertita in euro. Poi cambio EUR/USD e costi fissi. |
| Si possono comprare ETF USA come SPY o QQQ? | **Incerto per un residente UE** (regolamento PRIIPs/KID). Progetta il bot in modo che funzioni anche con **sole azioni**. **[verifica]** |
| Esistono alternative ad Alpaca? | Sì: Interactive Brokers (API potente, più complessa), Directa (italiana, regime amministrato, API locale), BG Saxo (regime amministrato, API da verificare), Trading 212 (API in beta, poco adatta all'intraday). Dettagli al §3. |

**Verdetto:** il progetto è **fattibile** per una persona fisica italiana. Il collo di bottiglia non è
la tecnica ma l'economia (costi fissi contro un edge tutto da dimostrare) e la burocrazia fiscale.

---

## 1 · Fattibilità con Alpaca per una persona fisica italiana

### 1.1 Chi ti apre il conto
Alpaca oggi ha due "anime" che in Europa è facile confondere:

| Entità | A chi si rivolge | Note |
|---|---|---|
| **Alpaca Securities LLC** (USA, broker-dealer registrato SEC/FINRA) | Clienti individuali del **Trading API**, compresi molti non residenti USA | È il conto "classico" su cui si basano queste guide. Tutela investitori: schema USA (SIPC) **[verifica i limiti]**. |
| **Alpaca Europe** (Spagna, autorizzata dalla CNMV, con passaporto MiFID II in 29 paesi SEE inclusa l'Italia dal 7/7/2026) | Soprattutto **fintech e istituzioni** che costruiscono prodotti per clienti europei (Broker API) | Il passaporto non significa automaticamente che il tuo conto individuale sarà presso l'entità europea. |

➡ **Chiedi per iscritto al supporto** con quale entità verrà aperto il tuo conto: da questo dipendono
tutela degli investitori, accesso agli ETF USA (§1.4) e documentazione fiscale.

### 1.2 Apertura, deposito e prelievo
- **Requisiti:** documento d'identità, prova di residenza, codice fiscale italiano come TIN, modulo
  **W-8BEN** (dichiari di non essere soggetto fiscale USA; il trattato Italia–USA riduce la ritenuta
  sui dividendi).
- **Deposito minimo:** Alpaca ha eliminato il vecchio minimo di $30.000 per i non residenti; oggi si
  parte da importi simbolici.
- **Valuta:** il conto è **solo in USD**. Il deposito dall'Italia avviene tipicamente con bonifico
  internazionale o tramite servizi di pagamento/cambio convenzionati (es. Wise): confronta il costo
  totale del cambio EUR→USD, che può pesare più delle commissioni di trading.
- **Prelievo:** secondo recensioni indipendenti il bonifico internazionale in uscita costa circa
  **$50** **[verifica]**: evita prelievi frequenti e piccoli.
- **Commissioni di trading:** zero commissioni per conti individuali self-directed su titoli quotati
  USA; restano le piccole fee regolamentari sulle vendite **[verifica il listino per non residenti]**.

### 1.3 Tipo di conto, PDT e nuovo regime intraday
- Su Alpaca **tutti i conti nascono come conti margin**; non esiste un conto "solo cash".
  Con equity ≥ $2.000 si ha accesso a margine e short; sotto $2.000 il conto è a "margine limitato"
  (puoi usare fondi non ancora regolati, ma senza leva).
- **PDT eliminata:** dal 4 giugno 2026 Alpaca non conta più i day trade, non esiste più la
  designazione "pattern day trader" né il minimo di $25.000. Al suo posto c'è l'**Intraday Margin
  Rule**: si controlla in tempo reale che l'equity sia adeguata all'esposizione effettiva durante
  la giornata. Le perdite di margine molto piccole non generano una margin call (soglia: il minore
  fra $1.000 e il 5% dell'equity).
- **Cosa significa per il bot:** poiché il bot non usa mai leva (esposizione lorda ≤ 100% dell'equity)
  il nuovo regime non lo limita. Resta però utile:
  - leggere dall'API i campi di stato dell'account (`trading_blocked`, `account_blocked`, eventuali
    campi PDT se ancora presenti) invece di presumere;
  - trattare qualsiasi rifiuto per motivi di margine come **errore bloccante** (log + notifica, nessun
    retry);
  - ricordare che **altri broker** possono adottare il nuovo regime più tardi (fino al 20/10/2027):
    se cambi piattaforma, verifica di nuovo.

### 1.4 ETF USA e regolamento PRIIPs
- Nell'UE un prodotto "impacchettato" (come un ETF) può essere venduto a un cliente al dettaglio solo
  se l'emittente fornisce un KID europeo. Gli ETF domiciliati negli USA (SPY, QQQ, IWM…) quasi mai lo
  hanno, e i broker regolati nell'UE ne bloccano l'acquisto ai clienti retail.
- Con un conto presso l'entità USA la situazione può essere diversa, con un conto presso un'entità UE
  è molto probabile il blocco. **[verifica]**
- **Conseguenza pratica:** l'universo del bot deve poter essere composto di **sole azioni**. Il bot
  deve controllare all'avvio, per ogni simbolo, che l'asset risulti negoziabile per il tuo conto
  (campo `tradable` dell'asset) e scartare gli altri con un log chiaro. Verificalo in live con il
  conto reale: il conto paper potrebbe non riflettere queste restrizioni.

### 1.5 Fisco italiano (orientativo, da validare con un commercialista)
- **Regime dichiarativo:** un broker estero non fa da sostituto d'imposta. Calcoli e dichiari tu le
  plusvalenze (quadro RT, 26%), compili il quadro **RW** e paghi l'**IVAFE** sulle attività detenute
  all'estero. Le minusvalenze sono in genere compensabili entro 4 anni con redditi della stessa natura.
- **Ogni trade va convertito in euro** ai cambi delle date di acquisto e vendita: con centinaia di
  operazioni l'anno servono export ordinati (i `trades.csv` del bot con data/ora aiutano, ma vanno
  riconciliati con i documenti ufficiali del broker).
- **Liquidità in USD:** le regole sulle plusvalenze valutarie per le giacenze in valuta vanno chiarite
  col commercialista.
- **Tobin tax italiana:** riguarda azioni di società italiane, non le azioni USA.
- **Alternativa:** un broker italiano in **regime amministrato** (§3) calcola e versa le imposte al
  posto tuo. Per chi fa molti trade è un vantaggio pratico enorme, da pesare contro API meno comode.

### 1.6 Domande da fare al supporto Alpaca prima di aprire il conto
1. Con quale entità (USA o Europa) verrà aperto il mio conto individuale Trading API da residente in
   Italia? Quale schema di tutela degli investitori si applica?
2. Posso comprare ETF domiciliati negli USA (es. SPY)? Se no, come compare la restrizione nell'API?
3. Come si applica l'Intraday Margin Rule al mio conto? Posso disattivare margine e short?
4. Quali metodi di deposito sono disponibili dall'Italia e con quali costi di cambio? Quanto costa
   un prelievo?
5. Quali documenti fiscali annuali ricevo (utili per il quadro RT/RW)?
6. Il piano dati gratuito e l'abbonamento Algo Trader Plus sono disponibili alle stesse condizioni per
   i non residenti? Serve dichiarare lo status di utente "non professionale"?

---

## 2 · Limiti del feed dati gratuito (Alpaca Basic) e loro impatto sul bot

### 2.1 Cosa offre il piano gratuito
| Aspetto | Piano Basic (gratuito) | Algo Trader Plus (a pagamento) |
|---|---|---|
| Costo | $0 | circa **$99/mese** **[verifica]** |
| Dati in tempo reale azioni | solo feed **IEX** (una sola borsa) | feed **SIP** consolidato (tutte le borse USA) |
| Copertura del volume | circa **2,5%** del volume USA | 100% |
| Dati SIP storici | sì, ma **non gli ultimi 15 minuti** | sì, fino a "adesso" |
| Limite chiamate REST | **200 al minuto** | nessun limite pratico per un uso retail |
| WebSocket | massimo **30 simboli** | simboli illimitati |

### 2.2 Cosa rompe (o distorce) nella strategia di queste guide
| Elemento della strategia | Effetto del feed IEX | Gravità |
|---|---|---|
| **Volume relativo (RVOL)** | I volumi sono ~1/40 di quelli reali e la quota IEX varia da giorno a giorno e da titolo a titolo: il rapporto oggi/media è più "rumoroso" del vero. | Alta |
| **Opening range (massimo/minimo 9:30–9:45)** | Il massimo IEX può essere più basso del massimo reale: il bot vede un breakout che sul mercato vero non c'è (o lo vede in ritardo). | Alta |
| **Conferma di volume sul breakout** | Con pochi scambi IEX al minuto, la barra da 1 minuto può avere volume quasi nullo o **mancare del tutto**. | Media |
| **Spread bid/ask** | La quotazione IEX può essere più larga del miglior prezzo nazionale: il filtro `MAX_SPREAD_PCT` può scartare trade buoni. | Media |
| **SMA20 e dati giornalieri** | Nessun problema serio: si possono usare barre giornaliere SIP storiche (sono più vecchie di 15 minuti). | Bassa |
| **Coerenza baseline/oggi** | Mescolare volumi SIP storici e volumi IEX di oggi dà un RVOL completamente sbagliato. | Alta, ma evitabile |
| **Fill del paper vs segnale** | Gli ordini vengono eseguiti al prezzo del mercato reale, il segnale nasce da IEX: lo slippage misurato include anche questo scarto. | Media |

### 2.3 Come conviverci nella fase paper
1. **Stesso feed per tutto ciò che confronti:** RVOL = volume IEX di oggi / media volumi IEX storici
   nello stesso intervallo orario (il prompt v2 lo impone con `DATA_FEED="iex"`).
2. **Universo solo di titoli molto liquidi** (mega-cap con scambi IEX ogni minuto). Evita mid/small cap.
3. **Budget di chiamate:** usa richieste **multi-simbolo** (una chiamata per tutte le barre dell'universo)
   invece di una chiamata per simbolo; con 30 simboli e un ciclo al minuto resti molto sotto 200/min
   anche contando ordini, posizioni e account. Tieni un contatore e un rallentamento automatico
   (backoff) sulle risposte 429.
4. **WebSocket:** 30 simboli è esattamente la dimensione dell'universo, senza margine. Usa REST
   polling oppure un universo di 25 simboli al massimo se usi lo streaming.
5. **Barre mancanti:** una barra assente non è "volume zero"; il bot deve saltare il segnale e loggare
   `SKIP NO_BAR`, non interpretarlo come dato.
6. **Soglie ricalibrate su IEX:** i valori di `RVOL_MIN`, `BREAKOUT_VOL_MULT` e `MAX_SPREAD_PCT` vanno
   scelti dal backtest fatto **con lo stesso feed**, non copiati da articoli basati su dati SIP.

### 2.4 Quando passare a dati a pagamento
- **Prima del live** (fase F3 della guida 03): con denaro reale ti serve che il breakout visto dal bot
  sia quello del mercato vero. Con il SIP i segnali cambiano: rifai backtest e almeno 4 settimane di
  paper con il nuovo feed.
- **Calcolo di convenienza:** $99/mese sono ~$1.200/anno. Con $10.000 di capitale servono il 12% annuo
  di rendimento solo per pagare i dati. Se il capitale è piccolo valuta se la strategia ha senso,
  oppure una strategia meno sensibile al volume intraday.
- **Alternative:** esistono fornitori di dati di terze parti; se usi dati di un fornitore diverso dal
  broker, aggiungi una verifica di coerenza fra prezzo del dato e prezzo di esecuzione.

---

## 3 · Piattaforme compatibili con questo tipo di bot

### 3.1 Cosa serve a questo bot da un broker
Requisiti **indispensabili**: API ufficiale per ordini e posizioni, esecuzione non presidiata
(nessun login manuale ogni giorno), **stop lato broker**, ambiente paper/demo, accesso da residente
italiano. Requisiti **molto utili**: ordini bracket/OCO nativi, `client_order_id` o idempotenza,
Python supportato, dati in tempo reale economici, regime fiscale amministrato.

### 3.2 Confronto

| | **Alpaca** | **Interactive Brokers** (IBKR Ireland) | **Directa SIM** | **BG Saxo** | **Trading 212** |
|---|---|---|---|---|---|
| Disponibile per residenti in Italia | Sì (via API, mercati USA) | Sì (tutti i clienti SEE serviti da IBKR Ireland dal 2024) | Sì (SIM italiana) | Sì (joint venture Banca Generali–Saxo) | Sì |
| Regime fiscale | Dichiarativo | Dichiarativo | **Amministrato** | **Amministrato** | Dichiarativo **[verifica]** |
| API | REST + WebSocket, SDK Python ufficiale | TWS API / IB Gateway (Python: `ib_async`), Web API | Socket TCP locali (porte 10001 dati, 10002 trading, 10003 storico) con **Darwin aperto** | OpenAPI di Saxo **[verifica disponibilità per clienti BG Saxo]** | REST in **beta** |
| Paper / demo | Sì, nativo e gratuito | Sì (conto paper) | **[verifica]** | Sì (demo Saxo) **[verifica API]** | Sì (demo) |
| Bracket / OCO nativi | **Sì** | **Sì** (ordini padre/figli) | Limit, market, stop, trailing, iceberg; bracket da gestire nel bot **[verifica]** | **[verifica]** | No: limit, stop, stop-limit, market; non idempotente sullo stop-limit |
| Mercati | Solo USA | Globali (150+ mercati) | Italia, principali mercati UE e USA **[verifica]** | Globali | Molti, ma prodotto orientato all'investimento |
| Commissioni azioni USA | $0 | Da ~$0,005/azione (min. ~$1) con IBKR Pro | A ordine **[verifica listino]** | A ordine, più alte **[verifica]** | $0 (costo del cambio a parte) |
| Dati in tempo reale | IEX gratis; SIP ~$99/mese | Abbonamenti a pagamento: Level 1 USA in streaming circa $4,50/mese; il bundle snapshot da ~$10/mese è gratuito sopra ~$30 di commissioni mensili **[verifica]** | Inclusi/a pagamento secondo profilo **[verifica]** | **[verifica]** | Limitati |
| Esecuzione non presidiata | Ottima (solo chiavi API) | **Difficile**: IB Gateway richiede login con 2FA da telefono a ogni riavvio | Richiede Darwin aperto e loggato su un PC/VPS **Windows** | **[verifica]** (token OAuth con scadenza) | Buona |
| Sforzo per adattare il bot | Nessuno (è la base) | Riscrivere `broker.py` e la parte dati; gestire connessione persistente | Riscrivere `broker.py`, gestire socket e bracket lato bot | Riscrivere `broker.py` | Riscrivere `broker.py` e gestire lo stop come ordine separato |
| Adatta a questo bot | ✅ **Consigliata** | ✅ Buona per utenti esperti | ⚠️ Possibile, soprattutto per il vantaggio fiscale | ❓ Da verificare | ❌ Non per intraday |

### 3.3 Schede

**Alpaca — la scelta naturale per iniziare.** API pensata per il trading automatico, paper identico al
live come interfaccia, bracket nativi, zero commissioni. Svantaggi per un italiano: solo mercati USA,
solo USD, regime dichiarativo, possibili restrizioni sugli ETF USA, dati di qualità a pagamento.

**Interactive Brokers — la più completa, la più impegnativa.** Mercati di tutto il mondo, ordini
sofisticati, costi bassi, ottima reputazione. Per un bot non presidiato il problema principale è
l'autenticazione: IB Gateway/TWS vanno lasciati aperti e al riavvio chiedono l'approvazione 2FA sul
telefono; molti utenti usano strumenti di terze parti per automatizzare il riavvio, ma resta una fonte
di fermi. Dati in tempo reale a pagamento (pochi dollari al mese). Gli ETF USA sono in genere bloccati
per i retail UE (PRIIPs). Regime dichiarativo. Verifica anche quando applica il nuovo regime
intraday che sostituisce la PDT.

**Directa SIM — l'opzione "italiana".** Broker italiano con **regime amministrato** (calcola e versa
le imposte) e una delle poche API documentate fra gli intermediari italiani. Funziona tramite la
piattaforma **Darwin**, che deve restare aperta e con utente collegato: le applicazioni si collegano a
socket TCP locali (dati, trading, storico). Per l'automazione serve quindi un PC o un VPS Windows
sempre acceso con Darwin. Tipi d'ordine: limit, market, stop, trailing stop, iceberg; il bracket va
costruito nel bot (entrata, poi stop e target, con cancellazione reciproca gestita da te), il che
**aumenta il rischio operativo**: il bot diventa responsabile di un pezzo della protezione. Richiede la
firma di un accordo per l'uso delle API. Commissioni e costi dati da verificare sul listino.

**BG Saxo — regime amministrato, API da chiarire.** Saxo ha una OpenAPI matura; se e come sia
utilizzabile dai clienti retail di BG Saxo in Italia va chiesto al broker. Commissioni in genere più
alte: con molti trade intraday pesano.

**Trading 212 — no per l'intraday.** L'API è in beta, disponibile per i conti Invest e ISA, con ordini
market, limit, stop e stop-limit ma **senza bracket** e con endpoint non idempotenti (una richiesta
ripetuta può duplicare l'ordine). Può andare per strategie lente, non per un bot intraday che deve
avere uno stop su ogni posizione.

**Da evitare per questo progetto:**
- **Broker CFD** (anche con API o MetaTrader 5): sono derivati con leva, costi di finanziamento e
  margini ESMA. Violano la regola "no leva" e cambiano completamente il profilo di rischio.
- **Broker solo USA** (molti offrono API ottime, ma aprono conti solo a residenti USA).

### 3.4 Come scegliere
| Priorità | Scelta |
|---|---|
| Imparare, testare e andare live con il minimo sforzo tecnico | **Alpaca** |
| Fisco semplice con molti trade, accettando più lavoro tecnico | **Directa** (o BG Saxo se l'API è disponibile) |
| Più mercati, strumenti e robustezza, e sai gestire l'infrastruttura | **Interactive Brokers** |

Un approccio ragionevole: **sviluppo e paper su Alpaca**, perché è il più semplice; poi, prima del live,
decidi se il vantaggio fiscale di un broker italiano giustifica la riscrittura di `broker.py` e un
nuovo periodo paper sulla nuova piattaforma. L'architettura del bot (un solo file parla col broker)
serve proprio a rendere possibile questo cambio.

### 3.5 Se cambi piattaforma: cosa rifare
1. Nuovo `broker.py` con le stesse funzioni e **gli stessi test** (i test di sicurezza non cambiano).
2. Se il broker non ha bracket nativi: test aggiuntivi che provino che una posizione non resta mai senza
   stop per più di N secondi, e riconciliazione più frequente.
3. Dati: se cambia il feed, rifai backtest e ricalibrazione delle soglie.
4. Almeno 4 settimane di paper/demo sulla nuova piattaforma, poi di nuovo il cancello di 03 §2.3.

---

## 4 · Checklist di fattibilità personale

- ☐ Ho chiesto e ottenuto per iscritto le risposte del §1.6.
- ☐ So con quale entità è il conto e quale tutela degli investitori si applica.
- ☐ Ho verificato quali simboli del mio universo sono negoziabili dal mio conto reale.
- ☐ Ho calcolato il costo di cambio per deposito e prelievo.
- ☐ Ho parlato con un commercialista e so quanto costa la gestione del regime dichiarativo
  (o ho scelto un broker in regime amministrato).
- ☐ Ho deciso se pagare i dati SIP e ho rifatto il conto costi/benefici (03 §3.5).
- ☐ Il bot funziona anche con universo di sole azioni.
- ☐ Ho scelto la piattaforma per il live e, se diversa da Alpaca, ho pianificato riscrittura e nuovo paper.

---

## Fonti consultate (settembre 2026)

- FINRA, Regulatory Notice 26-10 (nuovo regime intraday, efficacia 4/6/2026, fase transitoria fino al 20/10/2027): https://www.finra.org/rules-guidance/notices/26-10
- Charles Schwab, "SEC Approves Scrapping $25,000 Day Trader Minimum": https://www.schwab.com/learn/story/sec-approves-scrapping-25000-day-trader-minimum
- Alpaca, "FINRA Retires the PDT Rule: Introducing Alpaca's New Intraday Margin Framework": https://alpaca.markets/blog/finra-retires-the-pdt-rule-introducing-alpacas-new-intraday-margin-framework/
- Alpaca Docs, "The Intraday Margin Rule": https://docs.alpaca.markets/us/docs/the-intraday-margin-rule
- Alpaca Docs, "About Market Data API" e "Market Data FAQ": https://docs.alpaca.markets/us/docs/about-market-data-api · https://docs.alpaca.markets/us/docs/market-data-faq
- Alpaca, "Countries Alpaca is available" e "How to Open a Live Trading Account as a Non-US Resident": https://alpaca.markets/support/countries-alpaca-is-available · https://alpaca.markets/learn/live-trading-account-non-us
- Alpaca, "Can I have a cash account with Alpaca?": https://alpaca.markets/support/alpaca-cash-accounts
- BusinessWire, passaporto SEE di Alpaca (7/7/2026): https://www.businesswire.com/news/home/20260707116782/en/Alpaca-Completes-EEA-Passporting-to-29-Countries-Expanding-Access-to-Regulated-Investment-Services-Across-Europe
- Alpaca Europe docs: https://docs.alpaca.markets/eu/docs/getting-started
- BrokerChooser, recensione e costi Alpaca 2026: https://brokerchooser.com/broker-reviews/alpaca-trading-review · https://brokerchooser.com/broker-reviews/alpaca-trading-review/how-to-withdraw-on-alpaca-trading
- BrokerChooser, broker per algo trading in Italia 2026: https://brokerchooser.com/best-brokers/best-brokers-for-algo-trading-in-italy
- Finorum, "US ETFs in Europe: Why PRIIPs Blocks Retail Access": https://finorum.com/us-etfs-in-europe/
- Interactive Brokers Ireland, costi dati di mercato: https://www.interactivebrokers.ie/en/pricing/market-data-pricing.php
- ib_async (libreria Python per IBKR): https://github.com/ib-api-reloaded/ib_async
- Directa, Trading API e guida API: https://www.directa.it/conto-directa/piattaforme/darwin/trading-api · https://app1.directatrading.com/apiwiki/en.html
- Trading 212 Public API: https://docs.trading212.com/api
- BG Saxo (regime amministrato): https://www.bgsaxo.it/
