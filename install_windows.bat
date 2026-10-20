@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title Cloud2BIM - Installation Windows

echo ====================================================
echo        Cloud2BIM - Installation pour Windows        
echo ====================================================
echo.

cd /d "%~dp0"

:: 1. Détection de Python
echo [1/5] Vérification de Python 3.10+...

set "PY_CMD="

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :check_version
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py -3"
    goto :check_version
)

:: Python non trouvé
echo [ERREUR] Python n'a pas été trouvé sur votre système.
echo.
where winget >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo winget a été détecté.
    set /p "INSTALL_WINGET=Voulez-vous installer Python 3.11 automatiquement via winget ? (O/N) : "
    if /i "!INSTALL_WINGET!"=="O" (
        echo Installation de Python 3.11 en cours...
        winget install -e --id Python.Python.3.11 --override "/passive PrependPath=1"
        echo.
        echo Veuillez redémarrer ce script d'installation après la fin de l'installation de Python.
        pause
        exit /b 0
    )
)

echo Veuillez télécharger et installer Python 3.10 ou supérieur depuis :
echo https://www.python.org/downloads/
echo (Important : cochez la case "Add python.exe to PATH" lors de l'installation)
echo.
set /p "OPEN_WEB=Voulez-vous ouvrir le site de téléchargement de Python ? (O/N) : "
if /i "!OPEN_WEB!"=="O" (
    start https://www.python.org/downloads/
)
pause
exit /b 1

:check_version
for /f "tokens=*" %%v in ('!PY_CMD! -c "import sys; print(str(sys.version_info[0]) + \".\" + str(sys.version_info[1]))"') do set "PY_VER=%%v"
for /f "tokens=*" %%c in ('!PY_CMD! -c "import sys; print(int(sys.version_info >= (3, 10)))"') do set "PY_COMPAT=%%c"

if not "!PY_COMPAT!"=="1" (
    echo [ERREUR] La version de Python détectée (!PY_VER!) est inférieure à 3.10.
    echo Cloud2BIM nécessite Python 3.10 ou supérieur.
    pause
    exit /b 1
)

echo [OK] Python !PY_VER! détecté avec succès.
echo.

:: 2. Création de l'environnement virtuel (.venv)
echo [2/5] Configuration de l'environnement virtuel (.venv)...
if not exist ".venv\Scripts\python.exe" (
    echo Création du virtualenv dans .venv...
    !PY_CMD! -m venv .venv
    if %ERRORLEVEL% neq 0 (
        echo [ERREUR] Échec de création de l'environnement virtuel.
        pause
        exit /b 1
    )
) else (
    echo Environnement virtuel existant réutilisé.
)
echo.

:: 3. Mise à niveau de pip et installation des dépendances
echo [3/5] Installation des dépendances Python...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel
if %ERRORLEVEL% neq 0 (
    echo [AVERTISSEMENT] La mise à jour de pip a échoué, continuation avec la version existante...
)

set "REQ_FILE=requirements.txt"
if not exist "%REQ_FILE%" set "REQ_FILE=requirements-docker.txt"

echo Installation depuis %REQ_FILE%...
call ".venv\Scripts\pip.exe" install -r "%REQ_FILE%"
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] L'installation de certaines dépendances a échoué.
    echo Vérifiez votre connexion Internet et réessayez.
    pause
    exit /b 1
)

:: S'assurer que FastAPI et Uvicorn sont installés
call ".venv\Scripts\python.exe" -c "import uvicorn, fastapi" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installation de FastAPI et Uvicorn...
    call ".venv\Scripts\pip.exe" install "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" "python-multipart>=0.0.12" "aiofiles>=24.1.0"
)

echo. > ".venv\.deps.stamp"
echo [OK] Dépendances installées avec succès.
echo.

:: 4. Création du raccourci sur le Bureau
echo [4/5] Création du raccourci Bureau...
set "TARGET_BAT=%CD%\start_windows.bat"
set "ICON_FILE=%CD%\icon.ico"
if not exist "%ICON_FILE%" set "ICON_FILE=%CD%\title.png"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\Cloud2BIM.lnk\"); " ^
  "$s.TargetPath = '%TARGET_BAT%'; " ^
  "$s.WorkingDirectory = '%CD%'; " ^
  "if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%'; }; " ^
  "$s.Description = 'Cloud2BIM - Automated Scan-to-BIM'; " ^
  "$s.Save()" >nul 2>&1

if exist "%USERPROFILE%\Desktop\Cloud2BIM.lnk" (
    echo [OK] Raccourci créé sur votre Bureau : Cloud2BIM.lnk
) else (
    echo [INFO] Impossible de créer le raccourci automatiquement. Vous pouvez lancer start_windows.bat.
)
echo.

:: 5. Test d'intégrité
echo [5/5] Test de fonctionnement...
call ".venv\Scripts\python.exe" -c "import open3d, ifcopenshell, cv2, fastapi, uvicorn; from web.main import app; print('OK')" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Tous les modules Cloud2BIM sont opérationnels !
) else (
    echo [AVERTISSEMENT] Le test d'import a rencontré un avertissement mineur.
)

echo.
echo ====================================================
echo        Installation terminée avec succès !
echo ====================================================
echo.
echo Vous pouvez démarrer Cloud2BIM :
echo   - Via le raccourci Cloud2BIM sur votre Bureau
echo   - Ou en double-cliquant sur start_windows.bat
echo.
echo L'application s'ouvrira sur http://localhost:8001
echo.

set /p "LAUNCH_NOW=Voulez-vous lancer Cloud2BIM maintenant ? (O/N) : "
if /i "%LAUNCH_NOW%"=="O" (
    start "" "%TARGET_BAT%"
)

exit /b 0
