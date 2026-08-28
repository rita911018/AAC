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
const requiredApiMethods = ['getStatus', 'markStarted', 'markSeen', 'nextIncomplete', 'initHub', 'renderChapter'];
const storageKey = 'amersports-ai-beginner-session-v1';
const allowedRuntimeStatuses = new Set(['unseen', 'in-progress', 'seen']);

function readRequired(relativePath) {
  try {
    return readFileSync(path.join(siteRoot, relativePath), 'utf8');
  } catch (error) {
    assert.fail(`${relativePath} must exist and be readable: ${error.message}`);
  }
}

function decodeHtmlEntities(source) {
  const named = new Map([
    ['amp', '&'], ['apos', "'"], ['bsol', '\\'], ['gt', '>'], ['lt', '<'], ['nbsp', '\u00a0'],
    ['period', '.'], ['quot', '"'], ['sol', '/'],
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
      const closePattern = new RegExp(`<\\/\\s*${token.tagName}\\s*>`, 'gi');
      closePattern.lastIndex = token.end;
      const close = closePattern.exec(masked);
      assert.ok(close, `<${token.tagName}> must have a closing tag`);
      if (token.tagName === 'script' && parseAttributeEntries(token.rawAttributes).some(({ name }) => name === 'src')) {
        masked = `${masked.slice(0, token.end)}${' '.repeat(close.index - token.end)}${masked.slice(close.index)}`;
        cursor = token.end;
        continue;
      }
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
  const output = Array(source.length).fill(' ');
  const controlParenClosers = new Set();
  const parenStack = [];

  function previousExecutableIndex(start) {
    let index = start - 1;
    while (index >= 0 && /\s/.test(output[index])) index -= 1;
    return index;
  }

  function regexCanStart(start) {
    const previous = previousExecutableIndex(start);
    if (previous < 0) return true;
    if (controlParenClosers.has(previous)) return true;
    const character = output[previous];
    if (/[$\w\])}]/.test(character)) {
      if (!/[A-Za-z]/.test(character)) return false;
      let wordStart = previous;
      while (wordStart > 0 && /[$\w]/.test(output[wordStart - 1])) wordStart -= 1;
      const word = output.slice(wordStart, previous + 1).join('');
      return ['await', 'case', 'delete', 'do', 'else', 'in', 'instanceof', 'of', 'return', 'throw', 'typeof', 'void', 'yield'].includes(word);
    }
    return true;
  }

  function scanQuoted(start, quote) {
    output[start] = 'S';
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') { cursor += 2; continue; }
      if (source[cursor] === quote) return cursor + 1;
      cursor += 1;
    }
    assert.fail('JavaScript strings must close');
  }

  function scanRegex(start) {
    output[start] = 'R';
    let cursor = start + 1;
    let inClass = false;
    while (cursor < source.length) {
      const character = source[cursor];
      assert.ok(character !== '\n' && character !== '\r', 'JavaScript regex literals must close before a newline');
      if (character === '\\') { cursor += 2; continue; }
      if (character === '[') inClass = true;
      else if (character === ']') inClass = false;
      else if (character === '/' && !inClass) {
        cursor += 1;
        while (/[A-Za-z]/.test(source[cursor] ?? '')) cursor += 1;
        return cursor;
      }
      cursor += 1;
    }
    assert.fail('JavaScript regex literals must close');
  }

  function scanTemplate(start) {
    output[start] = 'S';
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') { cursor += 2; continue; }
      if (source[cursor] === '`') return cursor + 1;
      if (source[cursor] === '$' && source[cursor + 1] === '{') {
        cursor = scanCode(cursor + 2, true);
        continue;
      }
      cursor += 1;
    }
    assert.fail('JavaScript template literals must close');
  }

  function scanCode(start, stopAtTemplateBrace = false) {
    let cursor = start;
    let braceDepth = 0;
    while (cursor < source.length) {
      const character = source[cursor];
      if (stopAtTemplateBrace && character === '}' && braceDepth === 0) return cursor + 1;
      if (character === "'" || character === '"') { cursor = scanQuoted(cursor, character); continue; }
      if (character === '`') { cursor = scanTemplate(cursor); continue; }
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
      if (character === '/' && regexCanStart(cursor)) { cursor = scanRegex(cursor); continue; }
      output[cursor] = character;
      if (character === '(') {
        const previous = previousExecutableIndex(cursor);
        let wordStart = previous;
        while (wordStart >= 0 && /[$\w]/.test(output[wordStart])) wordStart -= 1;
        const word = output.slice(wordStart + 1, previous + 1).join('');
        parenStack.push(['catch', 'for', 'if', 'switch', 'while', 'with'].includes(word));
      } else if (character === ')') {
        const closesControl = parenStack.pop() ?? false;
        if (closesControl) controlParenClosers.add(cursor);
      }
      if (stopAtTemplateBrace && character === '{') braceDepth += 1;
      else if (stopAtTemplateBrace && character === '}') braceDepth -= 1;
      cursor += 1;
    }
    assert.ok(!stopAtTemplateBrace, 'JavaScript template interpolation must close');
    return cursor;
  }

  scanCode(0);
  return output.join('');
}

