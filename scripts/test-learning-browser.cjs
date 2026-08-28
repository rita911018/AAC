const http = require('node:http');
const { createReadStream, existsSync, mkdirSync, readFileSync, statSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { extname, join, normalize, resolve } = require('node:path');

let playwright;
try {
  playwright = require('playwright');
} catch {
  const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  playwright = require(resolve(globalModules, 'playwright'));
}

const { chromium } = playwright;
const siteRoot = resolve(process.env.KB_LEARNING_SITE_ROOT || resolve(__dirname, '../site/knowledge-base'));
const screenshotRoot = resolve(process.argv[3] || '/private/tmp/knowledge-base-learning-qa');
const suppliedBase = process.argv[2] || '';
const mutation = process.env.KB_LEARNING_MUTATION || process.argv[4] || '';
const storageKey = 'amersports-ai-beginner-session-v1';
mkdirSync(screenshotRoot, { recursive: true });

const chapters = [
  { id: 'ai-basics', number: '01', title: '认识 AI', action: '[data-token-option]' },
  { id: 'ai-boundaries', number: '02', title: '看清边界', action: '[data-claim-index="0"][data-choice-value="需要修改"]' },
  { id: 'ai-delegation', number: '03', title: '学会分工', action: '[data-task-index="0"][data-choice-value="人负责"]' },
  { id: 'ai-prompting', number: '04', title: '把需求说清楚', action: '[data-prompt-field="目标"]' },
  { id: 'ai-verification', number: '05', title: '验证结果', action: '[data-claim-kind][data-claim-index="0"][data-choice-value="观点"]' },
  { id: 'ai-workflow', number: '06', title: '从对话走向工作流', action: '[data-workflow-move]:not(:disabled)' },
];
const rendererNames = [
  'renderTokenPrediction',
  'renderEvidenceSpotter',
  'renderDelegationSorter',
  'renderPromptBuilder',
  'renderClaimClassifier',
  'renderWorkflowSorter',
];
const viewports = [
  [1440, 1000],
  [820, 1000],
  [560, 900],
  [390, 844],
];

let checks = 0;
const failures = [];
function expect(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function startServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = normalize(join(siteRoot, relative));
    if (!file.startsWith(siteRoot + '/') || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (mutation && (relative === 'learning-experience.js' || relative === 'learning-experience.css')) {
      var source = readFileSync(file, 'utf8');
      var changed = source;
      if (mutation === 'renderer-dispatch' && relative.endsWith('.js')) {
        changed = source.replace("    'token-and-concepts': renderTokenPrediction,\n", '');
      } else if (mutation === 'drag-only' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-exercise button{display:none!important}\n';
      } else if (mutation === 'prompt-innerhtml' && relative.endsWith('.js')) {
        changed = source.replace("      preview.textContent = lines.join('\\n');", "      preview.innerHTML = lines.join('\\n');");
      } else if (mutation === 'done-score-gate' && relative.endsWith('.js')) {
        changed = source.replace('      enableCompletion(message);\n    });', "      if (exerciseSection.querySelectorAll('[aria-pressed=\\\"true\\\"]').length >= 99) enableCompletion(message);\n    });");
      } else if (mutation === 'punitive-feedback' && relative.endsWith('.js')) {
        changed = source.replace('可以换个角度再看。', '未通过。');
      } else if (mutation === 'storage-throw' && relative.endsWith('.js')) {
        changed = source.replace('    } catch (error) {\n      memoryState = emptyState();\n', '    } catch (error) {\n      throw error;\n');
      } else if (mutation === 'focus-loss' && relative.endsWith('.js')) {
        changed = source.replace("          if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });", "          if (false && focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });");
      } else if (mutation === 'copy-silent-failure' && relative.endsWith('.js')) {
        changed = source.replace('      else showCopyFallback(card, templateText);', '      else return;');
      } else if (mutation === 'concept-interaction-removed' && relative.endsWith('.js')) {
        changed = source.replace('for (var relationIndex = 0; relationIndex < exercise.relations.length; relationIndex += 1)', 'for (var relationIndex = 0; false && relationIndex < exercise.relations.length; relationIndex += 1)');
      } else if (mutation === 'five-step-removed' && relative.endsWith('.js')) {
        changed = source.replace('    appendFlowSteps(ownerDocument, root, exercise.steps, exercise.stepExplanations);', '    // mutation: five-step interaction removed');
      } else if (mutation === 'evidence-interaction-removed' && relative.endsWith('.js')) {
        changed = source.replace('for (var evidenceIndex = 0; evidenceIndex < exercise.evidenceOptions.length; evidenceIndex += 1)', 'for (var evidenceIndex = 0; false && evidenceIndex < exercise.evidenceOptions.length; evidenceIndex += 1)');
      } else if (mutation === 'version-comparison-removed' && relative.endsWith('.js')) {
        changed = source.replace('for (var versionIndex = 0; versionIndex < exercise.versions.length; versionIndex += 1)', 'for (var versionIndex = 0; false && versionIndex < exercise.versions.length; versionIndex += 1)');
      } else if (mutation === 'workflow-not-shuffled' && relative.endsWith('.js')) {
        changed = source.replace('      var sourceIndex = exercise.shuffleOrder[index];', '      var sourceIndex = index;');
      } else if (mutation === 'workflow-answer-leak' && relative.endsWith('.js')) {
        changed = source.replace('          result.hidden = true;', "          result.textContent = '建议分工：' + step.owner + (step.checkpoint ? ' · 已设人工检查点' : ''); result.hidden = false;");
      } else if (mutation === 'target-below-44' && relative.endsWith('.css')) {
        changed = source + '\n.lesson a,.lesson button,.lesson input,.lesson textarea,.lesson select,.lesson summary,.lesson label{min-height:10px!important;height:10px!important;padding-top:0!important;padding-bottom:0!important}\n';
      } else if (mutation === 'ordinary-button-pressed' && relative.endsWith('.js')) {
        changed = source.replace('    return button;\n  }\n\n  function setChoiceState', "    button.setAttribute('aria-pressed', 'false');\n    return button;\n  }\n\n  function setChoiceState");
      } else if (mutation === 'history-summary-compressed' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-history summary{display:block!important;min-height:10px!important;height:10px!important;line-height:10px!important;padding:0!important}\n';
      } else if (mutation === 'reference-summary-compressed' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-exercise-reference summary{display:block!important;min-height:10px!important;height:10px!important;line-height:10px!important;padding:0!important}\n';
      }
      if (changed !== source) {
        response.end(changed);
        return;
      }
    }
    createReadStream(file).pipe(response);
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolveServer({ server, base: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function exerciseWithKeyboard(page, chapter) {
  const action = page.locator(chapter.action).first();
  await action.waitFor({ state: 'visible', timeout: 3000 });
  await action.focus();
  const before = await action.evaluate((node) => ({
    tag: node.tagName,
    type: node.getAttribute('type'),
    name: node.getAttribute('data-prompt-field'),
  }));
  if (before.tag === 'INPUT' || before.tag === 'TEXTAREA') {
    await page.keyboard.type('<img src=x onerror=window.__promptXss=1> 提炼本月进展');
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(30);
}

async function lessonSnapshot(page) {
  return page.evaluate((names) => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const mainLinks = [...document.querySelectorAll('main a[href], #dcBody a[href]')];
    const controls = [...document.querySelectorAll('.lesson-exercise button, .lesson-exercise input, .lesson-exercise textarea, .lesson-exercise select')];
    const lessonTargets = [...document.querySelectorAll([
      '.lesson-nav a',
      '.lesson summary',
      '.lesson-exercise button',
      '.lesson-exercise input',
      '.lesson-exercise textarea',
      '.lesson-exercise select',
      '.lesson-exercise label',
      '.lesson-takeaway button',
      '.lesson-takeaway textarea',
      '.lesson-actions a',
      '.lesson-actions button',
    ].join(','))].filter(visible);
    return {
      title: document.querySelector('.lesson-header h1')?.textContent.trim() || '',
      progress: document.querySelector('.lesson-progress')?.textContent.trim() || '',
      status: sessionStorage.getItem('amersports-ai-beginner-session-v1'),
      doneDisabled: Boolean(document.querySelector('[data-mark-seen]')?.disabled),
      nextHref: document.querySelector('.lesson-actions a.lesson-primary-action')?.getAttribute('href') || '',
      nextVisible: visible(document.querySelector('.lesson-actions a.lesson-primary-action')),
      returnHref: [...document.querySelectorAll('.lesson-actions a')].find((node) => node.textContent.includes('返回学习路径'))?.getAttribute('href') || '',
      feedback: document.querySelector('.lesson-feedback')?.textContent.trim() || '',
      pageText: document.body.innerText,
      overflow: document.documentElement.scrollWidth - innerWidth,
      rendererTypes: names.map((name) => typeof window.AIBeginner?.[name]),
      fieldsetCount: document.querySelectorAll('.lesson-exercise fieldset').length,
      legendCount: document.querySelectorAll('.lesson-exercise legend').length,
      livePolite: [...document.querySelectorAll('.lesson-exercise [aria-live]')].some((node) => node.getAttribute('aria-live') === 'polite'),
      controls: controls.map((node) => ({
        height: node.getBoundingClientRect().height,
        visible: visible(node),
        disabled: Boolean(node.disabled),
      })),
      lessonTargets: lessonTargets.map((node) => ({
        tag: node.tagName,
        text: node.textContent.trim().slice(0, 40),
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      })),
      linkCount: mainLinks.length,
      badLinks: mainLinks.filter((node) => !node.getAttribute('href') || node.getAttribute('href') === '#').length,
      promptXss: Boolean(window.__promptXss),
      promptInjectedImageCount: document.querySelectorAll('.lesson-exercise img[src="x"]').length,
      promptPreview: document.querySelector('[data-prompt-preview]')?.textContent || '',
      activeHook: document.activeElement?.getAttribute('data-token-option') !== null ? 'token'
        : document.activeElement?.getAttribute('data-claim-choice') !== null ? 'claim'
          : document.activeElement?.getAttribute('data-sort-choice') !== null ? 'sort'
            : document.activeElement?.getAttribute('data-prompt-field') ||
              (document.activeElement?.getAttribute('data-claim-kind') !== null ? 'kind'
                : document.activeElement?.getAttribute('data-workflow-move') !== null ? 'workflow' : ''),
      activeRect: document.activeElement && document.activeElement !== document.body
        ? document.activeElement.getBoundingClientRect().toJSON() : null,
      activeOutlineWidth: document.activeElement && document.activeElement !== document.body
        ? Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth) : 0,
    };
  }, rendererNames);
}

async function assertNoPageErrors(page, errors, consoleErrors, label) {
  await page.waitForTimeout(20);
  expect(errors.length === 0, `${label}: runtime errors: ${errors.join(' | ')}`);
  expect(consoleErrors.length === 0, `${label}: console errors: ${consoleErrors.join(' | ')}`);
}

async function runPrimaryContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const chapter of chapters) {
      errors.length = 0;
      consoleErrors.length = 0;
      await page.goto(`${base}/detail.html?type=learn&id=${chapter.id}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.lesson').waitFor();
      let snapshot = await lessonSnapshot(page);
      expect(snapshot.title === chapter.title, `${chapter.id} ${width}px: title mismatch (${snapshot.title})`);
      expect(snapshot.progress === `${chapter.number} / 06`, `${chapter.id} ${width}px: chapter progress mismatch (${snapshot.progress})`);
      expect(snapshot.status && JSON.parse(snapshot.status)[chapter.id] === 'in-progress', `${chapter.id} ${width}px: entering chapter must mark it 正在看`);
      expect(snapshot.rendererTypes.every((type) => type === 'function'), `${chapter.id} ${width}px: all six renderer functions must be exported`);
      expect(snapshot.fieldsetCount >= 1 && snapshot.legendCount >= 1, `${chapter.id} ${width}px: interaction needs semantic fieldset/legend`);
      expect(snapshot.livePolite, `${chapter.id} ${width}px: interaction needs aria-live=polite feedback`);
      expect(snapshot.controls.filter((control) => control.visible && !control.disabled).every((control) => control.height >= 44), `${chapter.id} ${width}px: visible enabled controls must be at least 44px tall`);
      expect(snapshot.lessonTargets.length > 0 && snapshot.lessonTargets.every((target) => target.height >= 44),
        `${chapter.id} ${width}px: every visible lesson target must be at least 44px tall (${snapshot.lessonTargets.filter((target) => target.height < 44).map((target) => `${target.tag}:${target.text}:${target.height}`).join(' | ')})`);
      expect(snapshot.overflow <= 1, `${chapter.id} ${width}px: horizontal overflow ${snapshot.overflow}px`);
      expect(snapshot.badLinks === 0 && snapshot.linkCount >= 2, `${chapter.id} ${width}px: chapter links must remain usable`);
      expect(snapshot.nextVisible || chapter.id === 'ai-workflow', `${chapter.id} ${width}px: next chapter must be visible without a score gate`);

      await exerciseWithKeyboard(page, chapter);
      snapshot = await lessonSnapshot(page);
      expect(!snapshot.doneDisabled, `${chapter.id} ${width}px: first meaningful interaction must enable 我看完了`);
      expect(snapshot.activeHook !== '', `${chapter.id} ${width}px: re-render must retain logical keyboard focus`);
      expect(snapshot.activeRect && snapshot.activeRect.left >= 3 && snapshot.activeRect.right <= width - 3,
        `${chapter.id} ${width}px: focused interaction or its ring is clipped horizontally`);
      expect(snapshot.activeOutlineWidth >= 3, `${chapter.id} ${width}px: keyboard focus must have a visible >=3px outline`);
      expect(!/(未通过|不及格|\bscore\b|评分)/i.test(snapshot.feedback + snapshot.pageText), `${chapter.id} ${width}px: wrong attempts must stay non-punitive`);
      expect(snapshot.nextVisible || chapter.id === 'ai-workflow', `${chapter.id} ${width}px: interaction must not gate next chapter`);
      if (chapter.id === 'ai-prompting') {
        expect(!snapshot.promptXss && snapshot.promptInjectedImageCount === 0, 'prompt builder must render user input as text, never HTML');
        expect(snapshot.promptPreview.includes('<img src=x onerror=window.__promptXss=1>'), 'prompt preview must visibly preserve user input as text');
      }
      await assertNoPageErrors(page, errors, consoleErrors, `${chapter.id} ${width}px`);
      if (!mutation) await page.screenshot({ path: join(screenshotRoot, `${chapter.id}-${width}.png`), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/detail.html?type=learn&id=ai-boundaries`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-claim-choice]').first().focus();
  await page.keyboard.press('Enter');
  const done = page.locator('[data-mark-seen]');
  if (await done.isEnabled()) {
    await done.click();
    expect(await done.getAttribute('aria-pressed') === 'true', 'mark-seen button must expose pressed state');
    expect((await page.locator('[data-lesson-status]').textContent()).includes('已记为看过'), 'mark-seen must announce the new status');
  } else {
    expect(false, 'mark-seen button must be enabled after a meaningful attempt');
  }
  const returnLink = page.getByRole('link', { name: '返回学习路径', exact: true });
  expect((await returnLink.getAttribute('href')) === 'learn.html#chapter-ai-boundaries', 'return link must carry the chapter hash');
  await returnLink.click();
  await page.waitForURL(/learn\.html#chapter-ai-boundaries$/);
  await page.locator('#chapter-ai-boundaries').waitFor();
  await page.waitForTimeout(30);
  const returned = await page.evaluate(() => ({
    hash: location.hash,
    activeId: document.activeElement?.id || '',
    status: document.querySelector('#chapter-ai-boundaries .learning-status')?.textContent.trim(),
  }));
  expect(returned.hash === '#chapter-ai-boundaries', 'return navigation must preserve the chapter hash');
  expect(returned.activeId === 'chapter-ai-boundaries', `return navigation must focus the source card (${returned.activeId})`);
  expect(returned.status === '看过', `return navigation must update source-card status (${returned.status})`);
  await context.close();
}

async function runDeepInteractionContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  const conceptChoices = page.locator('[data-concept-choice]');
  expect(await conceptChoices.count() >= 6, 'basics: concept relationship activity must expose at least three keyboard-operable choices');
  const wrongConcept = page.locator('[data-concept-choice][data-relation-index="0"]').last();
  await wrongConcept.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await wrongConcept.getAttribute('aria-pressed') === 'true', 'basics: concept choice must expose selected state');
  expect((await page.locator('.lesson-feedback').textContent()).length > 8, 'basics: concept choice must explain the attempt');
  expect(!/(未通过|不及格|评分)/.test(await page.locator('.lesson-feedback').textContent()), 'basics: concept feedback must stay non-punitive');
  const correctConcept = page.locator('[data-concept-choice][data-relation-index="0"][data-choice-value="生成式 AI 是 AI 的一部分"]');
  await correctConcept.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('合理'), 'basics: concept relationship must support a correct retry with explanation');
  const flowSteps = page.locator('[data-flow-step]');
  expect(await flowSteps.count() === 5, 'basics: model flow must expose five clickable steps');
  const flowStep = flowSteps.nth(2);
  await flowStep.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await flowStep.getAttribute('aria-expanded') === 'true', 'basics: activating a flow step must expose its explanation state');
  expect(await page.locator('[data-flow-explanation]:visible').count() >= 1, 'basics: a flow step must reveal a short explanation');
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-flow-step')), 'basics: flow interaction must retain focus');

  await page.goto(`${base}/detail.html?type=learn&id=ai-verification`, { waitUntil: 'domcontentloaded' });
  const evidenceChoices = page.locator('[data-evidence-choice]');
  expect(await evidenceChoices.count() === 5, 'verification: the key attribution claim must expose a focused five-source evidence connection');
  expect(await evidenceChoices.evaluateAll((nodes) => nodes.every((node) => node.getAttribute('data-claim-index') === '1')),
    'verification: evidence connection must stay focused on the key attribution claim');
  const evidence = page.locator('[data-evidence-choice][data-claim-index="1"]').first();
  await evidence.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await evidence.getAttribute('aria-pressed') === 'true', 'verification: evidence choice must expose selected state');
  expect((await page.locator('.lesson-feedback').textContent()).includes('证据'), 'verification: evidence attempt must explain the connection');
  const correctEvidence = page.locator('[data-evidence-choice][data-choice-value="尚无足够证据"]');
  await correctEvidence.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('合理'), 'verification: evidence connection must support a correct retry');
  const versionChoices = page.locator('[data-version-choice]');
  expect(await versionChoices.count() === 2, 'verification: two answer versions must be available for comparison');
  const version = versionChoices.first();
  await version.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await version.getAttribute('aria-pressed') === 'true', 'verification: version choice must expose selected state');
  expect((await page.locator('.lesson-feedback').textContent()).includes('版本'), 'verification: version comparison must explain usability');
  const usableVersion = page.locator('[data-version-choice][data-choice-value="版本 B"]');
  await usableVersion.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('更可用'), 'verification: version comparison must support a more-usable retry');

  await page.goto(`${base}/detail.html?type=learn&id=ai-workflow`, { waitUntil: 'domcontentloaded' });
  const workflowInitial = await page.evaluate(() => ({
    steps: [...document.querySelectorAll('.lesson-workflow-step .lesson-workflow-copy b')].map((node) => node.textContent.replace(/^\d+\.\s*/, '')),
    text: document.querySelector('.lesson-workflow-list')?.innerText || '',
    movePressed: [...document.querySelectorAll('[data-workflow-move]')].some((node) => node.hasAttribute('aria-pressed')),
    ownerStates: [...document.querySelectorAll('[data-workflow-owner]')].map((node) => node.getAttribute('aria-pressed')),
    checkpointStates: [...document.querySelectorAll('[data-workflow-checkpoint]')].map((node) => node.getAttribute('aria-pressed')),
  }));
  const recommended = ['收集当月数据', '提取变化与异常', '核对来源和口径', '生成汇报初稿', '确定优先级并交付'];
  expect(workflowInitial.steps.join('|') !== recommended.join('|'), 'workflow: initial steps must be deterministically shuffled');
  expect(!/(建议分工|建议.*检查点|已设人工检查点)/.test(workflowInitial.text), 'workflow: initial DOM must not reveal recommended ownership or checkpoints');
  expect(!workflowInitial.movePressed, 'workflow: ordinary up/down buttons must not expose aria-pressed');
  expect(workflowInitial.ownerStates.length >= 15 && workflowInitial.ownerStates.every((value) => value === 'false'), 'workflow: responsibility choices must start unselected');
  expect(workflowInitial.checkpointStates.length >= 10 && workflowInitial.checkpointStates.every((value) => value === 'false'), 'workflow: checkpoint choices must start unselected');
  const firstOwner = page.locator('[data-workflow-owner]').first();
  const firstCheckpoint = page.locator('[data-workflow-checkpoint]').first();
  await firstOwner.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  await firstCheckpoint.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  const stepCheck = page.locator('[data-workflow-check]').first();
  await stepCheck.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('建议'), 'workflow: checking a responsibility/checkpoint choice must reveal a recommendation');
  const correctCheckpoint = page.locator('[data-workflow-checkpoint][data-step-key="3"][data-choice-value="false"]');
  await correctCheckpoint.focus();
  await page.keyboard.press('Enter');
  await stepCheck.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('一致'), 'workflow: responsibility/checkpoint controls must support a correct retry');
  const movable = page.locator('[data-workflow-move]:not(:disabled)').first();
  await movable.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await movable.getAttribute('aria-pressed') === null, 'workflow: move buttons must remain ordinary buttons after activation');
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-workflow-move')), 'workflow: reorder must retain focus on the logical move control');
  for (const key of ['0', '1', '2', '3', '4']) {
    for (;;) {
      const position = await page.locator('.lesson-workflow-step').evaluateAll((nodes, targetKey) => ({
        current: nodes.findIndex((node) => node.getAttribute('data-step-key') === targetKey),
        target: Number(targetKey),
      }), key);
      if (position.current <= position.target) break;
      const up = page.locator(`[data-workflow-move][data-step-key="${key}"][data-choice-value="up"]`);
      await up.focus();
      await page.keyboard.press('Enter');
    }
  }
  const orderCheck = page.locator('[data-workflow-check-order]');
  await orderCheck.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-feedback').textContent()).includes('顺序合理'), 'workflow: sorting must support a correct retry and explanation');
  expect(errors.length === 0, `deep interactions: runtime errors: ${errors.join(' | ')}`);
  await context.close();
}

