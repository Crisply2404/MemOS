param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not $Force) {
  Write-Host "Refusing to modify Redis without -Force." -ForegroundColor Yellow
  Write-Host "This will clear the RQ condensation queue + registries (failed/started/finished/deferred/scheduled)." -ForegroundColor Yellow
  Write-Host "Run: powershell -ExecutionPolicy Bypass -File .\scripts\rq_clear_condensation.ps1 -Force" -ForegroundColor Yellow
  exit 2
}

# Clear all registries so stale/failed jobs don't keep the demo stuck.
$keys = @(
  'rq:queue:condensation',
  'rq:failed:condensation',
  'rq:started:condensation',
  'rq:finished:condensation',
  'rq:deferred:condensation',
  'rq:scheduler:scheduled_jobs'
)

foreach ($k in $keys) {
  $n = docker compose exec redis redis-cli --raw DEL $k
  Write-Host ("DEL {0} -> {1}" -f $k, $n)
}

# Also delete the job hashes for any job IDs that were in the queue.
# (Optional cleanup; safe because we cleared the queue already.)
$jobIds = docker compose exec redis redis-cli --raw KEYS 'rq:job:*'
$jobIds = $jobIds -split "\r?\n" | Where-Object { $_ -and $_.Trim().Length -gt 0 }

$deleted = 0
foreach ($j in $jobIds) {
  $n = docker compose exec redis redis-cli --raw DEL $j
  if ($n -eq '1') { $deleted++ }
}

Write-Host ("Deleted job hashes: {0}" -f $deleted)
