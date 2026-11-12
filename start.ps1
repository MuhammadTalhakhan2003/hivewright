# Starts the Hivewright runtime (port 8000) and the web app (port 5173).
$root = $PSScriptRoot
$py = Join-Path $root 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path $py)) { Write-Error 'Backend venv missing. See README "Run it".'; exit 1 }

$api = Start-Process -FilePath $py -ArgumentList '-m', 'uvicorn', 'hivewright.api:app', '--port', '8000', '--reload' `
  -WorkingDirectory (Join-Path $root 'backend') -PassThru -NoNewWindow
try {
  Set-Location (Join-Path $root 'frontend')
  npm run dev
} finally {
  Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
}