async function runFreshContextContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/learn.html`, { waitUntil: 'domcontentloaded' });
  const status = await page.locator('#chapter-ai-boundaries .learning-status').textContent();
  expect(status.trim() === '未看', `new browser context must start fresh (${status.trim()})`);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), storageKey) === null, 'new browser context must not inherit session progress');
  await context.close();
}

async function runStorageFaultContract(browser, base, mode) {
  const context = await browser.newContext();
  await context.addInitScript(({ key, fault }) => {
    if (fault === 'invalid-json') {
      sessionStorage.setItem(key, '{not-json');
      return;
    }
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    if (fault === 'get') Storage.prototype.getItem = function (name) {
      if (name === key) throw new Error('learning get blocked');
      return originalGet.call(this, name);
    };
    if (fault === 'set') Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error('learning set blocked');
      return originalSet.call(this, name, value);
    };
  }, { key: storageKey, fault: mode });
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${base}/detail.html?type=learn&id=ai-delegation`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-sort-choice]').first().waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('[data-sort-choice]').first().focus();
  await page.keyboard.press('Enter');
  expect(await page.locator('[data-mark-seen]').isEnabled(), `${mode}: storage failure must not block meaningful interaction`);
  expect(await page.getByRole('link', { name: '下一章' }).isVisible(), `${mode}: links must remain available`);
  await assertNoPageErrors(page, errors, consoleErrors, `storage ${mode}`);
  await context.close();
}

