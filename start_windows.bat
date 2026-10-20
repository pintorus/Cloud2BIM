@echo off
chcp 65001 >nul
title Cloud2BIM - Serveur Web
cd /d "%~dp0"

echo ====================================================
echo  Cloud2BIM - Démarrage du serveur web
echo  URL : http://localhost:8001
echo  (Appuyez sur Ctrl+C dans cette fenêtre pour arrêter)
echo ====================================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [ERREUR] L'environnement virtuel n'est pas encore configuré.
    echo Lancement de l'installateur install.bat...
    echo.
    call "%~dp0install_windows.bat"
    if not exist ".venv\Scripts\python.exe" (
        echo L'installation n'a pas pu se terminer.
        pause
        exit /b 1
    )
)

:: Ouvre automatiquement le navigateur après 2 secondes
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8001"

:: Lancement du serveur uvicorn
call ".venv\Scripts\python.exe" -m uvicorn web.main:app --host 127.0.0.1 --port 8001 %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo Le serveur s'est arrêté avec une erreur.
    pause
)
