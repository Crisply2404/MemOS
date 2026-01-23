$ErrorActionPreference = 'Stop'

$base = 'http://127.0.0.1:8000'

function PostJson([string]$url, $body) {
  Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10)
}

$ns = 'Project_X'
$sid = 'verify-' + [guid]::NewGuid().ToString('N')

Write-Host ('Namespace=' + $ns)
Write-Host ('Session=' + $sid)

# 1) Seed a deterministic dataset into (namespace, session_id)
$seedUrl = "$base/v1/dev/seed?namespace=$ns&session_id=$sid&reset=true"
$seed = Invoke-RestMethod -Method Post -Uri $seedUrl
Write-Host ('Seed inserted=' + $seed.inserted)

# 2) Ingest + Query (creates audit events and enqueues condensation)
$null = PostJson "$base/v1/ingest" @{
  namespace  = $ns
  session_id = $sid
  role       = 'user'
  text       = "\u6211\u8e29\u8fc7\u54ea\u4e9b\u5751\uff1f\u8bf7\u5217\u51fa\u5e76\u7ed9\u51fa\u9a8c\u8bc1\u6b65\u9aa4"
  metadata   = @{ source = 'verify'; ui = 'AuditTest' }
}

$q = PostJson "$base/v1/query" @{
  namespace  = $ns
  session_id = $sid
  query      = "\u6211\u8e29\u8fc7\u54ea\u4e9b\u5751\uff1f"
  top_k      = 6
}
Write-Host ('Query returned chunks=' + $q.raw_chunks.Count)
if (-not $q.context_pack_id) { Write-Warning 'context_pack_id missing (expected after industry-aligned update)' }

Start-Sleep -Seconds 2

# 3) Audit should show INGEST/QUERY and DEV_SEED
$auditUrl = "$base/v1/ops/audit?namespace=$ns&session_id=$sid&limit=50"
$audit = Invoke-RestMethod -Method Get -Uri $auditUrl
$types = @($audit.events | ForEach-Object { $_.event_type })
Write-Host ('Audit event types: ' + ($types -join ', '))

if ($types -notcontains 'DEV_SEED') { Write-Warning 'DEV_SEED event missing (unexpected but not fatal)' }
if ($types -notcontains 'INGEST') { throw 'Expected INGEST audit event missing' }
if ($types -notcontains 'QUERY') { throw 'Expected QUERY audit event missing' }

# 4) Pipeline: condensation is async; retry once
$pipe = Invoke-RestMethod -Method Get -Uri "$base/v1/ops/pipeline"
$recentForSession = @($pipe.recent_condensations | Where-Object { $_.namespace -eq $ns -and $_.session_id -eq $sid })
Write-Host ('Recent condensations for this session: ' + $recentForSession.Count)

if ($recentForSession.Count -eq 0) {
  Write-Host 'No recent condensation yet; waiting 3s and retrying...'
  Start-Sleep -Seconds 3
  $pipe2 = Invoke-RestMethod -Method Get -Uri "$base/v1/ops/pipeline"
  $recentForSession2 = @($pipe2.recent_condensations | Where-Object { $_.namespace -eq $ns -and $_.session_id -eq $sid })
  Write-Host ('Recent condensations for this session after retry: ' + $recentForSession2.Count)
}

# 5) Condensation history (replay surface): this is per-session and more reliable than global pipeline slicing.
$histUrl = "$base/v1/ops/condensations?namespace=$ns&session_id=$sid&limit=5"
$hist = Invoke-RestMethod -Method Get -Uri $histUrl
$histCount = @($hist.condensations).Count
Write-Host ('Condensation history items: ' + $histCount)
if ($histCount -eq 0) {
  Write-Warning 'No condensation history yet. If you want to see it, start the worker and re-run query after a few seconds.'
} else {
  $latest = @($hist.condensations)[0]
  $saved = [Math]::Max(0, [int]$latest.token_original - [int]$latest.token_condensed)
  Write-Host ('Latest condensation: version=' + $latest.version + ' saved=' + $saved + ' tok created_at=' + $latest.created_at)
}

# 6) Context pack history (working memory replay): query-scoped snapshots.
$packsUrl = "$base/v1/ops/context_packs?namespace=$ns&session_id=$sid&limit=5"
$packs = Invoke-RestMethod -Method Get -Uri $packsUrl
$packCount = @($packs.context_packs).Count
Write-Host ('Context packs for this session: ' + $packCount)
if ($packCount -eq 0) {
  Write-Warning 'No context packs found (unexpected).'
} else {
  $p0 = @($packs.context_packs)[0]
  Write-Host ('Latest context pack: id=' + $p0.id + ' query=' + $p0.query_text + ' retrieved=' + $p0.retrieved_count)
}

# 7) Procedural registry (prompt/tool registry)
$proc = Invoke-RestMethod -Method Get -Uri "$base/v1/ops/procedural"
if (-not $proc.prompt_registry) { Write-Warning 'procedural prompt_registry missing (unexpected)' }
if (-not $proc.tool_registry) { Write-Warning 'procedural tool_registry missing (unexpected)' }

Write-Host 'OK: Seed -> ingest/query -> audit/pipeline verified at API level.'