async function runCopyContract(browser, base) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText() { return Promise.reject(new Error('denied')); } },
    });
  });
  const page = await context.newPage();
  for (const id of ['ai-delegation', 'ai-prompting', 'ai-verification', 'ai-workflow']) {
    await page.goto(`${base}/detail.html?type=learn&id=${id}`, { waitUntil: 'domcontentloaded' });
    const copy = page.locator('[data-lesson-copy]');
    expect(await copy.count() === 1, `${id}: chapter takeaway needs one copy action`);
    await copy.focus();
    await page.keyboard.press('Enter');
    const fallback = page.locator('[data-copy-fallback]');
    await fallback.waitFor({ state: 'visible', timeout: 3000 });
    await page.waitForFunction(() => document.querySelector('[data-copy-feedback]')?.textContent.includes('手动复制'));
    expect(await fallback.getAttribute('readonly') !== null, `${id}: copy failure needs readonly manual fallback`);
    expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-copy-fallback')), `${id}: copy fallback must receive focus`);
    expect((await page.locator('[data-copy-feedback]').textContent()).includes('手动复制'), `${id}: copy failure must be announced`);
  }
  await context.close();
}

(async () => {
  let localServer = null;
  let browser = null;
  try {
    let base = suppliedBase;
    if (!base) {
      localServer = await startServer();
      base = localServer.base;
    }
    browser = await chromium.launch({ headless: true });
    await runPrimaryContract(browser, base);
    await runDeepInteractionContract(browser, base);
    await runFreshContextContract(browser, base);
    for (const mode of ['get', 'set', 'invalid-json']) await runStorageFaultContract(browser, base, mode);
    await runCopyContract(browser, base);

    if (failures.length) {
      throw new Error(`Learning browser contract${mutation ? ` [mutation: ${mutation}]` : ''} failed (${failures.length}/${checks})\n- ${failures.join('\n- ')}`);
    }
    console.log(`PASS: learning browser contract (${checks} checks, ${chapters.length * viewports.length} screenshots at ${screenshotRoot})`);
  } finally {
    if (browser) await browser.close();
    if (localServer) await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
