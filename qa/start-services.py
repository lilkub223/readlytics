"""Run real services against the disposable QA database (start npm --prefix qa run db first)."""
import os, subprocess, signal
from pathlib import Path
root = Path(__file__).resolve().parents[1]
env = {**os.environ, 'PGHOST':'127.0.0.1','PGPORT':'55432','PGDATABASE':'postgres','PGUSER':'postgres','PGPASSWORD':'postgres','JWT_SECRET':'isolated-qa-secret-not-for-production-123456','CORS_ORIGIN':'http://localhost:3000,http://127.0.0.1:3000'}
# Prevent an inherited production URL from ever overriding QA database configuration.
env.pop('DATABASE_URL', None)
commands = [(['node','src/index.js'],'user-service'),([str(root/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','4002'],'reading-service'),([str(root/'.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','4003'],'analytics-service')]
children = [subprocess.Popen(cmd,cwd=root/'services'/name,env=env) for cmd,name in commands]
def shutdown(*_):
    for child in children: child.terminate()
    for child in children: child.wait(timeout=10)
    raise SystemExit
signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)
try:
    for child in children:
        code = child.wait()
        if code: raise RuntimeError(f'Service exited with {code}')
finally:
    for child in children: child.terminate()
