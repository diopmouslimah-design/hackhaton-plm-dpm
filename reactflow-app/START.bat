@echo off
REM Démarrage du serveur de conversion 3D et de l'application
REM Nécessite Node.js et npm installés

echo.
echo ========================================
echo Production Dashboard - Démarrage
echo ========================================
echo.

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installé
    exit /b 1
)

echo ✓ Node.js détecté
echo.

REM Installer les dépendances si node_modules n'existe pas
if not exist "node_modules" (
    echo Installation des dépendances...
    call cmd /c "npm install"
    if errorlevel 1 (
        echo ERREUR lors de l'installation
        exit /b 1
    )
)

echo.
echo ========================================
echo Services démarrés:
echo - Application : http://localhost:5173
echo - Serveur 3D  : http://localhost:5000
echo ========================================
echo.

REM Démarrer les deux services
title Production Dashboard
start cmd /k "cd /d %cd% && npm run dev"
timeout /t 3
start cmd /k "cd /d %cd% && node conversion-server.js"

echo.
echo Appuyez sur Ctrl+C pour arrêter
