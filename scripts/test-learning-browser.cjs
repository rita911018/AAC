const http = require('node:http');
const { cpSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { extname, join, normalize, resolve } = require('node:path');

let playwright;
try {
  playwright = require('playwright');
} catch {
  const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  playwright = require(resolve(globalModules, 'playwright'));
}

const { chromium } = playwright;
const cliArguments = process.argv.slice(2);
const unknownFlags = cliArguments.filter((argument) => argument.startsWith('--') && argument !== '--self-test');
if (unknownFlags.length) throw new Error(`Unknown option: ${unknownFlags.join(', ')}`);
const selfTestMode = cliArguments.includes('--self-test');
const positionalArguments = cliArguments.filter((argument) => !argument.startsWith('--'));
if (positionalArguments.length > 3) throw new Error('Expected at most base URL, screenshot directory, and mutation');
const siteRoot = resolve(process.env.KB_LEARNING_SITE_ROOT || resolve(__dirname, '../site/knowledge-base'));
const screenshotRoot = resolve(process.env.KB_LEARNING_SCREENSHOT_ROOT || positionalArguments[1] || '/private/tmp/knowledge-base-learning-qa');
const suppliedBase = positionalArguments[0] || '';
const mutation = process.env.KB_LEARNING_MUTATION || positionalArguments[2] || '';
const pathOnlyMode = process.env.KB_LEARNING_PATH_ONLY === '1';
const beginnerOnlyMode = process.env.KB_LEARNING_BEGINNER_ONLY === '1';
const storageKey = 'amersports-ai-beginner-session-v1';
if (!selfTestMode) mkdirSync(screenshotRoot, { recursive: true });

const chapters = [
  { id: 'ai-basics', number: '01', title: 'AI 到底是什么', action: '.lesson-demo-typewriter .lesson-type-candidate' },
  { id: 'ai-boundaries', number: '02', title: '哪些能信，哪些得自己核', action: '.lesson-demo-triage .lesson-triage-choice' },
  { id: 'ai-prompting', number: '03', title: '话怎么说它才懂', action: '[data-prompt-field="目标"]' },
  { id: 'ai-delegation', number: '04', title: '哪些活能交给它', action: '[data-task-index="0"][data-choice-value="人负责"]' },
  { id: 'ai-workflow', number: '05', title: '好用的那次，怎么让它下次还好用', action: '[data-workflow-move]:not(:disabled)' },
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
  [1024, 1000],
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
      } else if (mutation === 'path-missing-chapter' && relative.endsWith('.js')) {
        changed = source.replace(
          "    for (var index = 0; index < chapters.length; index += 1) {\n      var chapter = chapters[index];\n      var item = element(ownerDocument, 'li', 'learning-path-item');",
          "    for (var index = 0; index < chapters.length - 1; index += 1) {\n      var chapter = chapters[index];\n      var item = element(ownerDocument, 'li', 'learning-path-item');",
        );
      } else if (mutation === 'path-order-swap' && relative.endsWith('.js')) {
        changed = source.replace(
          "      var chapter = chapters[index];\n      var item = element(ownerDocument, 'li', 'learning-path-item');",
          "      var chapter = chapters[index === 0 ? 1 : index === 1 ? 0 : index];\n      var item = element(ownerDocument, 'li', 'learning-path-item');",
        );
      } else if (mutation === 'path-current-removed' && relative.endsWith('.js')) {
        changed = source.replace('      if (chapter.id === resolvedId) {', '      if (false && chapter.id === resolvedId) {');
      } else if (mutation === 'path-count-hardcoded' && relative.endsWith('.js')) {
        changed = source.replaceAll('String(seenCount())', "'0'");
      } else if (mutation === 'path-mark-seen-no-refresh' && relative.endsWith('.js')) {
        changed = source.replace('      refreshLearningPaths(layout);', '      // mutation: path refresh removed');
      } else if (mutation === 'path-leaks-routes' && relative.endsWith('.js')) {
        changed = source
          .replace('      renderMovedNotice(container);\n      return true;', "      renderMovedNotice(container);\n      container.appendChild(renderLearningPath(container.ownerDocument, 'ai-basics', false));\n      return true;")
          .replace('    if (!chapter) return renderUnknownNotice(container);', "    if (!chapter) { renderUnknownNotice(container); container.appendChild(renderLearningPath(container.ownerDocument, 'ai-basics', false)); return true; }");
      } else if (mutation === 'path-mobile-not-details' && relative.endsWith('.js')) {
        changed = source.replace("mobile ? 'details' : 'aside'", "mobile ? 'div' : 'aside'");
      } else if (mutation === 'path-desktop-not-sticky' && relative.endsWith('.css')) {
        changed = source.replace('  position: sticky;\n  top: 84px;', '  position: static;\n  top: 84px;');
      } else if (mutation === 'path-sticky-overlaps-topbar' && relative.endsWith('.css')) {
        changed = source.replace('  top: 84px;', '  top: 0;');
      } else if (mutation === 'path-1024-shows-aside' && relative.endsWith('.css')) {
        changed = source + '\n@media (width:1024px){.learning-path-rail{display:block!important}.learning-path-disclosure{display:none!important}}\n';
      } else if (mutation === 'path-summary-below-44' && relative.endsWith('.css')) {
        changed = source + '\n.learning-path-summary{min-height:10px!important;height:10px!important;padding:0!important;line-height:10px!important}\n';
      } else if (mutation === 'path-focus-clipped' && relative.endsWith('.css')) {
        changed = source + '\n.learning-path-disclosure{overflow:hidden!important}.learning-path-disclosure summary:focus-visible,.learning-path-disclosure a:focus-visible{outline-offset:0!important}\n';
      } else if (mutation === 'path-low-contrast' && relative.endsWith('.css')) {
        changed = source + '\n.learning-path-link[aria-current="page"],.learning-path-link[aria-current="page"] .learning-path-number,.learning-path-link[aria-current="page"] .learning-path-current,.learning-path-link[aria-current="page"] .learning-path-status{color:#2f68ed!important}\n';
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
      } else if (mutation === 'beginner-scene-too-few' && relative.endsWith('.js')) {
        changed = source.replace('for (var sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1)', 'for (var sceneIndex = 0; sceneIndex < scenes.length - 1; sceneIndex += 1)');
      } else if (mutation === 'beginner-scene-no-confirm' && relative.endsWith('.js')) {
        changed = source.replace("confirm: '确认事实、行动项和责任人，再决定是否发送。'", "confirm: ''");
      } else if (mutation === 'beginner-scene-keyboard-broken' && relative.endsWith('.js')) {
        changed = source.replace("var sceneButton = element(ownerDocument, 'button', 'lesson-scene-toggle');", "var sceneButton = element(ownerDocument, 'div', 'lesson-scene-toggle');");
      } else if (mutation === 'beginner-old-concept-groups' && relative.endsWith('.js')) {
        changed = source.replace(
          "var nodeButton = interactionButton(ownerDocument, relationshipNode.label, 'data-concept-node', relationshipNode.label);",
          "var nodeButton = interactionButton(ownerDocument, relationshipNode.label, 'data-concept-choice', relationshipNode.label);",
        );
      } else if (mutation === 'beginner-node-too-few' && relative.endsWith('.js')) {
        changed = source.replace('for (var nodeIndex = 0; nodeIndex < exercise.relationshipNodes.length; nodeIndex += 1)', 'for (var nodeIndex = 0; nodeIndex < exercise.relationshipNodes.length - 1; nodeIndex += 1)');
      } else if (mutation === 'beginner-node-wrong-order' && relative.endsWith('.js')) {
        changed = source.replace(
          '}(exercise.relationshipNodes[nodeIndex], nodeIndex));',
          '}(exercise.relationshipNodes[nodeIndex === 0 ? 1 : nodeIndex === 1 ? 0 : nodeIndex], nodeIndex));',
        );
      } else if (mutation === 'beginner-agent-explanation-wrong' && relative.endsWith('.js')) {
        changed = source.replace(
          "{ label: 'Agent', explanation: 'Agent = 模型 + 目标 + 工具 + 执行与检查循环。它不是简单变大的模型。' }",
          "{ label: 'Agent', explanation: 'Agent 只是一个更大的模型。' }",
        );
      } else if (mutation === 'beginner-agent-relation-label-missing' && relative.endsWith('.js')) {
        changed = source.replace('agentRelation.textContent = exercise.relationshipLabels.agent;', "agentRelation.textContent = '';");
      } else if (mutation === 'beginner-linear-concept-map' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-concept-scope,.lesson-agent-branch{display:contents!important}.lesson-concept-nodes{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}.lesson-concept-link,.lesson-agent-connector,.lesson-agent-relation{display:none!important}\n';
      } else if (mutation === 'beginner-concept-labels-narrow' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-concept-scope{grid-template-columns:minmax(0,1fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)!important}.lesson-concept-scope>*{grid-column:auto!important;grid-row:auto!important}\n';
      } else if (mutation === 'beginner-relationship-label-low-contrast' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-concept-link,.lesson-agent-relation{color:#2f68ed!important;background:#edf4ff!important}\n';
      } else if (mutation === 'beginner-duplicate-judgment' && relative.endsWith('.js')) {
        changed = source.replace('conceptMap.appendChild(judgmentFieldset);', 'conceptMap.appendChild(judgmentFieldset); conceptMap.appendChild(judgmentFieldset.cloneNode(true));');
      } else if (mutation === 'beginner-punitive-feedback' && relative.endsWith('.js')) {
        changed = source.replace('这个说法容易混淆能力边界。', '未通过。这个说法容易混淆能力边界。');
      } else if (mutation === 'beginner-boundary-compare-missing' && relative.endsWith('.js')) {
        changed = source.replace(
          'if (Array.isArray(sectionData.compare) && sectionData.choice) appendBoundaryComparison(ownerDocument, section, sectionData);',
          'if (Array.isArray(sectionData.compare) && sectionData.choice) { /* mutation: boundary comparison missing */ }',
        );
      } else if (mutation === 'beginner-boundary-choice-no-explanation' && relative.endsWith('.js')) {
        changed = source.replace('boundaryFeedback.textContent = option.explanation;', "boundaryFeedback.textContent = '';");
      } else if (mutation === 'beginner-dynamic-innerhtml' && relative.endsWith('.js')) {
        changed = source
          .replace("example: '可以和 AI 说：请把这段记录整理为决定、行动项、负责人和待确认事项。'", "example: '<img data-scene-xss src=x>可以和 AI 说'")
          .replace('sceneExample.textContent = scene.example;', 'sceneExample.innerHTML = scene.example;');
      } else if (mutation === 'beginner-mobile-overflow' && relative.endsWith('.css')) {
        changed = source + '\n@media(max-width:560px){.lesson-scene-grid{width:800px!important}}\n';
      } else if (mutation === 'beginner-scene-focus-missing' && relative.endsWith('.css')) {
        changed = source + '\n.lesson-scene-toggle:focus-visible{outline:0!important;outline-offset:0!important}\n';
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
      } else if (mutation === 'prompt-preview-live' && relative.endsWith('.js')) {
        changed = source.replace("    preview.setAttribute('data-prompt-preview', '');", "    preview.setAttribute('data-prompt-preview', '');\n    preview.setAttribute('aria-live', 'polite');");
      } else if (mutation === 'prompt-per-key-announce' && relative.endsWith('.js')) {
        changed = source.replace('      if (!hasAnnouncedInput && hasMeaningfulInput) {', '      if (hasMeaningfulInput) {');
      } else if (mutation === 'workflow-group-role-removed' && relative.endsWith('.js')) {
        changed = source
          .replace("          ownerGroup.setAttribute('role', 'group');\n", '')
          .replace("          checkpointGroup.setAttribute('role', 'group');\n", '');
      } else if (mutation === 'workflow-group-name-removed' && relative.endsWith('.js')) {
        changed = source
          .replace("          ownerGroup.setAttribute('aria-label', step.text + ' · 分工');\n", '')
          .replace("          checkpointGroup.setAttribute('aria-label', step.text + ' · 人工检查点');\n", '');
      } else if (mutation === 'workflow-double-number' && relative.endsWith('.js')) {
        changed = source.replace("copy.appendChild(element(ownerDocument, 'b', '', step.text));", "copy.appendChild(element(ownerDocument, 'b', '', String(currentIndex + 1) + '. ' + step.text));");
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
      '[data-scene-toggle]',
      '[data-concept-node]',
      '[data-concept-judgment]',
      '[data-boundary-choice]',
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
      // 互动区现在有两种：章末练习 .lesson-exercise 和小节演示 .lesson-demo。
      fieldsetCount: document.querySelectorAll('.lesson-exercise fieldset, fieldset.lesson-demo').length,
      legendCount: document.querySelectorAll('.lesson-exercise legend, fieldset.lesson-demo > legend').length,
      // 第 1 章重构后练习嵌进各小节的演示，不再只有一个 .lesson-exercise。
      // 规则改为：每个互动区（章末练习或小节演示）各自恰好一个 polite 区域。
      livePoliteCount: [...document.querySelectorAll('.lesson-exercise, .lesson-demo')]
        .map((zone) => zone.querySelectorAll('[aria-live="polite"]').length)
        .filter((count) => count !== 1).length === 0 ? 1 : 0,
      interactionZoneCount: document.querySelectorAll('.lesson-exercise, .lesson-demo').length,
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
                : document.activeElement?.getAttribute('data-workflow-move') !== null ? 'workflow'
                  // 小节演示里的控件同样算「保住了焦点」
                  : document.activeElement?.closest?.('.lesson-demo') ? 'demo' : ''),
      activeRect: document.activeElement && document.activeElement !== document.body
        ? document.activeElement.getBoundingClientRect().toJSON() : null,
      activeOutlineWidth: document.activeElement && document.activeElement !== document.body
        ? Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth) : 0,
      path: (() => {
        const parseColor = (value) => {
          const channels = value.match(/[\d.]+/g)?.map(Number) || [];
          return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 };
        };
        const luminance = (rgb) => {
          const channels = rgb.map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const effectiveBackground = (node) => {
          for (let currentNode = node; currentNode; currentNode = currentNode.parentElement) {
            const color = parseColor(getComputedStyle(currentNode).backgroundColor);
            if (color.alpha > 0) return color.rgb;
          }
          return [255, 255, 255];
        };
        const contrast = (node, backgroundNode) => {
          if (!node || !backgroundNode) return 0;
          const foreground = luminance(parseColor(getComputedStyle(node).color).rgb);
          const background = luminance(effectiveBackground(backgroundNode));
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        };
        const rail = document.querySelector('.learning-path-rail');
        const disclosure = document.querySelector('.learning-path-disclosure');
        const visiblePath = visible(rail) ? rail : disclosure;
        const links = [...(visiblePath?.querySelectorAll('.learning-path-link') || [])];
        const current = links.filter((link) => link.getAttribute('aria-current') === 'page');
        const currentLink = current[0] || null;
        const nonCurrentLink = links.find((link) => link !== currentLink) || null;
        const railRect = rail?.getBoundingClientRect();
        const topbarRect = document.querySelector('.topbar')?.getBoundingClientRect();
        return {
          railVisible: visible(rail),
          disclosureVisible: visible(disclosure),
          disclosureTag: disclosure?.tagName || '',
          summaryText: disclosure?.querySelector('summary')?.textContent.trim() || '',
          summaryHeight: disclosure?.querySelector('summary')?.getBoundingClientRect().height || 0,
          linkCount: links.length,
          hrefs: links.map((link) => link.getAttribute('href')),
          statuses: links.map((link) => link.querySelector('.learning-path-status')?.textContent.trim() || ''),
          currentCount: current.length,
          currentText: current[0]?.textContent.trim() || '',
          contrasts: {
            currentNumber: contrast(currentLink?.querySelector('.learning-path-number'), currentLink),
            currentName: contrast(currentLink?.querySelector('.learning-path-name'), currentLink),
            currentMarker: contrast(currentLink?.querySelector('.learning-path-current'), currentLink),
            currentStatus: contrast(currentLink?.querySelector('.learning-path-status'), currentLink),
            nonCurrentNumber: contrast(nonCurrentLink?.querySelector('.learning-path-number'), nonCurrentLink),
            nonCurrentStatus: contrast(nonCurrentLink?.querySelector('.learning-path-status'), nonCurrentLink),
          },
          asideLabel: rail?.getAttribute('aria-label') || '',
          railPosition: rail ? getComputedStyle(rail).position : '',
          railTop: railRect?.top || 0,
          topbarBottom: topbarRect?.bottom || 0,
          railWidth: railRect?.width || 0,
        };
      })(),
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
      // sessionStorage 在同一标签页内跨导航保留，前一个视口读过的小节会带到下一轮。
      // 这一段断言的是「全新进入一章」，所以每次都从空状态开始。
      // 第一次迭代时页面还停在 about:blank，没有 origin，此时状态本来就是空的。
      try {
        await page.evaluate((key) => sessionStorage.removeItem(key), storageKey);
      } catch (error) {
        if (!/sessionStorage/.test(String(error))) throw error;
      }
      await page.goto(`${base}/detail.html?type=learn&id=${chapter.id}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.lesson').waitFor();
      let snapshot = await lessonSnapshot(page);
      expect(snapshot.title === chapter.title, `${chapter.id} ${width}px: title mismatch (${snapshot.title})`);
      expect(snapshot.progress === `${chapter.number} / 05`, `${chapter.id} ${width}px: chapter progress mismatch (${snapshot.progress})`);
      // 2026-08-29 起口径变更：打开页面 ≠ 正在看。
      // 旧契约要求一进详情页就写 in-progress，结果目录页六张卡同时亮「正在看」，
      // 却又显示「已看 0 / 6」，两个口径互相打架。现在只有真正读过 2 个小节才升级。
      const enteredState = snapshot.status ? JSON.parse(snapshot.status) : null;
      expect(!enteredState || (enteredState.s || {})[chapter.id] !== 'in-progress',
        `${chapter.id} ${width}px: 仅仅打开章节不应把它标记为正在看`);
      expect(snapshot.rendererTypes.every((type) => type === 'function'), `${chapter.id} ${width}px: all six renderer functions must be exported`);
      expect(snapshot.fieldsetCount >= 1 && snapshot.legendCount >= 1, `${chapter.id} ${width}px: interaction needs semantic fieldset/legend`);
      expect(snapshot.interactionZoneCount >= 1, `${chapter.id} ${width}px: chapter must ship at least one hands-on interaction`);
      expect(snapshot.livePoliteCount === 1, `${chapter.id} ${width}px: every interaction zone must expose exactly one polite live region`);
      expect(snapshot.controls.filter((control) => control.visible && !control.disabled).every((control) => control.height >= 44), `${chapter.id} ${width}px: visible enabled controls must be at least 44px tall`);
      expect(snapshot.lessonTargets.length > 0 && snapshot.lessonTargets.every((target) => target.height >= 44),
        `${chapter.id} ${width}px: every visible lesson target must be at least 44px tall (${snapshot.lessonTargets.filter((target) => target.height < 44).map((target) => `${target.tag}:${target.text}:${target.height}`).join(' | ')})`);
      expect(snapshot.overflow <= 1, `${chapter.id} ${width}px: horizontal overflow ${snapshot.overflow}px`);
      expect(snapshot.badLinks === 0 && snapshot.linkCount >= 2, `${chapter.id} ${width}px: chapter links must remain usable`);
      expect(snapshot.nextVisible || chapter.id === 'ai-workflow', `${chapter.id} ${width}px: next chapter must be visible without a score gate`);
      expect(snapshot.path.linkCount === 5, `${chapter.id} ${width}px: visible path must contain exactly five chapter links`);
      expect(snapshot.path.hrefs.join('|') === chapters.map(({ id }) => `detail.html?type=learn&id=${id}`).join('|'),
        `${chapter.id} ${width}px: path href order must remain canonical`);
      expect(snapshot.path.currentCount === 1 && snapshot.path.currentText.includes('当前'),
        `${chapter.id} ${width}px: current path item must expose aria-current and visible 当前`);
      // 侧栏右侧改为「已读小节 / 总小节」，比「进行中」可量化，也和目录页卡片同口径。
      expect(snapshot.path.statuses.every((status) => /^\d+ \/ \d+$/.test(status)),
        `${chapter.id} ${width}px: path statuses must show a read/total section ratio (${snapshot.path.statuses.join('|')})`);
      for (const [part, ratio] of Object.entries(snapshot.path.contrasts)) {
        expect(ratio >= 4.5, `${chapter.id} ${width}px: ${part} path text contrast must be >=4.5 (${ratio.toFixed(2)})`);
      }
      if (width > 1024) {
        expect(snapshot.path.railVisible && !snapshot.path.disclosureVisible, `${chapter.id} ${width}px: desktop must show only the aside path`);
        expect(snapshot.path.asideLabel === 'AI 新手入门学习路径', `${chapter.id} ${width}px: aside must expose its accessible label`);
        expect(snapshot.path.railPosition === 'sticky', `${chapter.id} ${width}px: desktop path must be sticky`);
        expect(snapshot.path.railWidth >= 240 && snapshot.path.railWidth <= 280, `${chapter.id} ${width}px: desktop rail width must stay 240–280px (${snapshot.path.railWidth})`);
        expect(snapshot.path.railTop >= snapshot.path.topbarBottom - 1, `${chapter.id} ${width}px: sticky rail must start below the topbar`);
      } else {
        expect(!snapshot.path.railVisible && snapshot.path.disclosureVisible, `${chapter.id} ${width}px: mobile/tablet must show only the disclosure path`);
        expect(snapshot.path.disclosureTag === 'DETAILS', `${chapter.id} ${width}px: mobile path must be native details`);
        // 摘要仍是章级计数（看完的章数），侧栏每行是小节级比例，两者刻意不同层级。
        // 已看完的章表现为小节全满，用它来推算章级计数。
        const seenChapterCount = snapshot.path.statuses.filter((status) => {
          const [read, total] = status.split(' / ');
          return Number(total) > 0 && read === total;
        }).length;
        expect(snapshot.path.summaryText === `五章目录 · 本次浏览已看 ${seenChapterCount} / 5`,
          `${chapter.id} ${width}px: disclosure summary must expose exact session count (${snapshot.path.summaryText})`);
        expect(snapshot.path.summaryHeight >= 44, `${chapter.id} ${width}px: disclosure summary must be at least 44px (${snapshot.path.summaryHeight})`);
      }

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
  await page.locator('.lesson-demo-triage .lesson-triage-choice').first().focus();
  await page.keyboard.press('Enter');
  const done = page.locator('[data-mark-seen]');
  if (await done.isEnabled()) {
    await done.click();
    expect(await done.getAttribute('aria-pressed') === 'true', 'mark-seen button must expose pressed state');
    expect((await page.locator('[data-lesson-status]').textContent()).includes('已记为看过'), 'mark-seen must announce the new status');
    expect(await page.locator('.learning-path-disclosure [data-learning-path-count]').textContent() === '1',
      'mark-seen must immediately refresh the mobile path count');
    // 标记看完会补齐该章全部小节，侧栏比例应立刻变成满格（如 7 / 7）。
    const mobileRatio = (await page.locator('.learning-path-disclosure .learning-path-link[aria-current="page"] .learning-path-status').textContent()).trim();
    const [mobileRead, mobileTotal] = mobileRatio.split(' / ');
    expect(Number(mobileTotal) > 0 && mobileRead === mobileTotal,
      `mark-seen must fill the mobile current chapter ratio (${mobileRatio})`);
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

async function runPathRouteAndStateContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  const summary = page.locator('.learning-path-disclosure > summary');
  await summary.focus();
  expect(await summary.evaluate((node) => Number.parseFloat(getComputedStyle(node).outlineWidth) >= 3 && Number.parseFloat(getComputedStyle(node).outlineOffset) >= 3),
    'mobile summary focus ring must be at least 3px and remain outside the control boundary');
  await page.keyboard.press('Enter');
  expect(await page.locator('.learning-path-disclosure').getAttribute('open') !== null,
    'mobile summary must open the native details with Enter');
  expect(await page.evaluate(() => document.activeElement?.matches('.learning-path-disclosure > summary')),
    'opening mobile disclosure must retain keyboard focus on summary');
  expect(await page.locator('.learning-path-disclosure .learning-path-link').evaluateAll((links) => links.every((link) => link.getBoundingClientRect().height >= 44)),
    'every mobile path link must be at least 44px high');
  const firstPathLink = page.locator('.learning-path-disclosure .learning-path-link').first();
  await firstPathLink.focus();
  expect(await firstPathLink.evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return Number.parseFloat(style.outlineWidth) >= 3 && Number.parseFloat(style.outlineOffset) >= 3 && rect.left >= 3 && rect.right <= innerWidth - 3;
  }), 'mobile path link focus ring must be high contrast and not clipped horizontally');

  for (const route of [
    'detail.html?type=learn&id=ai-models',
    'detail.html?type=learn&id=unknown',
    'detail.html?type=learn&id=%E0%A4%A',
    'detail.html?type=resources&id=tools',
  ]) {
    await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' });
    expect(await page.locator('.learning-path-rail,.learning-path-disclosure').count() === 0,
      `${route}: non-canonical learning route must not expose the learning path`);
  }

  for (const [name, state, count] of [
    ['fresh', null, 0],
    ['partial', { 'ai-basics': 'seen', 'ai-boundaries': 'seen', 'ai-workflow': 'in-progress' }, 2],
    ['complete', Object.fromEntries(chapters.map(({ id }) => [id, 'seen'])), chapters.length],
  ]) {
    await context.clearCookies();
    await page.goto(`${base}/learn.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => {
      sessionStorage.clear();
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
    }, { key: storageKey, value: state });
    await page.goto(`${base}/detail.html?type=learn&id=ai-workflow`, { waitUntil: 'domcontentloaded' });
    expect((await page.locator('.learning-path-disclosure > summary').textContent()).trim() === `五章目录 · 本次浏览已看 ${count} / 5`,
      `${name}: learning path must render exact ${count} / 5 count`);
  }
  await context.close();
}

