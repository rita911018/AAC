# Homepage Brand and Content Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic AI mark with a knowledge-book brand, clarify the homepage identity, update the Xiao A panel to Xiao A 2.0 capabilities, remove its status badge, and keep external AI resources only on the resources page.

**Architecture:** Keep the existing six-page static HTML architecture and shared `style.css`. Extend the focused Xiao A/home contract test to cover exact content and brand invariants, then update the shared inline SVG and homepage markup. Extend the existing Playwright harness for rendered logo, content, removal, and responsive geometry checks.

**Tech Stack:** Static HTML, shared CSS, inline SVG, Node.js contract tests, Playwright browser QA.

---

## File map

- Modify `scripts/test-home-mascot-entry.mjs`: exact static contract for all brand marks, homepage hero copy, Xiao A 2.0 list, status removal, Gateway relocation, and preserved Portal entry.
- Modify `site/knowledge-base/index.html`: homepage title, Xiao A content, status removal, Gateway removal, header/footer book marks.
- Modify `site/knowledge-base/learn.html`: header/footer book marks only.
- Modify `site/knowledge-base/video.html`: header/footer book marks only.
- Modify `site/knowledge-base/resources.html`: header/footer book marks only; preserve Gateway section and external URLs.
- Modify `site/knowledge-base/progress.html`: header/footer book marks only.
- Modify `site/knowledge-base/detail.html`: header/footer book marks only.
- Modify `site/knowledge-base/style.css`: homepage subtitle typography and removal of homepage-only status positioning rules.
- Modify `scripts/test-task8-browser.cjs`: rendered four-viewport checks and screenshots.

### Task 1: Add the static brand and content contract

**Files:**
- Modify: `scripts/test-home-mascot-entry.mjs`

- [ ] **Step 1: Write the failing assertions**

Add all six HTML files to the test fixture and assert the exact approved contract:

```js
const htmlPages = Object.fromEntries(
  ['index.html', 'learn.html', 'video.html', 'resources.html', 'progress.html', 'detail.html']
    .map((name) => [name, readFileSync(`site/knowledge-base/${name}`, 'utf8')]),
);

for (const [name, html] of Object.entries(htmlPages)) {
  assert.equal((html.match(/data-brand-icon=["']knowledge-book["']/g) ?? []).length, 2,
    `${name} must use the knowledge-book mark in header and footer`);
  assert.ok(!html.includes('M12 3v3M12 18v3'), `${name} must not retain the old starburst mark`);
}

assert.match(files.index, /<h1>\s*亚玛芬 AI 知识库\s*<\/h1>/);
assert.match(files.index, /class=["']bh-subtitle["'][^>]*>一站式 AI 学习资源与实践指南<\/p>/);
assert.ok(!files.index.includes('AMER SPORTS · AI ENABLEMENT'));
assert.ok(!files.index.includes('XIAO A · ONLINE'));
assert.ok(!files.index.includes('id="gateway"'));
assert.ok(htmlPages['resources.html'].includes('id="gateway"'));

const approvedCapabilities = [
  '问流程：办公流程、SAP 流程、供应商创建与变更',
  '查财务：费用报销、财务项目预算管理',
  '查系统：Ariba、BIT 与 IT 服务指引',
  '连续追问：理解上下文、简称和补充信息',
  '看图表：识别图片与表格，回答更完整',
];
assert.ok(files.index.includes('小A 2.0 能帮你做什么'));
const xiaoASide = extractUniqueElementByClass(files.index, 'div', 'xh-side', 'home Xiao A 2.0 panel');
const xiaoASideText = xiaoASide.innerHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
for (const capability of approvedCapabilities) assert.ok(xiaoASideText.includes(capability));
```

Preserve all existing Portal URL, CTA, search object, detail object, and visible-instruction assertions.

- [ ] **Step 2: Run the focused contract and verify RED**

Run:

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: FAIL on the missing `knowledge-book` marks before any production file changes.

- [ ] **Step 3: Commit the RED test**

