@echo off
setlocal
cd /d "%~dp0"
echo Actualizando qwen3-vl:2b-instruct...
call ollama pull qwen3-vl:2b-instruct
if errorlevel 1 (
    echo ERROR: No se pudo actualizar el modelo.
    pause
    exit /b 1
)
echo Modelo actualizado.
pause
