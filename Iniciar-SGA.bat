@echo off
echo Iniciando SGA...

:: Activar el hotspot SGA-Academia
powershell -ExecutionPolicy Bypass -File "C:\sga-academia\iniciar-hotspot.ps1"

:: El DNS (sga.local -> 192.168.137.1) lo resuelve Technitium DNS Server,
:: que corre como servicio de Windows y arranca solo con la PC. No requiere
:: iniciarse aqui; ver sección 15.1 del manual para su configuración.

:: Asegurar que Docker (PostgreSQL, Redis, MinIO) este levantado
docker compose -f C:\sga-academia\docker-compose.yml up -d

:: Iniciar backend oculto (sin ventana), log en logs\backend.log
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\sga-academia\backend-start.bat' -WindowStyle Hidden -RedirectStandardOutput 'C:\sga-academia\logs\backend.log' -RedirectStandardError 'C:\sga-academia\logs\backend-error.log'"

:: Esperar a que el backend cargue antes de levantar el frontend
timeout /t 10 /nobreak

:: Iniciar frontend oculto (sin ventana), log en logs\frontend.log
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c C:\sga-academia\frontend-start.bat' -WindowStyle Hidden -RedirectStandardOutput 'C:\sga-academia\logs\frontend.log' -RedirectStandardError 'C:\sga-academia\logs\frontend-error.log'"

echo Servidores iniciados en segundo plano. Acceder en http://localhost:3000
echo Logs: C:\sga-academia\logs\backend.log y C:\sga-academia\logs\frontend.log
