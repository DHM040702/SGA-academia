@echo off

:: CMD 1 - Backend
start cmd /k "wsl -u cpu_ux bash /mnt/c/sga-academia/backend.sh"

:: CMD 2 - Frontend
start cmd /k "wsl -u cpu_ux bash /mnt/c/sga-academia/frontend.sh"