import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portalUrl = 'https://portal.amersports.cn/portal/indexs';
const oldUatUrl = 'ai-uat.amersports.cn:9093';
const portalInstructions = '进入 Portal 后，点击右侧「小A智助」';

const files = {
  index: readFileSync('site/knowledge-base/index.html', 'utf8'),
  search: readFileSync('site/knowledge-base/search.js', 'utf8'),
  detail: readFileSync('site/knowledge-base/detail.html', 'utf8'),
};

for (const [name, content] of Object.entries(files)) {
  assert.ok(!content.includes(oldUatUrl), `${name} must not reference the old Xiao A UAT URL`);
  assert.ok(content.includes(portalUrl), `${name} must reference the Portal homepage`);
}

assert.match(
  files.index,
  /<a class="xh-cta" href="https:\/\/portal\.amersports\.cn\/portal\/indexs" target="_blank" rel="noopener">前往 Portal 打开小A/,
  'home CTA must open Portal in a safe new tab with the approved copy',
);

assert.ok(
  files.search.includes(portalInstructions),
  'search Xiao A description must explain how to open Xiao A from Portal',
);
assert.ok(
  files.detail.includes(portalInstructions),
  'detail Xiao A description must explain how to open Xiao A from Portal',
);

console.log('Xiao A Portal entry checks passed.');
