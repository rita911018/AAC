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
- [ ] Run focused static and browser tests at `1440 / 1236 / 1024 / 820 / 560 / 390px`; adjust only the mascot offsets if needed to maintain the required gap and title safety.
- [ ] Run all learning, homepage, Task 7, Task 8, verifier and browser regression suites.
- [ ] Commit the production change.

### Task 3: Deliver and verify

**Files:**
- Update: `/Users/rita/Downloads/知识库/` excluding `backups/`

- [ ] Create a new append-only timestamped backup and `VERSIONS.md` row before synchronization.
- [ ] Sync `site/knowledge-base/` without deleting or overwriting existing backups.
- [ ] Require `rsync -aicn --delete --exclude backups/` to return zero differences.
- [ ] Run static and browser checks against the actual Downloads root.
- [ ] Reload and leave the delivered homepage open in the in-app browser.
- [ ] Stop only servers created by this task and confirm the Git worktree is clean.
