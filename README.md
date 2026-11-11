# Jessie Wang — Landscape Portfolio

A landscape design portfolio and a project for learning front-end development. It includes two garden case studies, About, Contact, and an interactive planting playground. Built with HTML, CSS, and plain JavaScript, with no framework installation required.

## Website and source

- [Website](https://jessie-wang-landscape-preview.dyeddrum8.chatgpt.site)
- [Private GitHub repository](https://github.com/j3278wan/landscape-portfolio) — access requires an authorized GitHub account.

The owner can download the source through GitHub’s **Code → Download ZIP**, or clone it:

```bash
git clone https://github.com/j3278wan/landscape-portfolio.git
cd landscape-portfolio
```

**Pushing to GitHub does not automatically update the live website.** Source control and deployment are separate steps.

## Run locally

Extract the source ZIP and open `dist/index.html` in a browser. Keep the complete folder together so images and other pages load correctly. `dist/` contains the editable source files.

Alternatively, run this command from the project root:

```bash
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). On Windows, you can use `py -m http.server 8000 --directory dist`. Save your changes and refresh the browser; press `Ctrl+C` to stop the server.

## Main files

**HTML provides content, CSS controls appearance, and JavaScript adds interaction.**

| File | Purpose |
| --- | --- |
| `dist/index.html` | Homepage text, JW mark, and project links |
| `dist/home.css` / `home.js` | Homepage layout, mobile styles, and JW pointer response |
| `dist/theme.css` | Shared color palette |
| `dist/projects/*.html` | Case-study images, descriptions, drawings, and videos |
| `dist/about.html` / `contact.html` / `profile.css` | Personal introduction, portrait, contact details, and layout |
| `dist/styles.css` / `script.js` | Shared page styles, mobile menu, image enlargement, and Esc handling |
| `dist/case-interactions.css` / `.js` | Case-study view switching and reading progress |
| `dist/playground.html` / `garden.css` / `garden.js` | Plant previews, drag planting, undo, seasons, and lighting |
| `dist/assets/` | Project media, portrait, and branding; `manifest.json` records provenance privately |
| `dist/download.html` / `download.js` | Owner-only source-package tools, excluded from public deployment |
| `scripts/` | Python tools for checks, offline previews, and private source packages |

## Image provenance

Site photographs use `Existing Site`; design visualizations use `Design Rendering`; drawings and plant lists use `Planting Plan` and `Plant Schedule`. Renderings do not represent completed construction.

The original Poolside SketchUp model was not saved. Its current `studies/model-study.png` is an AI-assisted model-style reconstruction from a supplied rendering, not a recovered or editable model. The website uses concise captions; the private `dist/assets/manifest.json` records the actual source. Planting’s model image is an original uploaded JPG.

The About photo, `assets/about/jessie-polaroids.webp`, uses the owner’s supplied, already-redacted photograph. It was converted losslessly and had EXIF/XMP metadata removed; the image data and displayed pixels remain unchanged.

The only outstanding files are Poolside’s Procreate concept sketch and the separately requested 728×1178 cropped model view. Existing-site photos, renderings, and detail images are already included.

## Replace images

1. Add the image under `dist/assets/projects/project-name/`, using folders such as `before/`, `model/`, `renderings/`, or `drawings/`.
2. Find the old filename in the project HTML. Update both the image’s `src` and its enlargement button’s `data-src`, plus the actual `width` / `height`, descriptive `alt`, caption, and `data-caption`.
3. Update the private asset manifest, save, and check the image, enlarged view, and mobile proportions. Preserve the top view panels’ `id` values so their switching buttons keep working.

Project pages use paths beginning with `../assets/`; the homepage and About page use `assets/`. `../` means one folder up. To replace the portrait, update `.about-portrait img` in `dist/about.html`; portrait files belong in `dist/assets/about/`.

## Add a project

1. Copy an existing page in `dist/projects/`. Update its filename, title, descriptions, and media. Keep accurate image classifications, working section links, and unique IDs within the page.
2. Copy a `.project-entry` link inside the homepage’s `.work-selection`. Update its name and `href`, related navigation, and the asset manifest. Check the narrow-screen layout.
3. For single-file previews, add the page to `PAGE_FILES` in `scripts/build_preview.py`, for example: `"new-garden": "projects/new-garden.html"`.

## Three beginner exercises

Change one thing at a time: **edit → save → refresh → observe**. Use your editor’s `Ctrl+Z` / `Cmd+Z` to undo.

1. **Text:** Find `id="home-title"` in `dist/index.html`. Change `<em>Landscape</em>` to `<em>Garden</em>`, keeping the tags. Notice how the text and italic styling work together.
2. **Color:** In `dist/theme.css`, change `--background:#0b251b` to `--background:#123b2a`, and set `--paper` to the same value. These control backgrounds; `--ink` controls text.
3. **Spacing:** In the first `.home-main` rule in `dist/home.css`, change `gap:9%` to `gap:6%`. View the two columns in a window wider than 1000px; later `@media` rules control smaller screens.

## Check changes

Run these commands from the project root:

```bash
python3 scripts/check_links.py
python3 scripts/test_build_preview.py
```

The first checks resource paths, links, and image information. The second checks that offline packaging preserves SVG structure. Also test narrow screens, navigation, image enlargement and Esc, view switching, and video playback in a browser.

## Save a small change with Git

A useful workflow is **new branch → edit → preview → commit → push → pull request**. For a homepage text change:

```bash
git switch -c edit/home-title
# Edit, save, and check the result in your browser, then:
git status
git diff
git add dist/index.html
git commit -m "Update home title"
git push -u origin edit/home-title
```

`commit` saves a local version; `push` sends the branch to the private GitHub repository. Open a pull request on GitHub, review the changes, then merge. Use a fresh branch name for each change, and give `git add` the paths you actually edited.

## Public deployment

Keep editing `dist/`. To prepare the public website, run:

```bash
python3 scripts/build_public.py
```

This rebuilds `out/`, excluding `download.html`, `download.js`, `downloads/`, and `assets/manifest.json`. The Sites configuration in `.openai/hosting.json` uses `out/`, which is generated output and ignored by Git.

Publish the prepared output through Sites as a separate step. Building files or pushing to GitHub does not publish them. Download-page code and the provenance manifest stay in the private repository; source archives and download chunks remain private owner tools.

## Private offline packages

Packaging is optional for everyday editing. To create an owner’s source archive, run:

```bash
python3 scripts/package_site.py
```

This creates `build/landscape-portfolio-source.zip` and rebuilds the checksum manifest and chunks in `dist/downloads/`. **`build/` and `dist/downloads/` are reproducible output and are excluded from Git.** These packages are for private owner use, not public source downloads.

For a self-contained HTML preview:

```bash
python3 scripts/build_preview.py build/portfolio-preview.html
```

The preview requires JavaScript and must be regenerated after source changes. Continue editing the original files in `dist/`.
