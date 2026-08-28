import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptPath), '../site/knowledge-base');
const siteRoot = path.resolve(process.env.KB_ROOT || defaultRoot);

const chapterIds = [
  'ai-basics',
  'ai-boundaries',
  'ai-delegation',
  'ai-prompting',
  'ai-verification',
  'ai-workflow',
];
const titles = [
  '认识 AI',
  '看清边界',
  '学会分工',
  '把需求说清楚',
  '验证结果',
  '从对话走向工作流',
];
const chapterHrefs = chapterIds.map((id) => `detail.html?type=learn&id=${id}`);
const allowedStatusCopy = new Set(['未看', '正在看', '看过']);
const forbiddenStatusCopy = ['未通过', '结业', '评分', '综合实战'];
const aliases = {
  'ai-what': 'ai-basics',
  'ai-history': 'ai-basics',
  'prompt-basics': 'ai-prompting',
  'ai-other': 'ai-basics',
};
const newImageNames = ['ai-boundaries', 'ai-delegation', 'ai-verification', 'ai-workflow'];

function readRequired(relativePath) {
  try {
    return readFileSync(path.join(siteRoot, relativePath), 'utf8');
  } catch (error) {
    assert.fail(`${relativePath} must exist and be readable: ${error.message}`);
  }
}

function decodeHtmlEntities(source) {
  const named = new Map([
    ['amp', '&'], ['apos', "'"], ['gt', '>'], ['lt', '<'], ['nbsp', '\u00a0'], ['quot', '"'],
  ]);
  return source.replace(/&(?:#(\d+);?|#x([\da-f]+);?|([a-z][\da-z]+);)/gi, (entity, decimal, hexadecimal, name) => {
    if (name) return named.get(name.toLowerCase()) ?? entity;
    const codePoint = Number.parseInt(decimal ?? hexadecimal, hexadecimal ? 16 : 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
      ? String.fromCodePoint(codePoint)
      : '\uFFFD';
  });
}

function parseAttributeEntries(rawAttributes) {
  const entries = [];
  const names = new Set();
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of rawAttributes.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    assert.ok(!names.has(name), `HTML attributes must not repeat ${name}`);
    names.add(name);
    entries.push({ name, value: decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '') });
  }
  return entries;
}

function scanTagEnd(source, start, label) {
  let quote = null;
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    if (character === '>') return cursor + 1;
  }
  assert.fail(`${label} contains an unclosed HTML tag`);
}

function scanNextTag(source, start, label) {
  let tagStart = source.indexOf('<', start);
  while (tagStart >= 0) {
    let cursor = tagStart + 1;
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    if (source[cursor] === '!' || source[cursor] === '?') {
      return { special: true, start: tagStart, end: scanTagEnd(source, tagStart, label) };
    }
    let closing = false;
    if (source[cursor] === '/') {
      closing = true;
      cursor += 1;
      while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    }
    const nameMatch = /^[a-z][\w:-]*/i.exec(source.slice(cursor));
    if (!nameMatch) {
      tagStart = source.indexOf('<', tagStart + 1);
      continue;
    }
    const end = scanTagEnd(source, tagStart, label);
    return {
      special: false,
      closing,
      tagName: nameMatch[0].toLowerCase(),
      rawAttributes: closing ? '' : source.slice(cursor + nameMatch[0].length, end - 1),
      start: tagStart,
      end,
    };
  }
  return null;
}

function maskHtmlCommentsAndNonContent(source) {
  let masked = source.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length));
  let cursor = 0;
  while (cursor < masked.length) {
    const token = scanNextTag(masked, cursor, 'HTML');
    if (!token) break;
    if (!token.special && !token.closing && ['script', 'style'].includes(token.tagName)) {
      if (token.tagName === 'script' && parseAttributeEntries(token.rawAttributes).some(({ name }) => name === 'src')) {
        cursor = token.end;
        continue;
      }
      const closePattern = new RegExp(`<\\/\\s*${token.tagName}\\s*>`, 'gi');
      closePattern.lastIndex = token.end;
      const close = closePattern.exec(masked);
      assert.ok(close, `<${token.tagName}> must have a closing tag`);
      const regionEnd = close.index + close[0].length;
      masked = `${masked.slice(0, token.start)}${' '.repeat(regionEnd - token.start)}${masked.slice(regionEnd)}`;
      cursor = regionEnd;
      continue;
    }
    cursor = token.end;
  }
  return masked;
}

