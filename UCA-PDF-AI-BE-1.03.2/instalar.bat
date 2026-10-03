@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  UCA AI B-E 1.03.2 - Instalacion
echo  SRB powered this AI.
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado o no se encuentra en PATH.
    echo Se requiere Node.js 22.13.0 o posterior.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm no se encuentra disponible.
    pause
    exit /b 1
)

node -e "const [a,b,c]=process.versions.node.split('.').map(Number); process.exit(a>22 || (a===22 && (b>13 || (b===13 && c>=0))) ? 0 : 1)"
if errorlevel 1 (
    echo ERROR: Se requiere Node.js 22.13.0 o posterior.
    pause
    exit /b 1
)

echo Instalando dependencias de Node.js...
call npm ci --registry=https://registry.npmjs.org
if errorlevel 1 (
    echo ERROR: npm ci fallo.
    echo Ejecuta instalar-limpio.bat si existe una dependencia nativa incompatible.
    pause
    exit /b 1
)

echo.
call npm run verify
if errorlevel 1 (
    echo ERROR: La integridad de la entrega no pudo verificarse.
    pause
    exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
    echo ADVERTENCIA: Falta Ollama. Instala Ollama y despues ejecuta instalar-modelo.bat.
    pause
    exit /b 0
)

call "%~dp0instalar-modelo.bat" --sin-pausa
if errorlevel 1 exit /b 1

echo.
echo Instalacion terminada.
echo Para usar la aplicacion sin internet, ejecuta iniciar.bat.
echo Direccion local: http://127.0.0.1:3000
pause
