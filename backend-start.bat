@echo off
title SGA Backend

:: Liberar el puerto 3001 si quedo ocupado por una ejecucion anterior
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d C:\sga-academia\backend

echo Iniciando backend SGA...
node dist/main
