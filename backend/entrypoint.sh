#!/usr/bin/env bash
set -e

echo "Esperando a la base de datos..."
python - <<'PY'
import time, sys
from sqlalchemy import create_engine, text
from app.config import settings

for attempt in range(30):
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Base de datos disponible.")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        print(f"  intento {attempt + 1}/30: {exc}")
        time.sleep(2)
print("No se pudo conectar a la base de datos.", file=sys.stderr)
sys.exit(1)
PY

echo "Aplicando migraciones..."
alembic upgrade head

echo "Sembrando datos iniciales..."
python -m app.seed

echo "Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