function findArrayLiteral(source, variableName) {
  const masked = maskJavaScript(source);
  const declarationPattern = new RegExp(`\\b(?:var|let|const)\\s+${variableName}\\s*=\\s*\\[`, 'g');
  const declarations = [...masked.matchAll(declarationPattern)];
  assert.equal(declarations.length, 1, `${variableName} must have exactly one canonical declaration`);
  const assignmentPattern = new RegExp(`\\b${variableName}\\s*=(?!=)`, 'g');
  assert.equal([...masked.matchAll(assignmentPattern)].length, 1, `${variableName} must be assigned exactly once`);
  const mutatorPattern = new RegExp(`\\b${variableName}\\s*\\.\\s*(?:copyWithin|fill|pop|push|reverse|shift|sort|splice|unshift)\\s*\\(`);
  const propertyWritePattern = new RegExp(`\\b${variableName}\\s*(?:\\[[^\\]]+\\]|\\.\\s*length)\\s*=(?!=)`);
  assert.ok(!mutatorPattern.test(masked) && !propertyWritePattern.test(masked), `${variableName} must not be mutated after its canonical declaration`);
  const declaration = declarations[0];
  const start = masked.indexOf('[', declaration.index);
  let depth = 0;
  for (let cursor = start; cursor < masked.length; cursor += 1) {
    const character = masked[cursor];
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
  }
  assert.fail(`${variableName} array must close`);
}

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evaluateLearningRuntime(source, storageOverride) {
  const sessionStorage = storageOverride ?? {
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
  const location = { href: 'https://example.test/learn.html', search: '', hash: '' };
  const window = { document, sessionStorage, location };
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    sessionStorage,
    URL,
    URLSearchParams,
    location,
    navigator: {},
    console: { log() {}, warn() {}, error() {} },
    setTimeout() { return 0; },
    clearTimeout() {},
  });
  vm.runInContext(source, context, { timeout: 100, displayErrors: true });
  assert.ok(window.AIBeginner && typeof window.AIBeginner === 'object', 'learning-experience.js must expose window.AIBeginner');
  return window.AIBeginner;
}

function evaluateLearningApi(source) {
  const api = evaluateLearningRuntime(source);
  for (const method of requiredApiMethods) {
    assert.equal(typeof api[method], 'function', `window.AIBeginner.${method} must be a function`);
  }
  return plainClone(api);
}

function createStorage(initialValue = null, options = {}) {
  let value = initialValue;
  const calls = { get: [], set: [] };
  return {
    calls,
    get value() { return value; },
    getItem(key) {
      calls.get.push(key);
      if (options.throwGet) throw new Error('getItem unavailable');
      return value;
    },
    setItem(key, nextValue) {
      calls.set.push([key, nextValue]);
      if (options.throwSet) throw new Error('setItem unavailable');
      value = nextValue;
    },
  };
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
  assert.ok(!/&[a-z][\da-z]+;/i.test(reference),
    `${path.relative(siteRoot, fromFile)} local reference contains an unknown named HTML entity: ${reference}`);
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

function findCssBlock(source, pattern, label) {
  const match = pattern.exec(source);
  assert.ok(match, `${label} must exist`);
  const start = source.indexOf('{', match.index);
  assert.ok(start >= 0, `${label} must open a CSS block`);
  let depth = 0;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    if (source[cursor] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, cursor);
    }
  }
  assert.fail(`${label} must close its CSS block`);
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
    assertLocalReferenceStaysInside(decodeCssEscapes(match[1] ?? match[2] ?? match[3]), fromFile);
  }
}

