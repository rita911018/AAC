import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portalUrl = 'https://portal.amersports.cn/portal/indexs';
const oldUatUrl = 'ai-uat.amersports.cn:9093';
const portalInstructions = '进入 Portal 后，点击右侧「小A智助」打开助手';

const files = {
  index: readFileSync('site/knowledge-base/index.html', 'utf8'),
  search: readFileSync('site/knowledge-base/search.js', 'utf8'),
  detail: readFileSync('site/knowledge-base/detail.html', 'utf8'),
};

function readStringToken(source, start) {
  const quote = source[start];
  assert.ok(quote === "'" || quote === '"' || quote === '`', 'string token must start with a quote');

  let value = '';
  let index = start + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === quote) return { start, end: index + 1, quote, value };
    if (character !== '\\') {
      value += character;
      index += 1;
      continue;
    }

    index += 1;
    assert.ok(index < source.length, 'string escape must not end the source');
    const escaped = source[index];
    const commonEscapes = {
      n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0',
      '\\': '\\', "'": "'", '"': '"', '`': '`',
    };
    if (Object.hasOwn(commonEscapes, escaped)) {
      value += commonEscapes[escaped];
      index += 1;
      continue;
    }
    if (escaped === '\n') {
      index += 1;
      continue;
    }
    if (escaped === '\r') {
      index += source[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (escaped === 'x') {
      const hexadecimal = source.slice(index + 1, index + 3);
      assert.match(hexadecimal, /^[0-9a-f]{2}$/i, 'hex escape must contain two digits');
      value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      index += 3;
      continue;
    }
    if (escaped === 'u') {
      if (source[index + 1] === '{') {
        const close = source.indexOf('}', index + 2);
        assert.ok(close > index + 2, 'Unicode code-point escape must close');
        const hexadecimal = source.slice(index + 2, close);
        assert.match(hexadecimal, /^[0-9a-f]+$/i, 'Unicode code-point escape must be hexadecimal');
        value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
        index = close + 1;
      } else {
        const hexadecimal = source.slice(index + 1, index + 5);
        assert.match(hexadecimal, /^[0-9a-f]{4}$/i, 'Unicode escape must contain four digits');
        value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
        index += 5;
      }
      continue;
    }
    value += escaped;
    index += 1;
  }

  assert.fail('string token must have a closing quote');
}

function scanLexical(source, label) {
  const braceStack = [];
  const bracePairs = new Map();
  const comments = [];
  const strings = [];

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "'" || character === '"' || character === '`') {
      const token = readStringToken(source, index);
      strings.push({ ...token, objectStart: braceStack.at(-1) });
      index = token.end;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      const start = index;
      index += 2;
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
      comments.push({ start, end: index });
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const start = index;
      const close = source.indexOf('*/', index + 2);
      assert.ok(close >= 0, `${label} block comment must close`);
      index = close + 2;
      comments.push({ start, end: index });
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
  return { bracePairs, comments, strings };
}

function removeComments(source, comments) {
  let clean = '';
  let cursor = 0;
  for (const { start, end } of comments) {
    clean += source.slice(cursor, start);
    clean += source.slice(start, end).replace(/[^\r\n]/g, ' ');
    cursor = end;
  }
  return clean + source.slice(cursor);
}

function extractUniqueMarkedObject(source, marker, label) {
  const scan = scanLexical(source, label);
  const markerTokens = scan.strings.filter((token) => token.value === marker);
  assert.equal(markerTokens.length, 1, `${label} marker must be one real string token`);

  const start = markerTokens[0].objectStart;
  const end = scan.bracePairs.get(start);
  assert.notEqual(start, undefined, `${label} marker must be inside an object`);
  assert.notEqual(end, undefined, `${label} object must have a balanced closing brace`);

  const withoutComments = removeComments(source, scan.comments);
  return withoutComments.slice(start, end + 1);
}

function parseObjectFields(objectSource, label) {
  assert.ok(objectSource.startsWith('{') && objectSource.endsWith('}'), `${label} must be an object literal`);
  const fields = {};
  let index = 1;

  const skipWhitespace = () => {
    while (/\s/.test(objectSource[index] ?? '')) index += 1;
  };

  while (index < objectSource.length - 1) {
    skipWhitespace();
    if (objectSource[index] === ',') {
      index += 1;
      continue;
    }
    if (index >= objectSource.length - 1) break;

    let key;
    if (objectSource[index] === "'" || objectSource[index] === '"') {
      const token = readStringToken(objectSource, index);
      key = token.value;
      index = token.end;
    } else {
      const match = /^[A-Za-z_$][\w$]*/.exec(objectSource.slice(index));
      assert.ok(match, `${label} field must have a valid key`);
      key = match[0];
      index += key.length;
    }

    skipWhitespace();
    assert.equal(objectSource[index], ':', `${label}.${key} must use a colon`);
    index += 1;
    skipWhitespace();

    let value;
    if (objectSource[index] === "'" || objectSource[index] === '"') {
      const token = readStringToken(objectSource, index);
      value = token.value;
      index = token.end;
    } else {
      const valueStart = index;
      while (index < objectSource.length - 1 && objectSource[index] !== ',') index += 1;
      const rawValue = objectSource.slice(valueStart, index).trim();
      value = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(rawValue)
        ? Number(rawValue)
        : rawValue;
    }

    assert.ok(!Object.hasOwn(fields, key), `${label}.${key} must not be duplicated`);
    fields[key] = value;
  }
  return fields;
}

function sliceUniqueRegion(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label} start marker must exist`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `${label} start marker must be unique`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label} end marker must follow its start marker`);
  return source.slice(start, end);
}

function selectFields(fields, names) {
  return Object.fromEntries(names.map((name) => [name, fields[name]]));
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

for (const [name, content] of Object.entries(files)) {
  assert.ok(!content.includes(oldUatUrl), `${name} must not reference the old Xiao A UAT URL`);
}

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
const searchXiaoA = parseObjectFields(
  extractUniqueMarkedObject(searchData, searchMarker, 'search Xiao A'),
  'search Xiao A',
);
assert.deepEqual(
  selectFields(searchXiaoA, ['t', 'd', 'href', 'ext', 'tag']),
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
const detailXiaoA = parseObjectFields(
  extractUniqueMarkedObject(detailTools, detailMarker, 'detail Xiao A'),
  'detail Xiao A',
);
assert.deepEqual(
  selectFields(detailXiaoA, ['name', 'desc', 'url', 'badge']),
  {
    name: detailMarker,
    desc: `接入公司数据与系统的内部 AI 助手，日常问答、写稿、翻译、总结首选。${portalInstructions}`,
    url: portalUrl,
    badge: '公司内部',
  },
  'detail Xiao A fields must match the approved entry',
);

console.log('Xiao A Portal entry checks passed.');
