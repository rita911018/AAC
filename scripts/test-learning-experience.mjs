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
const chapterMinutes = ['约 8 分钟', '约 7 分钟', '约 8 分钟', '约 10 分钟', '约 9 分钟', '约 8 分钟'];
const chapterImages = [
  ['images/ai-concept.webp', 'images/ai-concept.png'],
  ['images/ai-boundaries.webp', 'images/ai-boundaries.png'],
  ['images/ai-delegation.webp', 'images/ai-delegation.png'],
  ['images/ai-prompt.webp', 'images/ai-prompt.png'],
  ['images/ai-verification.webp', 'images/ai-verification.png'],
  ['images/ai-workflow.webp', 'images/ai-workflow.png'],
];
const expectedChapterContent = {
  'ai-basics': {
    sectionTitles: ['先把四个概念放对位置', '大模型在做什么'],
    coreTerms: ['AI', '生成式 AI', '大模型', 'Agent', 'Token', '上下文', '预训练'],
    caseTitle: '为什么新对话不记得上次说过的事？',
    caseTerms: ['新对话', '上下文', '临时工作记忆'],
    exerciseType: 'token-and-concepts',
    exerciseKeys: ['candidates', 'steps'],
    takeawayTitle: 'AI 概念关系图与 8 个工作必懂词',
    takeawayTerms: ['Token', '上下文', '多模态', '幻觉', 'RAG', 'Prompt', '工作流', 'Agent'],
  },
  'ai-boundaries': {
    sectionTitles: ['AI 擅长加速，人擅长把关', '“说得像真的”为什么还会错'],
    coreTerms: ['整理', '改写', '事实确认', '高代价判断', '流畅', '查证'],
    caseTitle: '汇报里出现了原材料没有的增长数字',
    caseTerms: ['原材料', '精确数字', '来源'],
    exerciseType: 'hallucination-spotter',
    exerciseKeys: ['claims'],
    takeawayTitle: 'AI 能力边界清单',
    takeawayTerms: ['绿', '黄', '红'],
  },
  'ai-delegation': {
    sectionTitles: ['三种分工方式', '分工前先问五个问题'],
    coreTerms: ['AI', '人机协作', '人负责', '可验证', '错误代价'],
    caseTitle: '一份月度汇报应该怎么分工？',
    caseTerms: ['数据整理', '优先级判断', '行动'],
    exerciseType: 'delegation-sort',
    exerciseKeys: ['tasks'],
    takeawayTitle: 'AI 任务分工五问',
    takeawayTerms: ['目标清晰', '结果可验证', '错误代价', '业务语境', '最终谁负责'],
  },
  'ai-prompting': {
    sectionTitles: ['提示词就是一份工作 brief', '用多轮协作逐步校准'],
    coreTerms: ['目标', '背景', '任务', '输出要求', '多轮', '具体差距'],
    caseTitle: '从“帮我写汇报”到可执行的任务说明',
    caseTerms: ['宽泛需求', '材料边界', '输出格式'],
    exerciseType: 'prompt-builder',
    exerciseKeys: ['fields', 'reference'],
    takeawayTitle: '四要素 Prompt 模板',
    takeawayTerms: ['目标', '背景', '任务', '输出要求'],
  },
  'ai-verification': {
    sectionTitles: ['先区分回答里的三种内容', '五步核验，再检查可用性'],
    coreTerms: ['事实', '推论', '观点', '来源', '原文', '时间口径', '可追溯'],
    caseTitle: '“销量上升”能否直接证明“营销有效”？',
    caseTerms: ['销量上升', '因果结论', '其他因素'],
    exerciseType: 'evidence-check',
    exerciseKeys: ['claims'],
    takeawayTitle: 'AI 结果核验五步卡',
    takeawayTerms: ['查来源', '对原文', '时间口径', '检查推理', '任务标准'],
  },
  'ai-workflow': {
    sectionTitles: ['从一次成功，到稳定复用', '沉淀一条工作流的五步'],
    coreTerms: ['对话', 'Prompt 模板', '工作流', 'Agent', '输入输出', '检查点'],
    caseTitle: '把每月重复的汇报从对话变成流程',
    caseTerms: ['每月', '步骤', '人机分工', '检查点'],
    exerciseType: 'workflow-builder',
    exerciseKeys: ['steps'],
    takeawayTitle: '个人 AI 工作流画布',
    takeawayTerms: ['拆任务', '输入输出', '明确分工', '设置检查点', '保存模板'],
  },
};
const allowedRuntimeStatuses = new Set(['unseen', 'in-progress', 'seen']);
const learnHeroDescription = '从看懂 AI 到会协作，用六个轻量章节掌握分工、表达与判断。每章都有案例和小练习，无需技术背景。';
const learnHubHeading = '选择一个章节，轻松开始';
const toolkitTitles = ['任务分工卡', '四要素提问模板', '结果验证清单', '工作流拆解模板'];
const toolkitFields = [
  ['目标', 'AI负责', '我负责', '检查点'],
  ['目标', '背景', '任务', '输出要求'],
  ['事实', '来源', '推论', '风险'],
  ['输入', '步骤', '人工判断点', '最终交付'],
];

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

function evaluateLearningRuntime(source, storageOverride, environment = {}) {
  const sessionStorage = storageOverride ?? {
    getItem() { throw new Error('storage unavailable in static contract'); },
    setItem() { throw new Error('storage unavailable in static contract'); },
    removeItem() { throw new Error('storage unavailable in static contract'); },
  };
  const document = environment.document ?? {
    readyState: 'loading',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  const location = environment.location ?? { href: 'https://example.test/learn.html', search: '', hash: '' };
  const navigator = environment.navigator ?? {};
  const window = { document, sessionStorage, location, navigator };
  if (Object.hasOwn(environment, 'matchMedia')) window.matchMedia = environment.matchMedia;
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    sessionStorage,
    URL,
    URLSearchParams,
    location,
    navigator,
    console: { log() {}, warn() {}, error() {} },
    setTimeout: environment.setTimeout ?? function (callback) { callback(); return 0; },
    clearTimeout() {},
  });
  vm.runInContext(source, context, { timeout: 100, displayErrors: true });
  assert.ok(window.AIBeginner && typeof window.AIBeginner === 'object', 'learning-experience.js must expose window.AIBeginner');
  return window.AIBeginner;
}

function createHubStateHarness() {
  const countNode = { textContent: '0' };
  const summary = { textContent: '已看 0 / 6' };
  const continueLink = { setAttribute() {} };
  return {
    countNode,
    summary,
    root: {
      querySelectorAll(selector) {
        if (selector === '.learning-card' || selector === '[data-copy-template]') return [];
        return [];
      },
      querySelector(selector) {
        if (selector === '[data-learning-summary]') return summary;
        if (selector === '[data-learning-seen-count]') return countNode;
        if (selector === '[data-learning-continue]') return continueLink;
        return null;
      },
    },
  };
}

function createMiniDom() {
  class MiniNode {
    constructor(ownerDocument, tagName = '', text = '') {
      this.ownerDocument = ownerDocument;
      this.tagName = tagName ? tagName.toUpperCase() : '';
      this.nodeType = tagName ? 1 : 3;
      this.children = [];
      this.parentNode = null;
      this.className = '';
      this.disabled = false;
      this.hidden = false;
      this.open = false;
      this._text = String(text);
      this._attributes = new Map();
      this._listeners = new Map();
      this._innerHtmlWrites = [];
    }
    get textContent() {
      return this._text + this.children.map((child) => child.textContent).join('');
    }
    set textContent(value) {
      this._text = String(value ?? '');
      this.children = [];
    }
    get innerHTML() { return this._innerHtmlWrites.at(-1) ?? ''; }
    get innerHtmlWrites() { return [...this._innerHtmlWrites]; }
    set innerHTML(value) {
      this._innerHtmlWrites.push(String(value));
      this._text = String(value);
      this.children = [];
    }
    setAttribute(name, value) { this._attributes.set(String(name), String(value)); }
    getAttribute(name) { return this._attributes.get(String(name)) ?? null; }
    removeAttribute(name) { this._attributes.delete(String(name)); }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    replaceChildren(...children) {
      this._text = '';
      this.children = [];
      for (const child of children) this.appendChild(child);
    }
    addEventListener(type, listener) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(listener);
    }
    dispatchEvent(event) {
      event.currentTarget = this;
      for (const listener of this._listeners.get(event.type) ?? []) listener.call(this, event);
    }
    matches(selector) {
      if (selector === '*') return this.nodeType === 1;
      if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
      const attribute = /^\[([^\]=]+)(?:=["']?([^\]"']+)["']?)?\]$/.exec(selector);
      if (attribute) {
        if (!this._attributes.has(attribute[1])) return false;
        return attribute[2] === undefined || this._attributes.get(attribute[1]) === attribute[2];
      }
      return this.tagName === selector.toUpperCase();
    }
    querySelectorAll(selector) {
      const matches = [];
      for (const child of this.children) {
        if (child.matches && child.matches(selector)) matches.push(child);
        if (child.querySelectorAll) matches.push(...child.querySelectorAll(selector));
      }
      return matches;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    walk(visitor) {
      visitor(this);
      for (const child of this.children) child.walk(visitor);
    }
  }
  const document = {
    readyState: 'complete',
    addEventListener() {},
    createElement(tagName) { return new MiniNode(document, tagName); },
    createTextNode(text) { return new MiniNode(document, '', text); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  return { document, createTarget() { return document.createElement('div'); } };
}

function collectInnerHtmlWrites(root) {
  const writes = [];
  root.walk((node) => writes.push(...node.innerHtmlWrites));
  return writes;
}

function assertNoSentinelInnerHtmlWrites(root, sentinels, message) {
  const writes = collectInnerHtmlWrites(root);
  for (const sentinel of sentinels) {
    assert.ok(!writes.some((write) => write.includes(sentinel)), `${message}: ${sentinel}`);
  }
  return writes;
}

function instrumentChapterDisplayText(chapter) {
  let sequence = 0;
  const sentinelByPath = new Map();
  const structuralStringPaths = new Set(['id', 'number', 'image.webp', 'image.fallback', 'history.image.webp', 'history.image.fallback', 'exercise.type']);
  function visit(value, pathParts) {
    const pathName = pathParts.join('.');
    if (typeof value === 'string') {
      if (structuralStringPaths.has(pathName)) return value;
      sequence += 1;
      const sentinel = `[[AI_BEGINNER_DISPLAY_${String(sequence).padStart(3, '0')}_${pathName.replace(/[^a-zA-Z0-9]+/g, '_')}]]`;
      sentinelByPath.set(pathName, sentinel);
      return `${sentinel} ${value}`;
    }
    if (Array.isArray(value)) return value.map((item, index) => visit(item, [...pathParts, String(index)]));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, [...pathParts, key])]));
    }
    return value;
  }
  return {
    chapter: visit(plainClone(chapter), []),
    sentinelByPath,
    sentinels: [...sentinelByPath.values()],
  };
}

