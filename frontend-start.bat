@echo off
title SGA Frontend

:: Liberar el puerto 3000 si quedo ocupado por una ejecucion anterior
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d C:\sga-academia\frontend

echo Iniciando frontend SGA...
call pnpm run start
