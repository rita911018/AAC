# Home Entry and Resources Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the homepage into a three-entry portal with a lightweight Xiao A Hero shortcut, and reorganize the resources page into company-internal Xiao A content plus unified external AI learning resources.

**Architecture:** Keep the six-page static site and shared stylesheet. Update the existing focused contract first, then make homepage and resources-page changes in separate commits so the contract moves from RED to GREEN. Extend the existing Playwright suite for content placement, link safety, keyboard access, and four-viewport geometry before checkpointing and syncing the delivered site.

**Tech Stack:** Static HTML, shared CSS, inline SVG, Node.js contract tests, Playwright browser QA.

---

## File map

- Modify `scripts/test-home-mascot-entry.mjs`: final static placement, uniqueness, copy, URL, classification, and compatibility-anchor contract.
- Modify `site/knowledge-base/index.html`: Hero shortcut, three-entry title, removal of full Xiao A section.
- Modify `site/knowledge-base/resources.html`: internal Xiao A section and unified external resources section.
- Modify `site/knowledge-base/style.css`: Hero shortcut positioning and external-site subsection spacing.
- Modify `scripts/test-task8-browser.cjs`: rendered four-viewport and interaction contract.
- Append `/Users/rita/Downloads/知识库/backups/VERSIONS.md` and sync `site/knowledge-base/` after validation.

### Task 1: Define the final placement contract

**Files:**
- Modify: `scripts/test-home-mascot-entry.mjs`

- [ ] **Step 1: Replace homepage-only Xiao A assumptions with scoped home/resources assertions**

Keep the approved brand SVG, title, search object, detail object, and Portal URL helpers. Replace the old assumption that `.xh-text`, `.xh-side`, and the full Xiao A section live on `index.html` with:

```js
const normalizeText = (value) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const homeHero = extractUniqueElementByClass(files.index, 'section', 'home-hero', 'home Hero');
const homeShortcut = extractUniqueElementByClass(homeHero.innerHtml, 'div', 'hero-xiaoa-entry', 'home Xiao A shortcut');
assert.equal(normalizeText(homeShortcut.innerHtml).includes('查制度、问流程、找内部信息，有问题先问小A。'), true);

const homeShortcutAnchor = findUniqueAnchorAttributesByText(homeShortcut.innerHtml, '打开小A');
const homeShortcutRel = new Set((homeShortcutAnchor.get('rel') ?? '').split(/\s+/).filter(Boolean));
assert.equal(homeShortcutAnchor.get('href'), portalUrl);
assert.equal(homeShortcutAnchor.get('target'), '_blank');
assert.ok(homeShortcutRel.has('noopener'));

assert.equal((files.index.match(/class=["'][^"']*\bentry-card\b[^"']*["']/g) ?? []).length, 3);
assert.ok(files.index.includes('<h2>选择你的 AI 学习路径</h2>'));
assert.ok(!/<section\b[^>]*\bid=["']xiaoa["']/i.test(files.index));
assert.ok(!files.index.includes('小A vs 微软 Copilot'));
```

- [ ] **Step 2: Add the resources-page internal/external structure contract**

Require the full Xiao A section only in `resources.html`, before the external resource section:

```js
const internalSection = extractUniqueElementByClass(files.resources, 'section', 'xiaoa-section', 'resources internal Xiao A section');
const externalSection = extractUniqueElementByClass(files.resources, 'section', 'external-resources', 'resources external section');
assert.ok(normalizeText(internalSection.innerHtml).includes('公司内部 AI 助手'));
assert.ok(normalizeText(externalSection.innerHtml).includes('外部 AI 学习资源'));
assert.ok(files.resources.indexOf('xiaoa-section') < files.resources.indexOf('external-resources'));
```

Run the existing exact five-capability, `.xh-note`, Portal CTA, and comparison-table checks against `files.resources`, not `files.index`.

Require four `.res-entry` links, no company-internal preview text inside the external section, and a DeepSeek preview:

```js
assert.equal((externalSection.innerHtml.match(/class=["'][^"']*\bres-entry\b[^"']*["']/g) ?? []).length, 4);
assert.ok(!normalizeText(externalSection.innerHtml).includes('公司内部'));
assert.ok(normalizeText(externalSection.innerHtml).includes('DeepSeek'));
```

Require one non-section `#gateway` inside the external section, visible copy `精选站点`, no visible `GATEWAY · AI 网闸` or duplicate `外部精选 AI 资源`, and the two existing safe external links.

- [ ] **Step 3: Require the retained header brand and PREVIEW label**

For every page, keep the exact knowledge-book checks and require the top `.brand` to contain normalized text `亚玛芬 AI 知识库PREVIEW`. Do not change the approved SVG contract.

- [ ] **Step 4: Run the focused test and verify RED**

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: FAIL because the homepage Hero shortcut does not yet exist.

- [ ] **Step 5: Mutation-check the new scope**

Use temporary copies to prove the test fails when: the full Xiao A section remains on home, the resources internal/external order is reversed, `#gateway` becomes a standalone section again, the home shortcut loses `noopener`, or `PREVIEW` is removed. Delete all temporary fixtures.

- [ ] **Step 6: Commit the RED contract**

```bash
git add scripts/test-home-mascot-entry.mjs
git commit -m "test: define home and resources placement contract"
```

### Task 2: Simplify the homepage and add the Hero shortcut

**Files:**
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/style.css`

- [ ] **Step 1: Add the semantic shortcut inside `.hero-mascot`**

Place this before the existing `<picture>`:

```html
<div class="hero-xiaoa-entry">
  <a class="hero-xiaoa-cta" href="https://portal.amersports.cn/portal/indexs" target="_blank" rel="noopener">打开小A<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
  <p>查制度、问流程、找内部信息，有问题先问小A。</p>
</div>
```

Do not change the WebP source, PNG fallback, alt text, or image dimensions.

- [ ] **Step 2: Change the three-entry section title and remove the full Xiao A section**

Replace only the `h2` text with `选择你的 AI 学习路径`. Delete the complete homepage `<section id="xiaoa">...</section>`. The three entry cards and footer must become adjacent siblings; preserve all three card hrefs, content, and order.

- [ ] **Step 3: Add the desktop shortcut styling**

Extend the existing CTA selector so the Hero shortcut reuses the approved button style:

```css
.xa-prompt-card .xp-cta,.xa-hero .xh-cta,.home-hero .hero-xiaoa-cta{min-height:44px;padding:9px 16px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--blue);border-radius:7px;background:var(--blue);color:var(--white);font-size:14px;font-weight:720}
```

Add:

```css
.home-hero .hero-xiaoa-entry{position:absolute;top:88px;right:-18px;z-index:5;width:190px;pointer-events:auto}
.home-hero .hero-xiaoa-entry p{margin:9px 0 0;color:var(--on-navy);font-size:12.5px;line-height:1.6}
.home-hero .hero-xiaoa-cta svg{width:16px;height:16px;stroke:currentColor}
.home-hero .hero-mascot img{right:48px}
```

Add the shortcut to the existing hover selector and keep focus-visible behavior inherited from the global link rule.

- [ ] **Step 4: Add responsive positions**

Within `max-width:820px`, set the shortcut to `width:174px;top:84px;right:0` and move the image left with `right:28px`. Within `max-width:560px`, set the shortcut to `width:160px;top:72px;right:0` and the image to `right:16px`. Browser geometry and screenshot review in Task 4 are the gate for accepting these exact positions.

- [ ] **Step 5: Run the focused contract**

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: still RED because the full Xiao A content is not yet present on `resources.html`; homepage shortcut/removal assertions pass.

- [ ] **Step 6: Run static regression checks**

```bash
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

- [ ] **Step 7: Commit the homepage change**

```bash
git add site/knowledge-base/index.html site/knowledge-base/style.css
git commit -m "feat: simplify home and add Xiao A shortcut"
```