```bash
git add scripts/test-home-mascot-entry.mjs
git commit -m "test: define homepage brand content contract"
```

### Task 2: Replace the brand mark across all pages

**Files:**
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/learn.html`
- Modify: `site/knowledge-base/video.html`
- Modify: `site/knowledge-base/resources.html`
- Modify: `site/knowledge-base/progress.html`
- Modify: `site/knowledge-base/detail.html`

- [ ] **Step 1: Replace each header and footer SVG**

Use the same two-path inline mark for every `.logo` element:

```html
<span class="logo"><svg data-brand-icon="knowledge-book" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5c3.1-.8 5.6-.2 7.5 1.5v12c-1.9-1.7-4.4-2.3-7.5-1.5z"/><path d="M19.5 5.5c-3.1-.8-5.6-.2-7.5 1.5v12c1.9-1.7 4.4-2.3 7.5-1.5z"/></svg></span>
```

Do not alter brand text, navigation links, footer links, or page-specific active states.

- [ ] **Step 2: Run the focused contract**

Run:

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: still FAIL on homepage copy/content/removal assertions, while logo assertions pass.

- [ ] **Step 3: Run syntax and verifier checks**

```bash
node scripts/verify-knowledge-base.mjs site/knowledge-base
node scripts/test-task8.mjs
git diff --check
```

Expected: six pages validate; no gradients or malformed local assets are reported.

- [ ] **Step 4: Commit the shared brand update**

```bash
git add site/knowledge-base/index.html site/knowledge-base/learn.html site/knowledge-base/video.html site/knowledge-base/resources.html site/knowledge-base/progress.html site/knowledge-base/detail.html
git commit -m "feat: add knowledge-book brand mark"
```

### Task 3: Refine the homepage title and content

**Files:**
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/style.css`

- [ ] **Step 1: Replace the hero copy and remove the status element**

Replace the `.bh-left` content with:

```html
<div class="bh-left reveal">
  <h1>亚玛芬 AI 知识库</h1>
  <p class="bh-subtitle">一站式 AI 学习资源与实践指南</p>
  <p>从入门、录播到工具实践，在清晰的知识路径里找到所需内容。</p>
</div>
```

Delete only the homepage `<span class="mascot-status">XIAO A · ONLINE</span>`. Keep the mascot `<picture>`, WebP source, PNG fallback, alt text, and geometry unchanged.

- [ ] **Step 2: Add the approved subtitle typography**

Add a specific rule after the existing `.bh-left p` rule:

```css
.bh-left .bh-subtitle{max-width:720px;margin-top:14px;color:var(--white);font-size:clamp(20px,2.2vw,27px);font-weight:650;letter-spacing:-.02em;line-height:1.4}
.bh-left .bh-subtitle + p{margin-top:10px}
```

Delete the three homepage-only `.home-hero .hero-mascot .mascot-status` positioning rules. Keep the global `.mascot-status` styles because the learning-page label remains in scope.

- [ ] **Step 3: Replace the Xiao A side panel content**

Use exact plain-text rows so the static and rendered contracts remain stable:

```html
<div class="xh-side">
  <h4>小A 2.0 能帮你做什么</h4>
  <ul>
    <li><b>问流程</b>：办公流程、SAP 流程、供应商创建与变更</li>
    <li><b>查财务</b>：费用报销、财务项目预算管理</li>
    <li><b>查系统</b>：Ariba、BIT 与 IT 服务指引</li>
    <li><b>连续追问</b>：理解上下文、简称和补充信息</li>
    <li><b>看图表</b>：识别图片与表格，回答更完整</li>
  </ul>
</div>
```

Keep the approved Portal note and CTA unchanged.

- [ ] **Step 4: Remove the homepage Gateway section**

Delete the entire `<!-- AI 网闸 -->` section from `index.html`. Do not change `resources.html`, the external URLs, or the search index entries.

- [ ] **Step 5: Run the focused contract and verify GREEN**

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: `Xiao A Portal entry checks passed.`

- [ ] **Step 6: Run the static regression suite**