function decodeCssEscapes(value) {
  let decoded = '';
  let cursor = 0;
  while (cursor < value.length) {
    if (value[cursor] !== '\\') {
      decoded += value[cursor];
      cursor += 1;
      continue;
    }
    if (value[cursor + 1] === '\r' && value[cursor + 2] === '\n') { cursor += 3; continue; }
    if (value[cursor + 1] === '\r' || value[cursor + 1] === '\n' || value[cursor + 1] === '\f') { cursor += 2; continue; }
    const hex = /^[\da-f]{1,6}/i.exec(value.slice(cursor + 1));
    if (hex) {
      const codePoint = Number.parseInt(hex[0], 16);
      decoded += codePoint === 0 || codePoint > 0x10FFFF ? '\uFFFD' : String.fromCodePoint(codePoint);
      cursor += 1 + hex[0].length;
      if (/[\t\n\f\r ]/.test(value[cursor] ?? '')) cursor += 1;
      continue;
    }
    if (cursor + 1 < value.length) {
      decoded += value[cursor + 1];
      cursor += 2;
      continue;
    }
    cursor += 1;
  }
  return decoded;
}

function isKnownExternalDirectoryLink(href) {
  let url;
  try { url = new URL(href, 'https://knowledge-base.example/'); }
  catch { return false; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return [
    'youtube.com',
    'coursera.org',
    'space.bilibili.com',
    'speech.ee.ntu.edu.tw',
    'baoyu.io',
    'jiqizhixin.com',
    'qbitai.com',
    'sspai.com',
    'karpathy.ai',
    'geekpark.net',
  ].some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`));
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
  for (const forbidden of ['课程目录', '视频目录', '博主目录']) {
    assert.ok(!visibleMainCopy.includes(forbidden), `learn hub must not contain the external-resource directory copy: ${forbidden}`);
  }
  const mainElements = parseElements(main.innerHtml, 'learn main');
  const directoryHeadingPattern = /(?:(?:精选|推荐|值得关注(?:的)?|延伸学习|资源导航|资源推荐).{0,12}(?:视频|课程|博主|创作者|信息源)|(?:视频|课程|博主|创作者|信息源).{0,12}(?:精选|推荐|目录|导航|资源|信息源)|(?:AI\s*公司|主流\s*AI\s*模型).{0,12}(?:介绍|入口|目录|推荐|官网|图谱)|(?:介绍|入口|目录|推荐|官网|图谱).{0,12}(?:AI\s*公司|主流\s*AI\s*模型))/;
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
    isKnownExternalDirectoryLink((element.attributes.get('href') ?? '').trim()));
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
  assert.ok(learningScript.includes(storageKey), `learning-experience.js must use storage key ${storageKey}`);
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

  const learningCss = readRequired('learning-experience.css');
  const requiredCssClasses = [
    'learning-hub', 'learning-card', 'learning-status', 'lesson-nav', 'lesson-figure',
    'lesson-case', 'lesson-exercise', 'lesson-check', 'lesson-takeaway', 'lesson-actions',
  ];
  for (const className of requiredCssClasses) {
    assert.ok(new RegExp(`\\.${className}(?![-_a-zA-Z0-9])`).test(learningCss), `learning-experience.css must define .${className}`);
  }
  const reducedMotion = findCssBlock(
    learningCss.replace(/\/\*[\s\S]*?\*\//g, ''),
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i,
    'learning-experience.css reduced-motion media query',
  );
  for (const className of ['learning-card', 'lesson-token', 'lesson-feedback', 'chapter-return-highlight']) {
    assert.ok(new RegExp(`\\.${className}(?![-_a-zA-Z0-9])`).test(reducedMotion), `reduced-motion block must cover .${className}`);
  }
  assert.match(reducedMotion, /scroll-behavior\s*:\s*auto\b/i, 'reduced-motion block must disable smooth scrolling');
  assert.match(reducedMotion, /transition\s*:\s*none\b/i, 'reduced-motion block must disable transitions');
  assert.match(reducedMotion, /animation\s*:\s*none\b/i, 'reduced-motion block must disable animations');

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
      <script src="learning-experience.js"><a class="learning-card" href="detail.html?type=learn&id=script-decoy"><h2>外链脚本 raw-text decoy</h2></a></script>
      <main><p>章节案例可以自然提到 AI 公司、主流 AI 模型、推荐课程、精选视频或值得关注的博主，不代表这里承载资源目录。必要时可引用<a href="https://www.anthropic.com/research">单一权威来源</a>。</p><section class="learning-hub"><a class="learning-card" hidden href="detail.html?type=learn&id=hidden"><h2>隐藏占位</h2><span class="learning-status">未看</span></a>${cards}</section></main></body></html>`,
    'detail.html': '<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body><main id="learningExperience"></main><script src="learning-experience.js"></script></body></html>',
    'progress.html': '<!doctype html><html><body><main><p>进度只在本次标签会话有效。</p><a href="learn.html">进入 AI 新手入门</a></main></body></html>',
    'search.js': `(function(){ var SEARCH_INDEX=[${searchEntries},{t:'AI 公司介绍',tag:'资源',href:'resources.html'}]; var decoy='SEARCH_INDEX.push({tag:"入门"})'; /* SEARCH_INDEX = []; */ window.search=SEARCH_INDEX; }());`,
    'learning-experience.js': `(function(){
      // localStorage in documentation must not count as executable usage.
      var harmlessStorageWord='localStorage';
      var harmlessTemplateText=\`localStorage\`;
      var harmlessRegex=/localStorage/;
      function harmlessRegexStatement(flag){ if(flag) /localStorage/.test('documentation'); }
      var harmlessNestedTemplate=\`documentation \${\`localStorage\`}\`;
      var chapters=[${chapters}];
      var aliases=${JSON.stringify(aliases)};
      function read(){ try { return sessionStorage.getItem('amersports-ai-beginner-session-v1'); } catch(error) { return null; } }
      function getStatus(){ return 'unseen'; }
      function markStarted(){ return 'in-progress'; }
      function markSeen(){ return 'seen'; }
      function nextIncomplete(){ return 'ai-basics'; }
      function initHub(){ return true; }
      function renderChapter(){ return true; }
      window.AIBeginner={chapters:chapters,aliases:aliases,getStatus:getStatus,markStarted:markStarted,markSeen:markSeen,nextIncomplete:nextIncomplete,initHub:initHub,renderChapter:renderChapter,read:read};
    }());`,
    'learning-experience.css': `.learning-hub,.learning-card,.learning-status,.lesson-nav,.lesson-figure,.lesson-case,.lesson-exercise,.lesson-check,.lesson-takeaway,.lesson-actions { color: #0e2144; }
      @media (prefers-reduced-motion: reduce) {
        .learning-card,.lesson-token,.lesson-feedback,.chapter-return-highlight { scroll-behavior:auto; transition:none; animation:none; }
      }`,
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

function expectMutationBatch(cases) {
  const missed = [];
  for (const { name, mutate, expectedMessage } of cases) {
    const root = createFixture();
    try {
      mutate(root);
      const result = runFixture(root);
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0 || !output.includes(expectedMessage)) missed.push(name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  assert.deepEqual(missed, [], `contract missed review mutations: ${missed.join(', ')}`);
}

function runRuntimeUnitTest() {
  const source = readRequired('learning-experience.js');

  const freshStorage = createStorage();
  const fresh = evaluateLearningRuntime(source, freshStorage);
  for (const method of requiredApiMethods) {
    assert.equal(typeof fresh[method], 'function', `window.AIBeginner.${method} must be a function`);
  }
  assert.deepEqual(plainClone(fresh.chapters.map(({ id }) => id)), chapterIds, 'runtime chapter order must remain stable');
  assert.deepEqual(plainClone(fresh.aliases), aliases, 'runtime aliases must remain exact');
  assert.equal(fresh.getStatus('ai-basics'), 'unseen', 'fresh known chapters must start unseen');
  assert.equal(fresh.markStarted('ai-basics'), 'in-progress', 'markStarted must move a known unseen chapter to in-progress');
  assert.equal(fresh.getStatus('ai-basics'), 'in-progress', 'markStarted must be visible in this session');
  assert.equal(fresh.markSeen('ai-basics'), 'seen', 'markSeen must move a known chapter to seen');
  assert.equal(fresh.markStarted('ai-basics'), 'seen', 'markStarted must not downgrade seen to in-progress');
  assert.equal(fresh.getStatus('ai-basics'), 'seen', 'seen chapters must remain seen');
  for (const status of chapterIds.map((id) => fresh.getStatus(id))) {
    assert.ok(allowedRuntimeStatuses.has(status), `runtime status must be unseen, in-progress, or seen: ${status}`);
  }
  assert.ok(freshStorage.calls.get.every((key) => key === storageKey), 'runtime must read only the approved session key');
  assert.ok(freshStorage.calls.set.every(([key]) => key === storageKey), 'runtime must write only the approved session key');

  const writesBeforeUnknown = freshStorage.calls.set.length;
  assert.equal(fresh.markStarted('unknown-chapter'), 'unseen', 'markStarted must ignore unknown chapter IDs');
  assert.equal(fresh.markSeen('unknown-chapter'), 'unseen', 'markSeen must ignore unknown chapter IDs');
  assert.equal(freshStorage.calls.set.length, writesBeforeUnknown, 'unknown chapter IDs must not trigger storage writes');

  const invalidStates = [
    '{not valid json',
    '[]',
    'null',
    JSON.stringify({ 'ai-basics': 'unknown-status', 'ai-boundaries': null, extra: 'seen' }),
    JSON.stringify({ 'ai-basics': { status: 'seen' }, 'ai-boundaries': ['seen'] }),
  ];
  for (const raw of invalidStates) {
    const runtime = evaluateLearningRuntime(source, createStorage(raw));
    assert.equal(runtime.getStatus('ai-basics'), 'unseen', `invalid state must be discarded safely: ${raw}`);
    assert.equal(runtime.getStatus('ai-boundaries'), 'unseen', `invalid status shapes must be discarded safely: ${raw}`);
  }

  const sanitized = evaluateLearningRuntime(source, createStorage(JSON.stringify({
    'ai-basics': 'seen',
    'ai-boundaries': 'in-progress',
    'ai-delegation': 'forged',
    unknown: 'seen',
  })));
  assert.equal(sanitized.getStatus('ai-basics'), 'seen', 'known seen state must load');
  assert.equal(sanitized.getStatus('ai-boundaries'), 'in-progress', 'known in-progress state must load');
  assert.equal(sanitized.getStatus('ai-delegation'), 'unseen', 'unknown statuses must not load');
  assert.equal(sanitized.getStatus('unknown'), 'unseen', 'unknown IDs must not load');

  const getFailure = evaluateLearningRuntime(source, createStorage(null, { throwGet: true }));
  assert.doesNotThrow(() => getFailure.getStatus('ai-basics'), 'sessionStorage getItem failure must not interrupt reading');
  assert.equal(getFailure.getStatus('ai-basics'), 'unseen', 'getItem failure must fall back to an empty session state');

  const setFailureStorage = createStorage(null, { throwSet: true });
  const setFailure = evaluateLearningRuntime(source, setFailureStorage);
  assert.doesNotThrow(() => setFailure.markStarted('ai-prompting'), 'sessionStorage setItem failure must not interrupt progress updates');
  assert.equal(setFailure.getStatus('ai-prompting'), 'in-progress', 'memory fallback must keep progress coherent after setItem failure');
  setFailure.markSeen('ai-prompting');
  assert.equal(setFailure.getStatus('ai-prompting'), 'seen', 'memory fallback must preserve later progress updates');

  const orderStorage = createStorage(JSON.stringify({ 'ai-basics': 'seen', 'ai-boundaries': 'in-progress' }));
  const ordered = evaluateLearningRuntime(source, orderStorage);
  assert.equal(ordered.nextIncomplete(), 'ai-boundaries', 'nextIncomplete must return the first non-seen chapter in approved order');
  ordered.markSeen('ai-boundaries');
  assert.equal(ordered.nextIncomplete(), 'ai-delegation', 'nextIncomplete must advance in approved order');
  for (const id of chapterIds) ordered.markSeen(id);
  assert.equal(ordered.nextIncomplete(), null, 'nextIncomplete must return null when all chapters are seen');

  const movedTarget = { innerHTML: '' };
  assert.equal(fresh.renderChapter('ai-models', movedTarget), true, 'legacy company/model routes must render a moved notice');
  assert.match(movedTarget.innerHTML, /已移至\s*AI 工具与资源/, 'legacy route notice must explain where the content moved');
  assert.match(movedTarget.innerHTML, /href=["']resources\.html["']/, 'legacy route notice must link to resources.html');
  assert.doesNotThrow(() => fresh.initHub(), 'initHub must remain safe without a matching DOM hub');

  console.log('PASS beginner learning runtime unit tests (state validation, storage failure, order, legacy routes)');
}

function runRuntimeMutationTest() {
  const source = readRequired('learning-experience.js');
  const downgradeNeedle = "if (state[id] !== STATUS_SEEN && state[id] !== STATUS_STARTED)";
  assert.ok(source.includes(downgradeNeedle), 'runtime downgrade mutation source must contain the seen guard');
  const downgradedSource = source.replace(downgradeNeedle, 'if (true)');
  const downgraded = evaluateLearningRuntime(downgradedSource, createStorage());
  downgraded.markSeen('ai-basics');
  downgraded.markStarted('ai-basics');
  assert.throws(
    () => assert.equal(downgraded.getStatus('ai-basics'), 'seen', 'seen chapters must remain seen'),
    assert.AssertionError,
    'runtime unit assertion must catch the status downgrade mutation',
  );

  const keyStorage = createStorage();
  const keyMutation = evaluateLearningRuntime(source.replace(storageKey, 'wrong-session-key'), keyStorage);
  keyMutation.markStarted('ai-basics');
  assert.throws(
    () => assert.ok(
      keyStorage.calls.get.every((key) => key === storageKey) && keyStorage.calls.set.every(([key]) => key === storageKey),
      'runtime must use only the approved session key',
    ),
    assert.AssertionError,
    'runtime unit assertion must catch the storage-key mutation',
  );

  console.log('PASS beginner learning runtime mutations (seen guard + storage key)');
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
  expectMutation('missing runtime API', (root) => {
    replaceIn(root, 'learning-experience.js', 'renderChapter:renderChapter,read:read', 'read:read');
  }, 'window.AIBeginner.renderChapter must be a function');
  expectMutation('hidden failed status', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><span hidden>未通过</span>');
  }, 'learn.html must not contain prohibited status or assessment copy: 未通过');
  expectMutation('company directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><a href="detail.html?type=learn&id=ai-companies">AI 公司入口</a>');
  }, 'learn hub must not link to the old company or model directory');
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
  expectMutation('missing reduced motion coverage', (root) => {
    replaceIn(root, 'learning-experience.css', '.chapter-return-highlight', '.chapter-return-highlight-missing');
  }, 'reduced-motion block must cover .chapter-return-highlight');
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
    replaceIn(root, 'learn.html', '<main>', '<main><a href="https://www.coursera.org/learn/ai-for-everyone">延伸阅读</a>');
  }, 'learn main must not contain external resource-directory links');

  expectMutationBatch([
    {
      name: 'SEARCH_INDEX push',
      mutate(root) { replaceIn(root, 'search.js', 'window.search=SEARCH_INDEX', "SEARCH_INDEX.push({t:'旧模型',tag:'入门',href:'detail.html?type=learn&id=ai-models'}); window.search=SEARCH_INDEX"); },
      expectedMessage: 'SEARCH_INDEX must not be mutated after its canonical declaration',
    },
    {
      name: 'second SEARCH_INDEX declaration',
      mutate(root) { replaceIn(root, 'search.js', 'window.search=SEARCH_INDEX', 'var SEARCH_INDEX=[]; window.search=SEARCH_INDEX'); },
      expectedMessage: 'SEARCH_INDEX must have exactly one canonical declaration',
    },
    {
      name: 'SEARCH_INDEX reassignment',
      mutate(root) { replaceIn(root, 'search.js', 'window.search=SEARCH_INDEX', 'SEARCH_INDEX=SEARCH_INDEX.slice(); window.search=SEARCH_INDEX'); },
      expectedMessage: 'SEARCH_INDEX must be assigned exactly once',
    },
    {
      name: 'localStorage in template interpolation',
      mutate(root) { replaceIn(root, 'learning-experience.js', 'window.AIBeginner=', 'function hiddenProbe(){ return `${localStorage.getItem("bad")}`; } window.AIBeginner='); },
      expectedMessage: 'learning-experience.js must not use localStorage',
    },
    {
      name: 'HTML named-entity traversal',
      mutate(root) { replaceIn(root, 'learn.html', '<head>', '<head><link rel="stylesheet" href="images&sol;..&sol;..&sol;escape.css">'); },
      expectedMessage: 'local reference must stay inside knowledge-base',
    },
    {
      name: 'CSS escaped traversal',
      mutate(root) { replaceIn(root, 'learning-experience.css', '#0e2144', '#0e2144; background-image: url(images/\\2e\\2e/\\2e\\2e/escape.png)'); },
      expectedMessage: 'local reference must stay inside knowledge-base',
    },
  ]);

  console.log('PASS learning experience contract self-test (valid fixture + 23 mutations)');
}

if (process.argv.includes('--runtime-test')) runRuntimeUnitTest();
else if (process.argv.includes('--runtime-mutation-test')) runRuntimeMutationTest();
else if (process.argv.includes('--self-test')) runSelfTest();
else {
  runContract();
  console.log('PASS AI beginner learning contract');
}
