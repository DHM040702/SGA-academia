@echo off
echo ============================================
echo    Iniciando SGA - CEPREUNASAM
echo ============================================

:: Esperar a que Docker Desktop inicie completamente
echo Esperando que Docker inicie...
timeout /t 60 /nobreak

:: Delegar a los scripts independientes (docker + backend + frontend)
call C:\sga-academia\Iniciar-SGA.bat