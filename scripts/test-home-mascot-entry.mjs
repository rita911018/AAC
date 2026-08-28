import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const portalUrl = 'https://portal.amersports.cn/portal/indexs';
const oldUatUrl = 'ai-uat.amersports.cn:9093';
const portalInstructions = '进入 Portal 后，点击右侧「小A智助」打开助手';

const files = {
  index: readFileSync('site/knowledge-base/index.html', 'utf8'),
  learn: readFileSync('site/knowledge-base/learn.html', 'utf8'),
  video: readFileSync('site/knowledge-base/video.html', 'utf8'),
  resources: readFileSync('site/knowledge-base/resources.html', 'utf8'),
  progress: readFileSync('site/knowledge-base/progress.html', 'utf8'),
  search: readFileSync('site/knowledge-base/search.js', 'utf8'),
  detail: readFileSync('site/knowledge-base/detail.html', 'utf8'),
};

const htmlFiles = new Map([
  ['index.html', files.index],
  ['learn.html', files.learn],
  ['video.html', files.video],
  ['resources.html', files.resources],
  ['progress.html', files.progress],
  ['detail.html', files.detail],
]);

const oldStarPath = 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1';

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

function stripNonMarkup(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

function findOpeningTags(source) {
  return [...stripNonMarkup(source).matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)]
    .map((match) => ({ tagName: match[1].toLowerCase(), attributes: parseTagAttributes(match[2]) }));
}

function openingTagsByClass(source, className) {
  return findOpeningTags(source).filter(({ attributes }) => (
    (attributes.get('class') ?? '').split(/\s+/).includes(className)
  ));
}

function extractUniqueElementByTag(source, tagName, label) {
  const withoutComments = stripNonMarkup(source);
  const elementPattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)</${tagName}\\s*>`, 'gi');
  const elements = [...withoutComments.matchAll(elementPattern)];
  assert.equal(elements.length, 1, `${label} must be one real, uncommented element`);
  return { attributes: parseTagAttributes(elements[0][1]), innerHtml: elements[0][2] };
}

function normalizedText(source) {
  return source.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizedPathData(source) {
  return source.replace(/[\s,]+/g, '');
}

function extractUniqueElementByTagAndId(source, tagName, id, label) {
  const withoutComments = stripNonMarkup(source);
  const elementPattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)</${tagName}\\s*>`, 'gi');
  const elements = [...withoutComments.matchAll(elementPattern)].filter((match) => (
    parseTagAttributes(match[1]).get('id') === id
  ));
  assert.equal(elements.length, 1, `${label} must be one real, uncommented ${tagName}#${id}`);
  return { attributes: parseTagAttributes(elements[0][1]), innerHtml: elements[0][2] };
}

for (const [fileName, content] of htmlFiles) {
  const header = extractUniqueElementByClass(content, 'header', 'topbar', `${fileName} header`);
  const footer = extractUniqueElementByClass(content, 'footer', 'footer', `${fileName} footer`);
  const brandRegions = [header.innerHtml, footer.innerHtml];
  const brandIconCounts = brandRegions.map((region) => findOpeningTags(region).filter(
    ({ attributes }) => attributes.get('data-brand-icon') === 'knowledge-book',
  ).length);
  assert.deepEqual(
    brandIconCounts,
    [1, 1],
    `${fileName} header and footer must each contain one knowledge-book brand icon`,
  );
  assert.equal(
    brandIconCounts.reduce((total, count) => total + count, 0),
    2,
    `${fileName} header and footer must contain exactly two knowledge-book brand icons`,
  );

  const logoRegions = brandRegions.map((region, index) => extractUniqueElementByClass(
    region,
    'span',
    'logo',
    `${fileName} ${index === 0 ? 'header' : 'footer'} logo`,
  ).innerHtml);
  const oldStarPaths = logoRegions.flatMap(findOpeningTags).filter(
    ({ tagName, attributes }) => tagName === 'path'
      && normalizedPathData(attributes.get('d') ?? '') === normalizedPathData(oldStarPath),
  );
  assert.equal(oldStarPaths.length, 0, `${fileName} header and footer must not contain the old star path`);
}

