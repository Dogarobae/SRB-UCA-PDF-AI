@echo off
setlocal
cd /d "%~dp0"

echo Se eliminaran y reinstalaran las dependencias de Node.js.
if exist node_modules rmdir /s /q node_modules
call npm ci --registry=https://registry.npmjs.org
if errorlevel 1 (
    echo ERROR: La reinstalacion fallo.
    pause
    exit /b 1
)
call npm run verify
pause
