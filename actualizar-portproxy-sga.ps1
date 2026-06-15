# Obtiene la IP de WSL2 dinamicamente
$wslIp = (wsl -u cpu_ux hostname -I 2>$null).Split(' ')[0].Trim()

if (-not $wslIp) {
    Write-Host "ERROR: No se pudo obtener la IP de WSL2"
    exit 1
}

Write-Host "IP de WSL2: $wslIp"

# Eliminar reglas anteriores
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0 2>$null

# Crear nuevas reglas apuntando a la IP actual de WSL2
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp

# Regla de firewall para permitir trafico entrante en los puertos (solo si no existe)
$existingRule = Get-NetFirewallRule -DisplayName "SGA - Puertos 3000 3001" -ErrorAction SilentlyContinue
if (-not $existingRule) {
    New-NetFirewallRule -DisplayName "SGA - Puertos 3000 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,3001
    Write-Host "Regla de firewall creada"
}

Write-Host "Portproxy actualizado correctamente"
netsh interface portproxy show v4tov4