const voidTags = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

function parseElements(source, label = 'HTML') {
  const searchable = maskHtmlCommentsAndNonContent(source);
  const elements = [];
  const stack = [];
  let cursor = 0;
  while (cursor < searchable.length) {
    const token = scanNextTag(searchable, cursor, label);
    if (!token) break;
    cursor = token.end;
    if (token.special) continue;
    if (token.closing) {
      const element = stack.pop();
      assert.ok(element, `${label} contains an unmatched closing </${token.tagName}>`);
      assert.equal(element.tagName, token.tagName, `${label} must be properly nested`);
      element.closeStart = token.start;
      element.closeEnd = token.end;
      element.innerHtml = source.slice(element.openEnd, token.start);
      continue;
    }
    const entries = parseAttributeEntries(token.rawAttributes);
    const element = {
      tagName: token.tagName,
      attributes: new Map(entries.map(({ name, value }) => [name, value])),
      openStart: token.start,
      openEnd: token.end,
      closeStart: token.end,
      closeEnd: token.end,
      innerHtml: '',
      parent: stack.at(-1) ?? null,
    };
    elements.push(element);
    if (!voidTags.has(token.tagName) && !/\/\s*$/.test(token.rawAttributes)) stack.push(element);
  }
  assert.equal(stack.length, 0, `${label} contains unclosed HTML elements`);
  return elements;
}

function hasClass(element, className) {
  return (element.attributes.get('class') ?? '').split(/\s+/).includes(className);
}

function isLocallyHidden(element) {
  const classes = new Set((element.attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
  return element.tagName === 'template'
    || element.tagName === 'noscript'
    || element.attributes.has('hidden')
    || element.attributes.get('aria-hidden')?.toLowerCase() === 'true'
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(element.attributes.get('style') ?? '')
    || ['hidden', 'sr-only', 'visually-hidden'].some((className) => classes.has(className));
}

function isVisible(element) {
  let current = element;
  while (current) {
    if (isLocallyHidden(current)) return false;
    current = current.parent;
  }
  return true;
}

function textContent(source) {
  const searchable = maskHtmlCommentsAndNonContent(source);
  const parts = [];
  let cursor = 0;
  while (cursor < searchable.length) {
    const token = scanNextTag(searchable, cursor, 'HTML text');
    if (!token) break;
    parts.push(searchable.slice(cursor, token.start));
    cursor = token.end;
  }
  parts.push(searchable.slice(cursor));
  return decodeHtmlEntities(parts.join(''));
}

function visibleText(source, label) {
  let masked = source;
  const hidden = parseElements(source, label)
    .filter(isLocallyHidden)
    .sort((left, right) => right.openStart - left.openStart);
  for (const element of hidden) {
    masked = `${masked.slice(0, element.openStart)}${' '.repeat(element.closeEnd - element.openStart)}${masked.slice(element.closeEnd)}`;
  }
  return textContent(masked).replace(/\s+/g, ' ').trim();
}

function uniqueElement(elements, predicate, message) {
  const matches = elements.filter(predicate);
  assert.equal(matches.length, 1, message);
  return matches[0];
}

function maskJavaScript(source) {
  const output = source.split('');
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '/' && source[cursor + 1] === '/') {
      let end = cursor + 2;
      while (end < source.length && source[end] !== '\n' && source[end] !== '\r') end += 1;
      for (let index = cursor; index < end; index += 1) output[index] = ' ';
      cursor = end;
      continue;
    }
    if (character === '/' && source[cursor + 1] === '*') {
      const close = source.indexOf('*/', cursor + 2);
      assert.ok(close >= 0, 'JavaScript block comments must close');
      const end = close + 2;
      for (let index = cursor; index < end; index += 1) output[index] = ' ';
      cursor = end;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      let end = cursor + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2;
          continue;
        }
        if (source[end] === quote) {
          end += 1;
          break;
        }
        end += 1;
      }
      assert.ok(end <= source.length && source[end - 1] === quote, 'JavaScript strings must close');
      for (let index = cursor; index < end; index += 1) output[index] = ' ';
      cursor = end;
      continue;
    }
    cursor += 1;
  }
  return output.join('');
}

