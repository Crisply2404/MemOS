$ErrorActionPreference = 'Stop'

# Local dev defaults (Docker runs postgres+redis; API runs on host)
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUNBUFFERED = '1'
$env:MEMOS_DATABASE_URL = 'postgresql+psycopg://postgres:postgres@127.0.0.1:5432/memos'
$env:MEMOS_REDIS_URL = 'redis://127.0.0.1:6379/0'
$env:MEMOS_NAMESPACE = 'demo'

Set-Location (Join-Path $PSScriptRoot '..\server')

# App uses a factory (create_app) instead of a module-level `app`.
uvicorn memos_server.app:create_app --factory --host 0.0.0.0 --port 8000 --reload
