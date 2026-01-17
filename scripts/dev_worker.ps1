$ErrorActionPreference = 'Stop'

# Local dev defaults (Docker runs postgres+redis; worker runs on host)
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUNBUFFERED = '1'
$env:MEMOS_DATABASE_URL = 'postgresql+psycopg://postgres:postgres@127.0.0.1:5432/memos'
$env:MEMOS_REDIS_URL = 'redis://127.0.0.1:6379/0'
$env:MEMOS_NAMESPACE = 'demo'

Set-Location (Join-Path $PSScriptRoot '..\server')

python -m worker
