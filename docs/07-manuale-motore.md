# 07 — Manuale del motore di segnali (codice in `segnali/`)

> Implementazione del piano di [`06-piano-operativo.md`](06-piano-operativo.md): segnali settimanali
> su azioni USA, esecuzione **manuale** su Directa, test sul conto **paper** Alpaca.
> Non è consulenza finanziaria. Il programma non si collega mai al tuo conto reale.

---

## 1 · Cosa fa e cosa non fa

| Fa | Non fa |
|---|---|
| Scarica barre giornaliere gratuite da Alpaca (feed SIP storico, aggiustate per split e dividendi) | Non invia **mai** ordini a Directa o a un conto reale |
| Ogni sabato calcola la classifica e produce i **ticket** (acquista / vendi / sposta stop) | Non usa leva, short, opzioni, futures, ETF |
| Ogni sera controlla stop, dati e registro, e ti avvisa solo se serve | Non decide al posto tuo se andare live |
| Durante il test esegue gli stessi ticket sul conto **paper** (acquisto sempre insieme allo stop) | Non garantisce risultati: il backtest non è una previsione |
| Fa il backtest della strategia con commissioni, slippage, gap e imposte stimate | |

---

## 2 · I file

| File | A cosa serve |
|---|---|
| `segnali/config.py` | **Tutti** i parametri. È l'unico file da toccare per cambiare la strategia (e ogni modifica fa ripartire il test). |
| `segnali/strategy.py` | Indicatori (SMA, ATR, momentum), classifica, decisione settimanale. Funzioni pure. |
| `segnali/risk.py` | Quante azioni comprare, controllo delle commissioni, limiti dell'esperimento. |
| `segnali/planner.py` | Dalla decisione agli ordini concreti (stessa logica per backtest e ticket). |
| `segnali/tickets.py` | Ticket leggibili (Markdown/Telegram) e salvati in JSON. |
| `segnali/ledger.py` | Il tuo registro delle esecuzioni manuali (`ledger/fills.csv`). |
| `segnali/paper.py` | L'**unico** file che invia ordini, solo al conto paper Alpaca. |
| `segnali/sim.py` | Backtest della variante A e benchmark teorici B (trend sull'indice) e C (buy & hold). |
| `segnali/tax.py` | Stima semplificata del 26% con zainetto fiscale. |
| `segnali/data.py`, `synthetic.py` | Dati Alpaca con cache; dati finti solo per prove tecniche. |
| `weekly.py`, `daily.py`, `backtest.py` | I tre comandi (`--help` per le opzioni). |
| `windows/*.ps1` | Installazione, alimentazione, registrazione dei job. |
| `tests/` | 48 test automatici, nessuno richiede rete o chiavi. |

---

## 3 · Installazione su Windows (una volta)

1. Installa **Python 3.11 o più recente** da python.org (spunta "Add python.exe to PATH") e **Git**.
2. Scarica il progetto in una cartella, ad esempio `C:\bot-trader`:
   ```powershell
   git clone https://github.com/tordiv/bot-trader C:\bot-trader
   cd C:\bot-trader
   ```
3. Consenti gli script locali (una volta sola) e installa l'ambiente:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   .\windows\install.ps1
   ```
   Lo script crea `.venv`, installa i pacchetti di `requirements.txt` (incluso `tzdata`, indispensabile
   su Windows per i fusi orari), crea `.env` e `ledger\fills.csv` e lancia i test: devono risultare
   tutti **passed**.
4. Apri `.env` con il Blocco note e inserisci le chiavi **paper** di Alpaca. Non incollarle altrove.
5. Nella dashboard Alpaca imposta il conto paper a **1.150 $** (≈ 1.000 € al cambio di `config.py`).
6. Alimentazione (PowerShell **come amministratore**): `.\windows\power_settings.ps1`.
   Per Windows Update segui 06 §7 (installazione il sabato a mezzogiorno, nessun riavvio automatico).

Da qui in poi, per lanciare un comando a mano: `.\.venv\Scripts\python.exe <comando>` dalla cartella
del progetto (oppure attiva prima l'ambiente con `.\.venv\Scripts\Activate.ps1` e usa `python`).

---

## 4 · Primi passi (in quest'ordine)

```powershell
python -m pytest -q                                   # 1. i test devono passare tutti
python backtest.py --source alpaca                    # 2. backtest con dati reali (scarica e salva in cache)
python backtest.py --source csv                       #    ripetizioni successive, dalla cache, senza rete
python weekly.py --dry-run --positions none           # 3. ticket che produrrebbe oggi, senza salvare nulla
python weekly.py --dry-run --positions paper          # 4. idem, leggendo il conto paper
```

**Come leggere il backtest** (`reports\backtest-alpaca-AAAA-MM-GG.md`):
- confronta la riga **out-of-sample** della variante A con B e C: è l'unica parte non "vista" durante
  la scelta dei parametri;
- guarda **max drawdown** e **trade/anno**: con 9 $ a ordine ogni trade in più costa;
- "candidati scartati" alto significa che i limiti di rischio/commissioni bloccano spesso i trade: è
  l'effetto previsto del capitale piccolo, non un errore;
- se A non batte C dopo costi e imposte, **fermati**: il piano va rivisto prima del paper.

> Il comando `python backtest.py --source synthetic` usa dati casuali: serve solo a verificare che il
> programma giri. I suoi numeri non significano nulla.

---

## 5 · Fase paper (almeno 3 mesi)

1. In `.env` imposta `PAPER_SUBMIT_ENABLED=true` (è l'equivalente del "START PAPER": finché è `false`
   nessun ordine parte, nemmeno al paper).
2. Registra i job (PowerShell **come amministratore**):
   ```powershell
   .\windows\register_tasks.ps1 -SubmitPaper
   Start-ScheduledTask -TaskName BotSegnali-Weekly      # prova immediata
   ```
3. Ogni sabato alle 9:00 il job settimanale salva `tickets\AAAA-MM-GG.md`, il report
   `reports\weekly-AAAA-MM-GG.md`, ti manda i ticket su Telegram e li invia al paper. L'acquisto paper
   parte insieme al suo stop (ordine OTO): la posizione non resta mai scoperta.
4. Ogni sera alle 22:45 il job giornaliero cancella gli acquisti paper scaduti, ricrea uno stop se
   mancasse (segnalandolo come violazione) e ti avvisa se un prezzo è vicino allo stop.
5. Tu, ogni settimana: leggi il report, controlla `RULE VIOLATIONS: NONE`, e **leggi i ticket come se
   dovessi eseguirli davvero** (è l'allenamento per la fase live). Nelle ultime 2 settimane eseguili a
   mano sul conto demo Directa.

Registro degli eventi: `logs\events.log`. Stato dei job: Utilità di pianificazione →
`BotSegnali-Daily` / `BotSegnali-Weekly` → "Risultato ultima esecuzione" (0 = ok; 1 dal job serale =
violazione segnalata).

---

## 6 · Fase live su Directa (esecuzione manuale)

1. Solo dopo il cancello di 06 §4.
2. In `segnali/config.py` imposta `POSITIONS_FROM = "ledger"` e registra i job **senza** invio al paper:
   `.\windows\register_tasks.ps1` (se vuoi continuare anche il paper come confronto, usa una seconda
   copia della cartella con `POSITIONS_FROM = "paper"`).
3. Registra **ogni** evento in `ledger\fills.csv` (esempio completo in `ledger\fills.example.csv`):

   | Evento | Riga da aggiungere |
   |---|---|
   | Versamento | `2026-12-01,DEPOSIT,,,1150.00,,,versamento` (controvalore in $ indicato da Directa) |
   | Acquisto eseguito | `2026-12-07,BUY,XYZ,12,74.10,9.00,20261204-01,` (`ticket_id` del ticket) |
   | Stop inserito o spostato | `2026-12-07,STOP,XYZ,,69.70,,20261204-01,` |
   | Vendita da ticket | `2027-01-11,SELL,XYZ,12,82.40,9.00,20270108-01,` |
   | Vendita causata dallo stop | `2027-01-05,SELL,XYZ,12,69.55,9.00,STOP,` |
   | Stop cancellato prima di vendere | `2027-01-11,STOP_CANCEL,XYZ,,,,,` |
   | Imposta trattenuta da Directa | `2027-01-11,TAX,,,4.10,,,` |
   | Dividendo netto | `2027-02-15,DIVIDEND,,,1.20,,,` |
   | Allineamento al saldo del broker | `2027-01-31,CASH_ADJUST,,,-2.35,,,cambio e arrotondamenti` |

4. Una volta a settimana confronta il saldo in dollari calcolato dal bot (report) con quello di Directa
   e correggi la differenza con una riga `CASH_ADJUST` (il cambio EUR/USD e le imposte la creano).
5. Il report settimanale segnala come violazioni: posizioni senza stop, acquisti sopra il limite del
   ticket, quantità superiori al ticket, righe del registro non valide.
6. Limiti dell'esperimento automatici: sotto 800 € niente nuovi acquisti (**PAUSA**), sotto 650 € solo
   vendite (**STOP**, ritorno al paper). La conversione usa `EURUSD` di `config.py`: aggiornalo se il
   cambio si sposta molto.

---

## 7 · I parametri principali (`segnali/config.py`)

| Parametro | Valore | Significato |
|---|---|---|
| `UNIVERSE` | 30 azioni USA | Lista modificabile; il filtro di prezzo scarta ogni settimana quelle sopra `MAX_PRICE_USD` |
| `MAX_POSITIONS` | 1 | Una posizione alla volta (con 1.000 € e 9 $/ordine non c'è spazio per di più) |
| `MOMENTUM_DAYS` / `SKIP_DAYS` | 126 / 5 | Rendimento a ~6 mesi escludendo l'ultima settimana |
| `SMA_DAYS` | 200 | Titolo e indice devono essere sopra la media a 200 sedute |
| `EXIT_RANK` | 8 | Vendi se il titolo scende oltre l'8° posto fra i titoli in trend |
| `ATR_MULT` | 3 | Stop a 3 volte la volatilità media; si alza ogni settimana, mai si abbassa |
| `RISK_PER_TRADE_MAX` | 5% | Rischio massimo per trade (alto per necessità: vedi 06 §2.2) |
| `MAX_COMMISSION_R` | 0,35 | Niente ticket se le commissioni superano 0,35 volte il rischio |
| `COMMISSION_PER_ORDER_USD` | 9 | Commissione Directa per ordine USA **[verifica]** |
| `LIMIT_BUFFER_PCT` | 1% | Prezzo limite = ultima chiusura + 1%: non si insegue il prezzo |
| `TICKET_VALID_TRADING_DAYS` | 2 | Un ticket di acquisto scade alla chiusura del martedì |
| `EXPERIMENT_*_EQUITY_EUR` | 800 / 650 | Limiti di pausa e di stop dell'esperimento |

Nota aritmetica importante: con 1.150 $ il rischio massimo è 57,50 $, quindi 18 $ di commissioni
valgono **almeno 0,31 R**. Il limite di 0,35 R lascia passare solo i trade dimensionati quasi al
massimo: molti candidati verranno scartati. È il costo del capitale piccolo, ed è giusto che il bot
lo mostri invece di nasconderlo.

---

## 8 · Cosa dimostrano i test

`python -m pytest -q` (48 test, nessuna rete). Fra gli altri:
- il sizing non supera mai rischio massimo, controvalore massimo e liquidità (commissioni comprese);
- un acquisto senza stop è impossibile (ticket, registro e paper lo rifiutano);
- i trade con commissioni oltre 0,35 R vengono scartati e si passa al candidato successivo;
- nessun uso di dati futuri, né nella decisione né nel backtest;
- nel backtest un gap sotto lo stop viene eseguito al prezzo di apertura (il peggiore);
- il filtro di mercato blocca gli acquisti; il tetto di prezzo non fa vendere un titolo già in portafoglio;
- lo stop mobile si alza soltanto;
- la scadenza dei ticket è corretta in ora italiana anche nelle settimane con ora legale non allineata;
- il registro calcola cassa, posizioni e risultato e segnala posizioni senza stop e acquisti sopra il limite;
- lo zainetto fiscale compensa e scade dopo 4 anni;
- il paper rifiuta qualsiasi modalità diversa da `paper` e i conti che non sembrano paper; rilanciare un
  job non duplica gli ordini; prima di vendere cancella lo stop; lo stop si sposta solo verso l'alto.

---

## 9 · Limiti noti e cose da verificare alla prima esecuzione reale

- **Mai eseguito contro i server Alpaca in fase di sviluppo** (l'ambiente di sviluppo non aveva accesso
  ad Alpaca né chiavi): la prima volta lancia `backtest.py --source alpaca` e `weekly.py --dry-run
  --positions paper` e controlla che non ci siano errori. Se ce ne sono, incollali in Claude Code.
- Accettazione degli ordini **OTO con durata GTC** sul paper: verifica nella dashboard, dopo il primo
  invio, che l'acquisto abbia la gamba di stop.
- **Festività USA** non considerate nella scadenza dei ticket (un ticket può scadere un giorno prima).
- **Bias di sopravvivenza** dell'universo e **benchmark teorici** (SPY non acquistabile da un residente UE).
- **Cambio EUR/USD** e dividendi trattati in modo semplificato; imposta stimata, non calcolata.
- Directa: lo stop sugli USA scatta sul **bid** e la sua **validità multigiorno** va confermata
  (06 §5.3): è il punto che può bloccare il piano.
- Il paper Alpaca esegue in modo ottimistico: in live i prezzi saranno un po' peggiori.

---

## 10 · Problemi comuni

| Messaggio | Causa e soluzione |
|---|---|
| `Chiavi Alpaca mancanti in .env` | `.env` non creato o chiavi non inserite: vedi §3 punto 4. |
| `Live trading is disabled in this build` | `TRADING_MODE` in `.env` non è `paper`. |
| `Invio al paper non abilitato` | `PAPER_SUBMIT_ENABLED=false`: voluto finché non inizi il paper (§5). |
| `ZoneInfoNotFoundError` | Manca `tzdata`: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`. |
| `subscription does not permit querying recent SIP data` | Richiesta di dati troppo recenti: rilancia più tardi (il programma già esclude gli ultimi 20 minuti). |
| `ERRORE registro: riga N ...` | Correggi la riga indicata in `ledger\fills.csv` (formato data AAAA-MM-GG, punto decimale). |
| Nessun ticket per settimane | Normale se il mercato è sotto la SMA200 o se i candidati sono scartati per commissioni: il report spiega perché. |
