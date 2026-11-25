<#
  Tarea programada de CIEPI: recordatorios de mentorías (24 h antes) y
  liberación de reservas no confirmadas.

  Lee CRON_SECRET de .env.local o .env (como Next.js) y llama al endpoint local.
  Registrar en el servidor (una sola vez, en PowerShell como administrador):

    schtasks /Create /TN "CIEPI Recordatorios Mentorias" /SC HOURLY /RU SYSTEM `
      /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\ciepi\scripts\recordatorios-mentorias.ps1"

  Probar a mano:
    powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\ciepi\scripts\recordatorios-mentorias.ps1
#>
param(
  # URL local donde escucha la app (la misma que NEXTAUTH_URL_INTERNAL)
  [string]$Url = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$log = Join-Path $raiz "logs\recordatorios-mentorias.log"
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null

function Write-Log([string]$mensaje) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $mensaje" | Add-Content -Path $log -Encoding utf8
}

try {
  # Misma prioridad que Next.js: .env.local antes que .env
  $linea = $null
  foreach ($archivo in ".env.local", ".env") {
    $ruta = Join-Path $raiz $archivo
    if (-not $linea -and (Test-Path $ruta)) {
      $linea = Get-Content $ruta -Encoding utf8 | Where-Object { $_ -match '^\s*CRON_SECRET\s*=\s*\S' } | Select-Object -Last 1
    }
  }
  if (-not $linea) { throw "CRON_SECRET no está en .env.local ni en .env" }
  $secreto = ($linea -replace '^\s*CRON_SECRET\s*=\s*', '').Trim().Trim('"').Trim("'")

  $respuesta = Invoke-RestMethod -Method Post -Uri "$Url/api/cron/mentorias-recordatorios/" `
    -Headers @{ Authorization = "Bearer $secreto" } -TimeoutSec 120
  Write-Log ("OK  expiradas={0} recordatorios={1} fallidos={2}" -f $respuesta.expiradas, $respuesta.recordatorios, $respuesta.fallidos)
}
catch {
  Write-Log "ERROR  $($_.Exception.Message)"
  exit 1
}
