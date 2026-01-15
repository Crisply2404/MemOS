# syntax=docker/dockerfile:1

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg/uvicorn standard extras
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential curl \
  && rm -rf /var/lib/apt/lists/*

# Copy source first; we install in editable mode so changes reflect without rebuilds.
COPY . /app

# Install Python deps (editable)
RUN python -m pip install --upgrade pip \
  && python -m pip install -e .

EXPOSE 8000

# Default to running the API; worker overrides this in docker-compose
CMD ["python", "-m", "uvicorn", "memos_server.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