```bash
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: Task 7 passes, Task 8 static passes, and six pages validate.

- [ ] **Step 7: Commit the homepage refinement**

```bash
git add site/knowledge-base/index.html site/knowledge-base/style.css
git commit -m "feat: clarify homepage brand and Xiao A content"
```

### Task 4: Extend browser QA and verify delivery behavior

**Files:**
- Modify: `scripts/test-task8-browser.cjs`

- [ ] **Step 1: Add rendered contract metrics**

Include the following values in the existing `page.evaluate` result:

```js
brandBookCount: document.querySelectorAll('svg[data-brand-icon="knowledge-book"]').length,
oldBrandCount: document.querySelectorAll('.logo svg path[d^="M12 3v3"]').length,
homeEyebrowCount: document.querySelectorAll('.home-hero .bh-tag').length,
homeStatusCount: document.querySelectorAll('.home-hero .mascot-status').length,
homeGatewayCount: document.querySelectorAll('body > #gateway, main #gateway').length,
homeSubtitleRect: rect(document.querySelector('.home-hero .bh-subtitle')),
```

Assert every page has two knowledge-book marks and no old mark. On `index`, assert exact H1/subtitle text, no eyebrow, no status, no Gateway, visible subtitle geometry, and preserved mascot/copy non-overlap. After loading `resources.html`, assert `#gateway`, AI 日报, WaytoAGI, and both safe external links remain.

- [ ] **Step 2: Run JavaScript syntax checks**

```bash
node --check scripts/test-home-mascot-entry.mjs
node --check scripts/test-task8-browser.cjs
```

Expected: both files parse successfully.

- [ ] **Step 3: Run the full browser suite at four viewports**

Serve the site and run:

```bash
python3 -m http.server 4176 --bind 127.0.0.1
node scripts/test-task8-browser.cjs http://127.0.0.1:4176 /private/tmp/knowledge-base-home-brand-final
```

Expected: all checks pass; 28 screenshots are written; 1440/820/560/390 homepage metrics show no title or image overlap and no horizontal overflow.

- [ ] **Step 4: Inspect homepage screenshots**

Open `index-1440.png` and `index-390.png`. Confirm the book mark is legible, the title hierarchy is clear, Xiao A is unobstructed, and the page flows directly from the Xiao A comparison to the footer after the removed Gateway content.

- [ ] **Step 5: Commit browser coverage**

```bash
git add scripts/test-task8-browser.cjs
git commit -m "test: cover homepage brand refinement"
```

### Task 5: Checkpoint and sync the delivered site

**Files:**
- Append: `/Users/rita/Downloads/知识库/backups/VERSIONS.md`
- Sync: `site/knowledge-base/` to `/Users/rita/Downloads/知识库/`

- [ ] **Step 1: Run the final source verification**

```bash
node scripts/test-home-mascot-entry.mjs
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
git status --short
```

Expected: all commands exit 0 and the worktree is clean after commits.

- [ ] **Step 2: Create a timestamped checkpoint of the current delivered site**

Run `date +%Y%m%d-%H%M%S`, use that exact returned value in a new `knowledge-base-backup-...` directory under `/Users/rita/Downloads/知识库/backups/`, copy the live site excluding `backups/`, and append the same literal timestamp to `VERSIONS.md` with a description of the pre-brand-refinement version. Never overwrite or delete earlier backups.

- [ ] **Step 3: Sync the validated site**

```bash
rsync -a --exclude backups/ site/knowledge-base/ /Users/rita/Downloads/知识库/
```

- [ ] **Step 4: Verify the actual delivered directory**

Copy the live delivered files excluding `backups/` to a temporary directory, compare it with `site/knowledge-base`, run the six-page verifier, then serve `/Users/rita/Downloads/知识库/` and rerun the full browser suite against the delivered files.

Expected: no diff, six pages validate, browser checks pass, and screenshots show the approved design.

- [ ] **Step 5: Open the delivered homepage**

```bash
open /Users/rita/Downloads/知识库/index.html
```

Expected: the browser opens the final local homepage.