### Task 3: Reorganize the resources page

**Files:**
- Modify: `site/knowledge-base/resources.html`
- Modify: `site/knowledge-base/style.css`

- [ ] **Step 1: Update the resources Hero description**

Use:

```html
<p>公司内部小A助手与外部 AI 学习资源统一整理：查流程、找工具、看课程、关注创作者与经典阅读，都从这里开始。</p>
```

- [ ] **Step 2: Insert the internal Xiao A section after the Hero**

Move the complete former homepage Xiao A markup into:

```html
<section class="section xiaoa-section" id="xiaoa">
```

Its section heading must identify `公司内部 AI 助手`; preserve the exact five capabilities, Portal note, Portal CTA, comparison table, aria-label, and table tabindex behavior.

- [ ] **Step 3: Convert the resource directory to the external section**

Change the existing category section to:

```html
<section class="section external-resources">
```

Use tag `EXTERNAL RESOURCES · 外部资源`, heading `外部 AI 学习资源`, and a description explaining that the four categories and selected sites are company-external learning resources.

Change the AI tools preview subtitle from `海外 · 国内 · 公司内部` to `海外 · 国内`. Replace the Xiao A preview row with:

```html
<div class="p-row">
  <span class="p-logo">DS</span>
  <div class="p-info"><b>DeepSeek <span class="p-badge">国内</span></b><small>国产通用 AI 助手，推理能力突出</small></div>
</div>
```

Keep the four detail URLs and their order unchanged.

- [ ] **Step 4: Merge selected sites into the external section**

Remove the standalone `section#gateway`. After `.resource-directory`, add:

```html
<div class="external-sites" id="gateway">
  <div class="external-sites-head">
    <h3>精选站点</h3>
    <p>精选外部 AI 站点，点击卡片在新窗口打开。</p>
  </div>
  <div class="gate-home-grid">
    <a class="gate-home-card" href="https://aihot.virxact.com/daily" target="_blank" rel="noopener">
      <span class="gh-icon">AI</span><div><div class="gh-name">AI 日报</div><div class="gh-desc">AI 行业每日精选动态 · virxact</div></div>
      <span class="gh-go">前往<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></span>
    </a>
    <a class="gate-home-card" href="https://www.waytoagi.com/zh" target="_blank" rel="noopener">
      <span class="gh-icon">AGI</span><div><div class="gh-name">WaytoAGI · AI 知识库</div><div class="gh-desc">高质量 AI 知识库与导航 · waytoagi.com</div></div>
      <span class="gh-go">前往<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></span>
    </a>
  </div>
</div>
```

The `id="gateway"` anchor remains, but no `section#gateway`, `GATEWAY · AI 网闸`, or `外部精选 AI 资源` heading remains.

- [ ] **Step 5: Add subsection spacing**

```css
.external-sites{margin-top:44px;padding-top:30px;border-top:1px solid var(--line)}
.external-sites-head{margin-bottom:18px}
.external-sites-head h3{margin-bottom:6px;font-size:22px}
.external-sites-head p{margin:0;color:var(--muted);font-size:16px;line-height:1.75}
```

At `max-width:560px`, reduce the top margin/padding to `32px/24px` without changing card targets.

- [ ] **Step 6: Run the focused contract and verify GREEN**

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: focused brand/home/resources/Gateway/Portal contract passes.

- [ ] **Step 7: Run all static checks**

```bash
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
node --check scripts/test-home-mascot-entry.mjs
git diff --check
```

- [ ] **Step 8: Commit the resources architecture**

```bash
git add site/knowledge-base/resources.html site/knowledge-base/style.css
git commit -m "feat: separate internal and external AI resources"
```

### Task 4: Update browser QA and inspect responsive geometry

**Files:**
- Modify: `scripts/test-task8-browser.cjs`

- [ ] **Step 1: Replace old placement assertions**

