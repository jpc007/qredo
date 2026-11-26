# =====================================================================
# QREDO - Voir l'application en direct sur un téléphone Android (USB)
# ---------------------------------------------------------------------
# 1. Lancer Live Server dans VS Code ("Go Live" en bas à droite)
# 2. Brancher le téléphone (débogage USB activé)
# 3. powershell -ExecutionPolicy Bypass -File tools\phone-dev.ps1
# 4. Sur le téléphone, Chrome :  http://localhost:5500
#
# "adb reverse" fait voir le PC comme "localhost" au téléphone :
# Chrome considère alors la page comme sécurisée -> caméra, installation
# et mode hors ligne fonctionnent comme en production.
# =====================================================================

param([int]$Port = 5500, [string]$Serial = '')

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { Write-Error "adb introuvable : $adb"; exit 1 }

$devices = & $adb devices | Select-String '\tdevice$' | ForEach-Object { ($_ -split '\t')[0] }
if (-not $devices) { Write-Error 'Aucun téléphone détecté en adb.'; exit 1 }
if ($Serial) { $devices = @($Serial) }

foreach ($d in $devices) {
    & $adb -s $d reverse "tcp:$Port" "tcp:$Port" | Out-Null
    $model = (& $adb -s $d shell getprop ro.product.model).Trim()
    Write-Host "OK  $model ($d) -> http://localhost:$Port"
    # Ouvre directement la page dans Chrome sur le téléphone
    & $adb -s $d shell am start -a android.intent.action.VIEW -d "http://localhost:$Port/" com.android.chrome | Out-Null
}
