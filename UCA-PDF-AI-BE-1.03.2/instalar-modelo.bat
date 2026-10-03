@echo off
setlocal
cd /d "%~dp0"
set "SIN_PAUSA="
if /i "%~1"=="--sin-pausa" set "SIN_PAUSA=1"

echo ===============================================
echo  UCA AI - Instalacion del modelo local
echo ===============================================
echo.

where ollama >nul 2>nul
if errorlevel 1 (
    echo ERROR: Ollama no esta instalado o no se encuentra en PATH.
    if not defined SIN_PAUSA pause
    exit /b 1
)

echo Descargando qwen3-vl:2b-instruct...
call ollama pull qwen3-vl:2b-instruct
if errorlevel 1 (
    echo ERROR: No se pudo descargar el modelo.
    echo Esta descarga requiere conexion a internet una sola vez.
    if not defined SIN_PAUSA pause
    exit /b 1
)

echo Modelo instalado correctamente.
if not defined SIN_PAUSA pause
exit /b 0
