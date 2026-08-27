# 亚玛芬 AI 知识库全站改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有六页静态知识库改造为蓝白、无渐变、清晰简洁的编辑式 AI 学习门户，并保留搜索、外链和本地学习进度。

**Architecture:** 以 `/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base/` 作为 Git 受控工作副本，保持纯 HTML/CSS/JavaScript 架构。`style.css` 负责全站设计系统，`search.js` 继续负责搜索，新增 `site.js` 负责移动导航和页面进入状态。验证通过后，先对 `/Users/rita/Downloads/知识库/` 做时间戳存档，再同步已验证文件。

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, Node.js 静态校验脚本, Playwright 截图验收。

---

## 文件边界

- 创建：`/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base/site.js`—移动菜单、顶部滚动状态、页面 ready 状态。
- 创建：`/Users/rita/Documents/ChatGPT/AAC社群/scripts/verify-knowledge-base.mjs`—设计约束、本地链接、脚本引用和外链安全属性校验。
- 修改：`site/knowledge-base/style.css`—唯一全站设计系统。
- 修改：`site/knowledge-base/index.html`—轻门户首页。
- 修改：`site/knowledge-base/learn.html`—学习目录和小A学习主题。
- 修改：`site/knowledge-base/video.html`—录播列表和小A观看主题。
- 修改：`site/knowledge-base/resources.html`—资源目录和小A探索主题。
- 修改：`site/knowledge-base/detail.html`—详情阅读宽度、章节样式和列表层级。
- 修改：`site/knowledge-base/progress.html`—进度列表视觉，不改 `amer_ai_progress_v1`。
- 保留：`site/knowledge-base/search.js`—只在验证发现可访问性问题时做小范围修正。
- 新增图片：`site/knowledge-base/img/xiaoa-home.png`、`xiaoa-learn.png`、`xiaoa-video.png`、`xiaoa-resources.png`。

## Task 1: 建立受控工作副本与基线校验

**Files:**
- Create: `/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base/`
- Create: `/Users/rita/Documents/ChatGPT/AAC社群/scripts/verify-knowledge-base.mjs`
- Source: `/Users/rita/Downloads/知识库/`

- [ ] **Step 1: 复制原站点到 Git 受控工作区**

Run:

```bash
mkdir -p "/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base"
rsync -a --exclude backups "/Users/rita/Downloads/知识库/" "/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base/"
```

Expected: `site/knowledge-base/index.html` 等八个核心文件和现有图片均存在。

- [ ] **Step 2: 编写会在现状上失败的静态验证脚本**

Create `scripts/verify-knowledge-base.mjs` with these exact checks:

```js
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'site/knowledge-base');
const pages = ['index.html','learn.html','video.html','resources.html','detail.html','progress.html'];
const errors = [];
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

for (const page of pages) {
  const html = read(page);
  if (!html.includes('href="style.css"')) errors.push(`${page}: missing style.css`);
  if (!html.includes('src="search.js"')) errors.push(`${page}: missing search.js`);
  if (!html.includes('src="site.js"')) errors.push(`${page}: missing site.js`);
  if (!html.includes('class="nav-toggle"')) errors.push(`${page}: missing mobile nav toggle`);
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)) {
    const [tag, href] = match;
    if (/^https?:/.test(href) && /target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) {
      errors.push(`${page}: external target lacks noopener: ${href}`);
    }
    if (!/^(https?:|mailto:|#|javascript:)/.test(href)) {
      const local = href.split(/[?#]/)[0];
      if (local && !fs.existsSync(path.join(root, local))) errors.push(`${page}: missing local target ${local}`);
    }
  }
  for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)) {
    const src = match[1];
    if (!/^https?:/.test(src) && !fs.existsSync(path.join(root, src))) errors.push(`${page}: missing image ${src}`);
  }
}

const css = read('style.css');
if (/gradient\s*\(/i.test(css)) errors.push('style.css: gradients are forbidden');
for (const asset of ['img/xiaoa-home.png','img/xiaoa-learn.png','img/xiaoa-video.png','img/xiaoa-resources.png']) {
  if (!fs.existsSync(path.join(root, asset))) errors.push(`missing mascot ${asset}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${pages.length} pages validated`);
```

