"""Regression checks for SVG geometry surviving the offline preview bundler.

Run: python3 scripts/test_build_preview.py
Uses only Python's standard library; it does not change website files.
"""
import re
import unittest
import xml.etree.ElementTree as ET

from build_preview import DIST, InlinePage


def structure(element):
    # HTMLParser normalizes SVG tag/attribute casing; browsers restore it.
    return (
        element.tag.lower(),
        sorted((key.lower(), value) for key, value in element.attrib.items()),
        (element.text or "").strip(),
        [structure(child) for child in element],
    )


class PreviewSVGTests(unittest.TestCase):
    def round_trip(self, svg, page):
        parser = InlinePage(page)
        parser.feed(svg)
        parser.close()
        return ET.fromstring("".join(parser.parts))

    def test_self_closing_shapes_remain_siblings(self):
        svg = '<svg><g><path d="M0 0L2 2"/><circle cx="3" cy="3" r="1"/><path d="M4 4L6 6"/></g></svg>'
        result = self.round_trip(svg, DIST / "playground.html")
        self.assertEqual([child.tag for child in result[0]], ["path", "circle", "path"])
        self.assertTrue(all(len(child) == 0 for child in result[0]))

    def test_all_website_inline_svgs_preserve_structure(self):
        count = 0
        for page in DIST.rglob("*.html"):
            for index, svg in enumerate(re.findall(r"<svg\b[^>]*>.*?</svg>", page.read_text(), re.S)):
                with self.subTest(page=page.name, svg=index):
                    self.assertEqual(structure(ET.fromstring(svg)), structure(self.round_trip(svg, page)))
                count += 1
        self.assertGreater(count, 10, "Check the actual garden and page icons, not just a fixture.")


if __name__ == "__main__":
    unittest.main()
