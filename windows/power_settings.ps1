# Impostazioni di alimentazione per un PC che deve restare sempre acceso.
# Esegui in PowerShell come amministratore.
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change disk-timeout-ac 0
powercfg /hibernate off
w32tm /resync
Write-Host "Fatto. Ricorda anche: BIOS 'Restore on AC power loss' e Windows Update (vedi docs/07)."
