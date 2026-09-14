#!/usr/bin/env python3
"""One-command setup and launch; installs dependencies, never trains a model."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parent


def main() -> int:
    if sys.version_info[:2] not in {(3, 11), (3, 12)}:
        print("Please install Python 3.11 or 3.12, then open Start Dashboard again.")
        return 1
    os.chdir(ROOT)
    env = ROOT / ".venv"
    python = env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not python.exists():
        print("First launch: creating the dashboard environment…", flush=True)
        venv.EnvBuilder(with_pip=True).create(env)
    lock = ROOT / "requirements.lock"
    stamp = env / ".dashboard-requirements"
    digest = hashlib.sha256(lock.read_bytes()).hexdigest()
    if not stamp.exists() or stamp.read_text() != digest:
        print("Installing dashboard dependencies (internet needed for this first setup only)…", flush=True)
        subprocess.run([str(python), "-m", "pip", "install", "-r", str(lock)], check=True)
        stamp.write_text(digest)
    os.environ.setdefault("OMP_NUM_THREADS", "2")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
    # Fail clearly before opening a browser if the package is incomplete.
    subprocess.run([str(python), "-c", "from dashboard.inference import load_manifest, load_model, template, predict; "
                    "m = load_manifest(); "
                    "[(predict(template(i), load_model(k, m), i)) for k, i in m['models'].items()]; "
                    "print('All packaged models ready.')"], check=True)
    if "--check" in sys.argv:
        return 0
    print("Opening the dashboard at http://localhost:8501. Keep this window open; Ctrl+C stops it.", flush=True)
    return subprocess.call([str(python), "-m", "streamlit", "run", "app.py", "--server.headless=false"])


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        pass
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"Dashboard could not start: {exc}\nCheck your Python installation and internet connection "
              "for first setup. No model training is required.", file=sys.stderr)
        raise SystemExit(1)
