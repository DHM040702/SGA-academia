@echo off

:: CMD 1 - Backend
start cmd /k "wsl -u diego bash /mnt/c/Users/Diego/sga-academia/backend.sh"

:: CMD 2 - Frontend
start cmd /k "wsl -u diego bash /mnt/c/Users/Diego/sga-academia/frontend.sh"