async function runDesktopPathGeometryContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const width of [1440, 1236, 1025]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => scrollTo(0, 700));
    await page.waitForTimeout(30);
    const geometry = await page.evaluate(() => {
      const rail = document.querySelector('.learning-path-rail');
      const topbar = document.querySelector('.topbar');
      const railRect = rail.getBoundingClientRect();
      return {
        visible: getComputedStyle(rail).display !== 'none',
        position: getComputedStyle(rail).position,
        width: railRect.width,
        top: railRect.top,
        topbarBottom: topbar.getBoundingClientRect().bottom,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(geometry.visible && geometry.position === 'sticky', `${width}px: desktop rail must stay visible and sticky after scrolling`);
    expect(geometry.width >= 240 && geometry.width <= 280, `${width}px: desktop rail must stay 240–280px after scrolling (${geometry.width})`);
    expect(geometry.top >= geometry.topbarBottom - 1, `${width}px: sticky rail must not sit beneath the topbar (${geometry.top} < ${geometry.topbarBottom})`);
    expect(geometry.overflow <= 1, `${width}px: desktop path layout must not overflow horizontally (${geometry.overflow})`);
  }
  await context.close();
}

async function runPathFocusedContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const canonicalHrefs = chapters.map(({ id }) => `detail.html?type=learn&id=${id}`).join('|');

  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  let snapshot = await lessonSnapshot(page);
  const contrastEvidence = { desktop1440: snapshot.path.contrasts };
  expect(snapshot.path.linkCount === 5, `focused desktop: visible path must contain exactly five chapter links (${snapshot.path.linkCount})`);
  expect(snapshot.path.hrefs.join('|') === canonicalHrefs, 'focused desktop: path href order must remain canonical');
  expect(snapshot.path.currentCount === 1 && snapshot.path.currentText.includes('当前'),
    `focused desktop: current item must expose aria-current and visible 当前 (${snapshot.path.currentCount})`);
  expect(snapshot.path.railVisible && !snapshot.path.disclosureVisible, 'focused desktop: desktop must show only the aside path');
  expect(snapshot.path.railPosition === 'sticky', `focused desktop: desktop path must be sticky (${snapshot.path.railPosition})`);
  for (const [part, ratio] of Object.entries(snapshot.path.contrasts)) {
    expect(ratio >= 4.5, `focused desktop: ${part} path text contrast must be >=4.5 (${ratio.toFixed(2)})`);
  }
  await page.evaluate(() => scrollTo(0, 700));
  await page.waitForTimeout(30);
  const stickyGeometry = await page.evaluate(() => {
    const rail = document.querySelector('.learning-path-rail').getBoundingClientRect();
    const topbar = document.querySelector('.topbar').getBoundingClientRect();
    return { top: rail.top, topbarBottom: topbar.bottom };
  });
  expect(stickyGeometry.top >= stickyGeometry.topbarBottom - 1,
    `focused desktop: sticky rail must not sit beneath the topbar (${stickyGeometry.top} < ${stickyGeometry.topbarBottom})`);

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  snapshot = await lessonSnapshot(page);
  contrastEvidence.mobile1024 = snapshot.path.contrasts;
  expect(snapshot.path.linkCount === 5, `focused mobile: visible path must contain exactly five chapter links (${snapshot.path.linkCount})`);
  expect(snapshot.path.hrefs.join('|') === canonicalHrefs, 'focused mobile: path href order must remain canonical');
  expect(snapshot.path.currentCount === 1 && snapshot.path.currentText.includes('当前'),
    `focused mobile: current item must expose aria-current and visible 当前 (${snapshot.path.currentCount})`);
  expect(!snapshot.path.railVisible && snapshot.path.disclosureVisible, 'focused mobile: mobile/tablet must show only the disclosure path');
  expect(snapshot.path.disclosureTag === 'DETAILS', `focused mobile: mobile path must be native details (${snapshot.path.disclosureTag})`);
  expect(snapshot.path.summaryHeight >= 44, `focused mobile: disclosure summary must be at least 44px (${snapshot.path.summaryHeight})`);
  for (const [part, ratio] of Object.entries(snapshot.path.contrasts)) {
    expect(ratio >= 4.5, `focused mobile: ${part} path text contrast must be >=4.5 (${ratio.toFixed(2)})`);
  }
  const focusEvidence = await page.evaluate(() => {
    const details = document.querySelector('.learning-path-disclosure');
    const summary = details?.querySelector('summary');
    if (details?.tagName === 'DETAILS') details.open = true;
    summary?.focus();
    const summaryOffset = Number.parseFloat(summary ? getComputedStyle(summary).outlineOffset : '0');
    const link = details?.querySelector('.learning-path-link');
    link?.focus();
    const linkOffset = Number.parseFloat(link ? getComputedStyle(link).outlineOffset : '0');
    return {
      summaryOffset,
      linkOffset,
    };
  });
  expect(focusEvidence.summaryOffset >= 3 && focusEvidence.linkOffset >= 3,
    `focused mobile: path focus rings must not be clipped (${focusEvidence.summaryOffset}/${focusEvidence.linkOffset})`);

  await page.evaluate((key) => sessionStorage.setItem(key, JSON.stringify({
    'ai-basics': 'seen',
    'ai-boundaries': 'seen',
    'ai-workflow': 'in-progress',
  })), storageKey);
  await page.goto(`${base}/detail.html?type=learn&id=ai-workflow`, { waitUntil: 'domcontentloaded' });
  expect((await page.locator('.learning-path-disclosure > summary').textContent()).trim() === '五章目录 · 本次浏览已看 2 / 5',
    'focused state: partial path count must be 2 / 5');

  await page.evaluate((key) => sessionStorage.removeItem(key), storageKey);
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-token-option]').first().click();
  await page.locator('[data-mark-seen]').click();
  const refreshed = await page.evaluate(() => ({
    counts: [...document.querySelectorAll('[data-learning-path-count]')].map((node) => node.textContent),
    currentStatuses: [...document.querySelectorAll('.learning-path-link[aria-current="page"] .learning-path-status')].map((node) => node.textContent),
  }));
  expect(refreshed.counts.length === 2 && refreshed.counts.every((value) => value === '1'),
    `focused state: markSeen must immediately refresh both path counts (${refreshed.counts.join('|')})`);
  expect(refreshed.currentStatuses.length === 2 && refreshed.currentStatuses.every((value) => {
    const [read, total] = value.trim().split(' / ');
    return Number(total) > 0 && read === total;
  }), `focused state: markSeen must immediately fill both current section ratios (${refreshed.currentStatuses.join('|')})`);

  for (const route of ['ai-models', 'unknown', '%E0%A4%A']) {
    await page.goto(`${base}/detail.html?type=learn&id=${route}`, { waitUntil: 'domcontentloaded' });
    const pathCount = await page.locator('.learning-path-rail,.learning-path-disclosure').count();
    expect(pathCount === 0, `focused route ${route}: non-canonical learning route must not expose the learning path (${pathCount})`);
  }
  if (!mutation) console.log(`PATH CONTRAST: ${JSON.stringify(contrastEvidence)}`);
  await context.close();
}

