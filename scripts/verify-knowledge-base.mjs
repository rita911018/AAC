import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/knowledge-base');
const pages = ['index.html', 'learn.html', 'video.html', 'resources.html', 'detail.html', 'progress.html'];
const requiredMascots = ['img/xiaoa-home.png', 'img/xiaoa-learn.png', 'img/xiaoa-video.png', 'img/xiaoa-resources.png'];
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

function tags(document, name) {
  const expectedName = new RegExp(`^(?:${name})$`, 'i');
  const found = [];
  let position = 0;

  while (position < document.length) {
    const start = document.indexOf('<', position);
    if (start === -1) break;
    const nameMatch = document.slice(start + 1).match(/^([a-z][\w:-]*)/i);
    if (!nameMatch) {
      position = start + 1;
      continue;
    }

    const tagName = nameMatch[1];
    let quote = null;
    let end = start + 1 + tagName.length;
    for (; end < document.length; end += 1) {
      const character = document[end];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        break;
      }
    }
    if (end === document.length) break;

    if (expectedName.test(tagName)) found.push(attributes(document.slice(start, end + 1)));
    position = end + 1;

    if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'style') {
      const closingTag = new RegExp(`<\\/${tagName}\\s*>`, 'ig');
      closingTag.lastIndex = position;
      const closingMatch = closingTag.exec(document);
      if (closingMatch) position = closingMatch.index + closingMatch[0].length;
    }
  }

  return found;
}

function removeComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function removeInactiveMarkup(html) {
  return removeComments(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

function hookMarkup(html) {
  return removeComments(html);
}

function isLocal(value) {
  return value && !/^(?:[a-z][a-z\d+.-]*:|\/\/|mailto:|tel:|data:|javascript:)/i.test(value);
}

function isExternalHttp(value) {
  return /^(?:https?:)?\/\//i.test(value ?? '');
}

function tokens(value) {
  return (value ?? '').trim().split(/[\t\n\f\r ]+/).filter(Boolean).map((token) => token.toLowerCase());
}

function decode(value, context) {
  try {
    return decodeURIComponent(value);
  } catch {
    report(`${context}: invalid percent-encoded value: ${value}`);
    return null;
  }
}

function splitReference(value) {
  const hashIndex = value.indexOf('#');
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  return {
    path: queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex),
    fragment: hashIndex === -1 ? null : value.slice(hashIndex + 1),
  };
}

function resolveLocal(page, pagePath, value, kind) {
  if (!isLocal(value)) return null;
  const { path } = splitReference(value);
  const decodedPath = decode(path, `${page}: ${kind}`);
  if (decodedPath === null) return null;
  if (isAbsolute(decodedPath)) {
    report(`${page}: absolute local target is not allowed: ${value}`);
    return null;
  }
  const target = decodedPath ? resolve(dirname(pagePath), decodedPath) : pagePath;
  const rootRelative = relative(root, target);
  if (rootRelative === '..' || rootRelative.startsWith('../') || isAbsolute(rootRelative)) {
    report(`${page}: local target escapes site root: ${value}`);
    return null;
  }
  return { target, rootRelative: rootRelative.replace(/\\/g, '/') };
}

function isInsideRealRoot(target, escapeMessage) {
  try {
    const realRoot = realpathSync(root);
    const realTarget = realpathSync(target);
    const rootPrefix = realRoot.endsWith(sep) ? realRoot : `${realRoot}${sep}`;
    if (realTarget !== realRoot && !realTarget.startsWith(rootPrefix)) {
      report(escapeMessage);
      return false;
    }
    return true;
  } catch {
    report(`${escapeMessage}: could not resolve real path`);
    return false;
  }
}

function isRegularFile(target, missingMessage, nonFileMessage, symlinkMessage, escapeMessage) {
  try {
    if (lstatSync(target).isSymbolicLink()) {
      report(symlinkMessage);
      return false;
    }
    if (!statSync(target).isFile()) {
      report(nonFileMessage);
      return false;
    }
    return isInsideRealRoot(target, escapeMessage);
  } catch {
    report(missingMessage);
    return false;
  }
}

function readText(target, message) {
  try {
    return readFileSync(target, 'utf8');
  } catch {
    report(message);
    return null;
  }
}

function verifyRequiredAsset(page, pagePath, document, asset, tagName) {
  let referenced = false;
  for (const attrs of tags(document, tagName)) {
    const source = tagName === 'link' ? attrs.href : attrs.src;
    const target = resolveLocal(page, pagePath, source, 'required asset');
    if (!target || target.rootRelative !== asset) continue;
    if (tagName === 'link' && !tokens(attrs.rel).includes('stylesheet')) continue;
    referenced = true;
    isRegularFile(
      target.target,
      `${page}: referenced asset is missing: ${asset}`,
      `${page}: referenced asset is not a file: ${asset}`,
      `${page}: referenced asset is a symlink: ${asset}`,
      `${page}: referenced asset escapes real site root: ${asset}`,
    );
  }
  if (!referenced) report(`${page}: missing required asset: ${asset}`);
}

function verifyFragment(page, href, target) {
  const { fragment } = splitReference(href);
  if (fragment === null || fragment === '') return;
  const decodedFragment = decode(fragment, `${page}: fragment`);
  if (decodedFragment === null) return;
  const targetHtml = readText(target, `${page}: could not read anchor target: ${href}`);
  if (targetHtml === null) return;
  const found = tags(removeInactiveMarkup(targetHtml), '[a-z][\\w:-]*')
    .some((attrs) => attrs.id === decodedFragment || attrs.name === decodedFragment);
  if (!found) report(`${page}: anchor target is missing: ${href}`);
}

for (const page of pages) {
  const pagePath = resolve(root, page);
  if (!isRegularFile(pagePath, `missing page: ${page}`, `page is not a file: ${page}`, `page is a symlink: ${page}`, `page escapes real site root: ${page}`)) continue;
  const html = readText(pagePath, `could not read page: ${page}`);
  if (html === null) continue;
  const inspection = hookMarkup(html);
  const document = removeInactiveMarkup(html);

  verifyRequiredAsset(page, pagePath, inspection, 'style.css', 'link');
  verifyRequiredAsset(page, pagePath, inspection, 'search.js', 'script');
  verifyRequiredAsset(page, pagePath, inspection, 'site.js', 'script');

  if (!tags(document, '[a-z][\\w:-]*').some((attrs) => tokens(attrs.class).includes('nav-toggle'))) {
    report(`${page}: missing .nav-toggle`);
  }

  for (const attrs of tags(document, 'a')) {
    if (attrs.href && isLocal(attrs.href)) {
      const target = resolveLocal(page, pagePath, attrs.href, 'anchor target');
      if (target && isRegularFile(
        target.target,
        `${page}: anchor target file is missing: ${splitReference(attrs.href).path || page}`,
        `${page}: local target is not a file: ${splitReference(attrs.href).path || page}`,
        `${page}: local target is a symlink: ${splitReference(attrs.href).path || page}`,
        `${page}: local target escapes real site root: ${splitReference(attrs.href).path || page}`,
      )) verifyFragment(page, attrs.href, target.target);
    }
    if (attrs.target?.toLowerCase() === '_blank' && isExternalHttp(attrs.href) && !tokens(attrs.rel).includes('noopener')) {
      report(`${page}: target=_blank link is missing rel=noopener: ${attrs.href ?? '(no href)'}`);
    }
  }

  for (const attrs of tags(document, 'img')) {
    if (!attrs.src || !isLocal(attrs.src)) continue;
    const target = resolveLocal(page, pagePath, attrs.src, 'image target');
    if (target) isRegularFile(
      target.target,
      `${page}: image is missing: ${attrs.src}`,
      `${page}: image is not a file: ${attrs.src}`,
      `${page}: image is a symlink: ${attrs.src}`,
      `${page}: image escapes real site root: ${attrs.src}`,
    );
  }
}

const stylesheet = resolve(root, 'style.css');
if (isRegularFile(stylesheet, 'missing stylesheet: style.css', 'stylesheet is not a file: style.css', 'stylesheet is a symlink: style.css', 'stylesheet escapes real site root: style.css')) {
  const css = readText(stylesheet, 'could not read stylesheet: style.css');
  if (css !== null && /gradient\s*\(/i.test(css)) report('style.css: gradients are not allowed');
}

for (const mascot of requiredMascots) {
  isRegularFile(resolve(root, mascot), `missing required mascot: ${mascot}`, `required mascot is not a file: ${mascot}`, `required mascot is a symlink: ${mascot}`, `required mascot escapes real site root: ${mascot}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: 6 pages validated');
}
