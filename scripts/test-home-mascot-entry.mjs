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
const approvedBookPaths = [
  'M4.5 5.5c3.1-.8 5.6-.2 7.5 1.5v12c-1.9-1.7-4.4-2.3-7.5-1.5z',
  'M19.5 5.5c-3.1-.8-5.6-.2-7.5 1.5v12c1.9-1.7 4.4-2.3 7.5-1.5z',
];

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
  return new Map(parseTagAttributeEntries(rawAttributes).map(({ name, value }) => [name, value]));
}

function parseTagAttributeEntries(rawAttributes) {
  const entries = [];
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of rawAttributes.matchAll(attributePattern)) {
    entries.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? '',
    });
  }
  return entries;
}

const voidHtmlTags = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

function blankNonMarkup(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (match) => ' '.repeat(match.length));
}

function parseHtmlElements(source, label = 'HTML') {
  const searchable = blankNonMarkup(source);
  const elements = [];
  const stack = [];
  const tagPattern = /<\s*(\/?)\s*([a-z][\w:-]*)\b([^>]*)>/gi;

  for (const match of searchable.matchAll(tagPattern)) {
    const closing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    if (closing) {
      const element = stack.pop();
      assert.ok(element, `${label} must not contain an unmatched closing </${tagName}>`);
      assert.equal(element.tagName, tagName, `${label} must contain properly nested <${element.tagName}> markup`);
      element.closeStart = match.index;
      element.closeEnd = match.index + match[0].length;
      element.innerHtml = source.slice(element.openEnd, element.closeStart);
      continue;
    }

    const rawAttributes = match[3];
    const element = {
      tagName,
      attributes: parseTagAttributes(rawAttributes),
      attributeEntries: parseTagAttributeEntries(rawAttributes),
      openStart: match.index,
      openEnd: match.index + match[0].length,
      closeStart: match.index + match[0].length,
      closeEnd: match.index + match[0].length,
      innerHtml: '',
      parent: stack.at(-1) ?? null,
    };
    elements.push(element);

    if (!voidHtmlTags.has(tagName) && !/\/\s*$/.test(rawAttributes)) stack.push(element);
  }

  assert.equal(stack.length, 0, `${label} must not contain unclosed HTML elements`);
  return elements;
}

function hasClass(element, className) {
  return (element.attributes.get('class') ?? '').split(/\s+/).includes(className);
}

function findElementsByClass(source, tagName, className, label) {
  return parseHtmlElements(source, label).filter(
    (element) => element.tagName === tagName && hasClass(element, className),
  );
}

function findElementsByTag(source, tagName, label) {
  return parseHtmlElements(source, label).filter((element) => element.tagName === tagName);
}

function findDirectChildrenByTag(source, tagName, label) {
  return parseHtmlElements(source, label).filter(
    (element) => element.tagName === tagName && element.parent === null,
  );
}

function extractUniqueElementByClass(source, tagName, className, label) {
  const elements = findElementsByClass(source, tagName, className, label);
  assert.equal(elements.length, 1, `${label} must be one real, uncommented element`);
  return elements[0];
}

function stripNonMarkup(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

function findOpeningTags(source) {
  return [...stripNonMarkup(source).matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)]
    .map((match) => ({
      tagName: match[1].toLowerCase(),
      attributes: parseTagAttributes(match[2]),
      attributeEntries: parseTagAttributeEntries(match[2]),
    }));
}

function extractSvgElements(source) {
  const withoutComments = stripNonMarkup(source);
  return [...withoutComments.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg\s*>/gi)]
    .map((match) => ({
      attributes: parseTagAttributes(match[1]),
      attributeEntries: parseTagAttributeEntries(match[1]),
      innerHtml: match[2],
    }));
}

function openingTagsByClass(source, className) {
  return findOpeningTags(source).filter(({ attributes }) => (
    (attributes.get('class') ?? '').split(/\s+/).includes(className)
  ));
}

