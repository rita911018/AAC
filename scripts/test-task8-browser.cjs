const { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { extname, join, resolve, sep } = require('node:path');
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
const mutation = process.env.KB_QA_MUTATION || '';
const mutationMode = mutation.length > 0;
const browserSelfTestMode = process.env.KB_QA_SELF_TEST === '1'
  && process.env.KB_QA_SELF_TEST_CHILD !== '1';
const cleanupTrace = process.env.KB_QA_CLEANUP_TRACE === '1';
mkdirSync(output, { recursive: true });

const portalUrl = 'https://portal.amersports.cn/portal/indexs';
const shortcutDescription = '查制度、问流程、找内部信息，有问题先问小A。';
const oldStarPath = 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1';

const failures = [];
let checks = 0;
function expect(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

async function readFocusedOutlineMetrics(page, expectedClass, clipSelector) {
  return page.evaluate(({ expectedClass, clipSelector }) => {
    const node = document.activeElement;
    if (!node?.classList.contains(expectedClass)) return null;
    const style = getComputedStyle(node);
    const bounds = node.getBoundingClientRect();
    const clip = node.closest(clipSelector)?.getBoundingClientRect();
    const parseColor = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return { red: channels[0] ?? 0, green: channels[1] ?? 0, blue: channels[2] ?? 0, alpha: channels[3] ?? 1 };
    };
    const luminance = ({ red, green, blue }) => {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const contrast = (left, right) => {
      const leftLuminance = luminance(left);
      const rightLuminance = luminance(right);
      return (Math.max(leftLuminance, rightLuminance) + .05) / (Math.min(leftLuminance, rightLuminance) + .05);
    };
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    const outlineOffset = Number.parseFloat(style.outlineOffset) || 0;
    const outlineColor = parseColor(style.outlineColor);
    const backgroundColor = parseColor(style.backgroundColor);
    const externalExtent = Math.max(0, outlineWidth + outlineOffset);
    return {
      href: node.getAttribute('href'),
      focusVisible: node.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth,
      outlineAlpha: outlineColor.alpha,
      contrastRatio: contrast(outlineColor, backgroundColor),
      ring: {
        left: bounds.left - externalExtent,
        right: bounds.right + externalExtent,
        top: bounds.top - externalExtent,
        bottom: bounds.bottom + externalExtent,
      },
      clip: clip?.toJSON() ?? null,
      viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
    };
  }, { expectedClass, clipSelector });
}

async function waitForScrollPositionToSettle(page, {
  timeoutMs = 3000,
  minimumObservationMs = 250,
  intervalMs = 50,
  stableSamplesRequired = 4,
} = {}) {
  const startedAt = Date.now();
  let previousScrollY = null;
  let stableSamples = 0;
  while (Date.now() - startedAt < timeoutMs) {
    const currentScrollY = await page.evaluate(() => scrollY);
    if (previousScrollY !== null && Math.abs(currentScrollY - previousScrollY) < .5) stableSamples += 1;
    else stableSamples = 0;
    if (Date.now() - startedAt >= minimumObservationMs && stableSamples >= stableSamplesRequired) return currentScrollY;
    previousScrollY = currentScrollY;
    await page.waitForTimeout(intervalMs);
  }
  return page.evaluate(() => scrollY);
}

const allPages = [
  ['index', 'index.html'],
  ['learn', 'learn.html'],
  ['video', 'video.html'],
  ['resources', 'resources.html'],
  ['progress', 'progress.html'],
  ['detail-learn', 'detail.html?type=learn&id=ai-basics'],
  ['detail-resources', 'detail.html?type=resources&id=tools'],
];
const allViewports = [
  [1440, 1100],
  [820, 1100],
  [560, 900],
  [390, 844],
];
const focusedViewports = [
  [1440, 1100],
  [1236, 1050],
  [1024, 1050],
  [820, 1100],
  [560, 900],
  [390, 844],
];
const mutationDefinitions = {
  '1': { pages: ['index', 'resources'], viewport: [390, 844], css: '' },
  'fixture-index-1440': { page: 'index', viewport: [1440, 1100], css: '' },
  'fixture-index-390': { page: 'index', viewport: [390, 844], css: '' },
  'fixture-learn-1440': { page: 'learn', viewport: [1440, 1100], css: '' },
  'fixture-learn-1236': { page: 'learn', viewport: [1236, 1050], css: '' },
  'fixture-learn-390': { page: 'learn', viewport: [390, 844], css: '' },
  'entry-icon-hidden': { page: 'index', viewport: [1440, 1100], css: '.entry-card .ec-icon{visibility:hidden!important}', expectedFailure: 'every entry icon must be visible' },
  'entry-focus-none': { page: 'index', viewport: [1440, 1100], css: '.entry-card:focus,.entry-card:focus-visible{outline:none!important;box-shadow:none!important}', expectedFailure: 'focus outline must be opaque and at least 3px' },
  'entry-title-weak': { page: 'index', viewport: [1440, 1100], css: '.entry-card h3{font-size:20px!important}', expectedFailure: 'entry titles must be at least 26px' },
  'entry-description-large': { page: 'index', viewport: [1440, 1100], css: '.entry-card p{font-size:22px!important;font-weight:800!important;color:rgb(15,23,42)!important}', expectedFailure: 'entry title weight must remain stronger' },
  'entry-description-red': { page: 'index', viewport: [1440, 1100], css: '.entry-card p{color:#3b0000!important}', expectedFailure: 'descriptions need 4.5:1 contrast' },
  'face-safe-overlap': { page: 'index', viewport: [390, 844], css: '.home-hero .hero-xiaoa-entry{right:72px!important}', expectedFailure: 'overlaps the mascot face-safe rectangle' },
  'learn-240': { page: 'learn', viewport: [1440, 1100], css: '.learn-hero .hero-mascot,.learn-hero .hero-mascot picture,.learn-hero .hero-mascot img{width:240px!important;height:240px!important;max-width:240px!important;max-height:240px!important}', expectedFailure: 'must be at least 300px tall' },
  'learn-wrap': { page: 'learn', viewport: [1236, 1050], css: '.learn-hero .bh-left{max-width:620px!important}.learn-hero .bh-left>p:first-of-type{white-space:normal!important;max-width:500px!important}', expectedFailure: 'must remain on one line' },
  'learn-cover': { page: 'learn', viewport: [1440, 1100], css: '.learn-hero .hero-mascot img{object-fit:cover!important;object-position:center center!important}', expectedFailure: 'must use object-fit:contain' },
  'learn-mobile-horizontal': { page: 'learn', viewport: [390, 844], css: '.learn-hero .lesson-primary-action,.learn-hero .learning-session-summary{display:inline-flex!important;margin-top:0!important;margin-right:16px!important;vertical-align:top!important}', expectedFailure: 'must stack vertically' },
};
const activeMutation = mutationDefinitions[mutation] ?? null;
if (mutationMode && !activeMutation) throw new Error(`Unknown KB_QA_MUTATION: ${mutation}`);
const activeMutationPages = activeMutation ? (activeMutation.pages ?? [activeMutation.page]) : [];
const pages = mutationMode ? allPages.filter(([name]) => activeMutationPages.includes(name)) : allPages;
const learningChapters = [
  ['ai-basics', '认识 AI'],
  ['ai-boundaries', '看清边界'],
  ['ai-delegation', '学会分工'],
  ['ai-prompting', '把需求说清楚'],
  ['ai-verification', '验证结果'],
  ['ai-workflow', '从对话走向工作流'],
];

function prepareBrowserGoodFixture(sourceRoot, targetRoot) {
  cpSync(sourceRoot, targetRoot, { recursive: true });
  const indexFile = join(targetRoot, 'index.html');
  let index = readFileSync(indexFile, 'utf8')
    .replace('<p>从入门、录播到工具实践，在清晰的知识路径里找到所需内容。</p>', '')
    .replace('<p class="desc">每个板块都是独立的完整页面，点击进入后内部还有细分目录。</p>', '');
  for (const [number, marker, graphic] of [
    ['01 / LEARN', 'learn', '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>'],
    ['02 / WATCH', 'watch', '<rect x="3" y="4" width="18" height="14"/><path d="m10 8 5 3-5 3z"/>'],
    ['03 / EXPLORE', 'resources', '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>'],
  ]) {
    if (!index.includes(`data-entry-icon="${marker}"`)) {
      index = index.replace(
        `<span class="ec-num">${number}</span>`,
        `<span class="ec-top"><span class="ec-num">${number}</span><span class="ec-icon"><svg data-entry-icon="${marker}" aria-hidden="true" viewBox="0 0 24 24">${graphic}</svg></span></span>`,
      );
    }
  }
  index = index.replace('</head>', `<style data-browser-self-test-fixture>
.entry-card{height:320px;display:flex;flex-direction:column;background:#fff}
.entry-card .ec-top{display:flex}.entry-card .ec-icon{width:72px;height:72px;background:#2563eb;color:#fff}
.entry-card .ec-icon svg{width:36px;height:36px;fill:none;stroke:currentColor}
.entry-card h3{font-size:28px;font-weight:800;color:#0e2144}.entry-card p{color:#60728d;font-size:17px;font-weight:400}
.entry-card .ec-link{margin-top:auto}.home-hero .hero-mascot img{right:78.5px}
@media(max-width:820px){.home-hero .hero-mascot img{right:76px}}
@media(max-width:560px){.home-hero .hero-mascot img{right:64px}}
</style></head>`);
  writeFileSync(indexFile, index);

  const learnFile = join(targetRoot, 'learn.html');
  let learn = readFileSync(learnFile, 'utf8');
  learn = learn.replace('</head>', `<style data-browser-self-test-fixture>
@media(min-width:1236px){.learn-hero .container{grid-template-columns:minmax(0,1fr) 300px;gap:24px}.learn-hero .bh-left>p:first-of-type{max-width:none;white-space:nowrap}.learn-hero .hero-mascot,.learn-hero .hero-mascot picture,.learn-hero .hero-mascot img{width:300px;height:333px;max-width:300px;max-height:333px}}
.learn-hero .lesson-primary-action{margin-right:16px;vertical-align:top}.learn-hero .learning-session-summary{min-height:48px;margin:0;vertical-align:top}
@media(max-width:820px){.learn-hero .hero-mascot,.learn-hero .hero-mascot picture,.learn-hero .hero-mascot img{width:190px;height:210px;max-width:190px;max-height:210px}}
@media(max-width:560px){.learn-hero .lesson-primary-action,.learn-hero .learning-session-summary{display:flex;width:max-content;margin-right:0}.learn-hero .learning-session-summary{margin-top:8px}}
</style></head>`);
  writeFileSync(learnFile, learn);
}

function startFixtureServer(root) {
  const contentTypes = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'], ['.webp', 'image/webp'], ['.png', 'image/png'],
  ]);
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = resolve(root, relativePath);
      if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error('path traversal');
      response.writeHead(200, { 'Content-Type': contentTypes.get(extname(file)) ?? 'application/octet-stream' });
      response.end(readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

function runBrowserSelfTestChild(mode, childBase, childOutput) {
  return new Promise((resolveChild) => {
    const child = spawn(process.execPath, [__filename, childBase, childOutput], {
      env: {
        ...process.env,
        KB_QA_MUTATION: mode,
        KB_QA_SELF_TEST: '0',
        KB_QA_SELF_TEST_CHILD: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolveChild({ status, stdout, stderr }));
  });
}

async function runBrowserSelfTest() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'kb-browser-self-test-'));
  let server = null;
  try {
    const fixtureRoot = join(temporaryRoot, 'site');
    prepareBrowserGoodFixture(resolve(process.env.KB_QA_SELF_TEST_SITE || 'site/knowledge-base'), fixtureRoot);
    server = await startFixtureServer(fixtureRoot);
    const address = server.address();
    const childBase = `http://127.0.0.1:${address.port}`;

    for (const mode of ['fixture-index-1440', 'fixture-index-390', 'fixture-learn-1236', 'fixture-learn-390']) {
      const result = await runBrowserSelfTestChild(mode, childBase, join(temporaryRoot, `green-${mode}`));
      if (result.status !== 0) throw new Error(`valid browser fixture ${mode} must pass:\n${result.stdout}\n${result.stderr}`);
      console.log(`GREEN browser fixture: ${mode}`);
    }

    for (const mode of [
      'entry-icon-hidden', 'entry-focus-none', 'entry-title-weak', 'entry-description-large',
      'entry-description-red', 'face-safe-overlap', 'learn-240', 'learn-wrap', 'learn-cover',
      'learn-mobile-horizontal',
    ]) {
      const result = await runBrowserSelfTestChild(mode, childBase, join(temporaryRoot, `mutation-${mode}`));
      if (result.status === 0) throw new Error(`${mode} browser mutation must be detected`);
      if (!/^FAIL:/m.test(result.stderr)) throw new Error(`${mode} must fail through a contract assertion:\n${result.stdout}\n${result.stderr}`);
      if (!result.stderr.includes(mutationDefinitions[mode].expectedFailure)) {
        throw new Error(`${mode} did not hit its targeted assertion “${mutationDefinitions[mode].expectedFailure}”:\n${result.stderr}`);
      }
      console.log(`DETECTED browser mutation: ${mode}`);
    }
    console.log('PASS browser homepage contract self-test (4 valid fixtures + 10 mutations)');
  } finally {
    if (server) await new Promise((resolveClose) => server.close(resolveClose));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

async function runQa() {
  let browser = null;
  let runError = null;
  const runtimeErrors = [];
  const homeViewportEvidence = [];
  const learnViewportEvidence = [];
  const gatewayViewportEvidence = [];
  let screenshotCount = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    if (process.env.KB_QA_EARLY_FAIL === '1') throw new Error('QA_EARLY_FAILURE_PROBE');
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

  for (const [name, path] of pages) {
    const pageViewports = mutationMode
      ? [activeMutation.viewport]
      : (name === 'index' || name === 'learn' ? focusedViewports : allViewports);
    for (const [width, height] of pageViewports) {
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' });
      if (activeMutation?.css) await page.addStyleTag({ content: activeMutation.css });
      await page.waitForTimeout(500);
      let homeShortcutReachedByTab = false;
      let homeShortcutKeyboardFocus = null;
      const homeEntryKeyboardFocus = [];
      if (name === 'index') {
        const focusedEntryHrefs = new Set();
        for (let step = 0; step < 60; step += 1) {
          await page.keyboard.press('Tab');
          const activeClass = await page.evaluate(() => ({
            shortcut: document.activeElement?.classList.contains('hero-xiaoa-cta') || false,
            entry: document.activeElement?.classList.contains('entry-card') || false,
            href: document.activeElement?.getAttribute('href') || '',
          }));
          if (activeClass.shortcut) {
            homeShortcutReachedByTab = true;
            homeShortcutKeyboardFocus = await readFocusedOutlineMetrics(page, 'hero-xiaoa-cta', '.home-hero');
          }
          if (activeClass.entry && !focusedEntryHrefs.has(activeClass.href)) {
            focusedEntryHrefs.add(activeClass.href);
            await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center', inline: 'nearest' }));
            await waitForScrollPositionToSettle(page);
            homeEntryKeyboardFocus.push(await readFocusedOutlineMetrics(page, 'entry-card', 'section'));
          }
          if (homeShortcutReachedByTab && homeEntryKeyboardFocus.length === 3) break;
        }
        const previousScrollBehavior = await page.evaluate(() => {
          const previous = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          scrollTo(0, 0);
          return previous;
        });
        await waitForScrollPositionToSettle(page);
        await page.evaluate((previous) => { document.documentElement.style.scrollBehavior = previous; }, previousScrollBehavior);
      }
      const metrics = await page.evaluate(({ oldStarPath, portalUrl }) => {
        const bodyStyle = getComputedStyle(document.body);
        const mascot = document.querySelector('.hero-mascot');
        const copy = document.querySelector('.bh-left');
        const rect = (node) => node ? node.getBoundingClientRect().toJSON() : null;
        const isVisible = (node) => {
          if (!node) return false;
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          return (!node.checkVisibility || node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number.parseFloat(style.opacity) > 0
            && bounds.width > 0
            && bounds.height > 0;
        };
        const normalizedText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
        const normalizedPathData = (value) => (String(value ?? '').match(/[A-Za-z]|[-+]?(?:(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?)/g) ?? []).join(' ');
        const oldStarPathPrefix = normalizedPathData(oldStarPath);
        const overlap = (a, b) => Boolean(a && b && a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top);
        const rectangleGap = (a, b) => {
          if (!a || !b) return -1;
          const horizontal = Math.max(a.left - b.right, b.left - a.right, 0);
          const vertical = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
          return Math.hypot(horizontal, vertical);
        };
        const parseColor = (value) => {
          const channels = String(value ?? '').match(/[\d.]+/g)?.map(Number) ?? [];
          return { red: channels[0] ?? 0, green: channels[1] ?? 0, blue: channels[2] ?? 0, alpha: channels[3] ?? 1 };
        };
        const compositeColor = (foreground, background) => ({
          red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
          green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
          blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
          alpha: 1,
        });
        const effectiveBackground = (node) => {
          const layers = [];
          let current = node;
          while (current) {
            layers.push(parseColor(getComputedStyle(current).backgroundColor));
            current = current.parentElement;
          }
          return layers.reverse().reduce((background, layer) => compositeColor(layer, background), {
            red: 255, green: 255, blue: 255, alpha: 1,
          });
        };
        const relativeLuminance = ({ red, green, blue }) => {
          const channels = [red, green, blue].map((channel) => {
            const normalized = channel / 255;
            return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
          });
          return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
        };
        const contrastRatio = (foreground, background) => {
          const compositedForeground = compositeColor(foreground, background);
          const foregroundLuminance = relativeLuminance(compositedForeground);
          const backgroundLuminance = relativeLuminance(background);
          return (Math.max(foregroundLuminance, backgroundLuminance) + .05)
            / (Math.min(foregroundLuminance, backgroundLuminance) + .05);
        };
        const focusRingMetrics = (node, clipNode) => {
          if (!node || !clipNode) return null;
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          const clip = clipNode.getBoundingClientRect();
          const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
          const outlineOffset = Number.parseFloat(style.outlineOffset) || 0;
          const parseRgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const luminance = (value) => {
            const channels = parseRgb(value).map((channel) => {
              const normalized = channel / 255;
              return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
            });
            return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
          };
          const foreground = luminance(style.outlineColor);
          const background = luminance(style.backgroundColor);
          const externalExtent = Math.max(0, outlineWidth + outlineOffset);
          return {
            focusVisible: node.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth,
            contrastRatio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05),
            ring: {
              left: bounds.left - externalExtent,
              right: bounds.right + externalExtent,
              top: bounds.top - externalExtent,
              bottom: bounds.bottom + externalExtent,
            },
            clip: clip.toJSON(),
          };
        };
        const safeLink = (node) => node ? {
          text: normalizedText(node.textContent),
          href: node.href,
          target: node.target,
          rel: node.rel,
          visible: isVisible(node),
          rect: rect(node),
        } : null;

        const mascotRect = rect(mascot);
        const copyRect = rect(copy);
        const homeSectionRect = rect(document.querySelector('.home-hero'));
        const homeHeroRect = rect(document.querySelector('.home-hero .hero-mascot'));
        const homeImageRect = rect(document.querySelector('.home-hero .hero-mascot img'));
        const homeTitleRect = rect(document.querySelector('.home-hero .bh-left h1'));
        const homeCopyRect = rect(document.querySelector('.home-hero .bh-left'));
        const homeSubtitle = document.querySelector('.home-hero .bh-subtitle');
        const homeShortcutNodes = [...document.querySelectorAll('.home-hero .hero-xiaoa-entry')];
        const visibleHomeShortcuts = homeShortcutNodes.filter(isVisible);
        const homeShortcut = visibleHomeShortcuts[0] ?? null;
        const homeShortcutCta = homeShortcut?.querySelector('.hero-xiaoa-cta') ?? null;
        const homeShortcutRect = rect(homeShortcut);
        const homeShortcutCtaRect = rect(homeShortcutCta);
        const faceSafeRect = homeImageRect ? {
          left: homeImageRect.left + homeImageRect.width * (innerWidth <= 820 ? .10 : .16),
          right: homeImageRect.left + homeImageRect.width * (innerWidth <= 820 ? .84 : .77),
          top: homeImageRect.top + homeImageRect.height * .01,
          bottom: homeImageRect.top + homeImageRect.height * (innerWidth <= 820 ? .67 : .63),
          width: homeImageRect.width * (innerWidth <= 820 ? .74 : .61),
          height: homeImageRect.height * (innerWidth <= 820 ? .66 : .62),
        } : null;
        const entryRow = document.querySelector('.entry-row');
        const entrySection = entryRow?.closest('section') ?? null;
        const entryCards = entryRow ? [...entryRow.querySelectorAll('.entry-card')] : [];
        const homeEntryCards = entryCards.map((card) => {
          const icon = card.querySelector('.ec-icon');
          const iconSvg = icon?.querySelector('svg') ?? null;
          const title = card.querySelector('h3');
          const description = card.querySelector('p');
          const action = card.querySelector('.ec-link');
          const titleStyle = title ? getComputedStyle(title) : null;
          const descriptionStyle = description ? getComputedStyle(description) : null;
          const cardBackground = effectiveBackground(card);
          return {
            href: card.getAttribute('href'),
            rect: rect(card),
            visible: isVisible(card),
            iconVisible: isVisible(icon) && isVisible(iconSvg),
            iconRect: rect(icon),
            iconMarker: iconSvg?.getAttribute('data-entry-icon') || '',
            iconAriaHidden: iconSvg?.getAttribute('aria-hidden') || '',
            iconSignature: normalizedText(iconSvg?.innerHTML),
            titleRect: rect(title),
            descriptionRect: rect(description),
            actionRect: rect(action),
            titleFontSize: Number.parseFloat(titleStyle?.fontSize) || 0,
            titleFontWeight: Number.parseFloat(titleStyle?.fontWeight) || 0,
            titleColor: titleStyle?.color || '',
            titleContrast: contrastRatio(parseColor(titleStyle?.color), cardBackground),
            descriptionFontSize: Number.parseFloat(descriptionStyle?.fontSize) || 0,
            descriptionFontWeight: Number.parseFloat(descriptionStyle?.fontWeight) || 0,
            descriptionColor: descriptionStyle?.color || '',
            descriptionContrast: contrastRatio(parseColor(descriptionStyle?.color), cardBackground),
            titleDescriptionOverlap: overlap(rect(title), rect(description)),
            titleActionOverlap: overlap(rect(title), rect(action)),
            descriptionActionOverlap: overlap(rect(description), rect(action)),
          };
        });
        const learnHero = document.querySelector('.learn-hero');
        const learnCopy = learnHero?.querySelector('.bh-left') ?? null;
        const learnTitle = learnCopy?.querySelector('h1') ?? null;
        const learnDescription = learnCopy?.querySelector(':scope > p:first-of-type') ?? null;
        const learnAction = learnCopy?.querySelector('.lesson-primary-action') ?? null;
        const learnSummary = learnCopy?.querySelector('.learning-session-summary') ?? null;
        const learnMeta = learnHero?.querySelector('.bh-meta') ?? null;
        const learnMascot = learnHero?.querySelector('.hero-mascot') ?? null;
        const learnImage = learnMascot?.querySelector('img') ?? null;
        const learnImageStyle = learnImage ? getComputedStyle(learnImage) : null;
        const learnDescriptionRange = learnDescription ? document.createRange() : null;
        if (learnDescriptionRange) learnDescriptionRange.selectNodeContents(learnDescription);
        const learnDescriptionLineTops = learnDescriptionRange
          ? [...learnDescriptionRange.getClientRects()].map(({ top }) => Math.round(top * 2) / 2)
          : [];
        const brandIcons = [...document.querySelectorAll('.logo svg[data-brand-icon="knowledge-book"]')];

        const internal = document.querySelector('section.xiaoa-section');
        const external = document.querySelector('section.external-resources');
        const gatewayNodes = [...document.querySelectorAll('#gateway')];
        const externalGateways = external ? [...external.querySelectorAll('div.external-sites#gateway')] : [];
        const gateway = externalGateways[0] ?? null;
        const gatewayTitle = gateway?.querySelector('.external-sites-head h3') ?? null;
        const internalAbilityItems = internal ? [...internal.querySelectorAll('.xh-side li')] : [];
        const externalEntries = external ? [...external.querySelectorAll('.res-entry')] : [];
        const deepSeekRows = external ? [...external.querySelectorAll('.p-row')].filter((node) => normalizedText(node.textContent).includes('DeepSeek')) : [];
        const selectedSiteLinks = gateway ? [...gateway.querySelectorAll('a.gate-home-card[href]')].map(safeLink) : [];
        const internalPortal = internal?.querySelector('.xh-cta') ?? null;
        const pageTextNoWhitespace = normalizedText(document.body.innerText).replace(/\s+/g, '');
        const learningCards = [...document.querySelectorAll('.learning-hub .learning-card')];
        const learningToolCards = [...document.querySelectorAll('.learning-tool-grid .learning-tool-card')];
        const progressCta = document.querySelector('.progress-compat-cta');

        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          viewportRect: { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight },
          fontSize: bodyStyle.fontSize,
          lineHeight: bodyStyle.lineHeight,
          brandIconCount: brandIcons.length,
          visibleBrandIconCount: brandIcons.filter(isVisible).length,
          oldStarPathCount: [...document.querySelectorAll('.logo svg path[d]')]
            .filter((node) => {
              const pathData = normalizedPathData(node.getAttribute('d'));
              return pathData === oldStarPathPrefix || pathData.startsWith(`${oldStarPathPrefix} `);
            }).length,
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
          homeCopyRect,
          homeMascotRect: rect(document.querySelector('.home-hero .hero-mascot')),
          homeImageCurrentSrc: document.querySelector('.home-hero .hero-mascot img')?.currentSrc || '',
          homeImageVisible: isVisible(document.querySelector('.home-hero .hero-mascot img')),
          homeImageCopyOverlap: overlap(homeImageRect, copyRect),
          homeTitleMascotOverlap: overlap(homeTitleRect, mascotRect),
          homeTitleText: normalizedText(document.querySelector('.home-hero .bh-left h1')?.textContent),
          homeSubtitleText: normalizedText(homeSubtitle?.textContent),
          homeDescriptionText: normalizedText(document.querySelector('.home-hero .bh-subtitle + p')?.textContent),
          homeRetiredCopyVisible: [
            '从入门、录播到工具实践，在清晰的知识路径里找到所需内容。',
            '每个板块都是独立的完整页面，点击进入后内部还有细分目录。',
          ].filter((copy) => normalizedText(document.body.innerText).includes(copy)),
          homeTagCount: document.querySelectorAll('.home-hero .bh-tag').length,
          homeStatusCount: document.querySelectorAll('.home-hero .mascot-status').length,
          homeGatewayCount: document.querySelectorAll('body > #gateway, main #gateway').length,
          homeSubtitleRect: rect(homeSubtitle),
          homeSubtitleVisible: isVisible(homeSubtitle),
          visibleEntryCardCount: entryCards.filter(isVisible).length,
          entrySectionTitle: normalizedText(entrySection?.querySelector('.section-head h2')?.textContent),
          entrySectionTitleVisible: isVisible(entrySection?.querySelector('.section-head h2')),
          homeXiaoaSectionCount: document.querySelectorAll('section#xiaoa, section.xiaoa-section').length,
          homeXaHeroCount: document.querySelectorAll('.xa-hero').length,
          homeXaVsCount: document.querySelectorAll('.xa-vs').length,
          visibleHomeShortcutCount: visibleHomeShortcuts.length,
          homeShortcutText: normalizedText(homeShortcut?.querySelector('p')?.textContent),
          homeShortcutRect,
          homeShortcutCtaRect,
          homeShortcutCta: safeLink(homeShortcutCta),
          homeShortcutArrowVisible: isVisible(homeShortcutCta?.querySelector('svg')),
          faceSafeRect,
          homeShortcutFaceOverlap: overlap(homeShortcutRect, faceSafeRect),
          homeShortcutFaceGap: rectangleGap(homeShortcutRect, faceSafeRect),
          homeShortcutCopyOverlap: overlap(homeShortcutRect, homeCopyRect),
          homeShortcutTitleOverlap: overlap(homeShortcutRect, homeTitleRect),
          homeShortcutSubtitleOverlap: overlap(homeShortcutRect, rect(homeSubtitle)),
          homeShortcutFocus: focusRingMetrics(homeShortcutCta, document.querySelector('.home-hero')),
          homeEntryCards,
          learnHeroRect: rect(learnHero),
          learnCopyRect: rect(learnCopy),
          learnTitleRect: rect(learnTitle),
          learnDescriptionRect: rect(learnDescription),
          learnDescriptionText: normalizedText(learnDescription?.textContent),
          learnDescriptionVisible: isVisible(learnDescription),
          learnDescriptionLineCount: new Set(learnDescriptionLineTops).size,
          learnDescriptionScrollWidth: learnDescription?.scrollWidth || 0,
          learnDescriptionClientWidth: learnDescription?.clientWidth || 0,
          learnActionRect: rect(learnAction),
          learnActionVisible: isVisible(learnAction),
          learnSummaryRect: rect(learnSummary),
          learnSummaryVisible: isVisible(learnSummary),
          learnMetaRect: rect(learnMeta),
          learnMetaVisible: isVisible(learnMeta),
          learnMascotRect: rect(learnMascot),
          learnImageRect: rect(learnImage),
          learnImageVisible: isVisible(learnImage),
          learnImageCurrentSrc: learnImage?.currentSrc || '',
          learnImageFallbackSrc: learnImage?.getAttribute('src') || '',
          learnImageAlt: learnImage?.getAttribute('alt') || '',
          learnImageObjectFit: learnImageStyle?.objectFit || '',
          learnImageObjectPosition: learnImageStyle?.objectPosition || '',
          learnImageTitleOverlap: overlap(rect(learnImage), rect(learnTitle)),
          learnImageDescriptionOverlap: overlap(rect(learnImage), rect(learnDescription)),
          learnImageActionOverlap: overlap(rect(learnImage), rect(learnAction)),
          learnImageSummaryOverlap: overlap(rect(learnImage), rect(learnSummary)),
          learnImageMetaOverlap: overlap(rect(learnImage), rect(learnMeta)),
          resourcesInternalCount: document.querySelectorAll('section.xiaoa-section').length,
          resourcesExternalCount: document.querySelectorAll('section.external-resources').length,
          resourcesInternalVisible: isVisible(internal),
          resourcesExternalVisible: isVisible(external),
          resourcesInternalBeforeExternal: Boolean(internal && external && (internal.compareDocumentPosition(external) & Node.DOCUMENT_POSITION_FOLLOWING)),
          resourcesInternalTitle: normalizedText(internal?.querySelector('.section-head h2')?.textContent),
          resourcesInternalPanelVisible: isVisible(internal?.querySelector('.xa-hero')),
          resourcesInternalTextPanelVisible: isVisible(internal?.querySelector('.xh-text')),
          resourcesInternalAbilityPanelVisible: isVisible(internal?.querySelector('.xh-side')),
          resourcesInternalAbilityCount: internalAbilityItems.filter(isVisible).length,
          resourcesInternalAbilityLabels: internalAbilityItems.map((node) => normalizedText(node.querySelector('b')?.textContent)),
          resourcesInternalNote: normalizedText(internal?.querySelector('.xh-note')?.textContent),
          resourcesInternalPortal: safeLink(internalPortal),
          resourcesComparisonVisible: isVisible(internal?.querySelector('.xa-vs')),
          resourcesComparisonTableVisible: isVisible(internal?.querySelector('.xa-vs table')),
          resourcesComparisonLabel: internal?.querySelector('.xa-vs .rt-table')?.getAttribute('aria-label') || '',
          resourcesComparisonTabIndex: internal?.querySelector('.xa-vs .rt-table')?.getAttribute('tabindex') || '',
          visibleResourceEntryCount: externalEntries.filter(isVisible).length,
          externalText: normalizedText(external?.innerText),
          deepSeekVisibleCount: deepSeekRows.filter(isVisible).length,
          deepSeekText: normalizedText(deepSeekRows[0]?.textContent),
          deepSeekName: normalizedText(deepSeekRows[0]?.querySelector('b')?.childNodes[0]?.textContent),
          deepSeekBadge: normalizedText(deepSeekRows[0]?.querySelector('.p-badge')?.textContent),
          deepSeekDescription: normalizedText(deepSeekRows[0]?.querySelector('small')?.textContent),
          gatewayIdCount: gatewayNodes.length,
          resourcesGatewayCount: externalGateways.length,
          resourcesGatewayVisible: isVisible(gateway),
          resourcesGatewayInsideExternal: Boolean(gateway && external?.contains(gateway)),
          resourcesGatewayTitleText: normalizedText(gatewayTitle?.textContent),
          resourcesGatewayTitleVisible: isVisible(gatewayTitle),
          standaloneGatewaySectionCount: document.querySelectorAll('section#gateway').length,
          visibleAiGatewayLabel: pageTextNoWhitespace.includes('AI网闸'),
          resourcesGatewayCards: selectedSiteLinks,
          learningCardCount: learningCards.length,
          visibleLearningCardCount: learningCards.filter(isVisible).length,
          learningCards: learningCards.map((node) => ({
            id: node.getAttribute('data-chapter-id'),
            title: normalizedText(node.querySelector('h3')?.textContent),
            status: normalizedText(node.querySelector('.learning-status')?.textContent),
            href: node.getAttribute('href'),
          })),
          learningToolCardCount: learningToolCards.length,
          visibleLearningToolCardCount: learningToolCards.filter(isVisible).length,
          learningMovedTextVisible: /AI\s*公司|模型入口|视频博主|课程目录/.test(normalizedText(document.querySelector('main')?.innerText)),
          progressCta: safeLink(progressCta),
          progressText: normalizedText(document.querySelector('main')?.innerText),
        };
      }, { oldStarPath, portalUrl });

      expect(metrics.scrollWidth <= metrics.viewportWidth + 1, `${name} ${width}px: horizontal overflow ${metrics.scrollWidth}/${metrics.viewportWidth}`);
      expect(metrics.fontSize === '17px', `${name} ${width}px: body copy must remain at least 17px (${metrics.fontSize})`);
      expect(Number.parseFloat(metrics.lineHeight) >= (width <= 560 ? 29.75 : 30.6) - 0.1, `${name} ${width}px: line-height too small (${metrics.lineHeight})`);
      expect(metrics.brandIconCount === 2, `${name} ${width}px: expected exactly two rendered knowledge-book brand icons (${metrics.brandIconCount})`);
      expect(metrics.visibleBrandIconCount === 2, `${name} ${width}px: expected both knowledge-book brand icons to be visible (${metrics.visibleBrandIconCount}/2)`);
      expect(metrics.oldStarPathCount === 0, `${name} ${width}px: old star brand path is still rendered (${metrics.oldStarPathCount})`);
      expect(metrics.mascotCount <= 1, `${name} ${width}px: more than one hero mascot`);
      expect(!metrics.mascotCopyOverlap, `${name} ${width}px: mascot overlaps hero copy`);
      expect(metrics.brandHeight >= 44, `${name} ${width}px: brand target below 44px`);
      expect(metrics.navTargetHeights.every((value) => value === 0 || value >= 44), `${name} ${width}px: navigation target below 44px`);
      expect(metrics.footerTargetHeights.every((value) => value >= 44), `${name} ${width}px: footer target below 44px`);
      expect(metrics.searchInput && metrics.searchInput.width >= 44 && metrics.searchInput.height >= 44, `${name} ${width}px: search input target below 44x44 (${metrics.searchInput?.width || 0}x${metrics.searchInput?.height || 0})`);

      if (name === 'index') {
        expect(metrics.homeTitleText === '亚玛芬 AI 知识库', `index ${width}px: home title copy changed (${metrics.homeTitleText})`);
        expect(metrics.homeSubtitleText === '一站式 AI 学习资源与实践指南', `index ${width}px: home subtitle copy changed (${metrics.homeSubtitleText})`);
        expect(metrics.homeRetiredCopyVisible.length === 0, `index ${width}px: retired homepage copy is still visible (${metrics.homeRetiredCopyVisible.join(' / ')})`);
        expect(metrics.homeTagCount === 0, `index ${width}px: obsolete .home-hero .bh-tag is rendered (${metrics.homeTagCount})`);
        expect(metrics.homeStatusCount === 0, `index ${width}px: obsolete .home-hero .mascot-status is rendered (${metrics.homeStatusCount})`);
        expect(metrics.homeGatewayCount === 0, `index ${width}px: homepage gateway regressed (${metrics.homeGatewayCount})`);
        expect(Boolean(metrics.homeSubtitleRect && metrics.homeSubtitleVisible), `index ${width}px: home subtitle is not visibly rendered`);
        expect(metrics.visibleEntryCardCount === 3, `index ${width}px: expected exactly three visible main entry cards (${metrics.visibleEntryCardCount})`);
        expect(metrics.entrySectionTitleVisible && metrics.entrySectionTitle === '选择你的 AI 学习路径', `index ${width}px: entry section title changed or hidden (${metrics.entrySectionTitle})`);
        expect(metrics.homeXiaoaSectionCount === 0, `index ${width}px: full Xiao A section returned to homepage (${metrics.homeXiaoaSectionCount})`);
        expect(metrics.homeXaHeroCount === 0, `index ${width}px: .xa-hero returned to homepage (${metrics.homeXaHeroCount})`);
        expect(metrics.homeXaVsCount === 0, `index ${width}px: .xa-vs returned to homepage (${metrics.homeXaVsCount})`);
        expect(metrics.visibleHomeShortcutCount === 1, `index ${width}px: expected one visible Xiao A shortcut (${metrics.visibleHomeShortcutCount})`);
        expect(metrics.homeShortcutText === shortcutDescription, `index ${width}px: Xiao A shortcut description changed (${metrics.homeShortcutText})`);
        expect(metrics.homeShortcutCta?.text === '打开小A', `index ${width}px: Xiao A CTA copy changed (${metrics.homeShortcutCta?.text || ''})`);
        expect(metrics.homeShortcutCta?.href === portalUrl, `index ${width}px: Xiao A CTA URL changed (${metrics.homeShortcutCta?.href || ''})`);
        expect(metrics.homeShortcutCta?.target === '_blank', `index ${width}px: Xiao A CTA no longer opens a new tab`);
        expect(metrics.homeShortcutCta?.rel.split(/\s+/).includes('noopener'), `index ${width}px: Xiao A CTA is missing noopener`);
        expect(metrics.homeShortcutArrowVisible, `index ${width}px: Xiao A CTA arrow is missing or hidden`);
        expect(homeShortcutReachedByTab, `index ${width}px: Tab navigation cannot reach the Xiao A CTA`);
        expect(Boolean(metrics.homeSectionRect && metrics.homeHeroRect && metrics.homeImageRect && metrics.homeTitleRect && metrics.homeCopyRect && metrics.homeMascotRect && metrics.homeShortcutRect && metrics.homeShortcutCtaRect && metrics.faceSafeRect), `index ${width}px: missing home Hero geometry target`);
        expect(metrics.homeImageVisible, `index ${width}px: Xiao A image is hidden`);
        expect(!metrics.homeImageCopyOverlap, `index ${width}px: actual mascot image overlaps hero copy`);
        expect(!metrics.homeTitleMascotOverlap, `index ${width}px: title and mascot rectangles overlap`);
        expect(!metrics.homeShortcutFaceOverlap, `index ${width}px: Xiao A shortcut overlaps the mascot face-safe rectangle`);
        expect(metrics.homeShortcutFaceGap >= 12, `index ${width}px: Xiao A shortcut needs at least 12px clear space from the visible head (${metrics.homeShortcutFaceGap.toFixed(1)}px)`);
        expect(!metrics.homeShortcutCopyOverlap, `index ${width}px: Xiao A shortcut overlaps Hero copy`);
        expect(!metrics.homeShortcutTitleOverlap && !metrics.homeShortcutSubtitleOverlap, `index ${width}px: Xiao A shortcut overlaps the Hero title or subtitle`);
        expect(metrics.homeShortcutRect && metrics.homeShortcutRect.left >= -.5 && metrics.homeShortcutRect.right <= metrics.viewportRect.right + .5 && metrics.homeShortcutRect.top >= -.5 && metrics.homeShortcutRect.bottom <= metrics.viewportRect.bottom + .5, `index ${width}px: Xiao A shortcut leaves the viewport`);
        expect(metrics.homeShortcutCtaRect && metrics.homeShortcutCtaRect.width >= 44 && metrics.homeShortcutCtaRect.height >= 44, `index ${width}px: Xiao A CTA is below 44x44 (${metrics.homeShortcutCtaRect?.width || 0}x${metrics.homeShortcutCtaRect?.height || 0})`);
        expect(homeShortcutKeyboardFocus?.focusVisible, `index ${width}px: Xiao A CTA does not enter :focus-visible state`);
        expect(homeShortcutKeyboardFocus?.outlineStyle !== 'none' && homeShortcutKeyboardFocus?.outlineWidth >= 3 && homeShortcutKeyboardFocus?.outlineAlpha > 0,
          `index ${width}px: Xiao A CTA focus ring must be opaque and at least 3px (${homeShortcutKeyboardFocus?.outlineWidth || 0})`);
        expect(homeShortcutKeyboardFocus?.contrastRatio >= 3, `index ${width}px: Xiao A CTA focus ring contrast is too low (${homeShortcutKeyboardFocus?.contrastRatio?.toFixed(2) || 0}:1)`);
        expect(homeShortcutKeyboardFocus && homeShortcutKeyboardFocus.ring.left >= -.5 && homeShortcutKeyboardFocus.ring.right <= metrics.viewportRect.right + .5 && homeShortcutKeyboardFocus.ring.top >= -.5 && homeShortcutKeyboardFocus.ring.bottom <= metrics.viewportRect.bottom + .5,
          `index ${width}px: Xiao A CTA focus ring is clipped by the viewport`);
        expect(homeShortcutKeyboardFocus && homeShortcutKeyboardFocus.clip && homeShortcutKeyboardFocus.ring.left >= homeShortcutKeyboardFocus.clip.left - .5 && homeShortcutKeyboardFocus.ring.right <= homeShortcutKeyboardFocus.clip.right + .5 && homeShortcutKeyboardFocus.ring.top >= homeShortcutKeyboardFocus.clip.top - .5 && homeShortcutKeyboardFocus.ring.bottom <= homeShortcutKeyboardFocus.clip.bottom + .5,
          `index ${width}px: Xiao A CTA focus ring is clipped by the Hero`);
        expect(metrics.homeEntryCards.length === 3 && metrics.homeEntryCards.every((card) => card.visible), `index ${width}px: expected three visible entry-card links`);
        expect(JSON.stringify(metrics.homeEntryCards.map(({ href }) => href)) === JSON.stringify(['learn.html', 'video.html', 'resources.html']), `index ${width}px: entry-card link order changed`);
        expect(JSON.stringify(homeEntryKeyboardFocus.map(({ href }) => href)) === JSON.stringify(['learn.html', 'video.html', 'resources.html']),
          `index ${width}px: each whole entry card must receive real keyboard focus in approved order (${homeEntryKeyboardFocus.map(({ href }) => href).join('/')})`);
        for (const cardFocus of homeEntryKeyboardFocus) {
          expect(cardFocus.focusVisible, `index ${width}px ${cardFocus.href}: entry card does not enter :focus-visible`);
          expect(cardFocus.outlineStyle !== 'none' && cardFocus.outlineWidth >= 3 && cardFocus.outlineAlpha > 0,
            `index ${width}px ${cardFocus.href}: focus outline must be opaque and at least 3px`);
          expect(cardFocus.contrastRatio >= 3, `index ${width}px ${cardFocus.href}: focus outline contrast is too low (${cardFocus.contrastRatio.toFixed(2)}:1)`);
          expect(cardFocus.ring.left >= cardFocus.viewport.left - .5 && cardFocus.ring.right <= cardFocus.viewport.right + .5 && cardFocus.ring.top >= cardFocus.viewport.top - .5 && cardFocus.ring.bottom <= cardFocus.viewport.bottom + .5,
            `index ${width}px ${cardFocus.href}: focus ring is clipped by the viewport (${JSON.stringify(cardFocus.ring)} / ${JSON.stringify(cardFocus.viewport)})`);
          expect(cardFocus.clip && cardFocus.ring.left >= cardFocus.clip.left - .5 && cardFocus.ring.right <= cardFocus.clip.right + .5 && cardFocus.ring.top >= cardFocus.clip.top - .5 && cardFocus.ring.bottom <= cardFocus.clip.bottom + .5,
            `index ${width}px ${cardFocus.href}: focus ring is clipped by the entry section`);
        }
        expect(metrics.homeEntryCards.every(({ iconVisible, iconRect }) => iconVisible && iconRect?.width >= 64 && iconRect?.height >= 64),
          `index ${width}px: every entry icon must be visible and at least 64x64 (${metrics.homeEntryCards.map(({ iconRect }) => `${iconRect?.width || 0}x${iconRect?.height || 0}`).join(', ')})`);
        expect(JSON.stringify(metrics.homeEntryCards.map(({ iconMarker }) => iconMarker)) === JSON.stringify(['learn', 'watch', 'resources']),
          `index ${width}px: entry icon markers must be unique and stable (${metrics.homeEntryCards.map(({ iconMarker }) => iconMarker).join('/')})`);
        expect(new Set(metrics.homeEntryCards.map(({ iconSignature }) => iconSignature)).size === 3, `index ${width}px: entry SVG graphics must be visually distinct`);
        expect(metrics.homeEntryCards.every(({ iconAriaHidden }) => iconAriaHidden === 'true'), `index ${width}px: entry SVG icons must use aria-hidden=true`);
        expect(metrics.homeEntryCards.every(({ titleDescriptionOverlap, titleActionOverlap, descriptionActionOverlap }) => !titleDescriptionOverlap && !titleActionOverlap && !descriptionActionOverlap),
          `index ${width}px: entry-card title, description, and action must not overlap`);
        const entryHeights = metrics.homeEntryCards.map(({ rect: cardRect }) => cardRect?.height || 0);
        expect(Math.max(...entryHeights) - Math.min(...entryHeights) <= 2, `index ${width}px: entry cards must be equal height within 2px (${entryHeights.join('/')})`);
        expect(metrics.homeEntryCards.every(({ titleContrast, descriptionContrast }) => descriptionContrast >= 4.5 && titleContrast - descriptionContrast >= 1.5),
          `index ${width}px: descriptions need 4.5:1 contrast while titles remain at least 1.5 stronger (${metrics.homeEntryCards.map(({ titleContrast, descriptionContrast }) => `${titleContrast.toFixed(2)}/${descriptionContrast.toFixed(2)}`).join(', ')})`);
        expect(metrics.homeEntryCards.every(({ titleFontWeight, descriptionFontWeight }) => titleFontWeight > descriptionFontWeight),
          `index ${width}px: entry title weight must remain stronger than description weight`);
        if (width > 820) {
          expect(metrics.homeEntryCards.every(({ titleFontSize, descriptionFontSize }) => titleFontSize >= 26 && titleFontSize - descriptionFontSize >= 8),
            `index ${width}px: entry titles must be at least 26px and 8px larger than descriptions (${metrics.homeEntryCards.map(({ titleFontSize, descriptionFontSize }) => `${titleFontSize}/${descriptionFontSize}`).join(', ')})`);
        }
        expect(Math.abs(metrics.homeHeroRect.bottom - metrics.homeSectionRect.bottom) <= 3.1, `index ${width}px: mascot crop boundary is not aligned to Hero bottom (${metrics.homeHeroRect.bottom}/${metrics.homeSectionRect.bottom})`);
        expect(metrics.homeImageRect.top >= metrics.homeHeroRect.top - 1, `index ${width}px: mascot rises above Hero (${metrics.homeImageRect.top}/${metrics.homeHeroRect.top})`);
        expect(metrics.homeImageRect.bottom > metrics.homeHeroRect.bottom + 20, `index ${width}px: mascot legs are not cropped by Hero (${metrics.homeImageRect.bottom}/${metrics.homeHeroRect.bottom})`);
        expect(metrics.homeImageRect.height / metrics.homeHeroRect.height >= 1.12, `index ${width}px: mascot is not sufficiently enlarged (${metrics.homeImageRect.height}/${metrics.homeHeroRect.height})`);
        expect(metrics.homeImageCurrentSrc.endsWith('/img/xiaoa-home-480.webp'), `index ${width}px: browser did not select the WebP mascot (${metrics.homeImageCurrentSrc})`);
        homeViewportEvidence.push({
          width,
          viewportRect: metrics.viewportRect,
          shortcutRect: metrics.homeShortcutRect,
          ctaRect: metrics.homeShortcutCtaRect,
          mascotImageRect: metrics.homeImageRect,
          faceSafeRect: metrics.faceSafeRect,
          copyRect: metrics.homeCopyRect,
          imageHeightRatio: metrics.homeImageRect && metrics.homeHeroRect
            ? Number((metrics.homeImageRect.height / metrics.homeHeroRect.height).toFixed(2)) : 0,
          faceOverlap: metrics.homeShortcutFaceOverlap,
          faceGap: Number(metrics.homeShortcutFaceGap.toFixed(1)),
          copyOverlap: metrics.homeShortcutCopyOverlap,
          entryIconSizes: metrics.homeEntryCards.map(({ iconRect }) => [Math.round(iconRect?.width || 0), Math.round(iconRect?.height || 0)]),
          entryHeights: entryHeights.map((value) => Number(value.toFixed(1))),
          horizontalOverflow: metrics.scrollWidth > metrics.viewportWidth + 1,
        });
      }

      if (name === 'learn') {
        const expectedDescription = '从看懂 AI 到会协作，用六个轻量章节掌握分工、表达与判断。每章都有案例和小练习，无需技术背景。';
        const minimumImageHeight = width >= 1236 ? 300 : (width >= 820 ? 250 : 190);
        expect(metrics.learnDescriptionText === expectedDescription && metrics.learnDescriptionVisible,
          `learn ${width}px: full Hero description changed, hidden, or clipped (${metrics.learnDescriptionText})`);
        expect(metrics.learnDescriptionScrollWidth <= metrics.learnDescriptionClientWidth + 1,
          `learn ${width}px: Hero description is horizontally clipped (${metrics.learnDescriptionScrollWidth}/${metrics.learnDescriptionClientWidth})`);
        if (width >= 1236) expect(metrics.learnDescriptionLineCount === 1, `learn ${width}px: full Hero description must remain on one line (${metrics.learnDescriptionLineCount})`);
        expect(metrics.learnImageVisible && metrics.learnImageRect?.height >= minimumImageHeight,
          `learn ${width}px: reading Xiao A must be at least ${minimumImageHeight}px tall (${metrics.learnImageRect?.height || 0})`);
        if (width >= 1236) expect(metrics.learnImageRect?.width >= 260, `learn ${width}px: reading Xiao A must be at least 260px wide (${metrics.learnImageRect?.width || 0})`);
        expect(metrics.learnImageCurrentSrc.endsWith('/img/xiaoa-learn-480.webp'), `learn ${width}px: browser did not select the WebP reading mascot (${metrics.learnImageCurrentSrc})`);
        expect(metrics.learnImageFallbackSrc === 'img/xiaoa-learn.png' && metrics.learnImageAlt === '正在阅读学习的小A AI 助手', `learn ${width}px: reading mascot fallback or alt changed`);
        expect(metrics.learnImageObjectFit === 'contain', `learn ${width}px: reading mascot must use object-fit:contain (${metrics.learnImageObjectFit})`);
        expect(/(?:bottom|(?:^|\s)100%(?:\s|$))/i.test(metrics.learnImageObjectPosition),
          `learn ${width}px: reading mascot object-position must stay bottom-aligned (${metrics.learnImageObjectPosition})`);
        expect(metrics.learnHeroRect && metrics.learnImageRect && metrics.learnImageRect.left >= metrics.learnHeroRect.left - .5 && metrics.learnImageRect.right <= metrics.learnHeroRect.right + .5 && metrics.learnImageRect.top >= metrics.learnHeroRect.top - .5 && metrics.learnImageRect.bottom <= metrics.learnHeroRect.bottom + .5,
          `learn ${width}px: reading Xiao A leaves the Hero bounds`);
        expect(!metrics.learnImageTitleOverlap && !metrics.learnImageDescriptionOverlap && !metrics.learnImageActionOverlap && !metrics.learnImageSummaryOverlap && !metrics.learnImageMetaOverlap,
          `learn ${width}px: reading Xiao A overlaps title, description, action, progress, or meta`);
        expect(metrics.learnActionVisible && metrics.learnSummaryVisible && metrics.learnMetaVisible,
          `learn ${width}px: action, session summary, or meta is hidden`);
        const learnCopyLeft = metrics.learnCopyRect?.left ?? -1;
        expect(Math.abs((metrics.learnActionRect?.left ?? -100) - learnCopyLeft) <= 2,
          `learn ${width}px: continue action must align with copy left edge (${metrics.learnActionRect?.left}/${learnCopyLeft})`);
        expect(Math.abs((metrics.learnMetaRect?.left ?? -100) - learnCopyLeft) <= 2,
          `learn ${width}px: meta must align with copy left edge (${metrics.learnMetaRect?.left}/${learnCopyLeft})`);
        if (width > 560) {
          expect(Boolean(metrics.learnActionRect && metrics.learnSummaryRect
            && Math.abs(metrics.learnActionRect.top - metrics.learnSummaryRect.top) <= 2
            && metrics.learnSummaryRect.left - metrics.learnActionRect.right >= 12),
            `learn ${width}px: action and session summary must form a horizontal group with at least 12px gap`);
        } else {
          expect(Boolean(metrics.learnActionRect && metrics.learnSummaryRect
            && metrics.learnSummaryRect.top >= metrics.learnActionRect.bottom + 8),
            `learn ${width}px: action and session summary must stack vertically with at least 8px gap`);
          expect(Math.abs((metrics.learnSummaryRect?.left ?? -100) - learnCopyLeft) <= 2,
            `learn ${width}px: stacked session summary must align with copy left edge (${metrics.learnSummaryRect?.left}/${learnCopyLeft})`);
        }
        learnViewportEvidence.push({
          width,
          descriptionLines: metrics.learnDescriptionLineCount,
          imageRect: metrics.learnImageRect,
          copyLeft: learnCopyLeft,
          actionLeft: metrics.learnActionRect?.left,
          summaryLeft: metrics.learnSummaryRect?.left,
          metaLeft: metrics.learnMetaRect?.left,
        });
      }

      if (name === 'resources') {
        expect(metrics.resourcesInternalCount === 1, `resources ${width}px: expected one internal Xiao A section (${metrics.resourcesInternalCount})`);
        expect(metrics.resourcesExternalCount === 1, `resources ${width}px: expected one external resources section (${metrics.resourcesExternalCount})`);
        expect(metrics.resourcesInternalVisible, `resources ${width}px: internal Xiao A section is hidden`);
        expect(metrics.resourcesExternalVisible, `resources ${width}px: external resources section is hidden`);
        expect(metrics.resourcesInternalBeforeExternal, `resources ${width}px: internal Xiao A section must precede external resources`);
        expect(metrics.resourcesInternalTitle === '公司内部 AI 助手', `resources ${width}px: internal Xiao A title changed (${metrics.resourcesInternalTitle})`);
        expect(metrics.resourcesInternalPanelVisible && metrics.resourcesInternalTextPanelVisible && metrics.resourcesInternalAbilityPanelVisible, `resources ${width}px: full internal Xiao A panel is not visibly rendered`);
        expect(metrics.resourcesInternalAbilityCount === 5, `resources ${width}px: expected five visible Xiao A capabilities (${metrics.resourcesInternalAbilityCount})`);
        expect(JSON.stringify(metrics.resourcesInternalAbilityLabels) === JSON.stringify(['问流程', '查财务', '查系统', '连续追问', '看图表']), `resources ${width}px: Xiao A capability labels changed (${metrics.resourcesInternalAbilityLabels.join('/')})`);
        expect(metrics.resourcesInternalNote === '进入 Portal 后，点击右侧「小A智助」打开助手。', `resources ${width}px: Portal usage note changed (${metrics.resourcesInternalNote})`);
        expect(metrics.resourcesInternalPortal?.href === portalUrl && metrics.resourcesInternalPortal.target === '_blank' && metrics.resourcesInternalPortal.rel.split(/\s+/).includes('noopener'), `resources ${width}px: internal Xiao A Portal CTA is not a safe approved target`);
        expect(metrics.resourcesComparisonVisible && metrics.resourcesComparisonTableVisible, `resources ${width}px: Xiao A comparison table is hidden or outside the internal section`);
        expect(metrics.resourcesComparisonLabel === '横向滚动查看小A与微软 Copilot 使用场景对比' && metrics.resourcesComparisonTabIndex === '0', `resources ${width}px: Xiao A comparison table lost its accessible scrolling contract`);
        expect(metrics.visibleResourceEntryCount === 4, `resources ${width}px: expected four visible external resource entries (${metrics.visibleResourceEntryCount})`);
        expect(!metrics.externalText.includes('公司内部'), `resources ${width}px: external section contains company-internal copy`);
        expect(!metrics.externalText.includes('小A'), `resources ${width}px: external section contains Xiao A copy`);
        expect(metrics.deepSeekVisibleCount === 1, `resources ${width}px: expected one visible DeepSeek preview (${metrics.deepSeekVisibleCount})`);
        expect(metrics.deepSeekName === 'DeepSeek' && metrics.deepSeekBadge === '国内' && metrics.deepSeekDescription === '国产通用 AI 助手，推理能力突出', `resources ${width}px: approved DeepSeek preview changed (${metrics.deepSeekText})`);
        expect(metrics.gatewayIdCount === 1, `resources ${width}px: expected one unique #gateway anchor (${metrics.gatewayIdCount})`);
        expect(metrics.resourcesGatewayCount === 1, `resources ${width}px: expected one div.external-sites#gateway inside external resources (${metrics.resourcesGatewayCount})`);
        expect(metrics.resourcesGatewayVisible && metrics.resourcesGatewayInsideExternal, `resources ${width}px: selected sites are hidden or outside external resources`);
        expect(metrics.resourcesGatewayTitleText === '精选站点' && metrics.resourcesGatewayTitleVisible, `resources ${width}px: selected-sites title changed or hidden (${metrics.resourcesGatewayTitleText})`);
        expect(metrics.standaloneGatewaySectionCount === 0, `resources ${width}px: standalone section#gateway returned (${metrics.standaloneGatewaySectionCount})`);
        expect(!metrics.visibleAiGatewayLabel, `resources ${width}px: obsolete AI 网闸 label is visible`);
        for (const [linkName, href] of [
          ['AI 日报', 'https://aihot.virxact.com/daily'],
          ['WaytoAGI · AI 知识库', 'https://www.waytoagi.com/zh'],
        ]) {
          const namedLinks = metrics.resourcesGatewayCards.filter((card) => card.text.includes(linkName));
          const exactLinks = metrics.resourcesGatewayCards.filter((link) => link.href === href);
          expect(namedLinks.length === 1 && namedLinks[0].visible, `resources ${width}px: expected one visible ${linkName} selected-site link (${namedLinks.length})`);
          expect(exactLinks.length === 1, `resources ${width}px: selected-site link is missing or duplicated (${href})`);
          expect(exactLinks.length === 1 && exactLinks[0].visible, `resources ${width}px: selected-site link is hidden (${href})`);
          expect(exactLinks.length === 1 && exactLinks[0].target === '_blank' && exactLinks[0].rel.split(/\s+/).includes('noopener'), `resources ${width}px: selected-site link is not a safe new-tab target (${href})`);
        }
      }

      if (name === 'learn') {
        expect(metrics.learningCardCount === 6 && metrics.visibleLearningCardCount === 6, `learn ${width}px: expected six visible chapter cards (${metrics.visibleLearningCardCount}/${metrics.learningCardCount})`);
        expect(JSON.stringify(metrics.learningCards.map((card) => [card.id, card.title])) === JSON.stringify(learningChapters), `learn ${width}px: chapter order or titles changed (${JSON.stringify(metrics.learningCards)})`);
        expect(metrics.learningCards.every((card) => card.status === '未看' && card.href === `detail.html?type=learn&id=${card.id}`), `learn ${width}px: fresh-session cards must expose 未看 and canonical detail URLs`);
        expect(metrics.learningToolCardCount === 4 && metrics.visibleLearningToolCardCount === 4, `learn ${width}px: expected four visible takeaway tools (${metrics.visibleLearningToolCardCount}/${metrics.learningToolCardCount})`);
        expect(!metrics.learningMovedTextVisible, `learn ${width}px: moved external resource directory returned to the beginner hub`);
      }

      if (name === 'progress') {
        expect(metrics.progressCta?.visible && metrics.progressCta.text === '进入 AI 新手入门', `progress ${width}px: compatibility CTA is missing or hidden`);
        expect(metrics.progressCta?.href.endsWith('/learn.html'), `progress ${width}px: compatibility CTA does not return to learn.html`);
        expect(metrics.progressText.includes('进度只在本次标签会话有效'), `progress ${width}px: session-only progress explanation is missing`);
        expect(!/localStorage|长期保存|永久保存/.test(metrics.progressText), `progress ${width}px: obsolete persistent-progress promise is visible`);
      }

      await page.screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: true });
      screenshotCount += 1;

      if (name === 'resources') {
        await page.goto(`${base}/resources.html?anchorQa=${width}#gateway`, { waitUntil: 'domcontentloaded' });
        await waitForScrollPositionToSettle(page);
        const anchorGeometry = await page.evaluate(() => {
          const gateway = document.querySelector('div.external-sites#gateway');
          const heading = gateway?.querySelector('.external-sites-head h3');
          const topbar = document.querySelector('#topbar');
          const gatewayRect = gateway?.getBoundingClientRect();
          const headingRect = heading?.getBoundingClientRect();
          const topbarRect = topbar?.getBoundingClientRect();
          return {
            gatewayTop: gatewayRect?.top ?? -1,
            headingTop: headingRect?.top ?? -1,
            headingBottom: headingRect?.bottom ?? -1,
            headingHeight: headingRect?.height ?? 0,
            topbarBottom: topbarRect?.bottom ?? -1,
            viewportHeight: innerHeight,
            scrollY,
            scrollMarginTop: gateway ? getComputedStyle(gateway).scrollMarginTop : '',
          };
        });
        expect(anchorGeometry.scrollY > 0, `resources ${width}px: #gateway deep link did not scroll the document (${anchorGeometry.scrollY})`);
        expect(anchorGeometry.headingHeight > 0, `resources ${width}px: #gateway deep-link heading has no rendered geometry`);
        expect(anchorGeometry.headingTop >= anchorGeometry.topbarBottom - 1, `resources ${width}px: #gateway deep-link heading is hidden by the sticky header (${anchorGeometry.headingTop}/${anchorGeometry.topbarBottom})`);
        expect(anchorGeometry.headingTop < anchorGeometry.viewportHeight && anchorGeometry.headingBottom > 0, `resources ${width}px: #gateway deep-link heading is outside the viewport (${anchorGeometry.headingTop}-${anchorGeometry.headingBottom}/${anchorGeometry.viewportHeight})`);
        gatewayViewportEvidence.push({ width, ...anchorGeometry });
      }
    }
  }

  const expectedHomeViewportCount = mutationMode && activeMutationPages.includes('index') ? 1 : (mutationMode ? 0 : focusedViewports.length);
  const expectedLearnViewportCount = mutationMode && activeMutationPages.includes('learn') ? 1 : (mutationMode ? 0 : focusedViewports.length);
  const expectedGatewayViewportCount = mutationMode && activeMutationPages.includes('resources') ? 1 : (mutationMode ? 0 : allViewports.length);
  expect(homeViewportEvidence.length === expectedHomeViewportCount, `home Hero geometry did not run at every requested viewport (${homeViewportEvidence.length}/${expectedHomeViewportCount})`);
  expect(learnViewportEvidence.length === expectedLearnViewportCount, `learn Hero geometry did not run at every requested viewport (${learnViewportEvidence.length}/${expectedLearnViewportCount})`);
  expect(gatewayViewportEvidence.length === expectedGatewayViewportCount, `#gateway deep-link geometry did not run at every requested viewport (${gatewayViewportEvidence.length}/${expectedGatewayViewportCount})`);

  if (!mutationMode) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    const tabbedEntryHrefs = [];
    for (let step = 0; step < 40 && tabbedEntryHrefs.length < 3; step += 1) {
      await page.keyboard.press('Tab');
      const activeHref = await page.evaluate(() => document.activeElement?.classList.contains('entry-card')
        ? document.activeElement.getAttribute('href') : null);
      if (activeHref) tabbedEntryHrefs.push(activeHref);
    }
    expect(JSON.stringify(tabbedEntryHrefs) === JSON.stringify(['learn.html', 'video.html', 'resources.html']),
      `390px: whole entry cards must be reachable by Tab in approved order (${tabbedEntryHrefs.join('/')})`);
    for (const href of ['learn.html', 'video.html', 'resources.html']) {
      await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.locator(`a.entry-card[href="${href}"]`).focus();
      await Promise.all([
        page.waitForURL((url) => url.pathname.endsWith(`/${href}`)),
        page.keyboard.press('Enter'),
      ]);
      expect(new URL(page.url()).pathname.endsWith(`/${href}`), `390px: Enter cannot activate the whole ${href} entry card`);
    }
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
    const progressCta = page.locator('.progress-compat-cta');
    expect(await progressCta.count() === 1 && await progressCta.isVisible(), 'progress compatibility route must expose one visible CTA');
    await progressCta.click();
    expect(new URL(page.url()).pathname.endsWith('/learn.html'), 'progress compatibility CTA cannot return to the learning hub');

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.removeItem('amersports-ai-beginner-session-v1');
    });
    await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
    await page.locator('.lesson[data-chapter-id="ai-basics"]').waitFor();
    const sessionAfterVisit = await page.evaluate(() => ({
      session: sessionStorage.getItem('amersports-ai-beginner-session-v1'),
      persistentKeys: Object.keys(localStorage),
    }));
    expect(JSON.parse(sessionAfterVisit.session || '{}')['ai-basics'] === 'in-progress', 'opening a canonical chapter must mark it 正在看 in sessionStorage');
    expect(sessionAfterVisit.persistentKeys.length === 0, 'learning progress must not write localStorage');
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(JSON.parse(await page.evaluate(() => sessionStorage.getItem('amersports-ai-beginner-session-v1')) || '{}')['ai-basics'] === 'in-progress', 'session progress must survive reload in the same tab');
    await page.goto(`${base}/learn.html`, { waitUntil: 'domcontentloaded' });
    expect((await page.locator('#chapter-ai-basics .learning-status').textContent()).trim() === '正在看', 'learning hub must reflect session progress');

    for (const [alias, canonicalTitle] of [
      ['ai-what', '认识 AI'],
      ['ai-history', '认识 AI'],
      ['prompt-basics', '把需求说清楚'],
      ['ai-other', '认识 AI'],
    ]) {
      await page.goto(`${base}/detail.html?type=learn&id=${alias}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.lesson-header h1').waitFor();
      expect((await page.locator('.lesson-header h1').textContent()).trim() === canonicalTitle, `${alias}: legacy learning alias did not render ${canonicalTitle}`);
    }

    for (const movedId of ['ai-companies', 'ai-models']) {
      await page.goto(`${base}/detail.html?type=learn&id=${movedId}`, { waitUntil: 'domcontentloaded' });
      const moved = page.locator('.lesson-moved');
      await moved.waitFor();
      expect((await moved.textContent()).includes('已移至 AI 工具与资源'), `${movedId}: moved-content notice is missing`);
      expect((await moved.locator('a[href="resources.html"]').count()) === 1, `${movedId}: moved-content notice must link to resources.html`);
    }

    await page.goto(`${base}/detail.html?type=learn&id=%E0%A4%A`, { waitUntil: 'domcontentloaded' });
    const malformedNotice = page.locator('.lesson-moved');
    expect(await malformedNotice.count() === 1 && (await malformedNotice.textContent()).includes('暂未找到这一章'), 'malformed learning query must fail safely with a not-found state');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/learn.html`, { waitUntil: 'domcontentloaded' });
    const reducedCardMotion = await page.locator('.learning-card').first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { animationName: style.animationName, transitionDuration: style.transitionDuration, scrollBehavior: style.scrollBehavior };
    });
    expect(reducedCardMotion.animationName === 'none' && reducedCardMotion.transitionDuration.split(',').every((duration) => Number.parseFloat(duration) <= .001),
      `reduced motion must disable learning-card animation and transitions (${JSON.stringify(reducedCardMotion)})`);
    await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
    const reducedFeedbackMotion = await page.locator('.lesson-feedback').evaluate((node) => {
      const style = getComputedStyle(node);
      return { animationName: style.animationName, transitionDuration: style.transitionDuration };
    });
    expect(reducedFeedbackMotion.animationName === 'none' && reducedFeedbackMotion.transitionDuration.split(',').every((duration) => Number.parseFloat(duration) <= .001),
      `reduced motion must disable lesson-feedback animation and transitions (${JSON.stringify(reducedFeedbackMotion)})`);
    await page.locator('[data-token-option]').first().click();
    expect((await page.locator('.lesson-feedback').textContent()).trim().length > 0, 'reduced-motion preference must not disable lesson interaction feedback');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

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
  }

    expect(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join(' | ')}`);
  } catch (error) {
    runError = error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        if (cleanupTrace) console.error('CLEANUP: browser closed');
      } catch (closeError) {
        if (!runError) runError = closeError;
        else console.error(`CLEANUP ERROR (original error preserved): ${closeError?.stack ?? closeError}`);
      }
    }
  }

  if (runError) throw runError;

  if (failures.length) {
    console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
    if (homeViewportEvidence.length) console.error(`HOME HERO: ${JSON.stringify(homeViewportEvidence)}`);
    if (learnViewportEvidence.length) console.error(`LEARN HERO: ${JSON.stringify(learnViewportEvidence)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`HOME HERO: ${JSON.stringify(homeViewportEvidence)}`);
  console.log(`LEARN HERO: ${JSON.stringify(learnViewportEvidence)}`);
  console.log(`GATEWAY ANCHOR: ${JSON.stringify(gatewayViewportEvidence)}`);
  console.log(`PASS: Task 8 browser QA (${checks} checks, ${screenshotCount} screenshots at ${output})`);
}

(browserSelfTestMode ? runBrowserSelfTest() : runQa()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
