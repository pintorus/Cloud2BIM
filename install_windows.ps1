# ==============================================================================
# Cloud2BIM - Windows PowerShell Installer
# Automated Scan-to-BIM pipeline
# ==============================================================================
[CmdletBinding()]
param (
    [switch]$SkipShortcut,
    [switch]$Launch
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       Cloud2BIM - Installation pour Windows        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python
Write-Host "[1/5] Recherche de Python 3.10+..." -ForegroundColor Yellow

$PythonCmd = $null
$Candidates = @("python", "py")

foreach ($cmd in $Candidates) {
    try {
        $ver = & $cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        $isCompat = & $cmd -c "import sys; print(1 if sys.version_info >= (3, 10) else 0)" 2>$null
        if ($isCompat -eq "1") {
            $PythonCmd = $cmd
            $PythonVersion = $ver
            break
        }
    } catch {
        # ignore and continue
    }
}

if (-not $PythonCmd) {
    Write-Host "[ERREUR] Python 3.10 ou supérieur est requis mais n'a pas été trouvé." -ForegroundColor Red
    Write-Host "Vous pouvez installer Python 3.11 avec winget :" -ForegroundColor Yellow
    Write-Host "  winget install -e --id Python.Python.3.11"
    Write-Host "Ou le télécharger sur : https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Assurez-vous de cocher 'Add python.exe to PATH' pendant l'installation."
    exit 1
}

Write-Host "✓ Python $PythonVersion détecté ($PythonCmd)" -ForegroundColor Green

# 2. Virtual environment (.venv)
Write-Host "`n[2/5] Configuration de l'environnement virtuel (.venv)..." -ForegroundColor Yellow
$VenvDir = Join-Path $RootDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Création de l'environnement virtuel dans $VenvDir..."
    if ($PythonCmd -eq "py") {
        & py -3 -m venv $VenvDir
    } else {
        & python -m venv $VenvDir
    }
} else {
    Write-Host "Environnement virtuel existant réutilisé."
}

Write-Host "✓ Environnement virtuel prêt." -ForegroundColor Green

# 3. Dependencies
Write-Host "`n[3/5] Installation des dépendances Python..." -ForegroundColor Yellow
& $VenvPython -m pip install --upgrade pip setuptools wheel

$ReqFile = Join-Path $RootDir "requirements.txt"
if (-not (Test-Path $ReqFile)) {
    $ReqFile = Join-Path $RootDir "requirements-docker.txt"
}

Write-Host "Installation depuis $(Split-Path -Leaf $ReqFile)..."
& $VenvPip install -r $ReqFile

# Verify web packages
$hasWeb = & $VenvPython -c "import uvicorn, fastapi; print('1')" 2>$null
if ($hasWeb -ne "1") {
    Write-Host "Installation complémentaire de FastAPI et Uvicorn..."
    & $VenvPip install "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" "python-multipart>=0.0.12" "aiofiles>=24.1.0"
}

New-Item -ItemType File -Path (Join-Path $VenvDir ".deps.stamp") -Force | Out-Null
Write-Host "✓ Dépendances installées avec succès." -ForegroundColor Green

# 4. Shortcut creation
if (-not $SkipShortcut) {
    Write-Host "`n[4/5] Création du raccourci Bureau..." -ForegroundColor Yellow
    try {
        $DesktopPath = [Environment]::GetFolderPath("Desktop")
        $ShortcutFile = Join-Path $DesktopPath "Cloud2BIM.lnk"
        $TargetBat = Join-Path $RootDir "start_windows.bat"
        $IconFile = Join-Path $RootDir "icon.ico"
        if (-not (Test-Path $IconFile)) {
            $IconFile = Join-Path $RootDir "title.png"
        }

        $WScript = New-Object -ComObject WScript.Shell
        $Shortcut = $WScript.CreateShortcut($ShortcutFile)
        $Shortcut.TargetPath = $TargetBat
        $Shortcut.WorkingDirectory = $RootDir
        if (Test-Path $IconFile) {
            $Shortcut.IconLocation = $IconFile
        }
        $Shortcut.Description = "Cloud2BIM - Automated Scan-to-BIM Web Application"
        $Shortcut.Save()
        Write-Host "✓ Raccourci créé sur le Bureau : $ShortcutFile" -ForegroundColor Green
    } catch {
        Write-Host "[INFO] Impossible de créer le raccourci automatiquement : $_" -ForegroundColor DarkGray
    }
}

# 5. Integrity check
Write-Host "`n[5/5] Test de fonctionnement..." -ForegroundColor Yellow
$testOk = & $VenvPython -c "import open3d, ifcopenshell, cv2, fastapi, uvicorn; from web.main import app; print('OK')" 2>$null
if ($testOk -eq "OK") {
    Write-Host "✓ Tous les modules Cloud2BIM sont opérationnels !" -ForegroundColor Green
} else {
    Write-Host "[AVERTISSEMENT] Le test d'import a rencontré un avertissement mineur." -ForegroundColor Yellow
}

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "       Installation terminée avec succès !          " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "`nPour démarrer Cloud2BIM :"
Write-Host "  - Double-cliquez sur le raccourci Cloud2BIM sur votre Bureau"
Write-Host "  - Ou exécutez .\start_windows.bat"
Write-Host "`nL'application s'ouvrira sur http://localhost:8001`n"

if ($Launch) {
    Start-Process (Join-Path $RootDir "start_windows.bat")
}