function installInstrumentedChapter(runtime, id = 'ai-basics') {
  const liveChapter = runtime.chapters.find((chapter) => chapter.id === id);
  assert.ok(liveChapter, `instrumented runtime must expose ${id}`);
  const instrumented = instrumentChapterDisplayText(liveChapter);
  Object.assign(liveChapter, instrumented.chapter);
  return instrumented;
}

function createCopyHarness(templateText, options = {}) {
  const feedbackHistory = [];
  let feedbackText = '';
  const feedback = {
    get textContent() { return feedbackText; },
    set textContent(value) {
      feedbackText = value;
      feedbackHistory.push(value);
    },
  };
  const template = { textContent: templateText };
  let fallback = null;
  const document = {
    createElement(tagName) {
      assert.equal(tagName, 'textarea', 'manual-copy fallback must use a textarea');
      const attributes = new Map();
      const textarea = {
        tagName: 'TEXTAREA',
        className: '',
        value: '',
        readOnly: false,
        hidden: false,
        focused: false,
        selected: false,
        selectionStart: null,
        selectionEnd: null,
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        focus() { this.focused = true; },
        select() {
          this.selected = true;
          this.selectionStart = 0;
          this.selectionEnd = this.value.length;
        },
        setSelectionRange(start, end) {
          this.selectionStart = start;
          this.selectionEnd = end;
        },
      };
      if (options.noSelect) delete textarea.select;
      return textarea;
    },
  };
  const card = {
    ownerDocument: document,
    querySelector(selector) {
      if (selector === '[data-template-content]') return template;
      if (selector === '[data-copy-feedback]') return feedback;
      if (selector === '[data-copy-fallback]') return fallback;
      return null;
    },
    appendChild(node) { fallback = node; return node; },
  };
  let handler = null;
  const attributes = new Map();
  const button = {
    disabled: false,
    addEventListener(type, listener) { if (type === 'click') handler = listener; },
    closest(selector) { return selector === '.learning-tool-card' ? card : null; },
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  };
  return {
    button,
    feedback,
    feedbackHistory,
    get fallback() { return fallback; },
    click() {
      assert.equal(typeof handler, 'function', 'copy button must receive a click handler');
      if (!button.disabled) handler();
    },
    root: {
      querySelectorAll(selector) {
        if (selector === '[data-copy-template]') return [button];
        if (selector === '.learning-card') return [];
        return [];
      },
      querySelector() { return null; },
    },
  };
}

