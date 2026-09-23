# Installazione dell'ambiente Python (PowerShell normale, dalla cartella del progetto).
$ErrorActionPreference = "Stop"
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Creato .env: inserisci le chiavi PAPER con un editor di testo." }
if (-not (Test-Path ledger\fills.csv)) {
    "date,action,symbol,qty,price_usd,commission_usd,ticket_id,note" | Out-File -Encoding utf8 ledger\fills.csv
}
.\.venv\Scripts\python.exe -m pytest -q