function findArrayLiteral(source, variableName) {
  const masked = maskJavaScript(source);
  const declaration = new RegExp(`\\b(?:var|let|const)\\s+${variableName}\\s*=\\s*\\[`).exec(masked);
  assert.ok(declaration, `${variableName} must be declared as an array`);
  const start = masked.indexOf('[', declaration.index);
  let depth = 0;
  let cursor = start;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] === '\\') cursor += 2;
        else if (source[cursor] === quote) { cursor += 1; break; }
        else cursor += 1;
      }
      continue;
    }
    if (character === '/' && source[cursor + 1] === '/') {
      while (cursor < source.length && source[cursor] !== '\n' && source[cursor] !== '\r') cursor += 1;
      continue;
    }
    if (character === '/' && source[cursor + 1] === '*') {
      const close = source.indexOf('*/', cursor + 2);
      assert.ok(close >= 0, 'JavaScript block comments must close');
      cursor = close + 2;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
    cursor += 1;
  }
  assert.fail(`${variableName} array must close`);
}

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evaluateLearningApi(source) {
  const sessionStorage = {
    getItem() { throw new Error('storage unavailable in static contract'); },
    setItem() { throw new Error('storage unavailable in static contract'); },
    removeItem() { throw new Error('storage unavailable in static contract'); },
  };
  const document = {
    readyState: 'loading',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  const window = { document, sessionStorage };
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    sessionStorage,
    URL,
    URLSearchParams,
    location: { href: 'https://example.test/learn.html', search: '', hash: '' },
    navigator: {},
    console: { log() {}, warn() {}, error() {} },
    setTimeout() { return 0; },
    clearTimeout() {},
  });
  vm.runInContext(source, context, { timeout: 100, displayErrors: true });
  assert.ok(window.AIBeginner && typeof window.AIBeginner === 'object', 'learning-experience.js must expose window.AIBeginner');
  return plainClone(window.AIBeginner);
}

function listFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function assertLocalReferenceStaysInside(rawReference, fromFile) {
  const reference = decodeHtmlEntities(rawReference.trim());
  if (!reference || reference.startsWith('#') || reference.startsWith('//')) return;
  if (/^(?:https?:|mailto:|tel:|data:|blob:)/i.test(reference)) return;
  const pathname = reference.split(/[?#]/, 1)[0];
  if (!pathname) return;
  let decoded;
  try { decoded = decodeURIComponent(pathname).replace(/\\/g, '/'); }
  catch { assert.fail(`${path.relative(siteRoot, fromFile)} contains an invalid encoded local reference: ${reference}`); }
  const resolved = path.resolve(path.dirname(fromFile), decoded);
  const relative = path.relative(siteRoot, resolved);
  assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    `${path.relative(siteRoot, fromFile)} local reference must stay inside knowledge-base: ${reference}`);
}

function stripCssCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (match) => ' '.repeat(match.length));
}

function assertNoGradient(files) {
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (!['.css', '.html', '.svg'].includes(extension)) continue;
    const source = readFileSync(file, 'utf8');
    const relative = path.relative(siteRoot, file);
    if (extension === '.css') {
      assert.ok(!/(?:linear|radial|conic)-gradient\s*\(/i.test(stripCssCommentsAndStrings(source)), `${relative} must not use CSS gradients`);
      continue;
    }
    const elements = parseElements(source, relative);
    assert.equal(elements.filter(({ tagName }) => ['lineargradient', 'radialgradient'].includes(tagName)).length, 0,
      `${relative} must not contain SVG gradients`);
    for (const element of elements) {
      const style = element.attributes.get('style');
      if (style) assert.ok(!/(?:linear|radial|conic)-gradient\s*\(/i.test(stripCssCommentsAndStrings(style)), `${relative} inline style must not use gradients`);
    }
    const withoutComments = source.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length));
    for (const match of withoutComments.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
      assert.ok(!/(?:linear|radial|conic)-gradient\s*\(/i.test(stripCssCommentsAndStrings(match[1])), `${relative} style block must not use gradients`);
    }
  }
}

function assertCssReferencesStayInside(css, fromFile) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of withoutComments.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/gi)) {
    assertLocalReferenceStaysInside(match[1] ?? match[2] ?? match[3], fromFile);
  }
}

