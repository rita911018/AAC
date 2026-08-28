import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const portalUrl = 'https://portal.amersports.cn/portal/indexs';
const oldUatUrl = 'ai-uat.amersports.cn:9093';
const portalInstructions = '进入 Portal 后，点击右侧「小A智助」打开助手';

const files = {
  index: readFileSync('site/knowledge-base/index.html', 'utf8'),
  search: readFileSync('site/knowledge-base/search.js', 'utf8'),
  detail: readFileSync('site/knowledge-base/detail.html', 'utf8'),
};

function scanLineCommentBoundary(source, start) {
  let index = start + 2;
  while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
  return index;
}

function scanBlockCommentBoundary(source, start) {
  const close = source.indexOf('*/', start + 2);
  assert.ok(close >= 0, 'block comment must close');
  return close + 2;
}

function scanTemplateExpressionBoundary(source, start) {
  let depth = 1;
  let index = start;
  while (index < source.length) {
    const character = source[index];
    if (character === "'" || character === '"' || character === '`') {
      index = scanStringBoundary(source, index).end;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      index = scanLineCommentBoundary(source, index);
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      index = scanBlockCommentBoundary(source, index);
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
    index += 1;
  }
  assert.fail('template expression must have a closing brace');
}

function scanStringBoundary(source, start) {
  const quote = source[start];
  assert.ok(quote === "'" || quote === '"' || quote === '`', 'string must start with a quote');

  let index = start + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === '\\') {
      index += 2;
      continue;
    }
    if (quote === '`' && character === '$' && source[index + 1] === '{') {
      index = scanTemplateExpressionBoundary(source, index + 2);
      continue;
    }
    if (character === quote) {
      return {
        start,
        end: index + 1,
        quote,
        rawBody: source.slice(start + 1, index),
      };
    }
    index += 1;
  }

  assert.fail('string must have a closing quote');
}

function scanLexical(source, label) {
  const braceStack = [];
  const bracePairs = new Map();
  const strings = [];

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "'" || character === '"' || character === '`') {
      const token = scanStringBoundary(source, index);
      strings.push({ ...token, objectStart: braceStack.at(-1) });
      index = token.end;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      index = scanLineCommentBoundary(source, index);
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      index = scanBlockCommentBoundary(source, index);
      continue;
    }
    if (character === '{') braceStack.push(index);
    if (character === '}') {
      const start = braceStack.pop();
      assert.notEqual(start, undefined, `${label} must not contain an unmatched closing brace`);
      bracePairs.set(start, index);
    }
    index += 1;
  }

  assert.equal(braceStack.length, 0, `${label} must not contain an unmatched opening brace`);
  return { bracePairs, strings };
}

function extractUniqueMarkedObject(source, marker, label) {
  const scan = scanLexical(source, label);
  const markerTokens = scan.strings.filter(
    (token) => token.quote !== '`' && token.rawBody === marker,
  );
  assert.equal(markerTokens.length, 1, `${label} marker must be one real string token`);

  const start = markerTokens[0].objectStart;
  const end = scan.bracePairs.get(start);
  assert.notEqual(start, undefined, `${label} marker must be inside an object`);
  assert.notEqual(end, undefined, `${label} object must have a balanced closing brace`);
  return source.slice(start, end + 1);
}

function evaluateObjectFields(objectSource, fieldNames, label) {
  const context = vm.createContext(Object.create(null), {
    name: `${label} validation`,
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });
  const evaluated = vm.runInContext(`(${objectSource})`, context, {
    displayErrors: true,
    timeout: 50,
  });
  assert.ok(evaluated && typeof evaluated === 'object' && !Array.isArray(evaluated), `${label} must evaluate to an object`);

  const plainRecord = {};
  for (const fieldName of fieldNames) {
    const descriptor = Object.getOwnPropertyDescriptor(evaluated, fieldName);
    assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), `${label}.${fieldName} must be a data field`);
    plainRecord[fieldName] = descriptor.value;
  }
  return plainRecord;
}

function sliceUniqueRegion(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label} start marker must exist`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `${label} start marker must be unique`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label} end marker must follow its start marker`);
  return source.slice(start, end);
}