function createHubReturnHarness(chapterId = 'ai-basics') {
  const scrollCalls = [];
  const classChanges = [];
  const card = {
    classList: {
      add(value) { classChanges.push(['add', value]); },
      remove(value) { classChanges.push(['remove', value]); },
    },
    getAttribute(name) {
      if (name === 'data-chapter-id') return chapterId;
      if (name === 'href') return `detail.html?type=learn&id=${chapterId}`;
      return null;
    },
    setAttribute() {},
    querySelector() { return null; },
    scrollIntoView(options) { scrollCalls.push(options); },
    focus() {},
  };
  const root = {
    querySelectorAll(selector) { return selector === '.learning-card' ? [card] : []; },
    querySelector() { return null; },
  };
  return { card, classChanges, root, scrollCalls };
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
    assert.equal(card.attributes.get('id'), `chapter-${chapterIds[index]}`, `learning card ${index + 1} must expose its return anchor`);
    assert.equal(card.attributes.get('data-chapter-id'), chapterIds[index], `learning card ${index + 1} must expose its chapter ID`);
    const descendants = parseElements(card.innerHtml, `learning card ${index + 1}`);
    const headings = descendants.filter((element) => ['h2', 'h3'].includes(element.tagName) && isVisible(element));
    assert.equal(headings.length, 1, `learning card ${index + 1} must contain exactly one visible h2 or h3`);
    actualTitles.push(visibleText(headings[0].innerHtml, `learning card ${index + 1} title`));
    const statuses = descendants.filter((element) => hasClass(element, 'learning-status') && isVisible(element));
    assert.equal(statuses.length, 1, `learning card ${index + 1} must contain exactly one visible status`);
    const status = visibleText(statuses[0].innerHtml, `learning card ${index + 1} status`);
    assert.equal(status, '未看', `learning card ${index + 1} must remain statically usable with the initial 未看 state`);
    const descriptions = descendants.filter((element) => element.tagName === 'p' && isVisible(element));
    assert.ok(descriptions.some((element) => visibleText(element.innerHtml, `learning card ${index + 1} description`).length > 0),
      `learning card ${index + 1} must contain a visible description`);
    const actions = descendants.filter((element) => hasClass(element, 'learning-card-action') && isVisible(element));
    assert.equal(actions.length, 1, `learning card ${index + 1} must contain one visible action`);
    assert.ok(visibleText(actions[0].innerHtml, `learning card ${index + 1} action`).length > 0,
      `learning card ${index + 1} action must contain copy`);
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
  const learnHeadings = learnElements.filter((element) => /^h[1-6]$/.test(element.tagName) && isVisible(element));
  const h1s = learnHeadings.filter((element) => element.tagName === 'h1');
  assert.equal(h1s.length, 1, 'learn.html must contain exactly one visible h1');
  assert.equal(visibleText(h1s[0].innerHtml, 'learn h1'), 'AI 新手入门', 'learn hero heading must match the approved copy');
  assert.ok(visibleMainCopy.includes(learnHeroDescription), 'learn hero description must match the approved copy');
  assert.equal(learnHeadings.filter((element) => visibleText(element.innerHtml, 'learn heading') === learnHubHeading).length, 1,
    'learn hub heading must match the approved copy');

  const learningStyles = learnElements.filter((element) => element.tagName === 'link' && element.attributes.get('rel') === 'stylesheet' &&
    element.attributes.get('href') === 'learning-experience.css');
  assert.equal(learningStyles.length, 1, 'learn.html must load learning-experience.css exactly once');
  const learningScripts = learnElements.filter((element) => element.tagName === 'script' && element.attributes.get('src') === 'learning-experience.js');
  assert.equal(learningScripts.length, 1, 'learn.html must load learning-experience.js exactly once');
  assert.match(learn, /AIBeginner\.initHub\s*\(/, 'learn.html must initialize the learning hub runtime');

  const heroPictures = learnElements.filter((element) => element.tagName === 'picture' && isVisible(element));
  assert.equal(heroPictures.length, 1, 'learn hero must retain exactly one visible Xiao A picture');
  const heroMedia = parseElements(heroPictures[0].innerHtml, 'learn hero picture');
  const heroSources = heroMedia.filter((element) => element.tagName === 'source');
  const heroImages = heroMedia.filter((element) => element.tagName === 'img');
  assert.equal(heroSources.length, 1, 'learn hero picture must contain one WebP source');
  assert.equal(heroSources[0].attributes.get('type'), 'image/webp', 'learn hero must prefer WebP');
  assert.match(heroSources[0].attributes.get('srcset') ?? '', /\.webp(?:\s|$)/, 'learn hero source must reference WebP');
  assert.equal(heroImages.length, 1, 'learn hero picture must contain one PNG fallback');
  assert.match(heroImages[0].attributes.get('src') ?? '', /\.png$/, 'learn hero image must provide a PNG fallback');
  assert.ok(Number(heroImages[0].attributes.get('width')) > 0 && Number(heroImages[0].attributes.get('height')) > 0,
    'learn hero image must declare positive dimensions');
  assert.ok((heroImages[0].attributes.get('alt') ?? '').trim().length > 0, 'learn hero image must provide alt text');

  const continueLinks = learnElements.filter((element) => element.tagName === 'a' && element.attributes.has('data-learning-continue') && isVisible(element));
  assert.equal(continueLinks.length, 1, 'learn hub must contain one session-aware continue link');
  const summaries = learnElements.filter((element) => hasClass(element, 'learning-session-summary') && isVisible(element));
  assert.equal(summaries.length, 1, 'learn.html must contain one visible session summary');
  assert.equal(visibleText(summaries[0].innerHtml, 'learning session summary'), '已看 0 / 6', 'session summary must have the approved static fallback');
  const summaryParts = parseElements(summaries[0].innerHtml, 'learning session summary');
  assert.equal(summaryParts.filter((element) => element.attributes.has('data-learning-seen-count')).length, 1,
    'session summary must expose one seen-count update target');

  const toolkits = learnElements.filter((element) => hasClass(element, 'learning-toolkit') && isVisible(element));
  assert.equal(toolkits.length, 1, 'learn.html must contain one visible copyable toolkit');
  assert.ok(toolkits[0].openStart > cards.at(-1).closeEnd, 'copyable toolkit must appear after the six chapter cards');
  const footer = uniqueElement(learnElements, (element) => element.tagName === 'footer' && isVisible(element), 'learn.html must contain exactly one footer');
  assert.ok(toolkits[0].closeEnd < footer.openStart, 'copyable toolkit must appear before the footer');
  const toolkitElements = parseElements(toolkits[0].innerHtml, 'learning toolkit');
  const toolCards = toolkitElements.filter((element) => element.tagName === 'article' && hasClass(element, 'learning-tool-card') && isVisible(element));
  assert.equal(toolCards.length, 4, 'learning toolkit must contain exactly four tool cards');
  for (const [index, toolCard] of toolCards.entries()) {
    const descendants = parseElements(toolCard.innerHtml, `tool card ${index + 1}`);
    const headings = descendants.filter((element) => /^h[1-6]$/.test(element.tagName) && isVisible(element));
    assert.equal(headings.length, 1, `tool card ${index + 1} must contain one visible heading`);
    assert.equal(visibleText(headings[0].innerHtml, `tool card ${index + 1} heading`), toolkitTitles[index],
      `tool card ${index + 1} title must match the approved tool`);
    assert.ok(descendants.some((element) => element.tagName === 'p' && isVisible(element) && visibleText(element.innerHtml, `tool card ${index + 1} description`).length > 0),
      `tool card ${index + 1} must contain a short visible description`);
    const templates = descendants.filter((element) => element.tagName === 'pre' && isVisible(element));
    assert.equal(templates.length, 1, `tool card ${index + 1} must contain one visible preformatted template`);
    const templateCopy = visibleText(templates[0].innerHtml, `tool card ${index + 1} template`);
    for (const field of toolkitFields[index]) assert.ok(templateCopy.includes(field), `tool card ${index + 1} template must include ${field}`);
    assert.equal(descendants.filter((element) => element.attributes.has('data-template-content')).length, 1,
      `tool card ${index + 1} must expose one copy source`);
    const copyButtons = descendants.filter((element) => element.tagName === 'button' && element.attributes.has('data-copy-template') && isVisible(element));
    assert.equal(copyButtons.length, 1, `tool card ${index + 1} must contain one semantic copy button`);
    assert.equal(visibleText(copyButtons[0].innerHtml, `tool card ${index + 1} button`), '复制模板',
      `tool card ${index + 1} copy button must use the approved label`);
    const feedback = descendants.filter((element) => element.attributes.has('data-copy-feedback') && isVisible(element));
    assert.equal(feedback.length, 1, `tool card ${index + 1} must contain one copy feedback region`);
    assert.equal(feedback[0].attributes.get('aria-live'), 'polite', `tool card ${index + 1} feedback must use polite live announcements`);
  }
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
    for (const field of ['id', 'number', 'title', 'description', 'image', 'sections', 'caseStudy', 'exercise', 'quickCheck', 'takeaway']) {
      assert.ok(Object.hasOwn(chapter, field), `${chapterIds[index]} must define ${field}`);
      assert.ok(chapter[field] !== null && chapter[field] !== undefined && !(typeof chapter[field] === 'string' && !chapter[field].trim()),
        `${chapterIds[index]}.${field} must contain learning content`);
    }
    assert.equal(chapter.number, String(index + 1).padStart(2, '0'), `${chapterIds[index]} must use its canonical chapter number`);
    assert.deepEqual([chapter.image.webp, chapter.image.fallback], chapterImages[index], `${chapterIds[index]} must use the approved WebP and fallback image`);
    assert.ok(typeof chapter.image.alt === 'string' && chapter.image.alt.trim(), `${chapterIds[index]} image must have meaningful alt text`);
    assert.ok(Array.isArray(chapter.sections) && chapter.sections.length >= 2, `${chapterIds[index]} must include complete core-content sections`);
    assert.ok(Array.isArray(chapter.quickCheck) && chapter.quickCheck.length >= 2, `${chapterIds[index]} must include at least two low-pressure review prompts`);
    const expected = expectedChapterContent[chapter.id];
    assert.deepEqual(chapter.sections.map(({ title }) => title), expected.sectionTitles,
      `${chapter.id} section titles must match the approved learning arc`);
    const coreCopy = JSON.stringify(chapter.sections);
    for (const term of expected.coreTerms) assert.ok(coreCopy.includes(term), `${chapter.id} core content must cover ${term}`);
    assert.equal(chapter.caseStudy.title, expected.caseTitle, `${chapter.id} case study must use the approved workplace scenario`);
    const caseCopy = JSON.stringify(chapter.caseStudy);
    for (const term of expected.caseTerms) assert.ok(caseCopy.includes(term), `${chapter.id} case study must retain ${term}`);
    assert.equal(chapter.exercise.type, expected.exerciseType, `${chapter.id} exercise must use ${expected.exerciseType}`);
    for (const key of expected.exerciseKeys) assert.ok(Object.hasOwn(chapter.exercise, key), `${chapter.id} exercise must define ${key}`);
    assert.equal(chapter.takeaway.title, expected.takeawayTitle, `${chapter.id} takeaway must match the approved tool`);
    const takeawayCopy = JSON.stringify(chapter.takeaway);
    for (const term of expected.takeawayTerms) assert.ok(takeawayCopy.includes(term), `${chapter.id} takeaway must retain ${term}`);
    assert.ok(typeof chapter.takeaway.template === 'string' && chapter.takeaway.template.trim(), `${chapter.id} takeaway must include a reusable template`);
  }
  const basics = api.chapters[0];
  assert.equal(basics.exercise.candidates.length, 3, 'ai-basics token exercise must expose three candidates');
  assert.ok(basics.exercise.candidates.every(({ label, probability }) => typeof label === 'string' && label && Number.isFinite(probability)),
    'ai-basics token candidates must have labels and numeric probabilities');
  assert.equal(basics.exercise.candidates.reduce((sum, { probability }) => sum + probability, 0), 100,
    'ai-basics token candidate probabilities must sum to 100');
  assert.deepEqual(basics.exercise.steps, ['切分 Token', '读取上下文', '预测候选', '选择下一个 Token', '重复直到完成'],
    'ai-basics exercise must retain the approved five-step model flow');
  assert.ok(basics.takeaway.template.includes('AI → 生成式 AI → 大模型'),
    'ai-basics takeaway must make the AI / generative AI / model relationship explicit');
  assert.ok(basics.takeaway.template.includes('Agent = 大模型 + 目标拆解 + 工具 + 执行循环'),
    'ai-basics takeaway must explain Agent as model plus goal, tools, and execution loop');
  assert.deepEqual(api.chapters[1].exercise.claims.map(({ category }) => category), ['可以保留', '需要核验', '需要修改'],
    'ai-boundaries exercise must retain the three non-punitive review states');
  assert.ok(api.chapters[1].exercise.claims.some(({ text }) => /\d/.test(text)), 'ai-boundaries exercise must include a numeric claim to verify');
  assert.deepEqual(api.chapters[2].exercise.tasks.map(({ lane }) => lane), ['AI', '人机协作', '人负责'],
    'ai-delegation exercise must cover all three delegation lanes');
  assert.deepEqual(api.chapters[3].exercise.fields, ['目标', '背景', '任务', '输出要求'],
    'ai-prompting exercise must retain the four approved brief fields');
  for (const field of api.chapters[3].exercise.fields) assert.ok(api.chapters[3].exercise.reference.includes(field),
    `ai-prompting reference brief must demonstrate ${field}`);
  assert.deepEqual(api.chapters[4].exercise.claims.map(({ kind }) => kind), ['事实', '推论', '观点'],
    'ai-verification exercise must distinguish fact, inference, and opinion');
  assert.ok(api.chapters[4].exercise.claims.every(({ evidence }) => typeof evidence === 'string' && evidence.trim()),
    'ai-verification exercise must connect every claim to evidence guidance');
  assert.ok(api.chapters[5].exercise.steps.length >= 4, 'ai-workflow exercise must contain sortable workflow steps');
  assert.deepEqual(api.chapters[5].exercise.steps.map(({ text }) => text),
    ['收集当月数据', '提取变化与异常', '核对来源和口径', '生成汇报初稿', '确定优先级并交付'],
    'ai-workflow exercise must retain the approved sortable monthly-report sequence');
  assert.ok(api.chapters[5].exercise.steps.some(({ owner, checkpoint }) => owner === '人负责' && checkpoint === true),
    'ai-workflow exercise must retain a human-owned checkpoint');
  assert.deepEqual(api.aliases, aliases, 'legacy learning URL aliases must map to the approved new chapters');
  const renderChapterSource = learningScript.slice(
    learningScript.indexOf('function renderChapter('),
    learningScript.indexOf('window.AIBeginner ='),
  );
  assert.ok(renderChapterSource.length > 0, 'renderChapter implementation must be inspectable');
  assert.ok(!/\.innerHTML\s*=\s*(?:chapter|check|sectionData|exercise|takeaway|caseStudy|[A-Za-z_$][\w$]*\.)/.test(renderChapterSource),
    'chapter metadata and questions must render without innerHTML string assembly');
  const movedNoticeSource = learningScript.slice(
    learningScript.indexOf('function renderMovedNotice('),
    learningScript.indexOf('function canonicalizeLearningUrl('),
  );
  assert.ok(movedNoticeSource.length > 0, 'legacy moved-route renderer must be inspectable');
  assert.ok(!/(?:OpenAI|Claude|Gemini|DeepSeek|Qwen|GPT)/i.test(movedNoticeSource),
    'legacy moved-route renderer must not retain old company or model directory content');

  const learningCss = readRequired('learning-experience.css');
  const requiredCssClasses = [
    'learning-hub', 'learning-card', 'learning-status', 'lesson-nav', 'lesson-figure',
    'lesson-case', 'lesson-exercise', 'lesson-check', 'lesson-takeaway', 'lesson-actions',
    'learning-session-summary', 'learning-toolkit', 'learning-tool-card', 'learning-tool-copy', 'tool-copy-fallback', 'progress-compat-cta',
  ];
  for (const className of requiredCssClasses) {
    assert.ok(new RegExp(`\\.${className}(?![-_a-zA-Z0-9])`).test(learningCss), `learning-experience.css must define .${className}`);
  }
  const reducedMotion = findCssBlock(
    learningCss.replace(/\/\*[\s\S]*?\*\//g, ''),
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i,
    'learning-experience.css reduced-motion media query',
  );
  for (const className of ['learning-card', 'lesson-token', 'lesson-feedback', 'chapter-return-highlight', 'learning-tool-card', 'tool-copy-feedback', 'tool-copy-fallback']) {
    assert.ok(new RegExp(`\\.${className}(?![-_a-zA-Z0-9])`).test(reducedMotion), `reduced-motion block must cover .${className}`);
  }
  assert.match(reducedMotion, /scroll-behavior\s*:\s*auto\b/i, 'reduced-motion block must disable smooth scrolling');
  assert.match(reducedMotion, /transition\s*:\s*none\b/i, 'reduced-motion block must disable transitions');
  assert.match(reducedMotion, /animation\s*:\s*none\b/i, 'reduced-motion block must disable animations');

  const detail = readRequired('detail.html');
  const detailElements = parseElements(detail, 'detail.html');
  const learningScriptTags = detailElements.filter((element) => element.tagName === 'script' && element.attributes.get('src') === 'learning-experience.js');
  assert.equal(learningScriptTags.length, 1, 'detail.html must load learning-experience.js exactly once');
  const detailLearningStyles = detailElements.filter((element) => element.tagName === 'link' && element.attributes.get('rel') === 'stylesheet' && element.attributes.get('href') === 'learning-experience.css');
  assert.equal(detailLearningStyles.length, 1, 'detail.html must load learning-experience.css exactly once');
  const inlineRendererStart = detail.indexOf('/* ================= 渲染主流程 ================= */');
  const learningScriptStart = detail.indexOf('<script src="learning-experience.js"></script>');
  assert.ok(learningScriptStart >= 0 && learningScriptStart < inlineRendererStart,
    'detail.html must load learning-experience.js before the inline renderer');
  assert.match(detail, /case\s+['"]learning['"]\s*:[\s\S]*?titleEl\.textContent\s*=\s*['"]轻量学习['"][\s\S]*?noteEl\.textContent\s*=\s*['"]LEARN · TRY · REVIEW['"][\s\S]*?AIBeginner\.renderChapter\s*\(\s*id\s*,\s*bodyEl\s*\)/,
    'detail learning renderer must delegate to AIBeginner with the approved labels');
  for (const [index, id] of chapterIds.entries()) {
    const configPattern = new RegExp(`['"]${id}['"]\\s*:\\s*\\{[^}]*structure\\s*:\\s*['"]learning['"][^}]*meta\\s*:\\s*\\[[^\\]]*${chapterMinutes[index].replace(/ /g, '\\s*')}[^\\]]*\\]`, 's');
    assert.match(detail, configPattern, `${id} detail config must be a learning route with ${chapterMinutes[index]}`);
  }
  assert.match(detail, /history\.replaceState\s*\(/, 'legacy learning aliases must canonicalize the URL with history.replaceState');

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
  const progressEntries = plainClone(searchIndex).filter(({ t }) => t === '本次学习进度');
  assert.equal(progressEntries.length, 1, 'search index must expose one 本次学习进度 entry');
  assert.equal(progressEntries[0].href, 'learn.html', 'search progress entry must point to learn.html');

  const progress = readRequired('progress.html');
  const progressCopy = textContent(progress).replace(/\s+/g, ' ');
  for (const forbidden of ['localStorage', '长期保存', '永久保存', '自动保存在这台设备', '保存在本机浏览器', '换设备不会同步']) {
    assert.ok(!progressCopy.includes(forbidden), `progress.html must not promise long-term local storage: ${forbidden}`);
  }
  assert.ok(progressCopy.includes('进度只在本次标签会话有效'), 'progress.html must explain the session-only progress scope');
  const progressElements = parseElements(progress, 'progress.html');
  const progressCtas = progressElements.filter((element) => element.tagName === 'a' && element.attributes.get('href') === 'learn.html' &&
    isVisible(element) && visibleText(element.innerHtml, 'progress CTA') === '进入 AI 新手入门');
  assert.equal(progressCtas.length, 1, 'progress.html must provide one compatibility CTA to AI 新手入门');
  assert.ok(hasClass(progressCtas[0], 'progress-compat-cta'), 'progress CTA must use the dedicated accessible target class');
  assert.equal(parseElements(progressCtas[0].innerHtml, 'progress CTA').length, 0, 'progress CTA must contain only its clear text label');
  assert.equal(progressElements.filter((element) => element.tagName === 'a' && hasClass(element, 'entry-card')).length, 0,
    'progress compatibility copy must not be wrapped in a full-card anchor');

  for (const pageName of ['index.html', 'video.html', 'resources.html', 'learn.html', 'progress.html']) {
    const page = readRequired(pageName);
    const pageElements = parseElements(page, pageName);
    const footer = uniqueElement(pageElements, (element) => element.tagName === 'footer' && isVisible(element), `${pageName} must contain exactly one footer`);
    const footerLinks = parseElements(footer.innerHtml, `${pageName} footer`)
      .filter((element) => element.tagName === 'a' && isVisible(element));
    assert.equal(footerLinks.filter((element) => visibleText(element.innerHtml, `${pageName} footer link`) === '继续学习' &&
      element.attributes.get('href') === 'learn.html').length, 1, `${pageName} footer must contain one 继续学习 link to learn.html`);
    assert.equal(footerLinks.filter((element) => element.attributes.get('href') === 'progress.html').length, 0,
      `${pageName} footer must not link to the legacy progress route`);
  }
}

function fixtureFiles(order = chapterIds) {
  const cards = order.map((id) => {
    const index = chapterIds.indexOf(id);
    return `<a class="learning-card" id="chapter-${id}" data-chapter-id="${id}" href="${chapterHrefs[index]}"><h2>${titles[index]}</h2><p>章节说明</p><span class="learning-status">未看</span><span class="learning-card-action">开始学习</span></a>`;
  }).join('\n');
  const approvedRuntime = evaluateLearningApi(readRequired('learning-experience.js'));
  const chapters = approvedRuntime.chapters.map((chapter) => JSON.stringify(chapter)).join(',\n');
  const detailConfigs = chapterIds.map((id, index) => `'${id}':{name:${JSON.stringify(titles[index])},structure:'learning',meta:['轻量学习','${chapterMinutes[index]}']}`).join(',');
  const searchEntries = chapterIds.map((id, index) => `{t:${JSON.stringify(titles[index])},d:'章节',tag:'入门',href:${JSON.stringify(chapterHrefs[index])}}`).join(',\n');
  const toolCards = toolkitTitles.map((title, index) => `<article class="learning-tool-card"><h3>${title}</h3><p>轻量说明</p><pre><code data-template-content>${toolkitFields[index].join('：\n')}：</code></pre><button class="learning-tool-copy" type="button" data-copy-template>复制模板</button><span class="tool-copy-feedback" data-copy-feedback aria-live="polite"></span></article>`).join('');
  return {
    'learn.html': `<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body>
      <!-- <a class="learning-card"><h2>decoy 未通过</h2></a> -->
      <script>var decoy='<a class="learning-card">decoy 未通过</a>';</script>
      <main><h1>AI 新手入门</h1><p>${learnHeroDescription}</p><picture><source srcset="img/xiaoa-learn.webp" type="image/webp"><img src="img/xiaoa-learn.png" width="432" height="480" alt="小A学习插画"></picture><h2>${learnHubHeading}</h2><a href="${chapterHrefs[0]}" data-learning-continue>继续学习</a><p class="learning-session-summary" data-learning-summary>已看 <span data-learning-seen-count>0</span> / 6</p><p>章节案例可以自然提到 AI 公司、主流 AI 模型、推荐课程、精选视频或值得关注的博主，不代表这里承载资源目录。必要时可引用<a href="https://www.anthropic.com/research">单一权威来源</a>。</p><section class="learning-hub"><a class="learning-card" hidden href="detail.html?type=learn&id=hidden"><h2>隐藏占位</h2><span class="learning-status">未看</span></a>${cards}</section><section class="learning-toolkit"><h2>可复制工具</h2>${toolCards}</section></main><footer><a href="learn.html">继续学习</a></footer><script src="learning-experience.js"></script><script>window.AIBeginner.initHub();</script></body></html>`,
    'detail.html': `<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body><main id="learningExperience"></main><script src="learning-experience.js"></script><script>var CONFIG={learn:{subs:{${detailConfigs}}}}; history.replaceState(null,'',''); /* ================= 渲染主流程 ================= */ switch(sub.structure){case 'learning':titleEl.textContent='轻量学习';noteEl.textContent='LEARN · TRY · REVIEW';window.AIBeginner.renderChapter(id,bodyEl);break;}</script></body></html>`,
    'progress.html': '<!doctype html><html><head><link rel="stylesheet" href="learning-experience.css"></head><body><main><p>进度只在本次标签会话有效。</p><article class="progress-compat-card"><p>兼容说明</p><a class="progress-compat-cta" href="learn.html">进入 AI 新手入门</a></article></main><footer><a href="learn.html">继续学习</a></footer></body></html>',
    'search.js': `(function(){ var SEARCH_INDEX=[${searchEntries},{t:'本次学习进度',tag:'功能',href:'learn.html'},{t:'AI 公司介绍',tag:'资源',href:'resources.html'}]; var decoy='SEARCH_INDEX.push({tag:"入门"})'; /* SEARCH_INDEX = []; */ window.search=SEARCH_INDEX; }());`,
    'index.html': '<!doctype html><html><body><main></main><footer><a href="learn.html">继续学习</a></footer></body></html>',
    'video.html': '<!doctype html><html><body><main></main><footer><a href="learn.html">继续学习</a></footer></body></html>',
    'resources.html': '<!doctype html><html><body><main></main><footer><a href="learn.html">继续学习</a></footer></body></html>',
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
      function renderMovedNotice(){ return '已移至 AI 工具与资源'; }
      function canonicalizeLearningUrl(){ return true; }
      function renderChapter(){ var nextId=''; var chapter={caseStudy:{lesson:''}}; var ownerDocument={createTextNode:function(){}}; function element(){} element(ownerDocument,'fieldset'); element(ownerDocument,'legend'); ownerDocument.createTextNode(chapter.caseStudy.lesson); if(nextId){ return 'detail.html?type=learn&id='; } return true; }
      window.AIBeginner={chapters:chapters,aliases:aliases,getStatus:getStatus,markStarted:markStarted,markSeen:markSeen,nextIncomplete:nextIncomplete,initHub:initHub,renderChapter:renderChapter,read:read};
    }());`,
    'learning-experience.css': `.learning-hub,.learning-card,.learning-status,.lesson-nav,.lesson-figure,.lesson-case,.lesson-exercise,.lesson-check,.lesson-takeaway,.lesson-actions,.learning-session-summary,.learning-toolkit,.learning-tool-card,.learning-tool-copy,.tool-copy-fallback,.progress-compat-cta { color: #0e2144; }
      @media (prefers-reduced-motion: reduce) {
        .learning-card,.lesson-token,.lesson-feedback,.chapter-return-highlight,.learning-tool-card,.tool-copy-feedback,.tool-copy-fallback { scroll-behavior:auto; transition:none; animation:none; }
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

  function assertSeenSummary(name, rawState, expectedCount, storageOptions) {
    const harness = createHubStateHarness();
    const runtime = evaluateLearningRuntime(source, createStorage(rawState, storageOptions));
    assert.doesNotThrow(() => runtime.initHub(harness.root), `${name} must not interrupt hub initialization`);
    assert.equal(harness.countNode.textContent, String(expectedCount), `${name} must render 已看 ${expectedCount} / 6`);
  }
  assertSeenSummary('fresh session summary', null, 0);
  assertSeenSummary('partial session summary', JSON.stringify({
    'ai-basics': 'seen',
    'ai-boundaries': 'in-progress',
    'ai-delegation': 'seen',
  }), 2);
  assertSeenSummary('complete session summary', JSON.stringify(Object.fromEntries(chapterIds.map((id) => [id, 'seen']))), 6);
  assertSeenSummary('storage failure summary fallback', null, 0, { throwGet: true });

  const copied = [];
  const successCopy = createCopyHarness('目标：完成月报');
  const copyRuntime = evaluateLearningRuntime(source, createStorage(), {
    navigator: {
      clipboard: {
        writeText(value) {
          copied.push(value);
          return { then(resolve) { resolve(); } };
        },
      },
    },
  });
  copyRuntime.initHub(successCopy.root);
  successCopy.click();
  assert.deepEqual(copied, ['目标：完成月报'], 'copy tool must send only its template text to the Clipboard API');
  assert.equal(successCopy.feedback.textContent, '已复制', 'successful copy must announce 已复制');
  assert.equal(successCopy.fallback, null, 'successful copy must not expose a manual-copy textarea');
  assert.equal(successCopy.button.disabled, false, 'successful copy must restore the copy button');
  assert.equal(successCopy.button.getAttribute('aria-busy'), null, 'successful copy must clear the busy state');

  const throwingCopy = createCopyHarness('事实：');
  const throwingCopyRuntime = evaluateLearningRuntime(source, createStorage(), {
    navigator: { clipboard: { writeText() { throw new Error('clipboard denied'); } } },
  });
  throwingCopyRuntime.initHub(throwingCopy.root);
  assert.doesNotThrow(() => throwingCopy.click(), 'clipboard exceptions must not interrupt the learning hub');
  assert.equal(throwingCopy.feedback.textContent, '请手动复制', 'clipboard exceptions must announce the manual-copy fallback');
  assert.ok(throwingCopy.fallback, 'clipboard exceptions must expose a manual-copy textarea');
  assert.equal(throwingCopy.fallback.value, '事实：', 'manual-copy textarea must preserve the exact template');
  assert.equal(throwingCopy.fallback.readOnly, true, 'manual-copy textarea must be readonly');
  assert.equal(throwingCopy.fallback.hidden, false, 'manual-copy textarea must remain visible');
  assert.equal(throwingCopy.fallback.focused, true, 'manual-copy textarea must receive focus');
  assert.equal(throwingCopy.fallback.selected, true, 'manual-copy textarea must select its contents');
  assert.deepEqual([throwingCopy.fallback.selectionStart, throwingCopy.fallback.selectionEnd], [0, '事实：'.length],
    'manual-copy textarea must select the complete template range');
  assert.equal(throwingCopy.button.disabled, false, 'throwing Clipboard API must restore the copy button');
  assert.equal(throwingCopy.button.getAttribute('aria-busy'), null, 'throwing Clipboard API must clear the busy state');

  const missingCopy = createCopyHarness('输入：');
  const missingCopyRuntime = evaluateLearningRuntime(source, createStorage(), { navigator: {} });
  missingCopyRuntime.initHub(missingCopy.root);
  missingCopy.click();
  assert.equal(missingCopy.feedback.textContent, '请手动复制', 'missing Clipboard API must announce the manual-copy fallback');
  assert.ok(missingCopy.fallback && !missingCopy.fallback.hidden, 'missing Clipboard API must expose a visible manual-copy textarea');
  assert.equal(missingCopy.fallback.value, '输入：', 'missing Clipboard API fallback must preserve the exact template');

  const noSelectCopy = createCopyHarness('最终交付：摘要', { noSelect: true });
  const noSelectRuntime = evaluateLearningRuntime(source, createStorage(), { navigator: {} });
  noSelectRuntime.initHub(noSelectCopy.root);
  assert.doesNotThrow(() => noSelectCopy.click(), 'manual-copy fallback must tolerate a textarea without select()');
  assert.ok(noSelectCopy.fallback.focused, 'manual-copy fallback without select() must still receive focus');
  assert.deepEqual([noSelectCopy.fallback.selectionStart, noSelectCopy.fallback.selectionEnd], [0, '最终交付：摘要'.length],
    'manual-copy fallback without select() must still select the complete range when setSelectionRange is available');

  const rejectingCopy = createCopyHarness('背景：当前季度');
  const rejectingRuntime = evaluateLearningRuntime(source, createStorage(), {
    navigator: { clipboard: { writeText() { return { then(resolve, reject) { reject(new Error('denied')); } }; } } },
  });
  rejectingRuntime.initHub(rejectingCopy.root);
  rejectingCopy.click();
  assert.ok(rejectingCopy.fallback && !rejectingCopy.fallback.hidden, 'rejected Clipboard API must expose a visible manual-copy textarea');
  assert.equal(rejectingCopy.fallback.value, '背景：当前季度', 'rejected Clipboard API fallback must preserve the exact template');
  assert.equal(rejectingCopy.feedback.textContent, '请手动复制', 'rejected Clipboard API must announce the manual-copy fallback');

  let laterWriteSucceeds = false;
  const retryCopy = createCopyHarness('检查点：来源');
  const retryRuntime = evaluateLearningRuntime(source, createStorage(), {
    navigator: { clipboard: { writeText() {
      if (!laterWriteSucceeds) throw new Error('first write denied');
      return { then(resolve) { resolve(); } };
    } } },
  });
  retryRuntime.initHub(retryCopy.root);
  retryCopy.click();
  assert.ok(retryCopy.fallback && !retryCopy.fallback.hidden, 'first failed copy must expose the textarea');
  laterWriteSucceeds = true;
  retryCopy.click();
  assert.equal(retryCopy.feedback.textContent, '已复制', 'later successful copy must replace the failure feedback');
  assert.equal(retryCopy.fallback.hidden, true, 'later successful copy must hide the manual-copy textarea');
  assert.equal(retryCopy.fallback.value, '检查点：来源', 'hiding the fallback must not discard its template data');

  let pendingResolve = null;
  let pendingWrites = 0;
  const pendingCopy = createCopyHarness('输出要求：表格');
  const pendingRuntime = evaluateLearningRuntime(source, createStorage(), {
    navigator: { clipboard: { writeText() {
      pendingWrites += 1;
      return { then(resolve) { pendingResolve = resolve; } };
    } } },
  });
  pendingRuntime.initHub(pendingCopy.root);
  pendingCopy.click();
  assert.equal(pendingCopy.button.disabled, true, 'copy button must be disabled while Clipboard API is pending');
  assert.equal(pendingCopy.button.getAttribute('aria-busy'), 'true', 'pending copy button must expose aria-busy=true');
  pendingCopy.click();
  assert.equal(pendingWrites, 1, 'a second click while pending must not start another Clipboard API write');
  pendingResolve();
  assert.equal(pendingCopy.button.disabled, false, 'settled Clipboard API must restore the copy button');
  assert.equal(pendingCopy.button.getAttribute('aria-busy'), null, 'settled Clipboard API must clear aria-busy');

  const repeatedCopy = createCopyHarness('风险：');
  const repeatedRuntime = evaluateLearningRuntime(source, createStorage(), { navigator: {} });
  repeatedRuntime.initHub(repeatedCopy.root);
  repeatedCopy.click();
  repeatedCopy.click();
  assert.deepEqual(repeatedCopy.feedbackHistory, ['', '请手动复制', '', '请手动复制'],
    'repeated manual-copy feedback must clear before each asynchronous live announcement');

  const movedTarget = { innerHTML: '' };
  assert.equal(fresh.renderChapter('ai-models', movedTarget), true, 'legacy company/model routes must render a moved notice');
  assert.match(movedTarget.innerHTML, /已移至\s*AI 工具与资源/, 'legacy route notice must explain where the content moved');
  assert.match(movedTarget.innerHTML, /href=["']resources\.html["']/, 'legacy route notice must link to resources.html');
  assert.ok(!/(?:OpenAI|Claude|Gemini|DeepSeek|Qwen|GPT)/i.test(movedTarget.innerHTML),
    'legacy moved notice must not leak the old company or model directory');

  const firstDom = createMiniDom();
  const firstRuntime = evaluateLearningRuntime(source, createStorage(), { document: firstDom.document });
  const firstTarget = firstDom.createTarget();
  assert.equal(firstRuntime.renderChapter('ai-basics', firstTarget), true, 'first chapter must render into a real DOM-like target');
  assert.equal(firstTarget.querySelectorAll('a').filter((anchor) => anchor.textContent === '下一章').length, 1,
    'a non-final chapter must render one next-chapter action');
  const caseSection = firstTarget.querySelector('.lesson-case');
  assert.ok(caseSection && caseSection.textContent.includes('把关键背景放进当前任务'),
    'case-study lesson must be visible as text in the rendered DOM');
  const renderedExercise = firstTarget.querySelector('.lesson-exercise');
  assert.ok(renderedExercise, 'chapter must render its quick exercise region');
  const exerciseFieldsets = renderedExercise.querySelectorAll('fieldset');
  assert.equal(exerciseFieldsets.length, 1, 'chapter exercise must render one semantic fieldset');
  assert.equal(exerciseFieldsets[0].querySelectorAll('legend').length, 1, 'chapter exercise fieldset must have one legend');
  assert.ok(exerciseFieldsets[0].querySelector('legend').textContent.trim(), 'chapter exercise legend must have an accessible label');

  const instrumentedDom = createMiniDom();
  const instrumentedRuntime = evaluateLearningRuntime(source, createStorage(), { document: instrumentedDom.document });
  const instrumented = installInstrumentedChapter(instrumentedRuntime);
  assert.equal(new Set(instrumented.sentinels).size, instrumented.sentinels.length,
    'every recursively instrumented display string must receive a unique sentinel');
  for (const pathName of ['title', 'description', 'image.alt', 'sections.0.title', 'sections.0.paragraphs.0', 'sections.0.bullets.0',
    'caseStudy.title', 'caseStudy.situation', 'caseStudy.lesson', 'exercise.title', 'exercise.instruction', 'exercise.candidates.0.label',
    'quickCheck.0.question', 'quickCheck.0.answer', 'quickCheck.0.explanation', 'takeaway.title', 'takeaway.items.0', 'takeaway.template']) {
    assert.ok(instrumented.sentinelByPath.has(pathName), `recursive display instrumentation must cover ${pathName}`);
  }
  assert.equal(instrumented.chapter.id, 'ai-basics', 'display instrumentation must preserve the structural chapter id');
  assert.equal(instrumented.chapter.exercise.type, 'token-and-concepts', 'display instrumentation must preserve the structural exercise type');
  assert.equal(instrumented.chapter.image.webp, 'images/ai-concept.webp', 'display instrumentation must preserve local image URLs');
  const instrumentedTarget = instrumentedDom.createTarget();
  assert.equal(instrumentedRuntime.renderChapter('ai-basics', instrumentedTarget), true,
    'instrumented chapter clone must render through the production renderer');
  assertNoSentinelInnerHtmlWrites(instrumentedTarget, instrumented.sentinels,
    'no recursively instrumented chapter display value may reach innerHTML');
  for (const pathName of ['title', 'description', 'sections.0.title', 'caseStudy.lesson', 'exercise.title', 'quickCheck.0.question', 'takeaway.template']) {
    const sentinel = instrumented.sentinelByPath.get(pathName);
    assert.ok(sentinel && instrumentedTarget.textContent.includes(sentinel),
      `production rendering must visibly exercise the sentinel for ${pathName}`);
  }
  const altSentinel = instrumented.sentinelByPath.get('image.alt');
  assert.ok(altSentinel && instrumentedTarget.querySelectorAll('img').some((node) => node.getAttribute('alt')?.includes(altSentinel)),
    'production rendering must exercise the instrumented image.alt value');

  const finalDom = createMiniDom();
  const finalRuntime = evaluateLearningRuntime(source, createStorage(), { document: finalDom.document });
  const finalTarget = finalDom.createTarget();
  assert.equal(finalRuntime.renderChapter('ai-workflow', finalTarget), true, 'final chapter must render into a real DOM-like target');
  assert.equal(finalTarget.querySelectorAll('a').filter((anchor) => anchor.textContent === '下一章').length, 0,
    'chapter six must not render a next-chapter action');

  const maliciousPayload = '<script>globalThis.__learningXss = true<\/script><img src=x onerror="globalThis.__learningXss=true">';
  const safeLessonNeedle = "lesson: '把关键背景放进当前任务，不把过去对话当作自动长期记忆。'";
  assert.ok(source.includes(safeLessonNeedle), 'malicious case payload probe must find the approved lesson source');
  const maliciousSource = source.replace(safeLessonNeedle, `lesson: ${JSON.stringify(maliciousPayload)}`);
  const maliciousDom = createMiniDom();
  const maliciousRuntime = evaluateLearningRuntime(maliciousSource, createStorage(), { document: maliciousDom.document });
  const maliciousTarget = maliciousDom.createTarget();
  assert.equal(maliciousRuntime.renderChapter('ai-basics', maliciousTarget), true, 'chapter must still render when metadata contains markup characters');
  assert.ok(maliciousTarget.textContent.includes(maliciousPayload), 'malicious-looking metadata must remain literal visible text');
  assert.equal(maliciousTarget.querySelectorAll('script').length, 0, 'malicious-looking metadata must not create script elements');
  assert.equal(maliciousTarget.querySelectorAll('*').filter((node) => node.getAttribute('onerror') !== null).length, 0,
    'malicious-looking metadata must not create event-handler attributes');
  assert.ok(!collectInnerHtmlWrites(maliciousTarget).some((write) => write.includes(maliciousPayload)),
    'malicious-looking metadata must never reach any innerHTML write in the rendered tree');

  const constantDom = createMiniDom();
  const constantNode = constantDom.createTarget();
  constantNode.innerHTML = '<strong>固定的安全标题</strong>';
  assert.deepEqual(collectInnerHtmlWrites(constantNode), ['<strong>固定的安全标题</strong>'],
    'MiniDom must record safe constant innerHTML writes without treating them as dynamic metadata');
  assert.doesNotThrow(() => assertNoSentinelInnerHtmlWrites(constantNode, instrumented.sentinels,
    'safe constant innerHTML must remain allowed'));
  assert.doesNotThrow(() => fresh.initHub(), 'initHub must remain safe without a matching DOM hub');

  function assertReturnScroll(name, expectedBehavior, matchMedia) {
    const harness = createHubReturnHarness();
    const environment = {
      location: { href: 'https://example.test/learn.html#chapter-ai-basics', search: '', hash: '#chapter-ai-basics' },
    };
    if (matchMedia !== undefined) environment.matchMedia = matchMedia;
    const runtime = evaluateLearningRuntime(source, createStorage(), environment);
    assert.doesNotThrow(() => runtime.initHub(harness.root), `${name} must not interrupt hub initialization`);
    assert.deepEqual(plainClone(harness.scrollCalls), [{ block: 'center', behavior: expectedBehavior }], `${name} must use ${expectedBehavior} return scrolling`);
    assert.deepEqual(harness.classChanges[0], ['add', 'chapter-return-highlight'], `${name} must still highlight the returned chapter`);
  }

  assertReturnScroll('reduced motion enabled', 'auto', (query) => {
    assert.equal(query, '(prefers-reduced-motion: reduce)', 'runtime must request the standard reduced-motion media query');
    return { matches: true };
  });
  assertReturnScroll('reduced motion enabled through matches getter', 'auto', () => Object.defineProperty({}, 'matches', {
    get() { return true; },
  }));
  assertReturnScroll('reduced motion disabled', 'smooth', () => ({ matches: false }));
  assertReturnScroll('missing matchMedia', 'smooth');
  assertReturnScroll('throwing matchMedia', 'smooth', () => { throw new Error('matchMedia unavailable'); });
  assertReturnScroll('throwing matches getter', 'smooth', () => Object.defineProperty({}, 'matches', {
    get() { throw new Error('matches unavailable'); },
  }));

  console.log('PASS beginner learning runtime unit tests (state, DOM semantics, XSS text safety, navigation, copy fallback, legacy routes, reduced motion)');
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

  const reducedMotionNeedle = "window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto';";
  assert.ok(source.includes(reducedMotionNeedle), 'reduced-motion mutation source must contain the auto behavior');
  const smoothOnlySource = source.replace(reducedMotionNeedle, "window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'smooth';");
  const harness = createHubReturnHarness();
  const smoothOnly = evaluateLearningRuntime(smoothOnlySource, createStorage(), {
    location: { href: 'https://example.test/learn.html#chapter-ai-basics', search: '', hash: '#chapter-ai-basics' },
    matchMedia: () => ({ matches: true }),
  });
  smoothOnly.initHub(harness.root);
  assert.throws(
    () => assert.equal(harness.scrollCalls[0].behavior, 'auto', 'reduced motion must use auto scrolling'),
    assert.AssertionError,
    'runtime unit assertion must catch the smooth-only reduced-motion mutation',
  );

  const summaryNeedle = "scope.querySelector('[data-learning-seen-count]')";
  assert.ok(source.includes(summaryNeedle), 'summary mutation source must contain the seen-count selector');
  const summaryHarness = createHubStateHarness();
  const missingSummaryUpdate = evaluateLearningRuntime(source.replace(summaryNeedle, "scope.querySelector('[data-learning-seen-count-missing]')"),
    createStorage(JSON.stringify({ 'ai-basics': 'seen', 'ai-boundaries': 'seen' })));
  missingSummaryUpdate.initHub(summaryHarness.root);
  assert.throws(
    () => assert.equal(summaryHarness.countNode.textContent, '2', 'partial session summary must render 已看 2 / 6'),
    assert.AssertionError,
    'runtime unit assertion must catch a missing seen-count update target',
  );

  const fallbackNeedle = "announce(succeeded ? '已复制' : '请手动复制');";
  assert.ok(source.includes(fallbackNeedle), 'copy fallback mutation source must contain the approved feedback');
  const fallbackHarness = createCopyHarness('目标：');
  const wrongFallback = evaluateLearningRuntime(source.replace(fallbackNeedle, "announce(succeeded ? '已复制' : '复制失败');"), createStorage(), { navigator: {} });
  wrongFallback.initHub(fallbackHarness.root);
  fallbackHarness.click();
  assert.throws(
    () => assert.equal(fallbackHarness.feedback.textContent, '请手动复制', 'missing Clipboard API must announce the manual-copy fallback'),
    assert.AssertionError,
    'runtime unit assertion must catch changed copy fallback feedback',
  );

  const fallbackUiNeedle = 'showCopyFallback(card, templateText);';
  assert.ok(source.includes(fallbackUiNeedle), 'copy fallback mutation source must contain the textarea fallback call');
  const missingFallbackUiHarness = createCopyHarness('目标：');
  const missingFallbackUi = evaluateLearningRuntime(source.replace(fallbackUiNeedle, ''), createStorage(), { navigator: {} });
  missingFallbackUi.initHub(missingFallbackUiHarness.root);
  missingFallbackUiHarness.click();
  assert.throws(
    () => assert.ok(missingFallbackUiHarness.fallback, 'missing Clipboard API must expose a manual-copy textarea'),
    assert.AssertionError,
    'runtime unit assertion must catch a removed manual-copy textarea fallback',
  );

  const pendingGuardNeedle = 'button.disabled = true;';
  assert.ok(source.includes(pendingGuardNeedle), 'copy pending mutation source must contain the disabled guard');
  let mutatedPendingWrites = 0;
  const pendingMutationHarness = createCopyHarness('任务：');
  const pendingMutation = evaluateLearningRuntime(source.replace(pendingGuardNeedle, ''), createStorage(), {
    navigator: { clipboard: { writeText() {
      mutatedPendingWrites += 1;
      return { then() {} };
    } } },
  });
  pendingMutation.initHub(pendingMutationHarness.root);
  pendingMutationHarness.click();
  pendingMutationHarness.click();
  assert.throws(
    () => assert.equal(mutatedPendingWrites, 1, 'pending copy must ignore a rapid second click'),
    assert.AssertionError,
    'runtime unit assertion must catch a removed pending-click guard',
  );

  function mutateProduction(name, needle, replacement) {
    assert.ok(source.includes(needle), `${name} mutation must find the production renderer`);
    return source.replace(needle, replacement);
  }
  function assertDynamicInnerHtmlMutationCaught(name, unsafeSource) {
    const unsafeDom = createMiniDom();
    const unsafeRuntime = evaluateLearningRuntime(unsafeSource, createStorage(), { document: unsafeDom.document });
    const unsafeInstrumented = installInstrumentedChapter(unsafeRuntime);
    const unsafeTarget = unsafeDom.createTarget();
    assert.equal(unsafeRuntime.renderChapter('ai-basics', unsafeTarget), true, `${name} fixture must still render`);
    assert.throws(
      () => assertNoSentinelInnerHtmlWrites(unsafeTarget, unsafeInstrumented.sentinels,
        'instrumented chapter display metadata must never be written through innerHTML'),
      assert.AssertionError,
      `${name} must be caught by recorded runtime innerHTML writes`,
    );
  }
  const safeLessonRenderNeedle = "    lesson.appendChild(element(ownerDocument, 'strong', '', '关键启发：'));\n" +
    '    lesson.appendChild(ownerDocument.createTextNode(chapter.caseStudy.lesson));';
  assertDynamicInnerHtmlMutationCaught('case concatenated dynamic innerHTML', mutateProduction('case concatenation', safeLessonRenderNeedle,
    "    lesson.innerHTML = '<strong>关键启发：</strong>' + chapter.caseStudy.lesson;"));
  assertDynamicInnerHtmlMutationCaught('case template-literal dynamic innerHTML', mutateProduction('case template literal', safeLessonRenderNeedle,
    '    lesson.innerHTML = `<strong>关键启发：</strong>${chapter.caseStudy.lesson}`;'));

  const headerTitleNeedle = "    header.appendChild(element(ownerDocument, 'h1', '', chapter.title));";
  assertDynamicInnerHtmlMutationCaught('header title concatenation', mutateProduction('header title', headerTitleNeedle,
    "    var unsafeHeaderTitle = element(ownerDocument, 'h1', '');\n" +
    "    unsafeHeaderTitle.innerHTML = '<span>' + chapter.title + '</span>';\n" +
    '    header.appendChild(unsafeHeaderTitle);'));

  const quickCheckNeedle = "      details.appendChild(element(ownerDocument, 'summary', '', check.question));";
  assertDynamicInnerHtmlMutationCaught('quick-check question template literal', mutateProduction('quick-check question', quickCheckNeedle,
    "      var unsafeSummary = element(ownerDocument, 'summary', '');\n" +
    '      unsafeSummary.innerHTML = `<span>${check.question}</span>`;\n' +
    '      details.appendChild(unsafeSummary);'));

  const takeawayTemplateNeedle = "    var template = element(ownerDocument, 'pre', 'lesson-template', chapter.takeaway.template);";
  assertDynamicInnerHtmlMutationCaught('takeaway template concatenation', mutateProduction('takeaway template', takeawayTemplateNeedle,
    "    var template = element(ownerDocument, 'pre', 'lesson-template');\n" +
    "    template.innerHTML = '<code>' + chapter.takeaway.template + '</code>';"));

  console.log('PASS beginner learning runtime mutations (state + copy + generalized dynamic innerHTML across header/case/check/takeaway)');
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
  expectMutation('missing card action', (root) => {
    replaceIn(root, 'learn.html', '<span class="learning-card-action">开始学习</span>', '');
  }, 'learning card 1 must contain one visible action');
  expectMutation('changed hero description', (root) => {
    replaceIn(root, 'learn.html', learnHeroDescription, '旧的学习页介绍');
  }, 'learn hero description must match the approved copy');
  expectMutation('missing session summary', (root) => {
    replaceIn(root, 'learn.html', 'class="learning-session-summary"', 'class="learning-session-summary-missing"');
  }, 'learn.html must contain one visible session summary');
  expectMutation('missing copyable tool card', (root) => {
    replaceIn(root, 'learn.html', 'class="learning-tool-card"', 'class="learning-tool-card-missing"');
  }, 'learning toolkit must contain exactly four tool cards');
  expectMutation('missing tool template field', (root) => {
    replaceIn(root, 'learn.html', '目标：\nAI负责', '预期：\nAI负责');
  }, 'tool card 1 template must include 目标');
  expectMutation('missing semantic copy control', (root) => {
    replaceIn(root, 'learn.html', 'data-copy-template', 'data-copy-template-missing');
  }, 'tool card 1 must contain one semantic copy button');
  expectMutation('legacy footer progress route', (root) => {
    replaceIn(root, 'index.html', '<a href="learn.html">继续学习</a>', '<a href="progress.html">我的学习进度</a>');
  }, 'index.html footer must contain one 继续学习 link to learn.html');
  expectMutation('missing session-only progress scope', (root) => {
    replaceIn(root, 'progress.html', '进度只在本次标签会话有效。', '查看学习状态。');
  }, 'progress.html must explain the session-only progress scope');
  expectMutation('full-card progress anchor', (root) => {
    replaceIn(root, 'progress.html', 'class="progress-compat-cta"', 'class="progress-compat-cta entry-card"');
  }, 'progress compatibility copy must not be wrapped in a full-card anchor');
  expectMutation('localStorage', (root) => {
    replaceIn(root, 'learning-experience.js', 'window.AIBeginner=', 'localStorage.getItem("bad"); window.AIBeginner=');
  }, 'learning-experience.js must not use localStorage');
  expectMutation('missing runtime API', (root) => {
    replaceIn(root, 'learning-experience.js', 'renderChapter:renderChapter,read:read', 'read:read');
  }, 'window.AIBeginner.renderChapter must be a function');
  expectMutation('duplicate detail learning script', (root) => {
    replaceIn(root, 'detail.html', '<script src="learning-experience.js"></script>', '<script src="learning-experience.js"></script><script src="learning-experience.js"></script>');
  }, 'detail.html must load learning-experience.js exactly once');
  expectMutation('detail learning script after renderer', (root) => {
    replaceIn(root, 'detail.html', '<script src="learning-experience.js"></script><script>', '<script>');
    replaceIn(root, 'detail.html', '</script></body>', '</script><script src="learning-experience.js"></script></body>');
  }, 'detail.html must load learning-experience.js before the inline renderer');
  expectMutation('missing canonical chapter', (root) => {
    replaceIn(root, 'learning-experience.js', '"id":"ai-workflow"', '"id":"ai-workflow-missing"');
  }, 'learning chapter IDs must match the approved order');
  expectMutation('wrong chapter minutes', (root) => {
    replaceIn(root, 'detail.html', '约 8 分钟', '约 18 分钟');
  }, 'ai-basics detail config must be a learning route with 约 8 分钟');
  expectMutation('wrong approved chapter image', (root) => {
    replaceIn(root, 'learning-experience.js', 'images/ai-concept.webp', 'images/ai-history.webp');
  }, 'ai-basics must use the approved WebP and fallback image');
  expectMutation('wrong final chapter number', (root) => {
    replaceIn(root, 'learning-experience.js', '"number":"06"', '"number":"07"');
  }, 'ai-workflow must use its canonical chapter number');
  expectMutation('moved route leaks model directory', (root) => {
    replaceIn(root, 'learning-experience.js', "return '已移至 AI 工具与资源'", "return 'OpenAI 与 GPT 目录'");
  }, 'legacy moved-route renderer must not retain old company or model directory content');
  expectMutation('unsafe chapter metadata rendering', (root) => {
    replaceIn(root, 'learning-experience.js', 'ownerDocument.createTextNode(chapter.caseStudy.lesson)', 'container.innerHTML=chapter.caseStudy.lesson');
  }, 'chapter metadata and questions must render without innerHTML string assembly');
  expectMutation('hidden failed status', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><span hidden>未通过</span>');
  }, 'learn.html must not contain prohibited status or assessment copy: 未通过');
  expectMutation('company directory', (root) => {
    replaceIn(root, 'learn.html', '<main>', '<main><a href="detail.html?type=learn&id=ai-companies">AI 公司入口</a>');
  }, 'learn hub must not link to the old company or model directory');
  expectMutation('missing case study', (root) => {
    replaceIn(root, 'learning-experience.js', '"caseStudy":', '"caseStudyMissing":');
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

  for (const id of chapterIds) {
    const expected = expectedChapterContent[id];
    expectMutation(`${id} placeholder core content`, (root) => {
      replaceIn(root, 'learning-experience.js', JSON.stringify(expected.sectionTitles[0]), JSON.stringify('占位内容'));
    }, `${id} section titles must match the approved learning arc`);
    expectMutation(`${id} crossed case study`, (root) => {
      replaceIn(root, 'learning-experience.js', JSON.stringify(expected.caseTitle), JSON.stringify('其他章节的案例'));
    }, `${id} case study must use the approved workplace scenario`);
    expectMutation(`${id} crossed interaction`, (root) => {
      replaceIn(root, 'learning-experience.js', JSON.stringify(expected.exerciseType), JSON.stringify('placeholder-interaction'));
    }, `${id} exercise must use ${expected.exerciseType}`);
    expectMutation(`${id} crossed takeaway`, (root) => {
      replaceIn(root, 'learning-experience.js', JSON.stringify(expected.takeawayTitle), JSON.stringify('其他章节的工具'));
    }, `${id} takeaway must match the approved tool`);
  }

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

  console.log('PASS learning experience contract self-test (valid fixture + 64 mutations)');
}

if (process.argv.includes('--runtime-test')) runRuntimeUnitTest();
else if (process.argv.includes('--runtime-mutation-test')) runRuntimeMutationTest();
else if (process.argv.includes('--self-test')) runSelfTest();
else {
  runContract();
  console.log('PASS AI beginner learning contract');
}