- [ ] **Step 3: 运行校验并确认基线失败**

Run:

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
```

Expected: FAIL，至少报告 `missing site.js`、`missing mobile nav toggle`、`gradients are forbidden` 和四张 mascot 缺失。

- [ ] **Step 4: 提交原站点基线与验证脚本**

```bash
git add site/knowledge-base scripts/verify-knowledge-base.mjs
git commit -m "chore: import knowledge base baseline"
```

## Task 2: 落盘四张小A主题素材

**Files:**
- Create: `site/knowledge-base/img/xiaoa-home.png`
- Create: `site/knowledge-base/img/xiaoa-learn.png`
- Create: `site/knowledge-base/img/xiaoa-video.png`
- Create: `site/knowledge-base/img/xiaoa-resources.png`

- [ ] **Step 1: 复制已确认的图片到工作副本**

```bash
cp "/Users/rita/.codex/generated_images/01a0414c-8917-7ac1-8792-1f12bb2b2c05/exec-9d42d4fa-8901-42c2-b718-4b2017cc2417.png" "site/knowledge-base/img/xiaoa-home.png"
cp "/Users/rita/.codex/generated_images/01a0414c-8917-7ac1-8792-1f12bb2b2c05/exec-e6cd0bd2-58e7-47a4-ac7d-1cb3cd32cdba.png" "site/knowledge-base/img/xiaoa-learn.png"
cp "/Users/rita/.codex/generated_images/01a0414c-8917-7ac1-8792-1f12bb2b2c05/exec-cc9f5a5b-b9eb-4337-9707-7deb698912cd.png" "site/knowledge-base/img/xiaoa-video.png"
cp "/Users/rita/.codex/generated_images/01a0414c-8917-7ac1-8792-1f12bb2b2c05/exec-673562a0-a5ff-4a14-8cc6-d35df3055f3f.png" "site/knowledge-base/img/xiaoa-resources.png"
```

- [ ] **Step 2: 验证尺寸与真透明通道**

```bash
for f in site/knowledge-base/img/xiaoa-{home,learn,video,resources}.png; do sips -g pixelWidth -g pixelHeight -g hasAlpha "$f"; done
```

Expected: 四张 `hasAlpha: yes`，短边均不小于 1100px。

- [ ] **Step 3: 提交角色素材**

```bash
git add site/knowledge-base/img/xiaoa-*.png
git commit -m "feat: add themed Xiao A mascot artwork"
```

## Task 3: 建立全站页面壳和交互基础

**Files:**
- Create: `site/knowledge-base/site.js`
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/learn.html`
- Modify: `site/knowledge-base/video.html`
- Modify: `site/knowledge-base/resources.html`
- Modify: `site/knowledge-base/detail.html`
- Modify: `site/knowledge-base/progress.html`

- [ ] **Step 1: 创建移动导航与 ready 状态脚本**

Create `site/knowledge-base/site.js`:

```js
(function () {
  var header = document.getElementById('topbar');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-links');

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) closeNav();
    });
  }

  window.addEventListener('scroll', function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  requestAnimationFrame(function () {
    document.documentElement.classList.add('is-ready');
  });
}());
```

- [ ] **Step 2: 在每个页面的品牌与导航之间加入菜单按钮**

Use this exact markup in all six pages, immediately before `<nav class="nav-links">`:

```html
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primaryNav">
  <span></span><span></span><span></span><span class="sr-only">打开导航</span>
</button>
```

Set the nav id consistently:

```html
<nav class="nav-links" id="primaryNav">
```

- [ ] **Step 3: 在六个页面的 `search.js` 后引用共享脚本**

```html
<script src="search.js"></script>
<script src="site.js"></script>
```

Remove the duplicated inline topbar scroll listener from every page because `site.js` owns it.