function extractUniqueElementByTag(source, tagName, label) {
  const elements = findElementsByTag(source, tagName, label);
  assert.equal(elements.length, 1, `${label} must be one real, uncommented element`);
  return elements[0];
}

function normalizedText(source) {
  return stripNonMarkup(source).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizedPathData(source) {
  const tokenPattern = /[-+]?(?:(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?)|[MmZzLlHhVvCcSsQqTtAa]/g;
  const tokens = [];
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    if (!/^[\s,]*$/.test(source.slice(cursor, match.index))) return null;
    const token = match[0];
    if (/^[A-Za-z]$/.test(token)) {
      tokens.push(token);
    } else {
      const number = Number(token);
      if (!Number.isFinite(number)) return null;
      tokens.push(Object.is(number, -0) ? '0' : String(number));
    }
    cursor = match.index + token.length;
  }

  if (tokens.length === 0 || !/^[\s,]*$/.test(source.slice(cursor))) return null;
  return tokens.join(' ');
}

function assertApprovedKnowledgeBookSvg(svg, label) {
  const approvedAttributeNames = [
    'aria-hidden',
    'data-brand-icon',
    'fill',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-width',
    'viewbox',
  ];
  assert.deepEqual(
    svg.attributeEntries.map(({ name }) => name).sort(),
    approvedAttributeNames,
    `${label} must contain exactly the approved SVG attributes`,
  );
  assert.equal(svg.attributes.get('data-brand-icon'), 'knowledge-book', `${label} must use the approved brand marker`);
  assert.equal(svg.attributes.get('aria-hidden'), 'true', `${label} must be hidden from assistive technology`);
  assert.equal(
    (svg.attributes.get('viewbox') ?? '').trim().replace(/\s+/g, ' '),
    '0 0 24 24',
    `${label} must use the approved viewBox`,
  );
  assert.equal(svg.attributes.get('fill'), 'none', `${label} must use the approved fill`);
  assert.equal(svg.attributes.get('stroke-width'), '1.8', `${label} must use the approved stroke width`);
  assert.equal(svg.attributes.get('stroke-linecap'), 'round', `${label} must use the approved line cap`);
  assert.equal(svg.attributes.get('stroke-linejoin'), 'round', `${label} must use the approved line join`);

  const children = findOpeningTags(svg.innerHtml);
  assert.equal(children.length, 2, `${label} must contain exactly two graphic elements`);
  assert.ok(children.every(({ tagName }) => tagName === 'path'), `${label} must contain only path elements`);
  assert.ok(
    children.every(({ attributeEntries }) => attributeEntries.length === 1 && attributeEntries[0].name === 'd'),
    `${label} paths must each contain exactly one d attribute`,
  );

  const actualPaths = children.map(({ attributes }) => normalizedPathData(attributes.get('d') ?? '')).sort();
  const expectedPaths = approvedBookPaths.map(normalizedPathData).sort();
  assert.deepEqual(actualPaths, expectedPaths, `${label} must contain exactly the two approved book paths`);
}

function extractUniqueAnchorByExactText(source, text, label) {
  const anchors = findElementsByTag(source, 'a', label).filter(
    (element) => normalizedText(element.innerHtml) === text,
  );
  assert.equal(anchors.length, 1, `${label} must contain exactly one anchor with visible text “${text}”`);
  return anchors[0];
}

function relTokenSet(element) {
  return new Set((element.attributes.get('rel') ?? '').split(/\s+/).filter(Boolean));
}

function isLocallyHidden(element) {
  const classTokens = new Set((element.attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
  return element.attributes.has('hidden')
    || element.attributes.get('aria-hidden') === 'true'
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(element.attributes.get('style') ?? '')
    || ['hidden', 'sr-only', 'visually-hidden'].some((className) => classTokens.has(className));
}

function assertVisiblyRendered(element, label) {
  let current = element;
  while (current) {
    assert.ok(!isLocallyHidden(current), `${label} must be visibly rendered`);
    current = current.parent;
  }
}

function normalizedVisibleText(source, label) {
  let visibleSource = source;
  const hiddenElements = parseHtmlElements(source, label)
    .filter((element) => isLocallyHidden(element))
    .sort((left, right) => right.openStart - left.openStart);
  for (const element of hiddenElements) {
    visibleSource = `${visibleSource.slice(0, element.openStart)}${' '.repeat(element.closeEnd - element.openStart)}${visibleSource.slice(element.closeEnd)}`;
  }
  return normalizedText(visibleSource);
}

for (const [fileName, content] of htmlFiles) {
  const header = extractUniqueElementByClass(content, 'header', 'topbar', `${fileName} header`);
  const footer = extractUniqueElementByClass(content, 'footer', 'footer', `${fileName} footer`);
  const brandRegions = [header.innerHtml, footer.innerHtml];
  const brandIconCounts = brandRegions.map((region) => extractSvgElements(region).filter(
    ({ attributes }) => attributes.get('data-brand-icon') === 'knowledge-book',
  ).length);
  assert.deepEqual(
    brandIconCounts,
    [1, 1],
    `${fileName} header and footer must each contain one knowledge-book SVG`,
  );

  const knowledgeBookMarkers = findOpeningTags(content).filter(
    ({ attributes }) => attributes.get('data-brand-icon') === 'knowledge-book',
  );
  assert.equal(knowledgeBookMarkers.length, 2, `${fileName} must contain exactly two knowledge-book markers`);
  assert.ok(
    knowledgeBookMarkers.every(({ tagName }) => tagName === 'svg'),
    `${fileName} knowledge-book markers must only be attached to SVG elements`,
  );

  const knowledgeBookSvgs = extractSvgElements(content).filter(
    ({ attributes }) => attributes.get('data-brand-icon') === 'knowledge-book',
  );
  assert.equal(
    knowledgeBookSvgs.length,
    2,
    `${fileName} must contain exactly two knowledge-book SVGs across the full page`,
  );
  knowledgeBookSvgs.forEach((svg, index) => assertApprovedKnowledgeBookSvg(
    svg,
    `${fileName} knowledge-book SVG ${index + 1}`,
  ));

  const oldStarPaths = findOpeningTags(content).filter(
    ({ tagName, attributes }) => tagName === 'path'
      && normalizedPathData(attributes.get('d') ?? '') === normalizedPathData(oldStarPath),
  );
  assert.equal(oldStarPaths.length, 0, `${fileName} must not contain the old star path in real HTML markup`);

  const topBrand = extractUniqueElementByClass(header.innerHtml, 'a', 'brand', `${fileName} top brand`);
  assertVisiblyRendered(topBrand, `${fileName} top brand`);
  const topBrandLogo = extractUniqueElementByClass(topBrand.innerHtml, 'span', 'logo', `${fileName} top brand logo`);
  const topBrandBookSvgs = extractSvgElements(topBrandLogo.innerHtml).filter(
    ({ attributes }) => attributes.get('data-brand-icon') === 'knowledge-book',
  );
  assert.equal(topBrandBookSvgs.length, 1, `${fileName} top brand must contain the knowledge-book logo`);
  const preview = extractUniqueElementByTag(topBrand.innerHtml, 'small', `${fileName} top brand PREVIEW`);
  assertVisiblyRendered(preview, `${fileName} top brand PREVIEW`);
  assert.equal(normalizedText(preview.innerHtml), 'PREVIEW', `${fileName} top brand must retain PREVIEW`);
  assert.equal(
    normalizedText(topBrand.innerHtml),
    '亚玛芬 AI 知识库PREVIEW',
    `${fileName} top brand must retain the approved brand text and PREVIEW`,
  );
}

const homeHero = extractUniqueElementByClass(files.index, 'section', 'home-hero', 'home hero');
const homeHeroCopy = extractUniqueElementByClass(homeHero.innerHtml, 'div', 'bh-left', 'home hero copy');
const homeTitle = extractUniqueElementByTag(homeHeroCopy.innerHtml, 'h1', 'home hero title');
assert.equal(homeTitle.innerHtml.replace(/<[^>]*>/g, ''), '亚玛芬 AI 知识库', 'home h1 must use the exact approved title');

const homeSubtitle = extractUniqueElementByClass(homeHeroCopy.innerHtml, 'p', 'bh-subtitle', 'home hero subtitle');
assert.equal(
  homeSubtitle.innerHtml.replace(/<[^>]*>/g, ''),
  '一站式 AI 学习资源与实践指南',
  'home subtitle must use the exact approved copy without extra whitespace',
);
const homeHeroParagraphs = findDirectChildrenByTag(homeHeroCopy.innerHtml, 'p', 'home hero copy');
assert.equal(homeHeroParagraphs.length, 2, 'home hero copy must retain exactly its subtitle and description');
assert.equal(
  normalizedText(homeHeroParagraphs[1].innerHtml),
  '从入门、录播到工具实践，在清晰的知识路径里找到所需内容。',
  'home hero must retain the exact approved description',
);
assert.equal(openingTagsByClass(homeHeroCopy.innerHtml, 'bh-tag').length, 0, 'home hero copy must not contain a bh-tag element');
assert.equal(openingTagsByClass(homeHero.innerHtml, 'mascot-status').length, 0, 'home hero must not contain a mascot-status element');
assert.ok(!normalizedText(homeHero.innerHtml).includes('AMER SPORTS · AI ENABLEMENT'), 'home hero must not contain the old eyebrow');
assert.ok(!normalizedText(homeHero.innerHtml).includes('XIAO A · ONLINE'), 'home hero must not contain the old Xiao A status');

const homeXiaoAShortcut = extractUniqueElementByClass(
  homeHero.innerHtml,
  'div',
  'hero-xiaoa-entry',
  'home Hero shortcut',
);
assertVisiblyRendered(homeXiaoAShortcut, 'home Hero shortcut');
assert.equal(
  findElementsByClass(files.index, 'div', 'hero-xiaoa-entry', 'home').length,
  1,
  'home must contain exactly one real div.hero-xiaoa-entry, scoped to the Hero',
);
const homeShortcutCta = extractUniqueAnchorByExactText(homeXiaoAShortcut.innerHtml, '打开小A', 'home Hero shortcut');
assert.equal(findElementsByTag(homeXiaoAShortcut.innerHtml, 'a', 'home Hero shortcut').length, 1, 'home Hero shortcut must contain exactly one anchor');
assertVisiblyRendered(homeShortcutCta, 'home Hero shortcut CTA');
assert.ok(
  homeShortcutCta.attributes.get('href') === portalUrl
    && homeShortcutCta.attributes.get('target') === '_blank'
    && relTokenSet(homeShortcutCta).has('noopener'),
  'home Hero shortcut must open the exact Portal URL in a safe new tab',
);
const homeShortcutParagraphs = findElementsByTag(homeXiaoAShortcut.innerHtml, 'p', 'home Hero shortcut');
assert.equal(homeShortcutParagraphs.length, 1, 'home Hero shortcut must contain exactly one description paragraph');
assertVisiblyRendered(homeShortcutParagraphs[0], 'home Hero shortcut description');
assert.equal(
  normalizedText(homeShortcutParagraphs[0].innerHtml),
  '查制度、问流程、找内部信息，有问题先问小A。',
  'home Hero shortcut description must match the approved copy exactly after normalization',
);

const homeEntryCards = findElementsByClass(files.index, 'a', 'entry-card', 'home learning path cards');
assert.equal(homeEntryCards.length, 3, 'home must contain exactly three entry-card anchors');
assert.deepEqual(
  homeEntryCards.map(({ attributes }) => attributes.get('href')),
  ['learn.html', 'video.html', 'resources.html'],
  'home entry-card hrefs must retain the approved order',
);
const learningPathTitles = findElementsByTag(files.index, 'h2', 'home').filter(
  ({ innerHtml }) => normalizedText(innerHtml) === '选择你的 AI 学习路径',
);
assert.equal(learningPathTitles.length, 1, 'home must contain exactly one h2 “选择你的 AI 学习路径”');

const homeElements = parseHtmlElements(files.index, 'home');
assert.equal(
  homeElements.filter(({ tagName, attributes }) => tagName === 'section' && attributes.get('id') === 'xiaoa').length,
  0,
  'home must not contain section#xiaoa',
);
assert.equal(homeElements.filter((element) => hasClass(element, 'xa-hero')).length, 0, 'home must not contain .xa-hero');
assert.equal(homeElements.filter((element) => hasClass(element, 'xa-vs')).length, 0, 'home must not contain .xa-vs');
assert.ok(!normalizedText(files.index).includes('小A vs 微软 Copilot'), 'home must not contain the Xiao A vs Microsoft Copilot comparison');
for (const forbiddenFullXiaoACopy of [
  '接入了公司制度、流程和内部数据的 AI 助手。',
  '小A 2.0 能帮你做什么',
  portalInstructions,
]) {
  assert.ok(
    !normalizedText(files.index).includes(forbiddenFullXiaoACopy),
    `home must not retain full Xiao A section copy: ${forbiddenFullXiaoACopy}`,
  );
}

const resourcesHero = extractUniqueElementByClass(files.resources, 'section', 'resources-hero', 'resources hero');
const resourcesHeroCopy = extractUniqueElementByClass(resourcesHero.innerHtml, 'div', 'bh-left', 'resources hero copy');
const resourcesHeroDescription = extractUniqueElementByTag(resourcesHeroCopy.innerHtml, 'p', 'resources hero description');
assert.equal(
  normalizedText(resourcesHeroDescription.innerHtml),
  '公司内部小A助手与外部 AI 学习资源统一整理：查流程、找工具、看课程、关注创作者与经典阅读，都从这里开始。',
  'resources Hero description must use the exact approved copy',
);

const resourcesXiaoA = extractUniqueElementByClass(files.resources, 'section', 'xiaoa-section', 'resources internal Xiao A section');
assertVisiblyRendered(resourcesXiaoA, 'resources internal Xiao A section');
assert.equal(resourcesXiaoA.attributes.get('id'), 'xiaoa', 'resources internal Xiao A section must be section.xiaoa-section#xiaoa');
const externalResources = extractUniqueElementByClass(files.resources, 'section', 'external-resources', 'resources external resources section');
assertVisiblyRendered(externalResources, 'resources external resources section');
assert.ok(
  resourcesXiaoA.openStart < externalResources.openStart,
  'resources internal Xiao A section must appear before the external resources section',
);
const resourcesPageElements = parseHtmlElements(files.resources, 'resources');
assert.equal(
  resourcesPageElements.filter(({ attributes }) => attributes.get('id') === 'xiaoa').length,
  1,
  'resources must contain exactly one real #xiaoa element, the internal section',
);
assert.equal(
  resourcesPageElements.filter((element) => element.tagName === 'section' && hasClass(element, 'external-resources')).length,
  1,
  'resources must contain exactly one real section.external-resources',
);

const internalTitle = extractUniqueElementByTag(resourcesXiaoA.innerHtml, 'h2', 'resources internal Xiao A title');
assert.equal(normalizedText(internalTitle.innerHtml), '公司内部 AI 助手', 'resources internal section must use the approved h2');
const internalTag = extractUniqueElementByClass(resourcesXiaoA.innerHtml, 'div', 'tag', 'resources Xiao A tag');
assert.equal(normalizedText(internalTag.innerHtml), 'XIAO A · 小A 智能助手', 'resources must retain the approved Xiao A positioning tag');
const internalPositioning = extractUniqueElementByClass(resourcesXiaoA.innerHtml, 'p', 'desc', 'resources Xiao A positioning');
assert.equal(
  normalizedText(internalPositioning.innerHtml),
  '接入了公司制度、流程和内部数据的 AI 助手。日常工作遇到「这个怎么操作 / 这个政策怎么说」的问题，先问小A —— 比翻邮件、问同事快得多。',
  'resources must retain the approved Xiao A positioning copy',
);

const xiaoANote = extractUniqueElementByClass(resourcesXiaoA.innerHtml, 'p', 'xh-note', 'resources Xiao A Portal note');
assert.equal(
  normalizedText(xiaoANote.innerHtml),
  `${portalInstructions}。`,
  'resources Xiao A Portal note must show the complete approved instructions',
);
assertVisiblyRendered(xiaoANote, 'resources Xiao A Portal note');
const xiaoACta = extractUniqueAnchorByExactText(resourcesXiaoA.innerHtml, '前往 Portal 打开小A', 'resources Xiao A CTA');
assertVisiblyRendered(xiaoACta, 'resources Xiao A CTA');
assert.ok(
  xiaoACta.attributes.get('href') === portalUrl
    && xiaoACta.attributes.get('target') === '_blank'
    && relTokenSet(xiaoACta).has('noopener'),
  'resources Xiao A CTA must open Portal in a safe new tab with the approved copy',
);

const xiaoASide = extractUniqueElementByClass(resourcesXiaoA.innerHtml, 'div', 'xh-side', 'resources Xiao A capabilities');
const xiaoATitle = extractUniqueElementByTag(xiaoASide.innerHtml, 'h4', 'resources Xiao A capabilities title');
assert.equal(normalizedText(xiaoATitle.innerHtml), '小A 2.0 能帮你做什么', 'resources Xiao A capabilities must retain the approved title');
const xiaoAItems = findElementsByTag(xiaoASide.innerHtml, 'li', 'resources Xiao A capabilities')
  .map(({ innerHtml }) => normalizedText(innerHtml));
assert.deepEqual(
  xiaoAItems,
  [
    '问流程：办公流程、SAP 流程、供应商创建与变更',
    '查财务：费用报销、财务项目预算管理',
    '查系统：Ariba、BIT 与 IT 服务指引',
    '连续追问：理解上下文、简称和补充信息',
    '看图表：识别图片与表格，回答更完整',
  ],
  'resources Xiao A capabilities must contain exactly the five approved normalized items',
);

const xiaoAVs = extractUniqueElementByClass(resourcesXiaoA.innerHtml, 'div', 'xa-vs', 'resources Xiao A comparison');
const comparisonTitle = extractUniqueElementByTag(xiaoAVs.innerHtml, 'h3', 'resources Xiao A comparison title');
assert.equal(normalizedText(comparisonTitle.innerHtml), '小A vs 微软 Copilot：什么时候用谁？', 'resources must retain the full comparison title');
const comparisonTable = extractUniqueElementByTag(xiaoAVs.innerHtml, 'table', 'resources Xiao A comparison table');
const comparisonRows = findElementsByTag(comparisonTable.innerHtml, 'tr', 'resources Xiao A comparison table').map((row) => (
  parseHtmlElements(row.innerHtml, 'resources Xiao A comparison row')
    .filter(({ tagName }) => tagName === 'th' || tagName === 'td')
    .map(({ innerHtml }) => normalizedText(innerHtml))
));
assert.deepEqual(
  comparisonRows,
  [
    ['场景', '推荐工具'],
    ['查公司制度、报销、班车、采购、招投标', '小A公司内部'],
    ['安排会议、写会议纪要、管理日程和邮件', 'Teams / Outlook 里的 Copilot微软'],
    ['写邮件、改文档、做总结（公司外部数据）', '通用 AI（ChatGPT / Claude / 小A 都行）'],
    ['创作、代码、学习、专业研究', '通用 AI（ChatGPT / Claude / DeepSeek 等）'],
  ],
  'resources must retain the complete approved Xiao A vs Microsoft Copilot table',
);

const externalTitle = extractUniqueElementByTag(externalResources.innerHtml, 'h2', 'resources external title');
assert.equal(normalizedText(externalTitle.innerHtml), '外部 AI 学习资源', 'resources external section must use the approved h2');
const resourceEntries = findElementsByClass(externalResources.innerHtml, 'a', 'res-entry', 'resources external entries');
assert.equal(resourceEntries.length, 4, 'resources external section must contain exactly four res-entry anchors');
assert.equal(
  findElementsByClass(files.resources, 'a', 'res-entry', 'resources').length,
  4,
  'resources must not contain res-entry anchors outside the external section',
);
assert.deepEqual(
  resourceEntries.map(({ attributes }) => attributes.get('href')),
  [
    'detail.html?type=resources&id=tools',
    'detail.html?type=resources&id=courses',
    'detail.html?type=resources&id=creators',
    'detail.html?type=resources&id=reading',
  ],
  'resources external entry hrefs must retain the approved order',
);
const toolsPreview = extractUniqueElementByClass(resourceEntries[0].innerHtml, 'div', 're-preview', 'AI tools preview');
const toolsPreviewText = normalizedText(toolsPreview.innerHtml);
assert.ok(!toolsPreviewText.includes('公司内部'), 'AI tools preview must not describe internal-company tools');
assert.ok(!toolsPreviewText.includes('小A'), 'AI tools preview must not include Xiao A');
assert.ok(toolsPreviewText.includes('DeepSeek'), 'AI tools preview must include DeepSeek');

const gatewayElements = resourcesPageElements.filter(({ attributes }) => attributes.get('id') === 'gateway');
assert.equal(gatewayElements.length, 1, 'resources must contain exactly one real #gateway element');
assert.equal(gatewayElements[0].tagName, 'div', 'resources #gateway must be a div, never a standalone section');
assert.ok(hasClass(gatewayElements[0], 'external-sites'), 'resources #gateway must be div.external-sites');
const resourcesGateway = extractUniqueElementByClass(externalResources.innerHtml, 'div', 'external-sites', 'resources external sites');
assertVisiblyRendered(resourcesGateway, 'resources external sites');
assert.equal(resourcesGateway.attributes.get('id'), 'gateway', 'resources external-sites must carry id="gateway"');
const resourcesGatewayTitle = extractUniqueElementByTag(resourcesGateway.innerHtml, 'h3', 'resources external sites title');
assert.equal(normalizedText(resourcesGatewayTitle.innerHtml), '精选站点', 'resources external-sites must use the approved h3');
const visibleExternalText = normalizedVisibleText(externalResources.innerHtml, 'resources external section');
assert.ok(!visibleExternalText.includes('GATEWAY · AI 网闸'), 'resources must not visibly render the old Gateway eyebrow');
assert.ok(!visibleExternalText.includes('外部精选 AI 资源'), 'resources must not visibly render the old Gateway title');

const resourcesGatewayLinks = findElementsByClass(resourcesGateway.innerHtml, 'a', 'gate-home-card', 'resources external sites links');
assert.equal(resourcesGatewayLinks.length, 2, 'resources external-sites must retain exactly two cards');
for (const [name, href] of [
  ['AI 日报', 'https://aihot.virxact.com/daily'],
  ['WaytoAGI', 'https://www.waytoagi.com/zh'],
]) {
  const matches = resourcesGatewayLinks.filter(({ innerHtml }) => normalizedText(innerHtml).includes(name));
  assert.equal(matches.length, 1, `resources external-sites must retain the ${name} card`);
  const link = matches[0];
  assert.ok(
    link.attributes.get('href') === href
      && link.attributes.get('target') === '_blank'
      && relTokenSet(link).has('noopener'),
    `resources external-sites ${name} card must retain its approved safe external link`,
  );
}

for (const [name, content] of Object.entries(files)) {
  assert.ok(!content.includes(oldUatUrl), `${name} must not reference the old Xiao A UAT URL`);
}

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

console.log('Brand, homepage, resources placement, Xiao A, Gateway, and Portal contract checks passed.');
