#!/usr/bin/env python3
"""Build a small prediction-only ZIP with pre-trained models, no student data."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT / "artifacts/manifest.json").read_text())
    files = ["app.py", "launch.py", "Start Dashboard.bat", "Start Dashboard.command",
             "requirements.txt", "requirements.lock", "README.md", "MODEL_CARD.md", "DEPLOYMENT.md",
             "Dockerfile", ".dockerignore", ".streamlit/config.toml",
             "dashboard/__init__.py", "dashboard/schema.py", "dashboard/inference.py",
             "artifacts/manifest.json"]
    for info in manifest["models"].values():
        relative = "artifacts/" + info["file"]
        if hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() != info["sha256"]:
            raise RuntimeError(f"Model checksum mismatch: {relative}")
        files.append(relative)
    destination = ROOT / "release/student-outcome-predictor.zip"
    destination.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(files):
            archive.write(ROOT / name, "student-outcome-predictor/" + name)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(".zip.sha256").write_text(f"{digest}  {destination.name}\n")
    print(f"Built {destination} ({destination.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
