import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/knowledge-base');
const videoPath = resolve(root, 'video.html');
const resourcesPath = resolve(root, 'resources.html');
const stylePath = resolve(root, 'style.css');
const video = readFileSync(videoPath, 'utf8');
const resources = readFileSync(resourcesPath, 'utf8');
const style = readFileSync(stylePath, 'utf8');
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const count = (source, value) => (source.match(new RegExp(escapePattern(value), 'g')) ?? []).length;

function expectExternalLink(source, href, page) {
  const anchor = source.match(new RegExp(`<a\\b[^>]*href=["']${escapePattern(href)}["'][^>]*>`, 'i'))?.[0] ?? '';
  expect(Boolean(anchor), `${page}: missing preserved external link ${href}`);
  expect(/target=["']_blank["']/i.test(anchor), `${page}: external link must open a new tab: ${href}`);
  expect(/rel=["'][^"']*\bnoopener\b[^"']*["']/i.test(anchor), `${page}: external link must use noopener: ${href}`);
}

for (const [page, source, theme, png, webp, alt] of [
  ['video.html', video, 'video', 'img/xiaoa-video.png', 'img/xiaoa-video-480.webp', '正在观看录播的小A AI 助手'],
  ['resources.html', resources, 'resources', 'img/xiaoa-resources.png', 'img/xiaoa-resources-480.webp', '使用放大镜探索 AI 工具的小A'],
]) {
  expect(source.includes('class="hero-grid"'), `${page}: hero must include the flat AI grid layer`);
  expect(source.includes('class="hero-mascot reveal"'), `${page}: hero must include one revealed mascot`);
  expect(count(source, `class="hero-mascot reveal"`) === 1, `${page}: hero must include exactly one mascot`);
  expect(source.includes(`<source srcset="${webp}" type="image/webp">`), `${page}: mascot picture must prefer optimized WebP`);
  expect(source.includes(`<img src="${png}" alt="${alt}"`), `${page}: mascot picture must retain the canonical PNG fallback and descriptive alt`);
  expect(new RegExp(`<img\\b[^>]*src=["']${escapePattern(png)}["'][^>]*fetchpriority=["']high["'][^>]*decoding=["']async["']`, 'i').test(source), `${page}: hero mascot must be eagerly prioritized without lazy loading`);
  expect(source.includes(`board-hero ${theme}-hero`), `${page}: hero must expose a page theme hook`);
}

const sharePointUrls = [
  'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E9%AB%98%E9%98%B6%E5%9F%B9%E8%AE%AD%E5%BD%95%E6%92%AD.aspx',
  'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E8%B4%A2%E5%8A%A1%E4%B8%93%E5%9C%BA%E5%9F%B9%E8%AE%AD.aspx',
  'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E7%BA%BF%E4%B8%8A%E7%B2%BE%E9%80%89%E8%AF%BE%E7%A8%8B.aspx',
];
for (const href of sharePointUrls) {
  expectExternalLink(video, href, 'video.html');
  expect(count(video, href) === 1, `video.html: SharePoint URL must remain unique: ${href}`);
}
for (const hook of ['thumb-landscape', 'thumb-stars', 'thumb-aurora']) {
  expect(video.includes(hook), `video.html: missing preserved thumbnail hook .${hook}`);
}

const resourceRoutes = [
  'detail.html?type=resources&id=tools',
  'detail.html?type=resources&id=courses',
  'detail.html?type=resources&id=creators',
  'detail.html?type=resources&id=reading',
];
for (const href of resourceRoutes) {
  expect(count(resources, href) === 1, `resources.html: route must be preserved exactly once: ${href}`);
}
for (const href of ['https://aihot.virxact.com/daily', 'https://www.waytoagi.com/zh']) {
  expectExternalLink(resources, href, 'resources.html');
}
for (const hook of ['res-entry', 're-head', 're-preview', 're-foot']) {
  expect(resources.includes(hook), `resources.html: missing preserved resource hook .${hook}`);
}
expect(resources.includes('class="resource-directory"'), 'resources.html: categories must use the wide row directory layout');
expect(!/\sstyle\s*=/i.test(resources), 'resources.html: page must not use inline presentation styles');

const allSource = [video, resources, style].join('\n');
expect(!/\b(?:linear|radial|conic)-gradient\s*\(/i.test(allSource), 'Task 7 source must not contain CSS gradients');

for (const asset of ['img/xiaoa-video-480.webp', 'img/xiaoa-resources-480.webp']) {
  const path = resolve(root, asset);
  expect(existsSync(path), `missing optimized mascot: ${asset}`);
  if (!existsSync(path)) continue;
  expect(statSync(path).size <= 200_000, `${asset}: optimized mascot must be at most 200 KB`);
  try {
    const metadata = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', path], { encoding: 'utf8' });
    const width = Number(metadata.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(metadata.match(/pixelHeight:\s*(\d+)/)?.[1]);
    expect(width <= 480 && height <= 480, `${asset}: dimensions must fit within 480 × 480`);
    expect(/hasAlpha:\s*yes/i.test(metadata), `${asset}: transparent background must be preserved`);
  } catch (error) {
    failures.push(`${asset}: could not inspect image metadata (${error.message})`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}

console.log('PASS: Task 7 video/resources contract validated');