- [ ] **Step 4: 运行结构校验**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
```

Expected: `site.js` 和 `nav-toggle` 错误消失；仍因 CSS 渐变规则失败。

- [ ] **Step 5: 提交共享页面壳**

```bash
git add site/knowledge-base/*.html site/knowledge-base/site.js
git commit -m "feat: add responsive site shell"
```

## Task 4: 重构共享设计系统

**Files:**
- Modify: `site/knowledge-base/style.css`

- [ ] **Step 1: 替换根令牌与基础阅读样式**

The top of `style.css` must begin with this system:

```css
:root {
  --navy:#0B1E3A; --navy-2:#132B4F; --blue:#2563EB;
  --blue-soft:#EAF1FF; --mist:#F6F9FD; --white:#FFFFFF;
  --ink:#10213D; --muted:#5E7089; --quiet:#7E8EA4; --line:#DCE5F0;
  --radius:12px; --content:1180px;
  --font-sans:"Inter","PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;
  --font-mono:"JetBrains Mono","SF Mono",Consolas,monospace;
  --shadow:0 14px 38px -28px rgba(11,30,58,.32);
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--mist)}
body{margin:0;font-family:var(--font-sans);font-size:17px;line-height:1.8;color:var(--ink);background:var(--mist);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
button,input{font:inherit}
img{max-width:100%;display:block}
.container{width:min(100% - 56px,var(--content));margin-inline:auto}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
:focus-visible{outline:3px solid rgba(37,99,235,.35);outline-offset:3px}
```

- [ ] **Step 2: 实现统一顶部导航和移动菜单**

Use single-line desktop navigation, a 1px divider, short blue active underline, and this mobile behavior:

```css
.nav-toggle{display:none;width:44px;height:44px;border:0;background:transparent;place-content:center;gap:4px}
.nav-toggle>span:not(.sr-only){display:block;width:20px;height:1.5px;background:var(--ink)}
@media(max-width:820px){
  .topbar-inner{height:60px;padding-inline:20px;position:relative}
  .nav-toggle{display:grid;margin-left:auto}
  .nav-links{display:none;position:absolute;left:16px;right:16px;top:calc(100% + 8px);padding:10px;background:var(--white);border:1px solid var(--line);box-shadow:var(--shadow)}
  .nav-links.is-open{display:grid}
  .nav-links a{min-height:44px;display:flex;align-items:center;padding-inline:12px}
  .nav-right{margin-left:0}.search-box{width:44px}.search-box input,.search-box .kbd{display:none}
}
```

- [ ] **Step 3: 实现 Hero、编号、列表和页脚共享语言**

Requirements:

```css
.board-hero{position:relative;overflow:hidden;background:var(--navy);color:var(--white);border-bottom:3px solid var(--blue)}
.board-hero::before{content:"";position:absolute;inset:0 0 0 58%;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M0 0H48M0 0V48' fill='none' stroke='%23FFFFFF' stroke-opacity='.18'/%3E%3C/svg%3E");background-size:48px 48px;opacity:.55}
.bh-tag,.section-head .tag{font:700 12px/1.4 var(--font-mono);letter-spacing:.14em;text-transform:uppercase}
.section-head .tag::before,.bh-tag::before{content:"";display:inline-block;width:28px;height:3px;background:var(--blue);vertical-align:middle;margin-right:10px}
.section{padding:76px 0}
.footer{background:var(--navy);color:#B9C6D8;border-top:1px solid rgba(255,255,255,.1)}
```

The geometric grid is built from repeated 1px lines, not color gradients. Because the product rule forbids CSS gradients entirely, implement the grid with absolutely positioned pseudo-elements or an inline SVG data image containing only flat strokes; do not retain any `gradient(` token in CSS.

- [ ] **Step 4: 统一可点击单元和减少卡片浮起**

Apply to `.entry-card`, `.sub-card`, `.video-card`, `.res-entry`, `.p-row`, `.gate-home-card`:

```css
.entry-card,.sub-card,.video-card,.res-entry,.gate-home-card{background:var(--white);border:0;border-top:1px solid var(--line);border-radius:0;box-shadow:none;transition:border-color .18s,color .18s,background .18s}
.entry-card:hover,.sub-card:hover,.video-card:hover,.res-entry:hover,.gate-home-card:hover{transform:none;background:#F9FBFE;border-color:var(--blue)}
.ec-link,.sc-link,.gh-go,.re-foot,.v-btn{color:var(--blue)}
.entry-card:hover .ec-link,.sub-card:hover .sc-link{gap:10px}
```

- [ ] **Step 5: 实现字号、响应式与减少动效**

```css
.detail-body p,.dc-body p,.section-head .desc,.bh-left p{font-size:17px;line-height:1.8}
@media(max-width:560px){
  body{font-size:16px;line-height:1.75}
  .container{width:min(100% - 32px,var(--content))}
  .section{padding:54px 0}
  .board-hero .container{padding-top:42px;padding-bottom:36px}
  .bh-left h1{font-size:30px}
  .detail-body p,.dc-body p,.section-head .desc,.bh-left p{font-size:16px}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
```

- [ ] **Step 6: 运行校验并清理所有渐变**

```bash
rg -n "gradient\s*\(" site/knowledge-base/style.css
node scripts/verify-knowledge-base.mjs site/knowledge-base
```

Expected: `rg` 无输出；静态校验输出 `PASS: 6 pages validated`。

- [ ] **Step 7: 提交全站样式系统**

```bash
git add site/knowledge-base/style.css
git commit -m "feat: apply editorial AI design system"
```

## Task 5: 改造首页为轻门户

**Files:**
- Modify: `site/knowledge-base/index.html`

- [ ] **Step 1: 替换首页 Hero 文案和主题小A**

Use:

```html
<section class="board-hero home-hero">
  <div class="hero-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="bh-left reveal">
      <div class="bh-tag">AMER SPORTS · AI ENABLEMENT</div>
      <h1>把 AI 变成<br><em>每天的工作能力</em></h1>
      <p>从入门、观看到工具实践，在一个清晰的知识门户里找到最短路径。</p>
    </div>
    <div class="hero-mascot reveal" aria-label="小A AI 助手">
      <span class="mascot-status">XIAO A · ONLINE</span>
      <img src="img/xiaoa-home.png" alt="抬手欢迎的小A AI 助手">
    </div>
  </div>
</section>
```

- [ ] **Step 2: 将三大板块改为编号导航行**

Keep the existing hrefs and descriptions. Remove inline `--accent` styles and decorative top bars. Each item must retain exactly one title, one description, and one arrow action.

- [ ] **Step 3: 压缩小A介绍和外部资源区**

Keep the existing Xiao A URL, scenario list, comparison table, AI Daily link, and WaytoAGI link. Remove the existing promotional color treatment and style them as two clear editorial sections with 1px dividers.

- [ ] **Step 4: 检查首页语义和链接**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
rg -n "xiaoa-home|learn\.html|video\.html|resources\.html" site/knowledge-base/index.html
```

Expected: PASS；首页引用主题图和三个主入口。

- [ ] **Step 5: 提交首页改版**

```bash
git add site/knowledge-base/index.html
git commit -m "feat: redesign knowledge base homepage"
```

## Task 6: 改造学习、详情和进度页

**Files:**
- Modify: `site/knowledge-base/learn.html`
- Modify: `site/knowledge-base/detail.html`
- Modify: `site/knowledge-base/progress.html`

- [ ] **Step 1: 在学习页 Hero 加入学习小A**

```html
<div class="hero-mascot reveal">
  <img src="img/xiaoa-learn.png" alt="正在阅读学习的小A AI 助手">
</div>
```

Keep every existing course anchor, detail query parameter, prompt example, and Xiao A Q&A link.

- [ ] **Step 2: 将学习模块改为编号列表和清晰章节**

Preserve `.sub-grid`, `.sub-card`, `.path-panel`, `.xa-qa-grid` class hooks so the current content and scripts continue to work; change presentation through CSS and remove inline accent colors where they create multiple competing blues.

- [ ] **Step 3: 收窄详情页阅读宽度**

Add `reading-shell` to the detail content container and style it to `max-width: 860px`. Preserve all dynamic data objects and the current `type`/`id` query handling in `detail.html`.

- [ ] **Step 4: 优化进度页但锁定存储 key**

Do not change:

```js
var KEY = 'amer_ai_progress_v1';
```

Move the page-local visual rules from the inline `<style>` into shared `style.css`, keeping `.prog-bar`, `.prog-fill`, `.mod-item`, `.mod-check`, and `.pg-hint` hooks unchanged.

- [ ] **Step 5: 验证学习路径和进度数据**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
rg -n "amer_ai_progress_v1|xiaoa-learn|detail\.html\?type=learn" site/knowledge-base/{learn,progress}.html
```

Expected: PASS；存储 key、学习小A和详情路由全部存在。

- [ ] **Step 6: 提交学习系统改版**

```bash
git add site/knowledge-base/learn.html site/knowledge-base/detail.html site/knowledge-base/progress.html site/knowledge-base/style.css
git commit -m "feat: improve learning and progress experience"
```

## Task 7: 改造录播和资源页

**Files:**
- Modify: `site/knowledge-base/video.html`
- Modify: `site/knowledge-base/resources.html`

- [ ] **Step 1: 在录播 Hero 加入正面观看小A**

```html
<div class="hero-mascot reveal">
  <img src="img/xiaoa-video.png" alt="正在观看录播的小A AI 助手">
</div>
```

Keep all three SharePoint URLs and their `target="_blank" rel="noopener"` attributes.

- [ ] **Step 2: 用纯色线性封面替换三个渐变缩略图**

Retain `.thumb-landscape`, `.thumb-stars`, `.thumb-aurora` hooks, but use flat navy/blue panels, 1px geometric lines, and a white play control. No `linear-gradient`, `radial-gradient`, or gradient SVG definitions.

- [ ] **Step 3: 在资源 Hero 加入反向探索小A**

```html
<div class="hero-mascot reveal">
  <img src="img/xiaoa-resources.png" alt="使用放大镜探索 AI 工具的小A">
</div>
```

Keep all existing detail query parameters and external links.

- [ ] **Step 4: 将资源类别改成宽行列表**

Preserve `.res-entry`, `.re-head`, `.re-preview`, `.re-foot` hooks. Remove inline `--accent` values and use the single `--blue` token for every interactive state.

- [ ] **Step 5: 验证录播、资源路由和无渐变约束**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
rg -n "gradient\s*\(" site/knowledge-base
rg -n "xiaoa-video|xiaoa-resources|sharepoint\.com|detail\.html\?type=resources" site/knowledge-base/{video,resources}.html
```

Expected: 静态校验 PASS；渐变搜索无输出；主题图和路由全部存在。

- [ ] **Step 6: 提交录播与资源改版**

```bash
git add site/knowledge-base/video.html site/knowledge-base/resources.html site/knowledge-base/style.css
git commit -m "feat: redesign video and resource pages"
```

## Task 8: 浏览器验收与可访问性检查

**Files:**
- Create: `/private/tmp/knowledge-base-qa/` screenshots only
- Inspect: `site/knowledge-base/*.html`, `style.css`, `site.js`, `search.js`

- [ ] **Step 1: 启动本地静态服务器**

```bash
python3 -m http.server 4173 --directory site/knowledge-base
```

Expected: `http://127.0.0.1:4173/index.html` 可打开。

- [ ] **Step 2: 在三个视口截取六个页面**

```bash
mkdir -p /private/tmp/knowledge-base-qa
npx playwright screenshot --full-page --viewport-size="1440,1100" http://127.0.0.1:4173/index.html /private/tmp/knowledge-base-qa/index-1440.png
npx playwright screenshot --full-page --viewport-size="768,1024" http://127.0.0.1:4173/learn.html /private/tmp/knowledge-base-qa/learn-768.png
npx playwright screenshot --full-page --viewport-size="390,844" http://127.0.0.1:4173/resources.html /private/tmp/knowledge-base-qa/resources-390.png
npx playwright screenshot --full-page --viewport-size="1440,1100" http://127.0.0.1:4173/video.html /private/tmp/knowledge-base-qa/video-1440.png
npx playwright screenshot --full-page --viewport-size="768,1024" http://127.0.0.1:4173/progress.html /private/tmp/knowledge-base-qa/progress-768.png
npx playwright screenshot --full-page --viewport-size="390,844" "http://127.0.0.1:4173/detail.html?type=learn&id=ai-what" /private/tmp/knowledge-base-qa/detail-learn-390.png
npx playwright screenshot --full-page --viewport-size="1440,1100" "http://127.0.0.1:4173/detail.html?type=resources&id=tools" /private/tmp/knowledge-base-qa/detail-resources-1440.png
```

- [ ] **Step 3: 视觉检查每张截图**

Verify:

- no text overlap or horizontal scrolling;
- desktop body text is 17px and mobile body text is 16px;
- each Hero has at most one mascot and the mascot does not cover copy;
- no checkerboard backgrounds or white halos around PNGs;
- all pages use one interactive blue and no CSS gradients;
- lists are scannable and clickable regions are at least 44px high.

- [ ] **Step 4: 功能检查**

In the browser:

1. Press `⌘K`, type `Copilot`, open one result, and close the search.
2. At 390px, open and close the mobile menu, then follow each main navigation item.
3. On `progress.html`, check one module, refresh, confirm percentage/count/bar persist, then uncheck it.
4. Open all three SharePoint replay links and both home-page gateway links; confirm new-tab behavior.

- [ ] **Step 5: 运行最终自动校验**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
rg -n "gradient\s*\(" site/knowledge-base || true
git diff --check
```

Expected: `PASS: 6 pages validated`；渐变搜索无输出；`git diff --check` 无输出。

- [ ] **Step 6: 提交验收修正**

```bash
git add site/knowledge-base scripts/verify-knowledge-base.mjs
git commit -m "fix: polish responsive knowledge base layout"
```

## Task 9: 存档原文件并同步已验证版本

**Files:**
- Create: `/Users/rita/Downloads/知识库/backups/`
- Create or append: `/Users/rita/Downloads/知识库/backups/VERSIONS.md`
- Modify: `/Users/rita/Downloads/知识库/` explicit site files only

- [ ] **Step 1: 生成时间戳并存档当前原站点**

Run with one resolved timestamp, for example `20260827-153000`:

```bash
mkdir -p "/Users/rita/Downloads/知识库/backups/20260827-153000"
cp "/Users/rita/Downloads/知识库/index.html" "/Users/rita/Downloads/知识库/learn.html" "/Users/rita/Downloads/知识库/video.html" "/Users/rita/Downloads/知识库/resources.html" "/Users/rita/Downloads/知识库/detail.html" "/Users/rita/Downloads/知识库/progress.html" "/Users/rita/Downloads/知识库/style.css" "/Users/rita/Downloads/知识库/search.js" "/Users/rita/Downloads/知识库/backups/20260827-153000/"
```

Append exactly one descriptive entry to `backups/VERSIONS.md`:

```markdown
- 20260827-153000 | 全站 HTML/CSS/JS | v0.3 简约蓝色版，改版前完整状态
```

- [ ] **Step 2: 显式同步已验证文件，不删除原有未知文件**

```bash
rsync -a "/Users/rita/Documents/ChatGPT/AAC社群/site/knowledge-base/" "/Users/rita/Downloads/知识库/" --exclude backups
```

- [ ] **Step 3: 对最终位置重新校验**

```bash
node scripts/verify-knowledge-base.mjs "/Users/rita/Downloads/知识库"
for f in "/Users/rita/Downloads/知识库"/img/xiaoa-{home,learn,video,resources}.png; do sips -g hasAlpha "$f"; done
```

Expected: `PASS: 6 pages validated`；四张 `hasAlpha: yes`。

- [ ] **Step 4: 打开最终首页供用户确认**

```bash
open "/Users/rita/Downloads/知识库/index.html"
```

- [ ] **Step 5: 记录最终状态**

```bash
git status --short
git log --oneline -8
```

Expected: 受控工作副本无未提交改动；用户原有的 `outputs/` 和 `.superpowers/` 保持未追踪，不纳入任何改版提交。