async function runBeginnerInteractionContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  for (const width of [1440, 1024, 560, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
    const basicsStructure = await page.evaluate(() => {
      const isVisible = (node) => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const parseColor = (value) => {
        const channels = value.match(/[\d.]+/g)?.map(Number) || [];
        return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 };
      };
      const luminance = (rgb) => {
        const channels = rgb.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const effectiveBackground = (node) => {
        for (let currentNode = node; currentNode; currentNode = currentNode.parentElement) {
          const color = parseColor(getComputedStyle(currentNode).backgroundColor);
          if (color.alpha > 0) return color.rgb;
        }
        return [255, 255, 255];
      };
      const textContrast = (node) => {
        if (!node) return 0;
        const foreground = luminance(parseColor(getComputedStyle(node).color).rgb);
        const background = luminance(effectiveBackground(node));
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      };
      const scopeNodes = [...document.querySelectorAll('[data-concept-node]')].slice(0, 3);
      const agentNode = document.querySelector('[data-concept-node][data-choice-value="Agent"]');
      const agentBranch = document.querySelector('[data-agent-branch]');
      const relationshipLabels = [...document.querySelectorAll('[data-concept-link],[data-agent-relation]')];
      return {
      sceneCount: document.querySelectorAll('[data-scene-toggle]').length,
      sceneTags: [...document.querySelectorAll('[data-scene-toggle]')].map((node) => node.tagName),
      sceneTitles: [...document.querySelectorAll('[data-scene-toggle] .lesson-scene-title')].map((node) => node.textContent.trim()),
      sceneTargets: [...document.querySelectorAll('[data-scene-toggle]')].map((node) => node.getBoundingClientRect().height),
      sceneCards: [...document.querySelectorAll('[data-scene-card]')].map((card) => ({
        text: card.textContent,
        controls: card.querySelector('[data-scene-toggle]')?.getAttribute('aria-controls') || '',
        panelId: card.querySelector('[data-scene-panel]')?.id || '',
        confirm: card.querySelectorAll('dd')[2]?.textContent.trim() || '',
      })),
      conceptLabels: [...document.querySelectorAll('[data-concept-node]')].map((node) => node.textContent.trim()),
      scopeTrackCount: document.querySelectorAll('[data-concept-scope]').length,
      agentBranchCount: document.querySelectorAll('[data-agent-branch]').length,
      scopeLinkTexts: [...document.querySelectorAll('[data-concept-link]')].map((node) => node.textContent.trim()),
      agentRelationText: document.querySelector('[data-agent-relation]')?.textContent.trim() || '',
      visibleRelationshipLabels: [...document.querySelectorAll('[data-concept-link],[data-agent-relation]')].filter(isVisible).length,
      relationshipLabelMetrics: relationshipLabels.map((node) => {
        const rect = node.getBoundingClientRect();
        const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight) || 0;
        return {
          kind: node.getAttribute('data-concept-link') || 'agent',
          width: rect.width,
          lineHeight,
          lineCount: lineHeight > 0 ? rect.height / lineHeight : 99,
          contrast: textContrast(node),
        };
      }),
      scopeBottom: Math.max(0, ...scopeNodes.map((node) => node.getBoundingClientRect().bottom)),
      agentTop: agentNode?.getBoundingClientRect().top || 0,
      agentBorderStyle: agentBranch ? getComputedStyle(agentBranch).borderTopStyle : '',
      oldConceptChoices: document.querySelectorAll('[data-concept-choice]').length,
      judgmentGroups: document.querySelectorAll('[data-concept-judgment-group]').length,
      judgmentChoices: document.querySelectorAll('[data-concept-judgment]').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      bodyCopySize: Number.parseFloat(getComputedStyle(document.querySelector('.lesson-core-section p')).fontSize),
      injectedSceneHtml: document.querySelectorAll('[data-scene-xss]').length,
      };
    });
    expect(basicsStructure.sceneCount === 4, `basics ${width}px: capability section must expose exactly four scenes (${basicsStructure.sceneCount})`);
    expect(basicsStructure.sceneTags.every((tag) => tag === 'BUTTON'), `basics ${width}px: every scene disclosure must be a real button`);
    expect(basicsStructure.sceneTitles.join('|') === '会议录音变纪要|同一份材料，换个人讲|一个想法写成稿|重复的活先打个底',
      `basics ${width}px: scene titles must keep the approved stable order (${basicsStructure.sceneTitles.join('|')})`);
    expect(basicsStructure.sceneCards.every(({ text, controls, panelId, confirm }) =>
      text.includes('你给它什么') && text.includes('它帮你做到哪一步') && text.includes('你必须自己检查什么') && text.includes('可以和 AI 说') && confirm && controls && controls === panelId),
    `basics ${width}px: every scene must connect its disclosure to input / AI / human / example copy`);
    expect(basicsStructure.sceneTargets.every((height) => height >= 44), `basics ${width}px: every scene target must be at least 44px`);
    // 关系图（AI → 生成式 AI → 大模型 + Agent 外接分支）已随第 1 章重构删除：
    // 它在解释术语关系，不是在回答「AI 到底是什么」。相关断言一并移除。
    expect(basicsStructure.overflow <= 1, `basics ${width}px: capability and relationship layout must not overflow (${basicsStructure.overflow}px)`);
    expect(basicsStructure.bodyCopySize >= 15, `basics ${width}px: core body copy must stay readable (>=15px)`);
    expect(basicsStructure.injectedSceneHtml === 0, `basics ${width}px: dynamic scene copy must never create HTML nodes`);

    const firstScene = page.locator('[data-scene-toggle]').first();
    await firstScene.focus();
    expect(await firstScene.evaluate((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return Number.parseFloat(style.outlineWidth) >= 3 && Number.parseFloat(style.outlineOffset) >= 3 && rect.left >= 3 && rect.right <= innerWidth - 3;
    }), `basics ${width}px: scene focus ring must be >=3px, outside, and unclipped`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  const done = page.locator('[data-mark-seen]');
  const availableScenes = Math.min(4, await page.locator('[data-scene-toggle]').count());
  const scenesAreNativeButtons = await page.locator('[data-scene-toggle]').evaluateAll((items) => items.every((item) => item.tagName === 'BUTTON'));
  for (let index = 0; scenesAreNativeButtons && index < availableScenes; index += 1) {
    const scene = page.locator('[data-scene-toggle]').nth(index);
    // 第一张卡默认展开（读者不用先点一下才知道里面长什么样），
    // 已经展开的就跳过切换，直接验证面板可见。
    if (await scene.getAttribute('aria-expanded') !== 'true') {
      if (index % 2 === 0) await scene.click();
      else {
        await scene.focus();
        await page.keyboard.press('Enter');
      }
    }
    expect(await scene.getAttribute('aria-expanded') === 'true', `basics: scene ${index + 1} must expand by ${index % 2 === 0 ? 'mouse' : 'keyboard'}`);
    const panelId = await scene.getAttribute('aria-controls');
    expect(panelId && await page.locator(`#${panelId}`).isVisible(), `basics: scene ${index + 1} must reveal its controlled example panel`);
  }
  expect(await done.isEnabled(), 'basics: 我看完了 must never be gated behind an interaction');

  // 第 1 章重构后：关系图和 token 练习已删除，四个小节各自带一个演示。
  // 玩过任意一个演示就算「动手过了」，可以确认看完。
  const typewriterOption = page.locator('.lesson-demo-typewriter .lesson-type-candidate').first();
  await typewriterOption.focus();
  await page.keyboard.press('Enter');
  expect((await page.locator('.lesson-demo-typewriter .lesson-type-text').textContent()).trim() !== '',
    'basics: picking a candidate word must append it to the generated sentence');
  expect(await done.isEnabled(), 'basics: one demo interaction must enable 我看完了 without a score gate');

  const contextDemo = page.locator('.lesson-demo-context');
  const capacity = Number(await contextDemo.locator('.lesson-context-desk').getAttribute('data-capacity'));
  const addTurn = contextDemo.locator('.lesson-demo-action');
  for (let index = 0; index < capacity + 2; index += 1) await addTurn.click();
  expect(await contextDemo.locator('.lesson-context-card[data-state="forgotten"]').count() >= 1,
    'basics: overflowing the context window must visibly drop the earliest turns');
  expect((await contextDemo.locator('.lesson-context-verdict').textContent()).trim().length >= 8,
    'basics: dropping a turn must explain what breaks because of it');
  await contextDemo.locator('.lesson-demo-chip').click();
  expect(await contextDemo.locator('.lesson-context-card').count() === 0,
    'basics: starting a new conversation must clear the desk');

  const shiftDemo = page.locator('.lesson-demo-shift');
  expect(await shiftDemo.locator('.lesson-shift-card').count() === 2,
    'basics: the software-shift demo must contrast exactly two ways of doing the same task');


  for (const width of [1440, 1024, 560, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`${base}/detail.html?type=learn&id=ai-boundaries`, { waitUntil: 'domcontentloaded' });
    const boundary = await page.evaluate(() => ({
      titleCount: [...document.querySelectorAll('.lesson-core-section h2')].filter((node) => node.textContent.trim() === '它不是搜索引擎').length,
      roles: [...document.querySelectorAll('[data-boundary-role]')].map((node) => node.getAttribute('data-boundary-role')),
      choices: [...document.querySelectorAll('[data-boundary-choice]')].map((node) => node.getAttribute('data-choice-value')),
      targetHeights: [...document.querySelectorAll('[data-boundary-choice]')].map((node) => node.getBoundingClientRect().height),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    expect(boundary.titleCount === 1, `boundaries ${width}px: comparison section must appear exactly once`);
    expect(boundary.roles.join('|') === '找搜索|找 AI|两个都用', `boundaries ${width}px: compare roles must be 找搜索 / 找 AI / 两个都用 (${boundary.roles.join('|')})`);
    expect(boundary.choices.join('|') === '找搜索|找 AI|两个都用', `boundaries ${width}px: lightweight choice must offer 找搜索 / 找 AI / 两个都用`);
    expect(boundary.targetHeights.every((height) => height >= 44), `boundaries ${width}px: choice targets must be at least 44px`);
    expect(boundary.overflow <= 1, `boundaries ${width}px: comparison must not overflow (${boundary.overflow}px)`);
  }
  const boundaryValues = await page.locator('[data-boundary-choice]').evaluateAll((items) => items.map((item) => item.getAttribute('data-choice-value')));
  for (const value of boundaryValues) {
    const choice = page.locator(`[data-boundary-choice][data-choice-value="${value}"]`);
    await choice.focus();
    await page.keyboard.press('Enter');
    expect(await choice.getAttribute('aria-pressed') === 'true', `boundaries: ${value} choice must expose selected state`);
    expect((await page.locator('[data-boundary-feedback]').textContent()).trim().length >= 8,
      `boundaries: ${value} choice must immediately explain the decision`);
  }
  if (await page.locator('[data-boundary-feedback]').count()) {
    expect(!/(未通过|不及格|评分|扣分)/.test(await page.locator('[data-boundary-feedback]').textContent()),
      'boundaries: lightweight choice must not use assessment language');
  }
  await assertNoPageErrors(page, errors, consoleErrors, 'beginner capability, relationship, and boundary interactions');
  await context.close();
}

async function runDeepInteractionContract(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // 第 1 章的五步 model-flow 已随重构删除。现在验证打字机演示的键盘可达性：
  // 用键盘选词、能看见句子增长、能看到概率条。
  await page.goto(`${base}/detail.html?type=learn&id=ai-basics`, { waitUntil: 'domcontentloaded' });
  const candidates = page.locator('.lesson-demo-typewriter .lesson-type-candidate');
  expect(await candidates.count() === 3, 'basics: each generation step must offer three candidate words');
  const firstCandidate = candidates.first();
  const pickedWord = (await firstCandidate.locator('.lesson-type-word').textContent()).trim();
  await firstCandidate.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  const generated = (await page.locator('.lesson-demo-typewriter .lesson-type-text').textContent()).trim();
  expect(generated.includes(pickedWord), 'basics: the word picked by keyboard must appear in the generated sentence');
  expect(await page.locator('.lesson-demo-typewriter .lesson-type-bar').count() >= 1,
    'basics: every candidate must show its probability so learners see it is guessing');

  await page.goto(`${base}/detail.html?type=learn&id=ai-prompting`, { waitUntil: 'domcontentloaded' });
  const promptSemantics = await page.evaluate(() => ({
    liveCount: document.querySelectorAll('.lesson-exercise [aria-live="polite"]').length,
    previewLive: document.querySelector('[data-prompt-preview]')?.hasAttribute('aria-live'),
  }));
  expect(promptSemantics.liveCount === 1, `prompting: exercise must have one live region (${promptSemantics.liveCount})`);
  expect(promptSemantics.previewLive === false, 'prompting: the continuously changing preview must not be a live region');
  await page.evaluate(() => {
    window.__promptFeedbackMutations = 0;
    const feedback = document.querySelector('.lesson-feedback');
    window.__promptFeedbackObserver = new MutationObserver((records) => {
      window.__promptFeedbackMutations += records.length;
    });
    window.__promptFeedbackObserver.observe(feedback, { childList: true, characterData: true, subtree: true });
  });
  const promptInput = page.locator('[data-prompt-field="目标"]');
  await promptInput.focus();
  await page.keyboard.type('ABC');
  await page.waitForTimeout(40);
  const promptInputResult = await page.evaluate(() => ({
    feedbackMutations: window.__promptFeedbackMutations,
    preview: document.querySelector('[data-prompt-preview]')?.textContent || '',
    doneDisabled: document.querySelector('[data-mark-seen]')?.disabled,
    inputFocused: document.activeElement?.getAttribute('data-prompt-field') === '目标',
  }));
  expect(promptInputResult.feedbackMutations === 1, `prompting: first meaningful input must announce once, not on every keystroke (${promptInputResult.feedbackMutations})`);
  expect(promptInputResult.preview.includes('ABC'), 'prompting: preview must still update on every input');
  expect(promptInputResult.doneDisabled === false, 'prompting: first meaningful input must enable completion');
  expect(promptInputResult.inputFocused, 'prompting: live preview updates must retain keyboard focus');
  await promptInput.fill('');
  await page.keyboard.type('D');
  expect(await page.locator('[data-mark-seen]').isEnabled(), 'prompting: clearing and retyping must not revoke completion');

  // 原第 4 章「验证结果」已并入第 2 章。章末的 evidence-check 练习拆成了
  // 两个小节演示：三句话判断（triage）和两版对照（version pick）。
  await page.goto(`${base}/detail.html?type=learn&id=ai-boundaries`, { waitUntil: 'domcontentloaded' });
  const triageChoices = page.locator('.lesson-demo-triage .lesson-triage-choice');
  expect(await triageChoices.count() === 9, 'boundaries: three claims must each offer the three review states');
  const firstTriage = triageChoices.first();
  await firstTriage.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await firstTriage.getAttribute('aria-pressed') === 'true', 'boundaries: triage choice must expose selected state');
  const triageFeedback = page.locator('.lesson-demo-triage .lesson-triage-feedback:visible').first();
  expect((await triageFeedback.textContent()).trim().length >= 8, 'boundaries: every triage choice must explain itself');
  expect(!/(未通过|不及格|评分|扣分)/.test(await triageFeedback.textContent()), 'boundaries: triage feedback must stay non-punitive');

  const versionCards = page.locator('.lesson-demo-versions .lesson-version-card');
  expect(await versionCards.count() === 2, 'boundaries: two answer versions must be available for comparison');
  const firstVersion = versionCards.first();
  await firstVersion.focus({ timeout: 3000 });
  await page.keyboard.press('Enter');
  expect(await firstVersion.getAttribute('aria-pressed') === 'true', 'boundaries: version choice must expose selected state');
  expect((await page.locator('.lesson-demo-versions .lesson-version-verdict:visible').first().textContent()).trim().length >= 8,
    'boundaries: version comparison must explain usability');


  await page.goto(`${base}/detail.html?type=learn&id=ai-workflow`, { waitUntil: 'domcontentloaded' });
  const workflowInitial = await page.evaluate(() => ({
    steps: [...document.querySelectorAll('.lesson-workflow-step .lesson-workflow-copy b')].map((node) => node.textContent),
    hasManualPrefix: [...document.querySelectorAll('.lesson-workflow-step .lesson-workflow-copy b')].some((node) => /^\d+\.\s*/.test(node.textContent)),
    listStyleType: getComputedStyle(document.querySelector('.lesson-workflow-list')).listStyleType,
    text: document.querySelector('.lesson-workflow-list')?.innerText || '',
    movePressed: [...document.querySelectorAll('[data-workflow-move]')].some((node) => node.hasAttribute('aria-pressed')),
    ownerStates: [...document.querySelectorAll('[data-workflow-owner]')].map((node) => node.getAttribute('aria-pressed')),
    checkpointStates: [...document.querySelectorAll('[data-workflow-checkpoint]')].map((node) => node.getAttribute('aria-pressed')),
    ownerGroups: [...document.querySelectorAll('.lesson-workflow-owner')].map((group) => ({
      role: group.getAttribute('role'),
      name: group.getAttribute('aria-label') || '',
      buttons: [...group.querySelectorAll('[data-workflow-owner]')].map((button) => button.getAttribute('aria-label') || ''),
    })),
    checkpointGroups: [...document.querySelectorAll('.lesson-workflow-checkpoints')].map((group) => ({
      role: group.getAttribute('role'),
      name: group.getAttribute('aria-label') || '',
      buttons: [...group.querySelectorAll('[data-workflow-checkpoint]')].map((button) => button.getAttribute('aria-label') || ''),
    })),
  }));
  const recommended = ['收集当月数据', '提取变化与异常', '核对来源和口径', '生成汇报初稿', '确定优先级并交付'];
  expect(workflowInitial.steps.join('|') !== recommended.join('|'), 'workflow: initial steps must be deterministically shuffled');
  expect(!/(建议分工|建议.*检查点|已设人工检查点)/.test(workflowInitial.text), 'workflow: initial DOM must not reveal recommended ownership or checkpoints');
  expect(!workflowInitial.movePressed, 'workflow: ordinary up/down buttons must not expose aria-pressed');
  expect(workflowInitial.ownerStates.length === 15 && workflowInitial.ownerStates.every((value) => value === 'false'), 'workflow: responsibility choices must start with exactly 15 unselected buttons');
  expect(workflowInitial.checkpointStates.length === 10 && workflowInitial.checkpointStates.every((value) => value === 'false'), 'workflow: checkpoint choices must start with exactly 10 unselected buttons');
  expect(workflowInitial.listStyleType !== 'none', 'workflow: ordered list must retain its native marker');
  expect(!workflowInitial.hasManualPrefix, 'workflow: step copy must not duplicate the native ordered-list number');
  expect(workflowInitial.ownerGroups.length === 5 && workflowInitial.ownerGroups.every((group) => group.role === 'group' && group.name.includes('分工') && group.buttons.length === 3),
    'workflow: each step needs a named responsibility group containing three buttons');
  expect(workflowInitial.checkpointGroups.length === 5 && workflowInitial.checkpointGroups.every((group) => group.role === 'group' && group.name.includes('人工检查点') && group.buttons.length === 2),
    'workflow: each step needs a named checkpoint group containing two buttons');
  expect(new Set(workflowInitial.ownerGroups.map((group) => group.name)).size === 5 && new Set(workflowInitial.checkpointGroups.map((group) => group.name)).size === 5,
    'workflow: all responsibility and checkpoint group names must be unique by step');
  expect(workflowInitial.ownerGroups.every((group) => group.buttons.every((name) => name.includes(group.name.split('分工')[0]))) &&
    workflowInitial.checkpointGroups.every((group) => group.buttons.every((name) => name.includes(group.name.split('人工检查点')[0]))),
  'workflow: every choice button accessible name must include its step context');
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
  await page.setViewportSize({ width: 1024, height: 900 });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${base}/detail.html?type=learn&id=ai-delegation`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-sort-choice]').first().waitFor({ state: 'visible', timeout: 3000 });
  expect(await page.locator('.learning-path-disclosure').isVisible(), `${mode}: storage failure must not hide the mobile path`);
  expect((await page.locator('.learning-path-disclosure > summary').textContent()).includes(`/ ${chapters.length}`), `${mode}: storage failure must preserve a valid path count`);
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
  for (const id of ['ai-delegation', 'ai-prompting', 'ai-boundaries', 'ai-workflow']) {
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

const pathSelfTestMutations = [
  ['path-missing-chapter', 'visible path must contain exactly five chapter links'],
  ['path-order-swap', 'path href order must remain canonical'],
  ['path-current-removed', 'current item must expose aria-current and visible 当前'],
  ['path-count-hardcoded', 'partial path count must be 2 / 5'],
  ['path-mark-seen-no-refresh', 'markSeen must immediately refresh both path counts'],
  ['path-leaks-routes', 'non-canonical learning route must not expose the learning path'],
  ['path-mobile-not-details', 'mobile path must be native details'],
  ['path-desktop-not-sticky', 'desktop path must be sticky'],
  ['path-sticky-overlaps-topbar', 'sticky rail must not sit beneath the topbar'],
  ['path-1024-shows-aside', 'mobile/tablet must show only the disclosure path'],
  ['path-summary-below-44', 'disclosure summary must be at least 44px'],
  ['path-focus-clipped', 'path focus rings must not be clipped'],
  ['path-low-contrast', 'currentNumber path text contrast must be >=4.5'],
];

const beginnerSelfTestMutations = [
  ['beginner-scene-too-few', 'capability section must expose exactly four scenes'],
  ['beginner-scene-no-confirm', 'every scene must connect its disclosure to input / AI / human / example copy'],
  ['beginner-scene-keyboard-broken', 'every scene disclosure must be a real button'],
  ['done-score-gate', 'first relationship-node attempt must enable 我看完了 without a score gate'],
  ['beginner-punitive-feedback', 'wrong Agent judgment feedback must stay non-punitive'],
  ['beginner-boundary-compare-missing', 'compare roles must be 找搜索 / 找 AI / 两个都用'],
  ['beginner-boundary-choice-no-explanation', 'choice must immediately explain the decision'],
  ['beginner-dynamic-innerhtml', 'dynamic scene copy must never create HTML nodes'],
  ['beginner-mobile-overflow', 'capability and relationship layout must not overflow'],
  ['beginner-scene-focus-missing', 'scene focus ring must be >=3px, outside, and unclipped'],
  ['target-below-44', 'every scene target must be at least 44px'],
];

function runSelfTestChild(environment, timeoutMs, readinessMarker = '') {
  return new Promise((resolveChild) => {
    const child = spawn(process.execPath, [__filename], {
      cwd: __dirname,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let timeoutTimer = null;
    let startupTimer = null;
    let forcedKillTimer = null;
    let timeoutArmed = false;
    const armTimeout = () => {
      if (timeoutArmed || settled) return;
      timeoutArmed = true;
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        forcedKillTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      }, timeoutMs);
    };
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (readinessMarker && stdout.includes(readinessMarker)) {
        clearTimeout(startupTimer);
        armTimeout();
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    if (readinessMarker) {
      startupTimer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, 15000);
    } else {
      armTimeout();
    }
    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      clearTimeout(startupTimer);
      clearTimeout(forcedKillTimer);
      resolveChild({ stdout, stderr, timedOut, ...result });
    }
    child.once('error', (error) => finish({ code: null, signal: null, error }));
    child.once('close', (code, signal) => finish({ code, signal, error: null }));
  });
}

async function runBrowserSelfTest() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'learning-path-browser-self-test-'));
  const temporarySite = join(temporaryRoot, 'site');
  const temporaryScreenshots = join(temporaryRoot, 'screenshots');
  try {
    cpSync(siteRoot, temporarySite, { recursive: true });
    mkdirSync(temporaryScreenshots, { recursive: true });
    const sharedEnvironment = {
      KB_LEARNING_SITE_ROOT: temporarySite,
      KB_LEARNING_SCREENSHOT_ROOT: temporaryScreenshots,
      KB_LEARNING_PATH_ONLY: '1',
      KB_LEARNING_BEGINNER_ONLY: '0',
      KB_LEARNING_MUTATION: '',
      KB_LEARNING_SELF_TEST_CRASH: '',
      KB_LEARNING_SELF_TEST_HANG: '',
    };

    const pathChildTimeoutMs = 35000;
    const beginnerChildTimeoutMs = 45000;
    const baseline = await runSelfTestChild(sharedEnvironment, pathChildTimeoutMs);
    if (baseline.error || baseline.timedOut || baseline.code !== 0) {
      throw new Error(`path browser baseline must be GREEN\n${baseline.stdout}\n${baseline.stderr}`);
    }
    console.log('GREEN path browser baseline: desktop 1440 + mobile 1024');
    const contrastLine = baseline.stdout.split(/\r?\n/).find((line) => line.startsWith('PATH CONTRAST:'));
    if (!contrastLine) throw new Error(`path browser baseline must report computed contrast evidence\n${baseline.stdout}`);
    console.log(contrastLine);

    const childError = await runSelfTestChild({ ...sharedEnvironment, KB_LEARNING_SELF_TEST_CRASH: '1' }, 5000);
    if (childError.timedOut || childError.code === 0 || !`${childError.stdout}\n${childError.stderr}`.includes('intentional learning browser self-test child error')) {
      throw new Error(`browser self-test must surface child errors\n${childError.stdout}\n${childError.stderr}`);
    }
    console.log('DETECTED path browser child error');

    const timedOut = await runSelfTestChild(
      { ...sharedEnvironment, KB_LEARNING_SELF_TEST_HANG: '1' },
      300,
      'SELF-TEST HANG READY: browser and local server running',
    );
    const timeoutOutput = `${timedOut.stdout}\n${timedOut.stderr}`;
    if (!timedOut.timedOut || timedOut.signal === 'SIGKILL'
      || !timeoutOutput.includes('SELF-TEST HANG READY: browser and local server running')
      || !timeoutOutput.includes('SELF-TEST HANG CLEANED: browser and local server closed')) {
      throw new Error(`browser self-test timeout must close an already-running browser and server (${JSON.stringify(timedOut)})`);
    }
    console.log('DETECTED path browser child timeout after launch and graceful browser/server cleanup');

    for (const [name, diagnostic] of pathSelfTestMutations) {
      const result = await runSelfTestChild({ ...sharedEnvironment, KB_LEARNING_MUTATION: name }, pathChildTimeoutMs);
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.error || result.timedOut || result.code === 0 || !output.includes(diagnostic)) {
        throw new Error(`${name} mutation was not detected for “${diagnostic}”\n${output}`);
      }
      console.log(`DETECTED path browser mutation: ${name}`);
    }

    const beginnerEnvironment = {
      ...sharedEnvironment,
      KB_LEARNING_PATH_ONLY: '0',
      KB_LEARNING_BEGINNER_ONLY: '1',
    };
    const beginnerBaseline = await runSelfTestChild(beginnerEnvironment, beginnerChildTimeoutMs);
    if (beginnerBaseline.error || beginnerBaseline.timedOut || beginnerBaseline.code !== 0) {
      throw new Error(`beginner browser baseline must be GREEN\n${beginnerBaseline.stdout}\n${beginnerBaseline.stderr}`);
    }
    console.log('GREEN beginner browser baseline: capability, relationship, and boundary interactions');
    for (const [name, diagnostic] of beginnerSelfTestMutations) {
      const result = await runSelfTestChild({ ...beginnerEnvironment, KB_LEARNING_MUTATION: name }, beginnerChildTimeoutMs);
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.error || result.timedOut || result.code === 0 || !output.includes(diagnostic)) {
        throw new Error(`${name} mutation was not detected for “${diagnostic}”\n${output}`);
      }
      console.log(`DETECTED beginner browser mutation: ${name}`);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  if (existsSync(temporaryRoot)) throw new Error(`browser self-test temporary root was not removed: ${temporaryRoot}`);
  console.log(`PASS: learning browser self-test (2 baselines + ${pathSelfTestMutations.length + beginnerSelfTestMutations.length} mutations)`);
  console.log('CLEANED path browser children, servers, browsers, and temporary site');
}

async function runBrowserContract() {
  let localServer = null;
  let browser = null;
  let releaseSyntheticHang = null;
  try {
    let base = suppliedBase;
    if (!base) {
      localServer = await startServer();
      base = localServer.base;
    }
    browser = await chromium.launch({ headless: true });
    if (process.env.KB_LEARNING_SELF_TEST_HANG === '1') {
      console.log('SELF-TEST HANG READY: browser and local server running');
      await new Promise((resolveHang, rejectHang) => {
        releaseSyntheticHang = () => rejectHang(new Error('intentional learning browser self-test hang released for cleanup'));
        process.once('SIGTERM', releaseSyntheticHang);
      });
    }
    if (pathOnlyMode) {
      await runPathFocusedContract(browser, base);
    } else if (beginnerOnlyMode) {
      await runBeginnerInteractionContract(browser, base);
    } else {
      await runPrimaryContract(browser, base);
      await runPathRouteAndStateContract(browser, base);
      await runDesktopPathGeometryContract(browser, base);
      await runBeginnerInteractionContract(browser, base);
      await runDeepInteractionContract(browser, base);
      await runFreshContextContract(browser, base);
      for (const mode of ['get', 'set', 'invalid-json']) await runStorageFaultContract(browser, base, mode);
      await runCopyContract(browser, base);
    }

    if (failures.length) {
      throw new Error(`Learning browser contract${mutation ? ` [mutation: ${mutation}]` : ''} failed (${failures.length}/${checks})\n- ${failures.join('\n- ')}`);
    }
    console.log(pathOnlyMode
      ? `PASS: focused learning path browser contract (${checks} checks)`
      : `PASS: learning browser contract (${checks} checks, ${chapters.length * viewports.length} screenshots at ${screenshotRoot})`);
  } finally {
    if (releaseSyntheticHang) process.removeListener('SIGTERM', releaseSyntheticHang);
    if (browser) await browser.close();
    if (localServer) await new Promise((resolveClose) => localServer.server.close(resolveClose));
    if (process.env.KB_LEARNING_SELF_TEST_HANG === '1') {
      console.log('SELF-TEST HANG CLEANED: browser and local server closed');
    }
  }
}

async function main() {
  if (process.env.KB_LEARNING_SELF_TEST_CRASH === '1') throw new Error('intentional learning browser self-test child error');
  if (selfTestMode) await runBrowserSelfTest();
  else await runBrowserContract();
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