function runContract() {
  const learn = readRequired('learn.html');
  const learnElements = parseElements(learn, 'learn.html');
  const cards = learnElements.filter((element) => element.tagName === 'a' && hasClass(element, 'learning-card') && isVisible(element));

  // This intentionally remains the first production assertion: it is the RED hand-off to implementation.
  assert.equal(cards.length, 6, 'learn hub must contain exactly six chapter cards');

  const hubs = learnElements.filter((element) => hasClass(element, 'learning-hub') && isVisible(element));
  assert.equal(hubs.length, 1, 'learn.html must contain exactly one visible .learning-hub');
  const hub = hubs[0];
  assert.ok(cards.every((card) => card.openStart > hub.openStart && card.closeEnd < hub.closeEnd), 'all chapter cards must be inside the learning hub');
  assert.deepEqual(cards.map((card) => card.attributes.get('href')), chapterHrefs, 'chapter card URLs must match the approved order');

  const actualTitles = [];
  for (const [index, card] of cards.entries()) {
    const descendants = parseElements(card.innerHtml, `learning card ${index + 1}`);
    const headings = descendants.filter((element) => ['h2', 'h3'].includes(element.tagName) && isVisible(element));
    assert.equal(headings.length, 1, `learning card ${index + 1} must contain exactly one visible h2 or h3`);
    actualTitles.push(visibleText(headings[0].innerHtml, `learning card ${index + 1} title`));
    const statuses = descendants.filter((element) => hasClass(element, 'learning-status') && isVisible(element));
    assert.equal(statuses.length, 1, `learning card ${index + 1} must contain exactly one visible status`);
    const status = visibleText(statuses[0].innerHtml, `learning card ${index + 1} status`);
    assert.ok(allowedStatusCopy.has(status), `learning card ${index + 1} status must be 未看, 正在看, or 看过`);
  }
  assert.deepEqual(actualTitles, titles, 'chapter card titles must match the approved order');

  const allStatusElements = learnElements.filter((element) => hasClass(element, 'learning-status'));
  for (const [index, statusElement] of allStatusElements.entries()) {
    const status = textContent(statusElement.innerHtml).replace(/\s+/g, ' ').trim();
    assert.ok(allowedStatusCopy.has(status), `learning status ${index + 1} must be 未看, 正在看, or 看过`);
  }
  const domCopyIncludingHidden = textContent(learn);
  for (const forbidden of forbiddenStatusCopy) {
    assert.ok(!domCopyIncludingHidden.includes(forbidden), `learn.html must not contain prohibited status or assessment copy: ${forbidden}`);
  }
  const main = uniqueElement(learnElements, (element) => element.tagName === 'main', 'learn.html must contain exactly one main');
  const visibleMainCopy = visibleText(main.innerHtml, 'learn main');
  for (const forbidden of ['AI 公司', '主流 AI 模型', '课程目录', '视频目录', '博主目录']) {
    assert.ok(!visibleMainCopy.includes(forbidden), `learn hub must not contain the external-resource directory copy: ${forbidden}`);
  }
  const mainElements = parseElements(main.innerHtml, 'learn main');
  const directoryHeadingPattern = /(?:(?:精选|推荐|值得关注(?:的)?|延伸学习|资源导航|资源推荐).{0,12}(?:视频|课程|博主|创作者|信息源)|(?:视频|课程|博主|创作者|信息源).{0,12}(?:精选|推荐|目录|导航|资源|信息源))/;
  const directoryHeadings = mainElements.filter((element) => /^h[1-6]$/.test(element.tagName) && isVisible(element))
    .map((element) => visibleText(element.innerHtml, 'learn directory heading'))
    .filter((heading) => directoryHeadingPattern.test(heading));
  assert.deepEqual(directoryHeadings, [], 'learn main must not contain course, video, or creator directory headings');

  const legacyDirectoryClasses = new Set([
    'video-grid', 'video-card',
    'lp-blog', 'lp-blog-card',
    'course-directory', 'course-grid', 'course-card',
    'media-directory', 'media-grid', 'media-card',
  ]);
  const visibleLegacyDirectories = mainElements.filter((element) => isVisible(element) &&
    (element.attributes.get('class') ?? '').split(/\s+/).some((className) => legacyDirectoryClasses.has(className)));
  assert.equal(visibleLegacyDirectories.length, 0, 'learn main must not retain legacy course, video, or creator directory structures');
  const visibleLegacyMediaSections = mainElements.filter((element) => isVisible(element) && element.attributes.get('id') === 'sec-media');
  assert.equal(visibleLegacyMediaSections.length, 0, 'learn main must not retain the legacy #sec-media directory');

  const externalDirectoryLinks = mainElements.filter((element) => element.tagName === 'a' && isVisible(element) &&
    /^(?:https?:)?\/\//i.test((element.attributes.get('href') ?? '').trim()));
  assert.equal(externalDirectoryLinks.length, 0, 'learn main must not contain external resource-directory links');
  const forbiddenLearningIds = ['ai-companies', 'ai-models'];
  for (const anchor of learnElements.filter((element) => element.tagName === 'a' && isVisible(element))) {
    const href = anchor.attributes.get('href') ?? '';
    assert.ok(!forbiddenLearningIds.some((id) => href.includes(id)), `learn hub must not link to the old company or model directory: ${href}`);
  }

  const learningScript = readRequired('learning-experience.js');
  const executableTokens = maskJavaScript(learningScript);
  assert.ok(/\bsessionStorage\b/.test(executableTokens), 'learning-experience.js must use sessionStorage');
  assert.ok(!/\blocalStorage\b/.test(executableTokens), 'learning-experience.js must not use localStorage');
  for (const forbidden of forbiddenStatusCopy) {
    const withoutComments = learningScript.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n\r]*/g, '');
    assert.ok(!withoutComments.includes(forbidden), `learning-experience.js must not contain prohibited assessment copy: ${forbidden}`);
  }
  const api = evaluateLearningApi(learningScript);
  assert.ok(Array.isArray(api.chapters), 'window.AIBeginner.chapters must be an array');
  assert.deepEqual(api.chapters.map(({ id }) => id), chapterIds, 'learning chapter IDs must match the approved order');
  assert.deepEqual(api.chapters.map(({ title }) => title), titles, 'learning chapter titles must match the approved order');
  for (const [index, chapter] of api.chapters.entries()) {
    for (const field of ['caseStudy', 'exercise', 'quickCheck', 'takeaway']) {
      assert.ok(Object.hasOwn(chapter, field), `${chapterIds[index]} must define ${field}`);
      assert.ok(chapter[field] !== null && chapter[field] !== undefined && !(typeof chapter[field] === 'string' && !chapter[field].trim()),
        `${chapterIds[index]}.${field} must contain learning content`);
    }
  }
  assert.deepEqual(api.aliases, aliases, 'legacy learning URL aliases must map to the approved new chapters');

  const detail = readRequired('detail.html');
  const detailElements = parseElements(detail, 'detail.html');
  const learningScriptTags = detailElements.filter((element) => element.tagName === 'script' && element.attributes.get('src') === 'learning-experience.js');
  assert.equal(learningScriptTags.length, 1, 'detail.html must load learning-experience.js exactly once');

  for (const imageName of newImageNames) {
    for (const extension of ['png', 'webp']) {
      try { readFileSync(path.join(siteRoot, 'images', `${imageName}.${extension}`)); }
      catch { assert.fail(`images/${imageName}.${extension} must exist`); }
    }
  }

  const allFiles = listFiles(siteRoot);
  for (const file of allFiles) {
    const extension = path.extname(file).toLowerCase();
    if (['.html', '.svg'].includes(extension)) {
      const markup = readFileSync(file, 'utf8');
      for (const element of parseElements(markup, path.relative(siteRoot, file))) {
        for (const attributeName of ['href', 'src', 'poster', 'xlink:href']) {
          const value = element.attributes.get(attributeName);
          if (value !== undefined) assertLocalReferenceStaysInside(value, file);
        }
        const srcset = element.attributes.get('srcset');
        if (srcset) {
          for (const candidate of srcset.split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean)) {
            assertLocalReferenceStaysInside(candidate, file);
          }
        }
        const style = element.attributes.get('style');
        if (style) assertCssReferencesStayInside(style, file);
      }
      const withoutComments = markup.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length));
      for (const match of withoutComments.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
        assertCssReferencesStayInside(match[1], file);
      }
    }
    if (extension === '.css') {
      assertCssReferencesStayInside(readFileSync(file, 'utf8'), file);
    }
  }
  assertNoGradient(allFiles);

  const searchSource = readRequired('search.js');
  const searchIndex = vm.runInNewContext(`(${findArrayLiteral(searchSource, 'SEARCH_INDEX')})`, Object.create(null), { timeout: 50 });
  const beginnerEntries = plainClone(searchIndex).filter(({ tag }) => tag === '入门');
  assert.deepEqual(beginnerEntries.map(({ t }) => t), titles, 'search index must expose only the six approved beginner chapters');
  assert.deepEqual(beginnerEntries.map(({ href }) => href), chapterHrefs, 'search beginner links must match the six approved chapter URLs');
  assert.ok(!beginnerEntries.some(({ href }) => /(?:ai-companies|ai-models)/.test(href ?? '')), 'old company and model entries must not remain tagged 入门');

  const progress = readRequired('progress.html');
  const progressCopy = textContent(progress).replace(/\s+/g, ' ');
  for (const forbidden of ['localStorage', '长期保存', '永久保存', '自动保存在这台设备', '保存在本机浏览器', '换设备不会同步']) {
    assert.ok(!progressCopy.includes(forbidden), `progress.html must not promise long-term local storage: ${forbidden}`);
  }
}

