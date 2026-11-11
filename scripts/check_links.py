#!/usr/bin/env python3
"""Check the static portfolio using only Python's standard library.

Run from any directory: python scripts/check_links.py
This checks local files and HTML anchors; it does not make network requests.
"""

from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1] / "dist"


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = []
        self.references = []
        self.aria_references = []
        self.images = []
        self.findings = []
        self.h1_count = 0
        self.lang = None

    def finding(self, line, message):
        self.findings.append(f"{self.path.relative_to(ROOT)}:{line}: {message}")

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        line = self.getpos()[0]
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "h1":
            self.h1_count += 1
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for key in ("href", "src", "poster", "data-src"):
            if key in attrs:
                self.references.append((line, key, attrs[key]))
        for key in ("aria-labelledby", "aria-describedby", "aria-controls"):
            for identifier in attrs.get(key, "").split():
                self.aria_references.append((line, key, identifier))
        if tag == "img":
            self.images.append((line, attrs))
            if "alt" not in attrs:
                self.finding(line, "Image is missing an alt attribute")
            for key in ("width", "height"):
                if not attrs.get(key, "").isdigit() or int(attrs[key]) < 1:
                    self.finding(line, f"Image requires a positive {key} attribute")
        if tag == "button" and attrs.get("type") != "button":
            self.finding(line, "Button should explicitly use type=button")
        if tag == "a" and attrs.get("target") == "_blank":
            if "noopener" not in attrs.get("rel", "").split():
                self.finding(line, "New-tab link is missing rel=noopener")


def local_target(page_path, raw_url):
    parts = urlsplit(raw_url)
    if parts.scheme or parts.netloc:
        return None, None
    path_part = unquote(parts.path)
    if path_part.startswith("/"):
        target = ROOT / path_part.lstrip("/")
    elif path_part:
        target = page_path.parent / path_part
    else:
        target = page_path
    target = target.resolve()
    if target.is_dir():
        target /= "index.html"
    return target, unquote(parts.fragment)


def main():
    pages = {}
    for path in sorted(ROOT.rglob("*.html")):
        page = Page(path)
        page.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = page
    if not pages:
        print(f"FAIL: No HTML files found in {ROOT}")
        return 1

    # The inventory records the recovered originals' actual pixel dimensions.
    manifest_path = ROOT / "assets" / "manifest.json"
    dimensions = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        dimensions = {
            (ROOT / item["path"]).resolve(): (item["width"], item["height"])
            for item in manifest.get("assets", [])
            if "width" in item and "height" in item
        }

    reference_count = 0
    external = set()
    for page in pages.values():
        if not page.lang:
            page.finding(1, "Document is missing its lang attribute")
        if page.h1_count != 1:
            page.finding(1, f"Expected one h1, found {page.h1_count}")
        for identifier, count in Counter(page.ids).items():
            if count > 1:
                page.finding(1, f"Duplicate id: {identifier}")
        for line, key, identifier in page.aria_references:
            if identifier not in page.ids:
                page.finding(line, f"{key} refers to a missing id: {identifier}")

        for line, key, url in page.references:
            target, fragment = local_target(page.path, url)
            if target is None:
                external.add(url)
                continue
            reference_count += 1
            if not target.is_relative_to(ROOT):
                page.finding(line, f"{key} leaves the site directory: {url}")
            elif not target.is_file():
                page.finding(line, f"{key} points to a missing file: {url}")
            elif fragment and target.suffix == ".html":
                if target not in pages or fragment not in pages[target].ids:
                    page.finding(line, f"{key} points to a missing HTML anchor: {url}")

        for line, attrs in page.images:
            target, _ = local_target(page.path, attrs.get("src", ""))
            if target not in dimensions:
                continue
            try:
                stated_width = int(attrs["width"])
                stated_height = int(attrs["height"])
            except (KeyError, ValueError):
                continue
            actual_width, actual_height = dimensions[target]
            if stated_width * actual_height != stated_height * actual_width:
                page.finding(line, f"Image aspect ratio differs from inventory: {attrs['src']}")

    findings = [item for page in pages.values() for item in page.findings]
    image_count = sum(len(page.images) for page in pages.values())
    for finding in findings:
        print(f"FAIL: {finding}")
    if findings:
        print(f"{len(findings)} issue(s) found.")
        return 1
    print(f"PASS: {len(pages)} pages, {reference_count} local references and {image_count} images.")
    print("Local paths, anchors, IDs, ARIA references, image alt/dimensions and recorded aspect ratios are valid.")
    print(f"{len(external)} external/contact link(s) present; availability is not checked offline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
