#!/usr/bin/env python3
"""Prepare public website files while keeping source-download artifacts private.

Run: python3 scripts/build_public.py
The hosted static directory is out/. The editable source stays in dist/.
"""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dist"
OUTPUT = ROOT / "out"
PRIVATE_FILES = {"download.html", "download.js", "assets/manifest.json"}


def main():
    # out/ is a generated directory and is safe to rebuild from dist/.
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    count = 0
    for source in sorted(SOURCE.rglob("*")):
        if not source.is_file():
            continue
        relative = source.relative_to(SOURCE)
        if relative.parts[0] == "downloads" or relative.as_posix() in PRIVATE_FILES:
            continue
        target = OUTPUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        count += 1
    print(f"Prepared {count} public website files in out/")
    print("Source ZIPs, download utilities and the internal asset manifest are excluded.")


if __name__ == "__main__":
    main()
