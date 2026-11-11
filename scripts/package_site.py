#!/usr/bin/env python3
"""Build the editable ZIP and the private download page's chunks.

Run: python3 scripts/package_site.py
The website's original assets are copied into the ZIP without modification.
Only build/ and dist/downloads/ are written; neither belongs in Git.
"""

import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CHUNKS = DIST / "downloads"
ARCHIVE = ROOT / "build" / "landscape-portfolio-source.zip"
CHUNK_SIZE = 8 * 1024 * 1024


def source_files():
    """An explicit source allowlist excludes credentials and generated downloads."""
    files = [ROOT / "README.md", ROOT / ".gitignore", ROOT / ".openai" / "hosting.json"]
    for folder in (DIST, ROOT / "scripts"):
        for path in folder.rglob("*"):
            if not path.is_file() or path.is_relative_to(CHUNKS):
                continue
            if "__pycache__" in path.parts or path.suffix == ".pyc" or path.name == ".DS_Store":
                continue
            files.append(path)
    return sorted(files)


def main():
    ARCHIVE.parent.mkdir(exist_ok=True)
    pending = ARCHIVE.with_suffix(".tmp")
    with zipfile.ZipFile(pending, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in source_files():
            archive.write(path, Path("landscape-portfolio") / path.relative_to(ROOT))
    with zipfile.ZipFile(pending) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("ZIP integrity check failed")
    pending.replace(ARCHIVE)

    CHUNKS.mkdir(exist_ok=True)
    parts = []
    total_hash = hashlib.sha256()
    total_size = 0
    with ARCHIVE.open("rb") as archive:
        while data := archive.read(CHUNK_SIZE):
            name = f"source-{len(parts) + 1:02d}.bin"
            (CHUNKS / name).write_bytes(data)
            parts.append({"file": name, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
            total_hash.update(data)
            total_size += len(data)
    current_names = {part["file"] for part in parts}
    for path in CHUNKS.glob("source-*.bin"):
        if path.name not in current_names:
            path.unlink()
    manifest = {"filename": "Jessie-Portfolio.zip", "size": total_size,
                "sha256": total_hash.hexdigest(), "chunks": parts}
    pending_manifest = CHUNKS / "source-manifest.tmp"
    pending_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    pending_manifest.replace(CHUNKS / "source-manifest.json")
    print(f"Built {ARCHIVE.relative_to(ROOT)} ({total_size / 1024 / 1024:.1f} MiB)")
    print(f"Prepared {len(parts)} verified download chunks in dist/downloads/")


if __name__ == "__main__":
    main()