function fixtureFiles(order = chapterIds) {
  const cards = order.map((id) => {
    const index = chapterIds.indexOf(id);
    return `<a class="learning-card" href="${chapterHrefs[index]}"><h2>${titles[index]}</h2><p>章节说明</p><span class="learning-status">未看</span></a>`;
  }).join('\n');
  const chapters = chapterIds.map((id, index) => `{
    id:${JSON.stringify(id)}, title:${JSON.stringify(titles[index])},
    caseStudy:{title:'案例'}, exercise:{type:'互动'}, quickCheck:[{q:'想一想'}], takeaway:{title:'模板'}
  }`).join(',\n');
  const searchEntries = chapterIds.map((id, index) => `{t:${JSON.stringify(titles[index])},d:'章节',tag:'入门',href:${JSON.stringify(chapterHrefs[index])}}`).join(',\n');
  return {
    'learn.html': `<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body>
      <!-- <a class="learning-card"><h2>decoy 未通过</h2></a> -->
      <script>var decoy='<a class="learning-card">decoy 未通过</a>';</script>
      <main><p>章节案例可以自然提到推荐课程、精选视频或值得关注的博主，不代表这里承载资源目录。</p><section class="learning-hub"><a class="learning-card" hidden href="detail.html?type=learn&id=hidden"><h2>隐藏占位</h2><span class="learning-status">未看</span></a>${cards}</section></main></body></html>`,
    'detail.html': '<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body><main id="learningExperience"></main><script src="learning-experience.js"></script></body></html>',
    'progress.html': '<!doctype html><html><body><main><p>进度只在本次标签会话有效。</p><a href="learn.html">进入 AI 新手入门</a></main></body></html>',
    'search.js': `(function(){ var SEARCH_INDEX=[${searchEntries},{t:'AI 公司介绍',tag:'资源',href:'resources.html'}]; window.search=SEARCH_INDEX; }());`,
    'learning-experience.js': `(function(){
      // localStorage in documentation must not count as executable usage.
      var harmlessStorageWord='localStorage';
      var chapters=[${chapters}];
      var aliases=${JSON.stringify(aliases)};
      function read(){ try { return sessionStorage.getItem('amersports-ai-beginner-session-v1'); } catch(error) { return null; } }
      window.AIBeginner={chapters:chapters,aliases:aliases,read:read};
    }());`,
    'learning-experience.css': '.learning-card { color: #0e2144; }',
  };
}

