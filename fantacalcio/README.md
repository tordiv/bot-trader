# Fanta War Room · Serie A 2026/27

Applicazione web a pagina singola (SPA) per l'**asta del Fantacalcio** (regolamento Classic con Modificatore di Difesa classico): banco di comando per l'asta dal vivo e centro di preparazione strategica. Funziona offline: stemmi e dati sono tutti in locale, lo stato si salva nel `localStorage` del browser.

## Viste e scorciatoie

| Tasto | Vista |
|---|---|
| `1` / `Alt+1` | **Asta Live (War Room)**: barra fissa con budget residuo, slot `P/D/C/A`, MaxBid, media per slot; rosa su campo (3-4-3 / 4-3-3 / 4-4-2) o in tabella con subtotali; Rival Tracker (8–12 rivali) con spesa rapida; cronologia; allarmi coppie |
| `2` / `Alt+2` | **Strategia & Budget**: crediti e slot (default 500, 3-8-8-6), ripartizione per ruolo, piano slot per slot con Δ reale/pianificato, modificatore di difesa (soglie, simulatore, proiezione sulla rosa), centrali da modificatore vs esterni da bonus |
| `3` / `Alt+3` | **Pupilli, Ballottaggi & Coppie**: bacheche Must-Have / Solo sotto budget / Scommessa a 1, ballottaggi per squadra, coppie titolare + riserva con avviso se un rivale ne prende uno |
| `4` / `Alt+4` | **Griglia Portieri**: matrice 20×20 di alternanza casa/trasferta dal calendario ufficiale; acquistando un portiere vengono evidenziati i partner migliori |
| `5` / `Alt+5` | **Listone & Import**: database completo, filtri, note, prezzi obiettivo, import `.csv`/`.xlsx` di Leghe Fantacalcio, backup |
| `Ctrl+K` / `Cmd+K` | Acquisto rapido: ricerca fuzzy, `Tab` Io/Rivale, `Alt+1…9` sceglie il rivale, `Invio` conferma (beep) |
| `Ctrl+Z` | Annulla l'ultimo acquisto registrato |

**MaxBid** = crediti residui − (slot vuoti − 1).
**Modificatore**: media di portiere + 3 migliori difensori (con almeno 4 difensori schierati): 6,00–6,24 → +1 · 6,25–6,49 → +3 · 6,50–6,99 → +5 · ≥ 7,00 → +6.

## Dati

- `src/data/initialPlayers.json`: i 535 giocatori del **listone ufficiale Leghe Fantacalcio 2026/27** (`scripts/fonti/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx`) delle 20 squadre (Atalanta, Bologna, Cagliari, Como, Fiorentina, Frosinone, Genoa, Inter, Juventus, Lazio, Lecce, Milan, Monza, Napoli, Parma, Roma, Sassuolo, Torino, Udinese, Venezia) con Id, ruolo Classic e Mantra, Qt.A, Qt.I, FVM; arricchiti con ruolo dettagliato (centrale/terzino…), titolare/ballottaggio/riserva, 1° e 2° rigorista, punizioni, corner, età, presenze e gol.
- `src/data/goalkeeperMatrix.json`: coefficiente 0–10 per ogni coppia di squadre, calcolato sul calendario ufficiale 2026/27.
- `public/crests/*.svg`: stemmi delle 20 squadre (con scudo generico di riserva se un file non si carica).

Ruoli e quotazioni arrivano dal listone ufficiale; età, presenze e gol dalle pagine Wikipedia dei club (sezione *Current squad*), abbinate per cognome e squadra (alias in `scripts/curation.mjs`); il calendario da [openfootball/football.json](https://github.com/openfootball/football.json). Titolari, ballottaggi e rigoristi sono **stime pre-asta** in `scripts/curation.mjs`. Per aggiornare le quotazioni basta sostituire il file in `scripts/fonti/` e rilanciare `npm run data`, oppure importare il nuovo listone dall'app (note, pupilli e prezzi obiettivo vengono conservati).

Per rigenerare i dati (serve rete):

```bash
npm run data
```

## Sviluppo

```bash
npm install
npm run dev      # sviluppo
npm test         # test unitari (MaxBid, modificatore, piano slot, import xlsx/csv, integrità dataset)
npm run build    # build di produzione in dist/
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Zustand (persistenza in `localStorage`), PapaParse, SheetJS (`xlsx` 0.20.3 dal CDN ufficiale SheetJS, la versione su npm è ferma e vulnerabile), lucide-react, canvas-confetti.

## Pubblicazione su GitHub Pages

`vite.config.ts` usa `base: './'`: la build funziona su qualsiasi sottopercorso (`https://<utente>.github.io/<repo>/`) e anche aperta da file statici.
Il workflow `.github/workflows/deploy.yml` (nella radice del repository) compila, testa e pubblica `fantacalcio/dist` a ogni push su `main` che tocca `fantacalcio/`, oppure a mano da *Actions → Run workflow*.
Una tantum: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
