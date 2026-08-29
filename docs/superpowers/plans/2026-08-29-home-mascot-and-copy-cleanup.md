# Home Mascot and Copy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the homepage Xiao A artwork left at responsive widths, redesign the three homepage entry cards with stronger hierarchy and large icons, remove two redundant homepage sentences, and unify the site footer owner copy.

**Architecture:** Keep the existing DOM and visual system. Add focused static and browser assertions first, then make a minimal HTML/CSS adjustment and resync the already delivered static site without deleting backups.

**Tech Stack:** Static HTML/CSS, Node contract tests, Playwright browser QA, rsync delivery.

---

### Task 1: Lock the requested copy and geometry

**Files:**
- Modify: `scripts/test-home-mascot-entry.mjs`
- Modify: `scripts/test-task8-browser.cjs`

- [ ] Add static assertions that both deleted sentences are absent from rendered homepage text.
- [ ] Assert all six HTML pages use the exact new `Amersports AI Community` footer sentence and the former owner sentence is absent.
- [ ] Assert the three entry cards preserve their approved href/title/description/order, and each contains exactly one distinct inline SVG icon with `aria-hidden="true"`.
- [ ] Add `1236px` and `1024px` homepage geometry cases in addition to existing viewports.
- [ ] At widths above `820px`, use a conservative expanded face-safe boundary; at `820px` and below, use a wider boundary matching the visible head in the supplied screenshot. Require a visible gap, no title overlap, no horizontal overflow and a `44px` CTA.
- [ ] Add learn-only geometry checks: the full Hero description is one line at `1440/1236`, and the reading mascot is at least `300px` tall there, at least `250px` at `1024/820`, and at least `190px` at `560/390`, without copy overlap or overflow.
- [ ] Run the focused tests and confirm RED on the current production files.
- [ ] Commit the test contract.

### Task 2: Apply the minimal homepage and footer change

**Files:**
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/learn.html`
- Modify: `site/knowledge-base/video.html`
- Modify: `site/knowledge-base/resources.html`
- Modify: `site/knowledge-base/progress.html`
- Modify: `site/knowledge-base/detail.html`
- Modify: `site/knowledge-base/style.css`

- [ ] Remove the two exact homepage paragraphs without changing the three entry cards.
- [ ] Add an `ec-top` row and distinct large inline SVG to each card: open book for learning, play screen for replay, and tool/grid for resources. Keep the whole card as the only link and keep SVG decorative.
- [ ] Restyle cards with a `72px` solid-blue icon tile, `28px` desktop titles, quieter `17px` descriptions, generous spacing, equal card heights and a bottom-aligned action; use no gradients.
- [ ] Replace every footer description with `由 Amersports AI Community 维护的内部学习平台，帮助每一位员工从 AI 新手成长为高效使用者。`
- [ ] Move the mascot left while keeping the entry fixed: begin with `right:80px` on desktop, `right:76px` at `max-width:820px`, and `right:64px` at `max-width:560px`; retain the value only if all geometry acceptance checks pass.
- [ ] Enlarge the learn Hero mascot to a main-visual scale while preserving the existing WebP/PNG/alt, and keep the complete learn Hero description on one line at `1236px` and above only.
- [ ] Keep the learn Hero action/progress group and overview data anchored to the copy's left boundary; use a desktop row and mobile stack without overlap.
- [ ] Run focused static and browser tests at `1440 / 1236 / 1024 / 820 / 560 / 390px`; adjust only the mascot offsets if needed to maintain the required gap and title safety.
- [ ] Run all learning, homepage, Task 7, Task 8, verifier and browser regression suites.
- [ ] Commit the production change.

### Task 3: Make the six-chapter learning path visible

**Files:**
- Modify: `site/knowledge-base/detail.html`
- Modify: `site/knowledge-base/learning-experience.js`
- Modify: `site/knowledge-base/learning-experience.css`
- Modify: `scripts/test-learning-experience.mjs`
- Modify: `scripts/test-learning-browser.cjs`

- [ ] For `type=learn` chapter detail pages only, add a left-side six-chapter path rail with an exact `已看 n/6` session count, current chapter, per-chapter status and a return-to-directory link.
- [ ] Use real links, `aria-current="page"`, text/icon status in addition to color, and update from the existing session store without adding `localStorage`, login, certificate or cross-device behavior.
- [ ] Keep the article as a strong single reading column. At `1024px` and below, replace the sticky rail with a native top disclosure containing the same six links and statuses.
- [ ] Preserve alias routing, back/return focus, previous/next, completion, reduced motion and storage-throw fallbacks.
- [ ] Add focused static/runtime/browser tests and mutations for six links/order/current/status/count, desktop sticky geometry, mobile disclosure, keyboard operation and no overflow.
- [ ] Run learning static/runtime/mutation/browser suites and commit the focused change.

### Task 4: Refine the beginner content rhythm and relationship interaction

**Files:**
- Modify: `site/knowledge-base/learning-experience.js`
- Modify: `site/knowledge-base/learning-experience.css`
- Modify: `scripts/test-learning-experience.mjs`
- Modify: `scripts/test-learning-browser.cjs`

- [ ] Add a four-scene “先看 AI 能做什么” overview to `ai-basics` before the principle explanation, using Amersports-relevant generic work examples and no external resource links.
- [ ] Add a concise “搜索找来源 / AI 组织与生成” choice comparison to `ai-boundaries`; keep source verification in `ai-verification` and do not create a safety or comprehensive-practice chapter.
- [ ] Replace the three repetitive concept matching fieldsets with a four-node clickable relationship map: AI, generative AI, large language model, Agent.
- [ ] Each node exposes one concise relationship explanation via the existing polite feedback region; add one lightweight retryable judgment question after the map.
- [ ] Keep the Token interaction and five-step disclosure unchanged; do not add scores, gates, drag-only behavior or persistence beyond the existing session state.
- [ ] Preserve keyboard access, `44px` targets, reduced motion, first meaningful interaction enabling completion, safe DOM rendering and 390px no-overflow behavior.
- [ ] Add static/runtime/browser contract and targeted mutations for the four nodes, explanation feedback, single judgment, keyboard use and removal of the old three repeated groups.
- [ ] Run learning static/runtime/mutation/browser suites and commit the focused change.

### Task 5: Deliver and verify

**Files:**
- Update: `/Users/rita/Downloads/知识库/` excluding `backups/`

- [ ] Create a new append-only timestamped backup and `VERSIONS.md` row before synchronization.
- [ ] Sync `site/knowledge-base/` without deleting or overwriting existing backups.
- [ ] Require `rsync -aicn --delete --exclude backups/` to return zero differences.
- [ ] Run static and browser checks against the actual Downloads root.
- [ ] Reload and leave the delivered homepage open in the in-app browser.
- [ ] Stop only servers created by this task and confirm the Git worktree is clean.
