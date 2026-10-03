@echo off
setlocal
cd /d "%~dp0"

set "UCA_EQUIPO=Oliver - Marco - Diego"
if exist "EQUIPO.txt" (
    set /p UCA_EQUIPO=<"EQUIPO.txt"
)

echo ===============================================
echo  UCA AI B-E 1.03.2 - Lector local de PDF
echo  SRB powered this AI.
if defined UCA_EQUIPO echo  Equipo: %UCA_EQUIPO%
echo ===============================================
echo.

set "UCA_MODEL=qwen3-vl:2b-instruct"
set "UCA_NUM_CTX=4096"
set "UCA_KEEP_ALIVE=2m"
set "UCA_MAX_VISION_PAGES=20"
set "UCA_PDF_RENDER_SCALE=1.6"

call npm start
pause
