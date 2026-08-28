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

function extractUniqueObject(source, marker, label) {
  const occurrences = source.split(marker).length - 1;
  assert.equal(occurrences, 1, `${label} marker must identify exactly one object`);

  const markerIndex = source.indexOf(marker);
  const start = source.lastIndexOf('{', markerIndex);
  const end = source.indexOf('}', markerIndex);
  assert.ok(start >= 0 && end > markerIndex, `${label} object boundaries must be present`);
  return source.slice(start, end + 1);
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

const searchXiaoA = extractUniqueObject(
  files.search,
  "t:'小A · 公司内部 AI 助手'",
  'search Xiao A',
);
assert.ok(
  searchXiaoA.includes(portalUrl)
    && searchXiaoA.includes(portalInstructions)
    && /\bext\s*:\s*1\b/.test(searchXiaoA),
  'search Xiao A object must contain the Portal URL, complete instructions, and ext:1',
);

const detailXiaoA = extractUniqueObject(
  files.detail,
  "name:'小A · 公司内部 AI 助手'",
  'detail Xiao A',
);
assert.ok(
  detailXiaoA.includes(portalUrl)
    && detailXiaoA.includes(portalInstructions)
    && /\bbadge\s*:\s*(['"])公司内部\1/.test(detailXiaoA),
  'detail Xiao A object must contain the Portal URL, complete instructions, and internal badge',
);

console.log('Xiao A Portal entry checks passed.');
