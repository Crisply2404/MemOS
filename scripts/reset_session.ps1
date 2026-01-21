param(
  [Parameter(Mandatory=$true)][string]$Namespace,
  [Parameter(Mandatory=$true)][string]$SessionId
)

$ErrorActionPreference = 'Stop'

function Parse-DbUrl([string]$url) {
  # Supports: postgresql+psycopg://user:pass@host:port/db
  $m = [regex]::Match($url, '^postgresql\+psycopg://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<db>[^/?#]+)')
  if (-not $m.Success) {
    throw "Unsupported MEMOS_DATABASE_URL format: $url"
  }
  return @{
    User = $m.Groups['user'].Value
    Pass = $m.Groups['pass'].Value
    Host = $m.Groups['host'].Value
    Port = $m.Groups['port'].Value
    Db   = $m.Groups['db'].Value
  }
}

$dbUrl = $env:MEMOS_DATABASE_URL
if (-not $dbUrl -or $dbUrl.Trim().Length -eq 0) {
  $dbUrl = 'postgresql+psycopg://postgres:postgres@127.0.0.1:5432/memos'
}

$cfg = Parse-DbUrl $dbUrl

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  throw 'psql not found on PATH. Install PostgreSQL client tools or use docker exec with psql.'
}

# Use PGPASSWORD env var instead of putting password on the command line.
$env:PGPASSWORD = $cfg.Pass

Write-Host "Resetting namespace='$Namespace' session_id='$SessionId' on ${cfg.Host}:${cfg.Port}/${cfg.Db} ..."

$sql = @"
BEGIN;
DELETE FROM condensations WHERE namespace = '$Namespace' AND session_id = '$SessionId';
DELETE FROM memories       WHERE namespace = '$Namespace' AND session_id = '$SessionId';
DELETE FROM audit_logs     WHERE namespace = '$Namespace' AND session_id = '$SessionId';
COMMIT;
"@

psql -h $cfg.Host -p $cfg.Port -U $cfg.User -d $cfg.Db -v ON_ERROR_STOP=1 -c $sql | Out-String | Write-Host

Write-Host 'OK'
