@echo off
echo Iniciando SGA...

:: Asegurar que Docker (PostgreSQL, Redis, MinIO) este levantado
docker compose -f C:\sga-academia\docker-compose.yml up -d

:: Iniciar backend en su propia ventana/script independiente
start "SGA Backend" cmd /k "C:\sga-academia\backend-start.bat"

:: Esperar a que el backend cargue antes de levantar el frontend
timeout /t 10 /nobreak

:: Iniciar frontend en su propia ventana/script independiente
start "SGA Frontend" cmd /k "C:\sga-academia\frontend-start.bat"

echo Servidores iniciados. Acceder en http://localhost:3000
