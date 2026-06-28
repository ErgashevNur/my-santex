@echo off
cd /d "%~dp0"

echo Print agent o'rnatilmoqda...

REM node_modules yo'q bo'lsa o'rnatamiz
if not exist node_modules (
    echo Kutubxonalar o'rnatilmoqda...
    npm install
)

REM Windows Startup papkasiga shortcut qo'shamiz
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_PATH=%~dp0start-silent.vbs

powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP%\MySantexPrint.lnk'); $s.TargetPath='%VBS_PATH%'; $s.Description='My Santex Print Agent'; $s.Save()"

echo.
echo  [OK] O'rnatildi! Endi Windows yoqilganda printer agent
echo       avtomatik ishga tushadi (hech qanday oyna chiqmaydi).
echo.
echo  Hozir ham ishga tushirasizmi? (Y/N)
set /p ANS=
if /i "%ANS%"=="Y" (
    wscript.exe "%VBS_PATH%"
    echo  [OK] Agent ishga tushdi - localhost:5555
)
echo.
pause
