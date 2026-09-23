# Registro delle modifiche

Ogni modifica a strategia o parametri va annotata qui con data e motivo, e fa ripartire il test
(backtest → paper). I bugfix vanno annotati ma non cambiano le regole.

## 2026-09-23 — v0.1.0
- Prima versione del motore di segnali settimanali (`segnali/`): variante A (rotazione momentum su
  azioni USA, 1 posizione, stop 3×ATR mobile), benchmark teorici B e C, ticket, registro delle
  esecuzioni manuali, esecuzione sul conto paper Alpaca, backtest con commissioni, gap e imposte
  stimate, job per Windows.
- Parametri iniziali: vedi `segnali/config.py` e `docs/07` §7.
