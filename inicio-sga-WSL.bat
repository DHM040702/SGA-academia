@echo off

powershell -ExecutionPolicy Bypass -File "C:\sga-academia\iniciar-hotspot.ps1"

timeout /t 15 /nobreak

start cmd /k "wsl -u cpu_ux bash /mnt/c/sga-academia/backend.sh"

timeout /t 60 /nobreak

start cmd /k "wsl -u cpu_ux bash /mnt/c/sga-academia/frontend.sh"

timeout /t 60 /nobreak

powershell -ExecutionPolicy Bypass -File "C:\sga-academia\actualizar-portproxy-sga.ps1"