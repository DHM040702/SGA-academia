# inicio-sga.ps1 — Arranque completo del sistema SGA
# Ejecutado por la tarea programada al iniciar sesion
# No requiere NSSM. Abre terminales WSL para backend y frontend.

# 1. Hotspot (solo si el script existe)
$hotspotScript = "C:\sga-academia\iniciar-hotspot.ps1"
if (Test-Path $hotspotScript) {
    Write-Host "[SGA] Iniciando hotspot..."
    & powershell -ExecutionPolicy Bypass -File $hotspotScript
    Start-Sleep -Seconds 10
} else {
    Write-Host "[SGA] iniciar-hotspot.ps1 no encontrado, se omite el hotspot."
}

# 2. Docker — esperar a que los contenedores esten listos
Write-Host "[SGA] Esperando contenedores Docker..."
Start-Sleep -Seconds 20

# 3. Backend (abre una terminal WSL visible)
Write-Host "[SGA] Iniciando backend..."
Start-Process cmd -ArgumentList '/k', 'wsl bash /mnt/c/sga-academia/backend.sh'

Start-Sleep -Seconds 15

# 4. Frontend (abre una terminal WSL visible)
Write-Host "[SGA] Iniciando frontend..."
Start-Process cmd -ArgumentList '/k', 'wsl bash /mnt/c/sga-academia/frontend.sh'

Start-Sleep -Seconds 5

# 5. Portproxy (solo si el script existe)
$portproxyScript = "C:\Scripts\actualizar-portproxy-sga.ps1"
if (Test-Path $portproxyScript) {
    Write-Host "[SGA] Actualizando portproxy..."
    & powershell -ExecutionPolicy Bypass -File $portproxyScript
}

Write-Host "[SGA] Inicio completado."
