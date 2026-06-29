@echo off
title My Santex - Print Agent
cd /d "%~dp0"

echo.
echo  My Santex Print Agent ishga tushmoqda...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  XATO: Node.js topilmadi!
  echo  https://nodejs.org dan yuklab o'rnating
  pause
  exit /b 1
)

if not exist node_modules (
  echo  Kutubxonalar o'rnatilmoqda...
  npm install
)

set PRINTER_IP=192.168.1.38
set PRINTER_PORT=9100

echo  Printer: %PRINTER_IP%:%PRINTER_PORT% (network)
echo  Manzil : http://localhost:5555
echo  To'xtatish uchun: Ctrl+C
echo.

node server.js
pause
