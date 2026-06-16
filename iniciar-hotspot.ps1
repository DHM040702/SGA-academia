Add-Type -AssemblyName System.Runtime.WindowsRuntime

function Await($WinRtTask) {
    $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 })[0]
    $netTask = $asTask.MakeGenericMethod($WinRtTask.GetType().GetGenericArguments()[0]).Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

$cp = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]::GetInternetConnectionProfile()

if ($cp -eq $null) {
    Write-Host "[ERROR] Sin conexion a internet. Verificar el cable Ethernet." -ForegroundColor Red
    exit 1
}

$tm = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]::CreateFromConnectionProfile($cp)

if ($tm.TetheringOperationalState -eq 1) {
    Write-Host "[OK] Hotspot SGA-Academia ya estaba activo." -ForegroundColor Green
    exit 0
}

$cfg = $tm.GetCurrentAccessPointConfiguration()
if ($cfg.Ssid -ne "SGA-Academia") {
    $cfg.Ssid       = "SGA-Academia"
    $cfg.Passphrase = "academia2026"
    Await($tm.ConfigureAccessPointAsync($cfg)) | Out-Null
}

Write-Host "[INFO] Iniciando hotspot SGA-Academia..." -ForegroundColor Cyan
Await($tm.StartTetheringAsync()) | Out-Null
Start-Sleep -Seconds 3

if ($tm.TetheringOperationalState -eq 1) {
    Write-Host "[OK] Hotspot activo en 192.168.137.1" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo iniciar el hotspot." -ForegroundColor Red
}