function createFixture(order = chapterIds) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'learning-contract-'));
  mkdirSync(path.join(root, 'images'));
  for (const [relative, content] of Object.entries(fixtureFiles(order))) writeFileSync(path.join(root, relative), content);
  for (const imageName of newImageNames) {
    writeFileSync(path.join(root, 'images', `${imageName}.png`), 'png');
    writeFileSync(path.join(root, 'images', `${imageName}.webp`), 'webp');
  }
  return root;
}

function runFixture(root) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    env: { ...process.env, KB_ROOT: root },
    encoding: 'utf8',
  });
}

function expectMutation(name, mutate, expectedMessage) {
  const root = createFixture();
  try {
    mutate(root);
    const result = runFixture(root);
    assert.notEqual(result.status, 0, `${name} mutation must fail the contract`);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.ok(output.includes(expectedMessage), `${name} mutation must fail for “${expectedMessage}”, received:\n${output}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function replaceIn(root, relative, from, to) {
  const absolute = path.join(root, relative);
  const source = readFileSync(absolute, 'utf8');
  assert.ok(source.includes(from), `${relative} fixture mutation source must contain ${from}`);
  writeFileSync(absolute, source.replace(from, to));
}

function runSelfTest() {
  const greenRoot = createFixture();
  try {
    const green = runFixture(greenRoot);
    assert.equal(green.status, 0, `valid fixture must pass:\n${green.stdout}\n${green.stderr}`);
  } finally {
    rmSync(greenRoot, { recursive: true, force: true });
  }

  expectMutation('seventh card', (root) => {
    replaceIn(root, 'learn.html', '</section>', '<a class="learning-card" href="detail.html?type=learn&id=extra"><h2>额外章节</h2><span class="learning-status">未看</span></a></section>');
  }, 'learn hub must contain exactly six chapter cards');
  expectMutation('chapter order', (root) => {
    const files = fixtureFiles([chapterIds[1], chapterIds[0], ...chapterIds.slice(2)]);
    writeFileSync(path.join(root, 'learn.html'), files['learn.html']);
  }, 'chapter card URLs must match the approved order');
  expectMutation('localStorage', (root) => {
    replaceIn(root, 'learning-experience.js', 'window.AIBeginner=', 'localStorage.getItem("bad"); window.AIBeginner=');
  }, 'learning-experience.js must not use localStorage');
  expectMutation('hidden failed status', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><span hidden>未通过</span>');
  }, 'learn.html must not contain prohibited status or assessment copy: 未通过');
  expectMutation('company directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><a href="detail.html?type=learn&id=ai-companies">AI 公司入口</a>');
  }, 'learn hub must not contain the external-resource directory copy: AI 公司');
  expectMutation('missing case study', (root) => {
    replaceIn(root, 'learning-experience.js', 'caseStudy:{title:\'案例\'}', 'caseStudyMissing:{title:\'案例\'}');
  }, 'ai-basics must define caseStudy');
  expectMutation('missing PNG', (root) => {
    unlinkSync(path.join(root, 'images', 'ai-boundaries.png'));
  }, 'images/ai-boundaries.png must exist');
  expectMutation('missing WebP', (root) => {
    unlinkSync(path.join(root, 'images', 'ai-boundaries.webp'));
  }, 'images/ai-boundaries.webp must exist');
  expectMutation('CSS gradient', (root) => {
    replaceIn(root, 'learning-experience.css', '#0e2144', 'linear-gradient(#fff, #0e2144)');
  }, 'learning-experience.css must not use CSS gradients');
  expectMutation('old model search entry', (root) => {
    replaceIn(root, 'search.js', chapterHrefs[0], 'detail.html?type=learn&id=ai-models');
  }, 'search beginner links must match the six approved chapter URLs');
  expectMutation('recommended creator directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><section class="lp-blog"><h2>值得关注的博主</h2><a class="lp-blog-card" href="https://example.test/creator">AI 创作者</a></section>');
  }, 'learn main must not contain course, video, or creator directory headings');
  expectMutation('selected video directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><section class="video-grid"><h2>精选视频</h2><a class="video-card" href="https://example.test/video">AI 讲解</a></section>');
  }, 'learn main must not contain course, video, or creator directory headings');
  expectMutation('recommended course directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><section class="course-directory"><h2>推荐课程</h2><a class="course-card" href="https://example.test/course">AI 入门课</a></section>');
  }, 'learn main must not contain course, video, or creator directory headings');
  expectMutation('legacy media directory structure', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><section id="sec-media"><div class="video-grid"><p>延伸内容</p></div></section>');
  }, 'learn main must not retain legacy course, video, or creator directory structures');
  expectMutation('external resource-directory link', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><a href="https://example.test/resource">延伸阅读</a>');
  }, 'learn main must not contain external resource-directory links');

  console.log('PASS learning experience contract self-test (valid fixture + 15 mutations)');
}

if (process.argv.includes('--self-test')) runSelfTest();
else {
  runContract();
  console.log('PASS AI beginner learning contract');
}
