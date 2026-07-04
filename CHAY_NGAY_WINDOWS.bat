@echo off
title Fix and Buy Smartphone - Run
cd /d "%~dp0"
echo.
echo ============================================
echo  Fix and Buy Smartphone - Ban hoan thien
echo ============================================
echo.
echo Thu muc hien tai:
echo %cd%
echo.
if not exist package.json (
  echo KHONG TIM THAY package.json.
  echo Hay chay file nay ben trong thu muc phone-repair-pro.
  pause
  exit /b 1
)
echo Dang cai package can thiet...
call npm install
if errorlevel 1 (
  echo.
  echo Cai package bi loi. Kiem tra Node.js da cai chua.
  pause
  exit /b 1
)
echo.
echo Dang chay server tai http://localhost:3000
echo Neu muon dung server, bam Ctrl + C.
echo.
call npm start
pause
