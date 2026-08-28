const { mkdirSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
let playwright;
try {
  playwright = require('playwright');
} catch {
  const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  playwright = require(resolve(globalModules, 'playwright'));
}
const { chromium } = playwright;

const base = process.argv[2] || 'http://127.0.0.1:4173';
const output = resolve(process.argv[3] || '/private/tmp/knowledge-base-qa');
mkdirSync(output, { recursive: true });

const failures = [];
let checks = 0;
function expect(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const pages = [
  ['index', 'index.html'],
  ['learn', 'learn.html'],
  ['video', 'video.html'],
  ['resources', 'resources.html'],
  ['progress', 'progress.html'],
  ['detail-learn', 'detail.html?type=learn&id=ai-what'],
  ['detail-resources', 'detail.html?type=resources&id=tools'],
];
const viewports = [
  [1440, 1100],
  [820, 1100],
  [560, 900],
  [390, 844],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const runtimeErrors = [];
  const homeViewportEvidence = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  for (const [name, path] of pages) {
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const metrics = await page.evaluate(() => {
        const bodyStyle = getComputedStyle(document.body);
        const mascot = document.querySelector('.hero-mascot');
        const copy = document.querySelector('.bh-left');
        const rect = (node) => node ? node.getBoundingClientRect().toJSON() : null;
        const overlap = (a, b) => Boolean(a && b && a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top);
        const mascotRect = rect(mascot);
        const copyRect = rect(copy);
        const homeSectionRect = rect(document.querySelector('.home-hero'));
        const homeHeroRect = rect(document.querySelector('.home-hero .hero-mascot'));
        const homeImageRect = rect(document.querySelector('.home-hero .hero-mascot img'));
        const homeTitleRect = rect(document.querySelector('.home-hero .bh-left h1'));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          fontSize: bodyStyle.fontSize,
          lineHeight: bodyStyle.lineHeight,
          mascotCount: document.querySelectorAll('.hero-mascot').length,
          mascotCopyOverlap: overlap(mascotRect, copyRect),
          brandHeight: document.querySelector('.brand')?.getBoundingClientRect().height || 0,
          navTargetHeights: [...document.querySelectorAll('.nav-links a')].map((node) => node.getBoundingClientRect().height),
          footerTargetHeights: [...document.querySelectorAll('.footer a')].map((node) => node.getBoundingClientRect().height),
          searchInput: rect(document.querySelector('#searchInput')),
          homeSectionRect,
          homeHeroRect,
          homeImageRect,
          homeTitleRect,
          homeCopyRect: rect(document.querySelector('.home-hero .bh-left')),
          homeMascotRect: rect(document.querySelector('.home-hero .hero-mascot')),
          homeImageCurrentSrc: document.querySelector('.home-hero .hero-mascot img')?.currentSrc || '',
          homeImageCopyOverlap: overlap(homeImageRect, copyRect),
          homeTitleMascotOverlap: overlap(homeTitleRect, mascotRect),
        };
      });
      expect(metrics.scrollWidth <= metrics.viewportWidth + 1, `${name} ${width}px: horizontal overflow ${metrics.scrollWidth}/${metrics.viewportWidth}`);
      expect(metrics.fontSize === (width <= 560 ? '16px' : '17px'), `${name} ${width}px: unexpected body font ${metrics.fontSize}`);
      expect(Number.parseFloat(metrics.lineHeight) >= (width <= 560 ? 28 : 30.6) - 0.1, `${name} ${width}px: line-height too small (${metrics.lineHeight})`);
      expect(metrics.mascotCount <= 1, `${name} ${width}px: more than one hero mascot`);
      expect(!metrics.mascotCopyOverlap, `${name} ${width}px: mascot overlaps hero copy`);
      expect(metrics.brandHeight >= 44, `${name} ${width}px: brand target below 44px`);
      expect(metrics.navTargetHeights.every((value) => value === 0 || value >= 44), `${name} ${width}px: navigation target below 44px`);
      expect(metrics.footerTargetHeights.every((value) => value >= 44), `${name} ${width}px: footer target below 44px`);
      expect(metrics.searchInput && metrics.searchInput.width >= 44 && metrics.searchInput.height >= 44, `${name} ${width}px: search input target below 44x44 (${metrics.searchInput?.width || 0}x${metrics.searchInput?.height || 0})`);
      if (name === 'index') {
        expect(Boolean(metrics.homeSectionRect && metrics.homeHeroRect && metrics.homeImageRect && metrics.homeTitleRect && metrics.homeCopyRect && metrics.homeMascotRect), `index ${width}px: missing home hero geometry target`);
        expect(!metrics.homeImageCopyOverlap, `index ${width}px: actual mascot image overlaps hero copy`);
        expect(!metrics.homeTitleMascotOverlap, `index ${width}px: title and mascot rectangles overlap`);
        expect(Math.abs(metrics.homeHeroRect.bottom - metrics.homeSectionRect.bottom) <= 3.1, `index ${width}px: mascot crop boundary is not aligned to hero bottom (${metrics.homeHeroRect.bottom}/${metrics.homeSectionRect.bottom})`);
        expect(metrics.homeImageRect.top >= metrics.homeHeroRect.top - 1, `index ${width}px: mascot rises above hero (${metrics.homeImageRect.top}/${metrics.homeHeroRect.top})`);
        expect(metrics.homeImageRect.bottom > metrics.homeHeroRect.bottom + 20, `index ${width}px: mascot legs are not cropped by hero (${metrics.homeImageRect.bottom}/${metrics.homeHeroRect.bottom})`);
        expect(metrics.homeImageRect.height / metrics.homeHeroRect.height >= 1.12, `index ${width}px: mascot is not sufficiently enlarged (${metrics.homeImageRect.height}/${metrics.homeHeroRect.height})`);
        expect(metrics.homeImageCurrentSrc.endsWith('/img/xiaoa-home-480.webp'), `index ${width}px: browser did not select the WebP mascot (${metrics.homeImageCurrentSrc})`);
        homeViewportEvidence.push({
          width,
          sectionHeight: Number(metrics.homeSectionRect.height.toFixed(2)),
          mascotHeight: Number(metrics.homeHeroRect.height.toFixed(2)),
          imageHeight: Number(metrics.homeImageRect.height.toFixed(2)),
          imageTopOffset: Number((metrics.homeImageRect.top - metrics.homeHeroRect.top).toFixed(2)),
          imageBottomExcess: Number((metrics.homeImageRect.bottom - metrics.homeHeroRect.bottom).toFixed(2)),
          imageHeightRatio: Number((metrics.homeImageRect.height / metrics.homeHeroRect.height).toFixed(2)),
          copyOverlap: metrics.homeImageCopyOverlap,
          titleOverlap: metrics.homeTitleMascotOverlap,
          horizontalOverflow: metrics.scrollWidth > metrics.viewportWidth + 1,
        });
      }
      await page.screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: true });
    }
  }

  expect(homeViewportEvidence.length === viewports.length, `home hero geometry did not run at all four viewports (${homeViewportEvidence.length}/${viewports.length})`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  const toggle = page.locator('.nav-toggle');
  await toggle.click();
  expect(await toggle.getAttribute('aria-expanded') === 'true', 'mobile menu does not expose expanded state');
  expect(await toggle.getAttribute('aria-label') === '关闭主导航', 'mobile menu open label is not synchronized');
  await page.keyboard.press('Escape');
  expect(await toggle.getAttribute('aria-expanded') === 'false', 'Escape does not close mobile menu');
  expect(await toggle.getAttribute('aria-label') === '打开主导航', 'mobile menu closed label is not synchronized');
  expect(await toggle.evaluate((node) => document.activeElement === node), 'Escape does not return focus to menu button');

  for (const href of ['learn.html', 'video.html', 'resources.html']) {
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('.nav-toggle').click();
    await page.locator(`.nav-links a[href="${href}"]`).click();
    expect(new URL(page.url()).pathname.endsWith(`/${href}`), `mobile navigation cannot follow ${href}`);
    expect(await page.locator('.nav-toggle').getAttribute('aria-expanded') === 'false', `${href}: destination menu state is not closed`);
  }

  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });

  await page.keyboard.press('Control+K');
  expect(await page.locator('#searchInput').evaluate((node) => document.activeElement === node), 'keyboard shortcut does not focus search');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+K');
  expect(await page.locator('#searchInput').evaluate((node) => document.activeElement === node), 'Meta+K does not focus search');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+K');
  expect(await page.locator('#searchInput').evaluate((node) => document.activeElement === node), 'Control+K does not focus search');
  await page.locator('#searchInput').fill('Copilot');
  expect(await page.locator('#searchDrop .search-item').count() > 0, 'Copilot search yields no results');
  await page.keyboard.press('Escape');
  expect(await page.locator('#searchDrop').evaluate((node) => getComputedStyle(node).display === 'none'), 'Escape does not close search results');
  await page.locator('#searchInput').fill('Copilot');
  await page.locator('#searchDrop .search-item').first().click();
  expect(new URL(page.url()).pathname.endsWith('/video.html'), 'search result cannot be opened');

  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => scrollTo(0, 24));
  await page.waitForTimeout(50);
  expect(await page.locator('#topbar').evaluate((node) => node.classList.contains('scrolled')), 'topbar does not synchronize after scrolling');
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => scrollY > 8), 'browser did not restore the non-zero scroll position for initial-state QA');
  expect(await page.locator('#topbar').evaluate((node) => node.classList.contains('scrolled')), 'topbar initial state is stale at a restored scroll position');

  await page.goto(`${base}/progress.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('amer_ai_progress_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  const firstProgress = page.locator('.mod-check').first();
  await firstProgress.click();
  const stored = await page.evaluate(() => localStorage.getItem('amer_ai_progress_v1'));
  expect(Boolean(stored && stored !== '{}'), 'progress click is not persisted');
  const completedBefore = await page.locator('.mod-item.done').count();
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.locator('.mod-item.done').count() === completedBefore && completedBefore > 0, 'progress state does not survive reload');
  await page.locator('.mod-check').first().click();

  await page.goto(`${base}/detail.html?type=learn&id=prompt-basics`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  const detailTables = page.locator('.rt-table');
  expect(await detailTables.count() > 0, 'prompt-basics detail route did not render its real comparison table');
  const overflowingTables = detailTables.filter({ has: page.locator('tbody') });
  const overflowCount = await overflowingTables.evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).length);
  expect(overflowCount > 0, 'prompt-basics has no real horizontally overflowing table at 390px');
  const scrollableTable = page.locator('.rt-table[tabindex="0"]').first();
  expect(await scrollableTable.count() === 1 && Boolean(await scrollableTable.getAttribute('aria-label')), 'overflowing detail table is not keyboard-scrollable and labelled');
  await scrollableTable.focus();
  const scrollBefore = await scrollableTable.evaluate((node) => node.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  expect(await scrollableTable.evaluate((node) => node.scrollLeft) > scrollBefore, 'ArrowRight does not scroll the focused detail table');

  await page.goto(`${base}/video.html`, { waitUntil: 'domcontentloaded' });
  const replayCards = await page.locator('a.video-card').evaluateAll((nodes) => nodes.map((node) => ({ target: node.target, rel: node.rel, height: node.getBoundingClientRect().height })));
  expect(replayCards.length === 3, 'video page does not expose three full-card replay links');
  expect(replayCards.every((card) => card.target === '_blank' && card.rel.split(/\s+/).includes('noopener') && card.height >= 44), 'replay cards are not safe 44px new-tab targets');

  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const focusEvidence = await page.evaluate(() => {
    const node = document.activeElement;
    const style = getComputedStyle(node);
    return { isBrand: node?.classList.contains('brand'), outlineWidth: Number.parseFloat(style.outlineWidth) };
  });
  expect(focusEvidence.isBrand && focusEvidence.outlineWidth >= 3, 'first Tab target lacks the clear shared focus-visible outline');

  await page.setContent('<div id="hex-gradient" style="background-image:linear-&#x67radient(red,blue)"></div><div id="decimal-gradient" style="background-image:radial-&#103radient(red,blue)"></div>');
  const chromiumEntityStyles = await page.evaluate(() => ({
    hex: getComputedStyle(document.querySelector('#hex-gradient')).backgroundImage,
    decimal: getComputedStyle(document.querySelector('#decimal-gradient')).backgroundImage,
  }));
  expect(chromiumEntityStyles.hex.includes('linear-gradient'), 'Chromium fixture did not decode semicolonless hex character reference');
  expect(chromiumEntityStyles.decimal.includes('radial-gradient'), 'Chromium fixture did not decode semicolonless decimal character reference');

  expect(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join(' | ')}`);
  await browser.close();

  if (failures.length) {
    console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
    process.exit(1);
  }
  console.log(`HOME HERO: ${JSON.stringify(homeViewportEvidence)}`);
  console.log(`PASS: Task 8 browser QA (${checks} checks, ${pages.length * viewports.length} screenshots at ${output})`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
