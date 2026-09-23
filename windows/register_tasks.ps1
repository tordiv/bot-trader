# Registra i job del motore di segnali nell'Utilità di pianificazione di Windows.
# Uso (PowerShell come amministratore, dalla cartella del progetto):
#     .\windows\register_tasks.ps1                 # solo ticket e controlli
#     .\windows\register_tasks.ps1 -SubmitPaper    # invia anche i ticket al conto PAPER
# Per rimuovere i job:  .\windows\register_tasks.ps1 -Remove
param(
    [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$User = "$env:USERDOMAIN\$env:USERNAME",
    [switch]$SubmitPaper,
    [switch]$Remove
)
$ErrorActionPreference = "Stop"
$names = @("BotSegnali-Daily", "BotSegnali-Weekly")

if ($Remove) {
    foreach ($n in $names) { Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue }
    Write-Host "Job rimossi."
    exit 0
}

$python = Join-Path $ProjectDir ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "Ambiente virtuale non trovato: $python (esegui prima l'installazione)" }

# StartWhenAvailable = se il PC era spento all'orario previsto, il job parte appena possibile.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
# S4U = esegue anche senza utente collegato, senza salvare la password.
$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType S4U -RunLevel Limited

$weeklyArgs = "weekly.py"
if ($SubmitPaper) { $weeklyArgs += " --submit-paper" }

$daily = New-ScheduledTaskAction -Execute $python -Argument "daily.py" -WorkingDirectory $ProjectDir
$weekly = New-ScheduledTaskAction -Execute $python -Argument $weeklyArgs -WorkingDirectory $ProjectDir
# Orari in ora italiana: 22:45 è dopo la chiusura USA anche quando questa è alle 22:00.
$dailyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday -At "22:45"
$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At "09:00"

Register-ScheduledTask -TaskName $names[0] -Action $daily -Trigger $dailyTrigger -Settings $settings `
    -Principal $principal -Description "Controlli serali del motore di segnali" -Force | Out-Null
Register-ScheduledTask -TaskName $names[1] -Action $weekly -Trigger $weeklyTrigger -Settings $settings `
    -Principal $principal -Description "Ticket settimanali del motore di segnali" -Force | Out-Null

Write-Host "Job registrati:"
Get-ScheduledTask -TaskName $names | Select-Object TaskName, State | Format-Table
Write-Host "Prova subito un job con:  Start-ScheduledTask -TaskName BotSegnali-Weekly"