function parseTagAttributes(rawAttributes) {
  const attributes = new Map();
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of rawAttributes.matchAll(attributePattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function findUniqueAnchorAttributesByText(source, text) {
  const anchors = [...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter((match) => match[2].includes(text));
  assert.equal(anchors.length, 1, `home must contain exactly one anchor with text “${text}”`);
  return parseTagAttributes(anchors[0][1]);
}

function extractUniqueElementByClass(source, tagName, className, label) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  const openingPattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'gi');
  const openings = [...withoutComments.matchAll(openingPattern)].filter((match) => {
    const classes = (parseTagAttributes(match[1]).get('class') ?? '').split(/\s+/);
    return classes.includes(className);
  });
  assert.equal(openings.length, 1, `${label} must be one real, uncommented element`);

  const opening = openings[0];
  const contentStart = opening.index + opening[0].length;
  const closingPattern = new RegExp(`</${tagName}\\s*>`, 'gi');
  closingPattern.lastIndex = contentStart;
  const closing = closingPattern.exec(withoutComments);
  assert.ok(closing, `${label} must have a closing tag`);
  return {
    attributes: parseTagAttributes(opening[1]),
    innerHtml: withoutComments.slice(contentStart, closing.index),
  };
}

function extractUniqueChildByClass(source, tagName, className, label) {
  const elementPattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)</${tagName}\\s*>`, 'gi');
  const elements = [...source.matchAll(elementPattern)].filter((match) => {
    const classes = (parseTagAttributes(match[1]).get('class') ?? '').split(/\s+/);
    return classes.includes(className);
  });
  assert.equal(elements.length, 1, `${label} must exist exactly once inside the Xiao A copy`);
  return { attributes: parseTagAttributes(elements[0][1]), innerHtml: elements[0][2] };
}

for (const [name, content] of Object.entries(files)) {
  assert.ok(!content.includes(oldUatUrl), `${name} must not reference the old Xiao A UAT URL`);
}

const xiaoACopy = extractUniqueElementByClass(files.index, 'div', 'xh-text', 'home Xiao A copy');
const xiaoANote = extractUniqueChildByClass(xiaoACopy.innerHtml, 'p', 'xh-note', 'home Xiao A Portal note');
const xiaoANoteText = xiaoANote.innerHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const xiaoANoteClasses = new Set((xiaoANote.attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
assert.equal(
  xiaoANoteText,
  `${portalInstructions}。`,
  'home Xiao A Portal note must show the complete approved instructions',
);
assert.ok(
  !xiaoANote.attributes.has('hidden')
    && xiaoANote.attributes.get('aria-hidden') !== 'true'
    && !/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(xiaoANote.attributes.get('style') ?? '')
    && !['hidden', 'sr-only', 'visually-hidden'].some((className) => xiaoANoteClasses.has(className)),
  'home Xiao A Portal note must be visibly rendered',
);

const ctaAttributes = findUniqueAnchorAttributesByText(files.index, '前往 Portal 打开小A');
const ctaRelTokens = new Set((ctaAttributes.get('rel') ?? '').split(/\s+/).filter(Boolean));
assert.ok(
  ctaAttributes.get('href') === portalUrl
    && ctaAttributes.get('target') === '_blank'
    && ctaRelTokens.has('noopener'),
  'home CTA must open Portal in a safe new tab with the approved copy',
);

const searchMarker = '小A · 公司内部 AI 助手';
const searchData = sliceUniqueRegion(files.search, 'var SEARCH_INDEX = [', '\n  ];', 'search data');
const searchXiaoA = evaluateObjectFields(
  extractUniqueMarkedObject(searchData, searchMarker, 'search Xiao A'),
  ['t', 'd', 'href', 'ext', 'tag'],
  'search Xiao A',
);
assert.deepEqual(
  searchXiaoA,
  {
    t: searchMarker,
    d: `接入公司数据的内部 AI 助手，日常问答首选。${portalInstructions}`,
    href: portalUrl,
    ext: 1,
    tag: '工具',
  },
  'search Xiao A fields must match the approved entry',
);

const detailMarker = '小A · 公司内部 AI 助手';
const detailTools = sliceUniqueRegion(
  files.detail,
  "'tools': { type:'list'",
  "\n\n'courses':",
  'detail tools data',
);
const detailXiaoA = evaluateObjectFields(
  extractUniqueMarkedObject(detailTools, detailMarker, 'detail Xiao A'),
  ['name', 'desc', 'url', 'badge'],
  'detail Xiao A',
);
assert.deepEqual(
  detailXiaoA,
  {
    name: detailMarker,
    desc: `接入公司数据与系统的内部 AI 助手，日常问答、写稿、翻译、总结首选。${portalInstructions}`,
    url: portalUrl,
    badge: '公司内部',
  },
  'detail Xiao A fields must match the approved entry',
);

console.log('Xiao A Portal entry checks passed.');
