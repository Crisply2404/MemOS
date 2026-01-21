$ErrorActionPreference = 'Stop'

$ns = 'Demo'
$sid = 'demo-session'

# Use the built-in dev seed defaults (Demo/demo-session) and force reset for a clean run.
$seedBody = @{ namespace = $ns; session_id = $sid; reset = $true } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/v1/dev/seed' -ContentType 'application/json' -Body $seedBody | Out-Null

$queryBody = @{ namespace = $ns; session_id = $sid; query = '5432 cors docker compose uvicorn'; top_k = 6 } | ConvertTo-Json
$r1 = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/v1/query' -ContentType 'application/json' -Body $queryBody

# First query may return fallback summary before worker writes a condensation.
'Summary(1):'
$r1.condensed_summary

Start-Sleep -Seconds 2
$r2 = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/v1/query' -ContentType 'application/json' -Body $queryBody

'Summary(2):'
$r2.condensed_summary

$audit = Invoke-RestMethod -Method Get -Uri ("http://127.0.0.1:8000/v1/ops/audit?namespace=$ns&session_id=$sid&limit=20")
'Audit (last 20):'
$audit.events | Select-Object -Property event_type, created_at | Format-Table -AutoSize

'Pipeline queues:'
(Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/v1/ops/pipeline').queues | Format-Table -AutoSize
