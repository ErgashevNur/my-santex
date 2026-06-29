@echo off
title My Santex - Print Agent
cd /d "%~dp0"

echo.
echo  ================================================
echo   My Santex Print Agent
echo  ================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  XATO: Node.js topilmadi!
  echo  https://nodejs.org dan yuklab o'rnating
  pause
  exit /b 1
)

REM ---- Eski agentni o'chirish (port 5555 bo'sh bo'lsin) ----
echo  Eski agent tekshirilmoqda...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5555 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ---- Windowsdagi printerlar ro'yxati ----
echo  Kompyuterga ulangan printerlar:
powershell -NoProfile -NonInteractive -Command "Get-Printer | ForEach-Object { Write-Host ('    ' + $_.Name) }" 2>nul
echo.

REM ================================================================
REM  SOZLAMALAR — ehtiyojga qarab o'zgartiring:
REM
REM  1) Printer USB kabel bilan ulangan bo'lsa:
REM     - PRINTER_IP ni bo'sh qoldiring
REM     - PRINTER_NAME ni yuqoridagi ro'yxatdan ANIQ nusxa ko'chiring
REM
REM  2) Printer tarmoq orqali ulangan bo'lsa (Wi-Fi yoki kabel):
REM     - PRINTER_IP ga printer IP manzilini kiriting
REM     - PRINTER_NAME ni bo'sh qoldirishingiz mumkin
REM ================================================================

set PRINTER_IP=
set PRINTER_PORT=9100
set PRINTER_NAME=XP-80

REM ================================================================

echo  Sozlamalar:
if not "%PRINTER_IP%"=="" (
  echo   Rejim   : Tarmoq ^(TCP^)
  echo   IP      : %PRINTER_IP%:%PRINTER_PORT%
) else (
  echo   Rejim   : Windows spooler ^(USB^)
  echo   Printer : %PRINTER_NAME%
)
echo.
echo   Manzil  : http://localhost:5555
echo   Diagnostika: http://localhost:5555/printers
echo.
echo  To'xtatish uchun Ctrl+C bosing
echo.

node server.js
pause
