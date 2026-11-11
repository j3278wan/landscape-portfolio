#!/usr/bin/env python3
"""Bundle the learning-friendly multi-page site into one offline preview HTML.

Usage: python3 scripts/build_preview.py [output.html]
No third-party packages, server, network connection, or changes to dist/ are needed.
The original multi-page files remain the source of truth.
"""
from __future__ import annotations

import argparse
import base64
import html
from html.parser import HTMLParser
import json
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PAGE_FILES = {
    "home": "index.html",
    "poolside": "projects/pool-garden.html",
    "planting": "projects/terraced-garden.html",
    "about": "about.html",
    "contact": "contact.html",
    "playground": "playground.html",
}
ROUTES = {str((DIST / filename).resolve()): route for route, filename in PAGE_FILES.items()}
ROUTES[str((DIST / "portfolio.html").resolve())] = "home"
ASSETS: dict[str, dict[str, str]] = {}
ASSET_KEYS: dict[Path, str] = {}


def local_path(reference: str, source: Path) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = (DIST / unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else (source.parent / unquote(parsed.path))
    path = path.resolve()
    if not path.is_relative_to(DIST.resolve()):
        raise ValueError(f"Resource leaves dist/: {source.name}: {reference}")
    if not path.is_file():
        raise FileNotFoundError(f"Missing local resource: {source.name}: {reference}")
    return path


def asset_token(path: Path, link: bool = False) -> str:
    if path not in ASSET_KEYS:
        key = str(len(ASSETS))
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        ASSET_KEYS[path] = key
        ASSETS[key] = {"mime": mime, "base64": base64.b64encode(path.read_bytes()).decode("ascii")}
    return f"__JESSIE_{'LINK' if link else 'DATA'}_{ASSET_KEYS[path]}__"


def css_source(path: Path) -> str:
    def substitute(match: re.Match) -> str:
        reference = match.group(2).strip()
        resource = local_path(reference, path)
        return f'url("{asset_token(resource)}")' if resource else match.group(0)
    return re.sub(r"url\(\s*(['\"]?)(.*?)\1\s*\)", substitute, path.read_text(encoding="utf-8"), flags=re.I)


def script_element(source: str) -> str:
    # A literal end-tag in a JS string must not terminate its HTML script element.
    return "<script>" + re.sub(r"</script", r"<\\/script", source, flags=re.I) + "</script>"


FRAME_ROUTER = r"""
(() => {
  const scrollToSection = id => {
    let decoded = id;
    try { decoded = decodeURIComponent(id); } catch (_) {}
    const target = document.getElementById(decoded);
    if (target) target.scrollIntoView({behavior: 'auto', block: 'start'});
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (link.dataset.previewRoute) {
      event.preventDefault();
      // Route before page-specific transition handlers (such as Playground's
      // animated exit) can assign a relative URL inside this srcdoc frame.
      event.stopImmediatePropagation();
      parent.postMessage({type: 'jessie-preview-route', route: link.dataset.previewRoute, section: link.dataset.previewSection || ''}, '*');
      return;
    }
    const href = link.getAttribute('href');
    // srcdoc inherits the parent's base URL; handle page fragments explicitly
    // so an in-page link cannot reload the whole standalone file inside itself.
    if (href && href.startsWith('#')) {
      event.preventDefault();
      scrollToSection(href.slice(1));
    }
  }, true);
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'jessie-preview-section') return;
    scrollToSection(event.data.section || '');
  });
})();
"""


class InlinePage(HTMLParser):
    def __init__(self, path: Path):
        super().__init__(convert_charrefs=False)
        self.path = path
        self.parts: list[str] = []
        self.scripts: list[str] = []
        self.skip_script = False
        self.inserted_scripts = False

    def handle_decl(self, value):
        self.parts.append(f"<!{value}>")

    def handle_comment(self, value):
        self.parts.append(f"<!--{value}-->")

    def handle_entityref(self, name):
        self.parts.append(f"&{name};")

    def handle_charref(self, name):
        self.parts.append(f"&#{name};")

    def handle_data(self, value):
        if not self.skip_script:
            self.parts.append(value)

    def handle_starttag(self, tag, attrs, self_closing=False):
        values = dict(attrs)
        if tag == "meta" and values.get("http-equiv", "").lower() == "refresh":
            return
        if tag == "link" and values.get("rel") == "stylesheet":
            resource = local_path(values.get("href", ""), self.path)
            if resource:
                media = f' media="{html.escape(values["media"], quote=True)}"' if "media" in values else ""
                self.parts.append(f"<style{media}>" + css_source(resource) + "</style>")
                return
        if tag == "script" and values.get("src"):
            resource = local_path(values["src"], self.path)
            if resource:
                self.scripts.append(resource.read_text(encoding="utf-8"))
                self.skip_script = not self_closing
                return
        if tag == "a" and values.get("href"):
            reference = values["href"]
            resource = local_path(reference, self.path)
            if resource:
                route = ROUTES.get(str(resource))
                if route:
                    section = urlsplit(reference).fragment
                    values["href"] = f"#/{route}"
                    values["data-preview-route"] = route
                    if section:
                        values["data-preview-section"] = section
                else:
                    values["href"] = asset_token(resource, link=True)
        for attribute in ("src", "poster", "data-src"):
            if values.get(attribute):
                resource = local_path(values[attribute], self.path)
                if resource:
                    values[attribute] = asset_token(resource)
        if tag == "link" and values.get("href"):
            resource = local_path(values["href"], self.path)
            if resource:
                values["href"] = asset_token(resource)
        serialized = "".join(f" {key}" if value is None else f' {key}="{html.escape(value, quote=True)}"' for key, value in values.items())
        ending = " />" if self_closing else ">"
        self.parts.append(f"<{tag}{serialized}{ending}")

    def handle_startendtag(self, tag, attrs):
        # SVG shapes must stay self-closing. Losing the slash nests later shapes
        # inside the first path/circle, hiding them in the standalone preview.
        self.handle_starttag(tag, attrs, self_closing=True)

    def append_scripts(self):
        if self.inserted_scripts:
            return
        self.parts.extend(script_element(source) for source in self.scripts)
        self.parts.append(script_element(FRAME_ROUTER))
        self.inserted_scripts = True

    def handle_endtag(self, tag):
        if tag == "script" and self.skip_script:
            self.skip_script = False
            return
        if tag == "body":
            self.append_scripts()
        self.parts.append(f"</{tag}>")

    def document(self) -> str:
        self.feed(self.path.read_text(encoding="utf-8"))
        self.close()
        self.append_scripts()
        return "".join(self.parts)


SHELL_SCRIPT = r"""
'use strict';
const pages = __PAGES__;
const assets = __ASSETS__;
const blobURLs = new Map();
let frame;

function linkedAsset(key) {
  if (!blobURLs.has(key)) {
    const asset = assets[key];
    const bytes = Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0));
    blobURLs.set(key, URL.createObjectURL(new Blob([bytes], {type: asset.mime})));
  }
  return blobURLs.get(key);
}
function expandAssets(source) {
  return source.replace(/__JESSIE_(DATA|LINK)_(\d+)__/g, (_, kind, key) => {
    // Reuse one browser-local URL per original file. Large photo strings no
    // longer get duplicated in every img, zoom button, and srcdoc navigation.
    return linkedAsset(key);
  });
}
function locationParts() {
  const parts = location.hash.replace(/^#\/?/, '').split('?');
  const candidate = parts[0] || 'home';
  const route = Object.prototype.hasOwnProperty.call(pages, candidate) ? candidate : 'home';
  return {route, section: new URLSearchParams(parts[1] || '').get('section') || ''};
}
function render() {
  const {route, section} = locationParts();
  const next = document.createElement('iframe');
  next.id = 'portfolio-page';
  next.title = pages[route].title;
  next.setAttribute('allow', 'autoplay; fullscreen');
  // A fresh frame gives every page its own styles and global script scope.
  // Replacing the frame also avoids extra iframe history entries on Back.
  next.srcdoc = expandAssets(pages[route].html);
  next.addEventListener('load', () => {
    if (section) next.contentWindow.postMessage({type: 'jessie-preview-section', section}, '*');
  }, {once: true});
  if (frame) frame.replaceWith(next);
  else document.body.append(next);
  frame = next;
  document.title = pages[route].title;
}
addEventListener('message', event => {
  if (event.source !== frame?.contentWindow || event.data?.type !== 'jessie-preview-route') return;
  const {route, section} = event.data;
  if (!Object.prototype.hasOwnProperty.call(pages, route)) return;
  const next = `#/${route}` + (section ? `?section=${encodeURIComponent(section)}` : '');
  if (location.hash === next) {
    if (section) frame.contentWindow.postMessage({type: 'jessie-preview-section', section}, '*');
    else frame.contentWindow.scrollTo(0, 0);
  } else location.hash = next;
});
addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', '#/home');
render();
"""


def safe_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def build(output: Path) -> tuple[int, int]:
    pages = {}
    for route, filename in PAGE_FILES.items():
        source = InlinePage(DIST / filename).document()
        match = re.search(r"<title>(.*?)</title>", source, re.S | re.I)
        pages[route] = {"title": html.unescape(match.group(1)) if match else "Jessie Wang", "html": source}
    script = SHELL_SCRIPT.replace("__PAGES__", safe_json(pages)).replace("__ASSETS__", safe_json(ASSETS))
    document = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jessie Wang — Portfolio Preview</title>
<!-- Self-contained offline preview. The editable multi-page source remains in dist/. -->
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b251b;color:#f3f3ee}#portfolio-page{display:block;width:100%;height:100%;border:0;background:#0b251b}noscript{display:block;padding:2rem;font:16px/1.6 system-ui}</style>
</head><body><noscript>This single-file preview needs JavaScript. The original multi-page site in the ZIP can also be opened at dist/index.html.</noscript>
""" + script_element(script) + "\n</body></html>\n"
    output = output.expanduser().resolve()
    if output.is_relative_to(DIST.resolve()):
        raise ValueError("Write the standalone preview outside dist/, not into the source website.")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(document, encoding="utf-8")
    return len(pages), len(ASSETS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, default=ROOT.parent / "jessie-portfolio-preview.html")
    args = parser.parse_args()
    pages, assets = build(args.output)
    print(f"Built {args.output.resolve()}: {pages} pages, {assets} embedded assets, {args.output.stat().st_size / 1024 / 1024:.1f} MiB")


if __name__ == "__main__":
    main()