const homeHero = extractUniqueElementByClass(files.index, 'section', 'home-hero', 'home hero');
const homeHeroCopy = extractUniqueElementByClass(homeHero.innerHtml, 'div', 'bh-left', 'home hero copy');
const homeTitle = extractUniqueElementByTag(homeHeroCopy.innerHtml, 'h1', 'home hero title');
assert.equal(homeTitle.innerHtml.replace(/<[^>]*>/g, ''), '亚玛芬 AI 知识库', 'home h1 must use the exact approved title');

const homeSubtitle = extractUniqueChildByClass(homeHeroCopy.innerHtml, 'p', 'bh-subtitle', 'home hero subtitle');
assert.equal(
  homeSubtitle.innerHtml.replace(/<[^>]*>/g, ''),
  '一站式 AI 学习资源与实践指南',
  'home subtitle must use the exact approved copy without extra whitespace',
);
assert.equal(openingTagsByClass(homeHeroCopy.innerHtml, 'bh-tag').length, 0, 'home hero copy must not contain a bh-tag element');
assert.equal(openingTagsByClass(homeHero.innerHtml, 'mascot-status').length, 0, 'home hero must not contain a mascot-status element');
assert.ok(!normalizedText(homeHero.innerHtml).includes('AMER SPORTS · AI ENABLEMENT'), 'home hero must not contain the old eyebrow');
assert.ok(!normalizedText(homeHero.innerHtml).includes('XIAO A · ONLINE'), 'home hero must not contain the old Xiao A status');

const homeGatewayElements = findOpeningTags(files.index).filter(
  ({ attributes }) => attributes.get('id') === 'gateway',
);
assert.equal(homeGatewayElements.length, 0, 'home must not contain a gateway section');

const resourcesGateway = extractUniqueElementByTagAndId(
  files.resources,
  'section',
  'gateway',
  'resources gateway',
);
const resourcesGatewayTitle = extractUniqueElementByTag(resourcesGateway.innerHtml, 'h2', 'resources gateway title');
assert.equal(normalizedText(resourcesGatewayTitle.innerHtml), '外部精选 AI 资源', 'resources gateway must retain its approved title');

const resourcesGatewayLinks = [...stripNonMarkup(resourcesGateway.innerHtml).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
  .map((match) => ({
    attributes: parseTagAttributes(match[1]),
    text: normalizedText(match[2]),
  }))
  .filter(({ attributes }) => (attributes.get('class') ?? '').split(/\s+/).includes('gate-home-card'));
assert.equal(resourcesGatewayLinks.length, 2, 'resources gateway must retain exactly two external resource cards');

for (const [name, href] of [
  ['AI 日报', 'https://aihot.virxact.com/daily'],
  ['WaytoAGI', 'https://www.waytoagi.com/zh'],
]) {
  const matches = resourcesGatewayLinks.filter(({ text }) => text.includes(name));
  assert.equal(matches.length, 1, `resources gateway must retain the ${name} card`);
  const { attributes } = matches[0];
  const relTokens = new Set((attributes.get('rel') ?? '').split(/\s+/).filter(Boolean));
  assert.ok(
    attributes.get('href') === href
      && attributes.get('target') === '_blank'
      && relTokens.has('noopener'),
    `resources gateway ${name} card must retain its approved safe external link`,
  );
}

const xiaoASide = extractUniqueElementByClass(files.index, 'div', 'xh-side', 'home Xiao A capabilities');
const xiaoATitle = extractUniqueElementByTag(xiaoASide.innerHtml, 'h4', 'home Xiao A capabilities title');
assert.equal(xiaoATitle.innerHtml.replace(/<[^>]*>/g, ''), '小A 2.0 能帮你做什么', 'home Xiao A capabilities must use the exact approved title');

const xiaoAItems = [...stripNonMarkup(xiaoASide.innerHtml).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)]
  .map((match) => normalizedText(match[1]));
assert.deepEqual(
  xiaoAItems,
  [
    '问流程：办公流程、SAP 流程、供应商创建与变更',
    '查财务：费用报销、财务项目预算管理',
    '查系统：Ariba、BIT 与 IT 服务指引',
    '连续追问：理解上下文、简称和补充信息',
    '看图表：识别图片与表格，回答更完整',
  ],
  'home Xiao A capabilities must contain the five approved normalized items',
);

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