On `index`, require: three visible `.entry-card`s, exact section title, no `section#xiaoa`, no `.xa-hero` or `.xa-vs`, and one visible `.hero-xiaoa-entry` with exact normalized description and safe Portal anchor.

On `resources`, require: visible `.xiaoa-section` before `.external-resources`; the full Xiao A panel and comparison table inside the internal section; four visible `.res-entry`s; no `公司内部` text inside `.external-resources`; visible DeepSeek preview; one visible `.external-sites#gateway` inside the external section; no `section#gateway` or visible AI 网闸 label; two visible safe selected-site links.

- [ ] **Step 2: Add Hero shortcut geometry and keyboard checks**

For 1440/820/560/390, record shortcut, CTA, mascot image, Hero copy, and viewport rectangles. Derive the face-safe rectangle from the image rectangle as `left + width * .30` through `left + width * .72`, and `top` through `top + height * .56`. Assert the shortcut does not overlap that rectangle or `.bh-left`, remains inside the viewport, and has a CTA at least 44px high. Keep all existing mascot crop, WebP, and overflow checks.

At 390px, Tab through the page until `.hero-xiaoa-cta` receives focus and verify the shared focus-visible outline. Verify its `href`, `_blank`, and `noopener` without following the corporate URL.

- [ ] **Step 3: Mutation-test the browser contract**

Use temporary site copies to prove RED for: a fourth main entry card, full Xiao A section restored on home, shortcut hidden or missing `noopener`, internal/external order reversed, Xiao A text inside external resources, standalone `section#gateway`, and hidden selected-site links. Delete fixtures afterward.

- [ ] **Step 4: Run source browser QA**

```bash
python3 -m http.server 4177 --bind 127.0.0.1
node scripts/test-task8-browser.cjs http://127.0.0.1:4177 /private/tmp/knowledge-base-home-resources-final
```

Expected: all checks pass and 28 screenshots are generated.

- [ ] **Step 5: Inspect visual evidence**

Inspect `index-1440/820/560/390.png` and `resources-1440/820/560/390.png`. Confirm the shortcut visually sits above the hand, the face and title remain unobstructed, homepage flows directly from three cards to footer, and resources clearly separates internal Xiao A from external content.

- [ ] **Step 6: Commit browser coverage**

```bash
git add scripts/test-task8-browser.cjs
git commit -m "test: cover home and resources architecture"
```

### Task 5: Checkpoint, sync, and verify the delivered site

**Files:**
- Append `/Users/rita/Downloads/知识库/backups/VERSIONS.md`
- Sync `site/knowledge-base/` to `/Users/rita/Downloads/知识库/`

- [ ] **Step 1: Run fresh source verification**

Run the focused contract, Task 7, Task 8 static, six-page verifier, JavaScript syntax checks, full browser QA, `git diff --check`, and `git status --short`. Stop if any check fails.

- [ ] **Step 2: Create an append-only checkpoint**

Run `date +%Y%m%d-%H%M%S`, use that exact literal in a new `knowledge-base-backup-...` directory, copy the current delivered site excluding `backups/`, and append the same literal timestamp to `VERSIONS.md` using `apply_patch`. Describe it as the recoverable version before the homepage-three-entry and internal/external resource reorganization. Preserve every existing backup and version row.

- [ ] **Step 3: Sync without deleting backups**

```bash
rsync -a --exclude backups/ site/knowledge-base/ /Users/rita/Downloads/知识库/
```

- [ ] **Step 4: Verify the actual delivered directory**

Use an `rsync -aicn --delete --exclude backups/` dry run to prove no source/destination difference or stale extras. Run the six-page verifier on a backup-free delivered snapshot, serve the actual Downloads directory, and rerun the complete browser QA into a new `/private/tmp` screenshot directory.

- [ ] **Step 5: Open the delivered homepage and clean up servers**

```bash
open /Users/rita/Downloads/知识库/index.html
```

Confirm all temporary servers are stopped and the Git worktree remains clean.
