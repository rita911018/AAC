import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/knowledge-base');
const pages = ['index.html', 'learn.html', 'video.html', 'resources.html', 'detail.html', 'progress.html'];
const requiredMascots = [
  'img/xiaoa-home.png',
  'img/xiaoa-learn.png',
  'img/xiaoa-video.png',
  'img/xiaoa-resources.png',
];
const errors = [];

function report(message) {
  errors.push(message);
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
      .map(([, key, quoted, singleQuoted, bare]) => [key.toLowerCase(), quoted ?? singleQuoted ?? bare ?? '']),
  );
}

function isLocal(value) {
  return value && !/^(?:[a-z][a-z\d+.-]*:|\/\/|mailto:|tel:|data:|javascript:)/i.test(value);
}

function isExternalHttp(value) {
  return /^https?:\/\//i.test(value ?? '');
}

function verifyAnchor(page, href) {
  const [filePart, fragment] = href.split('#');
  if (!isLocal(href)) return;
  const targetFile = (filePart || page).split('?', 1)[0];
  const target = resolve(root, targetFile);
  if (!existsSync(target)) {
    report(`${page}: anchor target file is missing: ${filePart}`);
    return;
  }
  if (!fragment) return;
  const html = readFileSync(target, 'utf8');
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b(?:id|name)\\s*=\\s*(["'])${escaped}\\1`, 'i').test(html)) {
    report(`${page}: anchor target is missing: ${href}`);
  }
}

for (const page of pages) {
  const pagePath = resolve(root, page);
  if (!existsSync(pagePath)) {
    report(`missing page: ${page}`);
    continue;
  }

  const html = readFileSync(pagePath, 'utf8');
  for (const asset of ['style.css', 'search.js', 'site.js']) {
    const escaped = asset.replace('.', '\\.');
    if (!new RegExp(`(?:href|src)\\s*=\\s*(["'])${escaped}\\1`, 'i').test(html)) {
      report(`${page}: missing required asset: ${asset}`);
    }
  }
  if (!/class\s*=\s*(["'])[^"']*\bnav-toggle\b[^"']*\1/i.test(html)) {
    report(`${page}: missing .nav-toggle`);
  }

  const document = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  for (const match of document.matchAll(/<a\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.href) verifyAnchor(page, attrs.href);
    if (attrs.target?.toLowerCase() === '_blank' && isExternalHttp(attrs.href) && !/\bnoopener\b/i.test(attrs.rel ?? '')) {
      report(`${page}: target=_blank link is missing rel=noopener: ${attrs.href ?? '(no href)'}`);
    }
  }
  for (const match of document.matchAll(/<img\b[^>]*>/gi)) {
    const { src } = attributes(match[0]);
    if (isLocal(src) && !existsSync(resolve(root, src.split(/[?#]/, 1)[0]))) {
      report(`${page}: image is missing: ${src}`);
    }
  }
}

const stylesheet = resolve(root, 'style.css');
if (!existsSync(stylesheet)) {
  report('missing stylesheet: style.css');
} else if (/gradient\s*\(/i.test(readFileSync(stylesheet, 'utf8'))) {
  report('style.css: gradients are not allowed');
}

for (const mascot of requiredMascots) {
  if (!existsSync(resolve(root, mascot))) report(`missing required mascot: ${mascot}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: 6 pages validated');
}
