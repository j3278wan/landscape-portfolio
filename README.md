# Jessie Wang — Landscape Portfolio

Jessie Wang 的英文景观设计作品集，也是学习前端开发的项目。包含两个庭院案例、About、Contact 和可种植绣球的 Playground。使用 HTML、CSS 和原生 JavaScript，无需安装前端框架。

## 在线查看

- [私密网站预览](https://jessie-wang-landscape-preview.dyeddrum8.chatgpt.site)
- [下载完整源码](https://jessie-wang-landscape-preview.dyeddrum8.chatgpt.site/download.html)

需要使用拥有者的 ChatGPT 账号登录。GitHub 保存源码版本，Sites 提供私密预览；**推送到 GitHub 不会自动更新 Sites**。

## 在电脑上运行

下载并解压源码，双击 `dist/index.html` 即可。保留整个文件夹，图片和其他页面才能正常加载。`dist/` 是可以直接修改的源码目录。

也可以在项目根目录打开终端，运行：

```bash
python3 -m http.server 8000 --directory dist
```

打开 [http://localhost:8000](http://localhost:8000)。Windows 可使用 `py -m http.server 8000 --directory dist`。修改后保存文件、刷新浏览器即可；按 `Ctrl+C` 停止服务器。

## 主要文件

**HTML 放内容，CSS 管外观，JavaScript 加交互。**

| 文件 | 作用 |
| --- | --- |
| `dist/index.html` | 首页文字、JW 标志和项目入口 |
| `dist/home.css` / `home.js` | 首页布局、手机样式和 JW 跟随效果 |
| `dist/theme.css` | 全站配色 |
| `dist/projects/*.html` | 两个项目的图片、说明、图纸和视频 |
| `dist/about.html` / `contact.html` / `profile.css` | 个人介绍、照片、联系方式及排版 |
| `dist/styles.css` / `script.js` | 内页基础样式、手机菜单、图片放大和 Esc 关闭 |
| `dist/case-interactions.css` / `.js` | 案例顶部视图切换和阅读进度 |
| `dist/playground.html` / `garden.css` / `garden.js` | 植物预览、拖动种植、撤销、季节与日夜切换 |
| `dist/assets/` | 项目素材、个人照片和标志；`manifest.json` 记录来源 |
| `dist/download.html` / `download.js` | 私密站点的源码下载页 |
| `scripts/` | 检查链接、生成预览与源码下载包的 Python 工具 |

## 素材说明

现场照片标为 `Existing Site`，设计效果图标为 `Design Rendering`，图纸和植物清单分别标为 `Planting Plan` / `Plant Schedule`。效果图不代表已施工完成的实景。

Poolside 的原始 SketchUp 模型没有保存；当前 `studies/model-study.png` 是依据效果图生成的 AI 辅助模型风格研究图，并非找回的或可编辑的模型。网页保留简短图注，真实来源记录在 `dist/assets/manifest.json`。Planting 的模型图是用户上传的原始 JPG。

About 使用用户自行打码的照片 `assets/about/jessie-polaroids.webp`，经过无损格式转换并移除 EXIF/XMP 元数据，图像数据与显示像素保持不变。

尚待补充的文件只有 Poolside 的 Procreate 初稿，以及另行指定的 728×1178 裁切模型视图；现有 Before、渲染图和 Details 已接入。

## 替换图片

1. 将图片放入 `dist/assets/projects/项目名/`，按 `before/`、`model/`、`renderings/`、`drawings/` 分类。
2. 在对应项目 HTML 搜索旧文件名，同时修改 `<img>` 的 `src` 和放大按钮的 `data-src`。更新真实 `width` / `height`、图片说明 `alt`、图注和 `data-caption`。
3. 在 `dist/assets/manifest.json` 更新来源，保存后检查正常显示、放大和手机比例。保留顶部图片面板的 `id`，否则切换按钮会找不到图片。

案例页的素材路径以 `../assets/` 开头；主页和 About 使用 `assets/`。`../` 表示往上一层。替换个人照片时，修改 `dist/about.html` 中 `.about-portrait img`；照片保存在 `dist/assets/about/`。

## 添加项目

1. 复制一个 `dist/projects/` 页面，改文件名、标题、说明和素材。保留正确的图片分类、章节链接与唯一的 `id`。
2. 在首页 `.work-selection` 中复制一个 `.project-entry` 链接，修改名称和 `href`；更新相关导航、素材清单，并检查窄屏布局。
3. 如果需要单文件预览，在 `scripts/build_preview.py` 的 `PAGE_FILES` 加入新页面，例如 `"new-garden": "projects/new-garden.html"`。

## 三个入门练习

每次只改一处：**修改 → 保存 → 刷新 → 观察**。不满意时用编辑器的 `Ctrl+Z` / `Cmd+Z` 撤销。

1. **文字：**在 `dist/index.html` 搜索 `id="home-title"`，把 `<em>Landscape</em>` 改为 `<em>Garden</em>`。保留标签，观察文字与斜体效果。
2. **颜色：**在 `dist/theme.css` 将 `--background:#0b251b` 改为 `--background:#123b2a`，并将同段的 `--paper` 改为相同值。它们控制背景；`--ink` 控制文字。
3. **间距：**在 `dist/home.css` 第一处 `.home-main` 中，将 `gap:9%` 改为 `gap:6%`。在宽于 1000px 的窗口观察两列距离；手机布局由后面的 `@media` 规则控制。

## 检查修改

在项目根目录运行：

```bash
python3 scripts/check_links.py
python3 scripts/test_build_preview.py
```

第一项检查资源路径、链接和图片信息；第二项检查单文件打包时 SVG 结构是否保留。再手动检查手机宽度、导航、图片放大与 Esc、视图切换和视频播放。

## 用 Git 保存一次小修改

以后可用“新分支 → 修改 → 本地预览 → 提交 → 推送 → Pull Request”的流程。下面以修改首页标题为例，在项目根目录运行：

```bash
git switch -c edit/home-title
# 修改文字，保存，并在浏览器确认效果后：
git status
git diff
git add dist/index.html
git commit -m "Update home title"
git push -u origin edit/home-title
```

`commit` 保存本地版本，`push` 将分支发送到私有 GitHub 仓库。随后在 GitHub 创建 Pull Request（PR），检查改动再合并。每次使用新的分支名；改其他文件时，给 `git add` 填写对应路径。

## 生成下载包

日常编辑不需要打包。要更新源码下载页，运行：

```bash
python3 scripts/package_site.py
```

它生成 `build/landscape-portfolio-source.zip`，并重建 `dist/downloads/` 中的校验清单与下载分段。**`build/` 和 `dist/downloads/` 是可重新生成的输出，不提交到 GitHub。** 下载页源码保留在仓库中；生成的下载内容需要另行更新到 Sites。

如需一个方便离线查看的 HTML 文件，运行：

```bash
python3 scripts/build_preview.py build/portfolio-preview.html
```

单文件预览需要 JavaScript，修改源码后须重新生成；继续编辑时仍使用 `dist/` 中的文件。
