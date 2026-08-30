# Home Mascot and Xiao A Entry Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the homepage Xiao A into a face-safe half-body composition that never overlaps the title, and replace every unreleased UAT entry with the approved Portal homepage.

**Architecture:** Keep the current transparent mascot assets and HTML structure. Add homepage-scoped CSS overrides so other page mascots remain unchanged, update the three known entry records, and lock the behavior with static and real-browser regression tests before syncing the validated site to Downloads.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js contract tests, Playwright/Chromium browser QA, repository verifier, rsync checkpoint delivery.

---

### Task 1: Lock and update the Xiao A entry contract

**Files:**
- Create: `scripts/test-home-mascot-entry.mjs`
- Modify: `site/knowledge-base/index.html:109`
- Modify: `site/knowledge-base/search.js:22`
- Modify: `site/knowledge-base/detail.html:437`

- [ ] **Step 1: Write the failing static contract test**

Create `scripts/test-home-mascot-entry.mjs` with assertions equivalent to:

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('site/knowledge-base');
const files = ['index.html', 'search.js', 'detail.html'];
const source = Object.fromEntries(files.map((file) => [file, readFileSync(resolve(root, file), 'utf8')]));
const portal = 'https://portal.amersports.cn/portal/indexs';
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(!files.some((file) => source[file].includes('ai-uat.amersports.cn:9093')), 'old UAT entry remains');
expect(files.every((file) => source[file].includes(portal)), 'not every Xiao A entry points to Portal');
expect(source['index.html'].includes('前往 Portal 打开小A'), 'homepage CTA does not explain the Portal step');
expect(source['search.js'].includes('点击右侧「小A智助」'), 'search result lacks Portal guidance');
expect(source['detail.html'].includes('点击右侧「小A智助」'), 'tool detail lacks Portal guidance');

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}
console.log('PASS: Xiao A entries use the approved Portal flow');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node scripts/test-home-mascot-entry.mjs
```

Expected: FAIL because the old UAT URL and old CTA copy are still present.

- [ ] **Step 3: Apply the minimal entry changes**

Use the approved target in all three files:

```text
https://portal.amersports.cn/portal/indexs
```

Use homepage CTA copy:

```html
前往 Portal 打开小A
```

Use guidance in search and tool descriptions:

```text
进入 Portal 后，点击右侧「小A智助」
```

Preserve `target="_blank" rel="noopener"` on the homepage CTA.

- [ ] **Step 4: Run the static contract and repository verifier**

Run:

```bash
node scripts/test-home-mascot-entry.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
```

Expected:

```text
PASS: Xiao A entries use the approved Portal flow
PASS: 6 pages validated
```

- [ ] **Step 5: Commit the entry update**

```bash
git add scripts/test-home-mascot-entry.mjs site/knowledge-base/index.html site/knowledge-base/search.js site/knowledge-base/detail.html
git commit -m "fix: update Xiao A Portal entry"
```

### Task 2: Implement the face-safe half-body homepage mascot

**Files:**
- Modify: `site/knowledge-base/style.css:89-107,429-506`
- Modify: `scripts/test-task8-browser.cjs:45-83`

- [ ] **Step 1: Add failing browser assertions for the homepage composition**

Extend the per-viewport metrics in `scripts/test-task8-browser.cjs` for `name === 'index'`:

```js
const hero = document.querySelector('.home-hero');
const image = hero?.querySelector('.hero-mascot img');
const heroRect = rect(hero);
const imageRect = rect(image);
return {
  // existing metrics remain
  homeMascot: heroRect && mascotRect && imageRect && copyRect ? {
    copyOverlap: overlap(copyRect, mascotRect),
    imageTopInsideHero: imageRect.top >= heroRect.top - 1,
    lowerBodyCropped: imageRect.bottom > heroRect.bottom + 20,
    faceScale: imageRect.height / heroRect.height,
    copyRight: copyRect.right,
    mascotLeft: mascotRect.left,
  } : null,
};
```

Add assertions after the shared checks:

```js
if (name === 'index') {
  expect(metrics.homeMascot && !metrics.homeMascot.copyOverlap, `index ${width}px: mascot overlaps title area`);
  expect(metrics.homeMascot?.imageTopInsideHero, `index ${width}px: mascot face/hair is clipped at the top`);
  expect(metrics.homeMascot?.lowerBodyCropped, `index ${width}px: mascot is not a half-body crop`);
  expect(metrics.homeMascot?.faceScale >= 1.12, `index ${width}px: mascot remains too small`);
}
```

- [ ] **Step 2: Run browser QA and verify RED**

Serve the site locally, then run:

```bash
node scripts/test-task8-browser.cjs http://127.0.0.1:4174 /private/tmp/knowledge-base-xiaoa-red
```

Expected: FAIL on the homepage half-body crop/scale assertions because the current mascot fits fully inside a 240px container.

- [ ] **Step 3: Add homepage-scoped desktop CSS**

Add rules after the shared mascot rules so other page mascots do not change:

```css
.home-hero .container{
  min-height:360px;
  padding-block:48px 0;
  grid-template-columns:minmax(0,1fr) minmax(340px,440px);
  align-items:stretch;
}
.home-hero .bh-left{
  grid-column:1;
  align-self:center;
  max-width:700px;
  padding-bottom:48px;
}
.home-hero .hero-mascot{
  grid-column:2;
  width:100%;
  height:360px;
  max-height:none;
  margin:0;
  align-self:end;
  justify-self:end;
  overflow:visible;
}
.home-hero .hero-mascot picture{position:relative;overflow:visible}
.home-hero .hero-mascot img{
  position:absolute;
  right:0;
  bottom:-165px;
  width:auto;
  height:520px;
  max-height:none;
  object-fit:contain;
}
.home-hero .hero-mascot .mascot-status{right:0;bottom:18px}
```

The section-level `overflow:hidden` performs the lower-body crop while the image top remains inside the Hero.

- [ ] **Step 4: Add tablet and mobile safe-zone CSS**

Within `@media(max-width:820px)` add:

```css
.home-hero .container{gap:14px;padding-block:42px 0}
.home-hero .bh-left{grid-column:1;grid-row:1;padding-bottom:0}
.home-hero .hero-mascot{
  grid-column:1;
  grid-row:2;
  width:min(92%,360px);
  height:280px;
  max-height:none;
  margin-top:0;
  justify-self:end;
  align-self:end;
}
.home-hero .hero-mascot img{right:0;bottom:-110px;height:390px;max-height:none}
.home-hero .hero-mascot .mascot-status{right:0;bottom:14px}
```

Within `@media(max-width:560px)` add:

```css
.home-hero .container{gap:10px;padding-block:38px 0}
.home-hero .hero-mascot{width:min(96%,320px);height:250px}
.home-hero .hero-mascot img{bottom:-80px;height:330px}
```

- [ ] **Step 5: Run browser QA and tune only scoped values until GREEN**

Run:

```bash
node scripts/test-task8-browser.cjs http://127.0.0.1:4174 /private/tmp/knowledge-base-xiaoa-green
```

Expected: all checks pass at 1440, 820, 560, and 390; screenshot inspection confirms the face and both eyes are complete and the title remains unobstructed.

- [ ] **Step 6: Commit the Hero refinement**

```bash
git add site/knowledge-base/style.css scripts/test-task8-browser.cjs
git commit -m "feat: enlarge homepage Xiao A mascot"
```

### Task 3: Final verification, checkpoint, and delivery

**Files:**
- Update outside Git after verification: `/Users/rita/Downloads/知识库/`
- Append: `/Users/rita/Downloads/知识库/backups/VERSIONS.md`

- [ ] **Step 1: Run the full fresh verification suite**

```bash
node scripts/test-home-mascot-entry.mjs
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
node --check site/knowledge-base/site.js
node --check site/knowledge-base/search.js
node --check scripts/test-task8-browser.cjs
git diff --check
git status --short
```

Expected: every test prints PASS, syntax checks and diff check exit 0, and the worktree is clean.

- [ ] **Step 2: Run the real-browser final QA**

```bash
node scripts/test-task8-browser.cjs http://127.0.0.1:4174 /private/tmp/knowledge-base-xiaoa-final
```

Expected: all browser checks pass and 28 screenshots are created.

- [ ] **Step 3: Create an append-only checkpoint of the currently delivered site**

Create a timestamped folder under:

```text
/Users/rita/Downloads/知识库/backups/knowledge-base-backup-YYYYMMDD-HHMMSS/
```

Copy the current live files while excluding `backups/`, then append this description to `backups/VERSIONS.md`:

```text
全站蓝白无渐变版：完整六页、四款小 A 主题形象、响应式与无障碍已验证；更新 Portal 入口和首页半身构图前的可恢复版本
```

- [ ] **Step 4: Sync and verify the actual Downloads site**

Sync `site/knowledge-base/` to `/Users/rita/Downloads/知识库/` without deleting `backups/`. Create a temporary live-only snapshot excluding backups and run:

```bash
KB_LIVE_SNAPSHOT=$(mktemp -d /private/tmp/knowledge-base-live-XXXXXX)
rsync -a --exclude 'backups/' '/Users/rita/Downloads/知识库/' "$KB_LIVE_SNAPSHOT/"
node scripts/verify-knowledge-base.mjs "$KB_LIVE_SNAPSHOT"
diff -qr site/knowledge-base "$KB_LIVE_SNAPSHOT"
```

Serve the actual Downloads directory and rerun the browser QA against it. Expected: static verifier PASS, no diff output, browser suite PASS.

- [ ] **Step 5: Open the delivered homepage and report the checkpoint path**

Open:

```text
/Users/rita/Downloads/知识库/index.html
```

Report the new backup timestamp, Portal link coverage, browser check count, and screenshot directory.
