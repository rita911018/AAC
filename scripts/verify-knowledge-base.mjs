import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/knowledge-base');
const pages = ['index.html', 'learn.html', 'video.html', 'resources.html', 'detail.html', 'progress.html'];
const requiredMascots = ['img/xiaoa-home.png', 'img/xiaoa-learn.png', 'img/xiaoa-video.png', 'img/xiaoa-resources.png'];
const errors = [];

function decodeHtmlEntities(source) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };
  return String(source ?? '')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (match, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      return codePoint === 0 || codePoint > 0x10FFFF ? '\uFFFD' : String.fromCodePoint(codePoint);
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (match, name) => named[name.toLowerCase()]);
}

function hasUnresolvedHtmlEntity(source) {
  return /&#(?:[xX][0-9A-Za-z]*|\d*)?;?|&[A-Za-z][A-Za-z0-9]+;/.test(source);
}

function report(message) {
  errors.push(message);
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
      .map(([, key, quoted, singleQuoted, bare]) => [key.toLowerCase(), decodeHtmlEntities(quoted ?? singleQuoted ?? bare ?? '')]),
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

function targetsTopLevelBackups(rootRelative) {
  return rootRelative.split('/')[0] === 'backups';
}

function resolveLocal(page, pagePath, value, kind) {
  if (!isLocal(value)) return null;
  const { path } = splitReference(value);
  const decodedPath = decode(path, `${page}: ${kind}`);
  if (decodedPath === null) return null;
  if (isAbsolute(decodedPath)) {
    report(`${page}: absolute ${kind} is not allowed: ${value}`);
    return null;
  }
  const target = decodedPath ? resolve(dirname(pagePath), decodedPath) : pagePath;
  const rootRelative = relative(root, target);
  if (rootRelative === '..' || rootRelative.startsWith('../') || isAbsolute(rootRelative)) {
    report(`${page}: ${kind} escapes site root: ${value}`);
    return null;
  }
  const normalizedRelative = rootRelative.replace(/\\/g, '/');
  if (targetsTopLevelBackups(normalizedRelative)) {
    report(`${page}: ${kind} must not target top-level backups: ${value}`);
    return null;
  }
  return { target, rootRelative: normalizedRelative };
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
    const rootRelative = relative(root, target);
    let current = root;
    const segments = rootRelative.split(sep).filter(Boolean);
    if (segments.some((segment) => {
      current = resolve(current, segment);
      try {
        return lstatSync(current).isSymbolicLink();
      } catch {
        return false;
      }
    })) {
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

function srcsetCandidates(value) {
  const source = value ?? '';
  const candidates = [];
  let position = 0;
  const whitespace = /[\t\n\f\r ]/;
  while (position < source.length) {
    while (position < source.length && (source[position] === ',' || whitespace.test(source[position]))) position += 1;
    if (position >= source.length) break;
    const start = position;
    const dataUrl = source.slice(position, position + 5).toLowerCase() === 'data:';
    let dataCommaSeen = false;
    while (position < source.length && !whitespace.test(source[position])) {
      if (source[position] === ',') {
        if (!dataUrl) break;
        if (dataCommaSeen && (position + 1 === source.length || whitespace.test(source[position + 1]))) break;
        dataCommaSeen = true;
      }
      position += 1;
    }
    const candidate = source.slice(start, position);
    if (candidate) candidates.push(candidate);
    while (position < source.length && source[position] !== ',') position += 1;
    if (source[position] === ',') position += 1;
  }
  return candidates;
}

function cssUrlReferences(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)]
    .map(([, doubleQuoted, singleQuoted, bare]) => (doubleQuoted ?? singleQuoted ?? bare ?? '').trim())
    .filter(Boolean);
}

function isLocalSvgReference(value) {
  if (!isLocal(value)) return false;
  try {
    return /\.svg$/i.test(decodeURIComponent(splitReference(value).path));
  } catch {
    return false;
  }
}

function hasSvgGradientElement(source) {
  return /<\s*(?:[A-Za-z_][\w.-]*:)?(?:linearGradient|radialGradient)\b/i.test(source);
}

function decodeCssEscapes(source) {
  return source
    .replace(/\\([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint === 0 || codePoint > 0x10FFFF ? '\uFFFD' : String.fromCodePoint(codePoint);
    })
    .replace(/\\(?:\r\n|[\n\f\r])/g, '')
    .replace(/\\([^\n\f\r])/g, '$1');
}

function hasForbiddenGradient(source) {
  const normalized = decodeCssEscapes(source);
  if (/gradient\s*\(/i.test(normalized)) return true;

  const withoutNonSvgImages = normalized.replace(/data:image\/(?!svg\+xml)[^,\s"'()<>]*,[^\s"')<>]*/gi, '');
  if (hasSvgGradientElement(withoutNonSvgImages)) return true;

  for (const match of normalized.matchAll(/data:image\/svg\+xml([^,]*),([^\s"')<>]*)/gi)) {
    const metadata = match[1].toLowerCase();
    const payload = match[2];
    try {
      const urlDecodedPayload = decodeURIComponent(payload);
      const decoded = metadata.split(';').includes('base64')
        ? Buffer.from(urlDecodedPayload, 'base64').toString('utf8')
        : urlDecodedPayload;
      if (hasSvgGradientElement(decoded)) return true;
    } catch {
      // Malformed data URIs are handled as ordinary source text; asset checks remain independent.
    }
  }
  return false;
}

function hasCssImport(source) {
  return /@import\b/i.test(decodeCssEscapes(source));
}

function verifyLocalAsset(page, pagePath, value, kind, gradientKind = 'linked SVG') {
  if (!isLocal(value)) return;
  const target = resolveLocal(page, pagePath, value, kind);
  if (!target) return;
  const valid = isRegularFile(
    target.target,
    `${page}: ${kind} is missing: ${value}`,
    `${page}: ${kind} is not a file: ${value}`,
    `${page}: ${kind} is a symlink: ${value}`,
    `${page}: ${kind} escapes real site root: ${value}`,
  );
  if (valid && target.rootRelative.toLowerCase().endsWith('.svg')) {
    const svg = readText(target.target, `${page}: could not read linked SVG: ${value}`);
    if (svg !== null && hasForbiddenGradient(svg)) report(`${page}: ${gradientKind} gradients are not allowed: ${value}`);
  }
}

function verifyCssSvgReferences(context, basePath, source) {
  for (const value of cssUrlReferences(source)) {
    if (isLocalSvgReference(value)) verifyLocalAsset(context, basePath, value, 'CSS SVG', 'CSS SVG');
  }
}

function verifySrcset(page, pagePath, value, kind) {
  for (const candidate of srcsetCandidates(value)) {
    if (/^data:/i.test(candidate)) {
      report(`${page}: data URL is not allowed in ${kind} srcset`);
    } else {
      verifyLocalAsset(page, pagePath, candidate, `${kind} candidate`);
    }
  }
}

function verifyStylesheetReference(page, pagePath, href) {
  if (!href || !isLocal(href)) return;
  const target = resolveLocal(page, pagePath, href, 'stylesheet');
  if (!target) return;
  const valid = isRegularFile(
    target.target,
    `${page}: stylesheet is missing: ${href}`,
    `${page}: stylesheet is not a file: ${href}`,
    `${page}: stylesheet is a symlink: ${href}`,
    `${page}: stylesheet escapes real site root: ${href}`,
  );
  if (!valid) return;
  const css = readText(target.target, `${page}: could not read linked stylesheet: ${href}`);
  if (css === null) return;
  if (hasCssImport(css)) report(`${page}: linked stylesheet @import is not allowed: ${href}`);
  if (hasForbiddenGradient(css)) report(`${page}: linked stylesheet gradients are not allowed: ${href}`);
  verifyCssSvgReferences(page, target.target, css);
}

function cssFiles(directory = root) {
  const found = [];
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    report(`could not inspect CSS directory: ${relative(root, directory) || '.'}`);
    return found;
  }
  for (const entry of entries) {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (resolve(directory) === root && entry.name === 'backups') continue;
      found.push(...cssFiles(target));
    } else if (/\.css$/i.test(entry.name)) {
      found.push(target);
    }
  }
  return found;
}

for (const page of pages) {
  const pagePath = resolve(root, page);
  if (!isRegularFile(pagePath, `missing page: ${page}`, `page is not a file: ${page}`, `page is a symlink: ${page}`, `page escapes real site root: ${page}`)) continue;
  const html = readText(pagePath, `could not read page: ${page}`);
  if (html === null) continue;
  const inspection = hookMarkup(html);
  const document = removeInactiveMarkup(html);

  for (const attrs of tags(document, '[a-z][\\w:-]*')) {
    for (const name of ['style', 'src', 'srcset', 'href', 'poster', 'data']) {
      if (attrs[name] && hasUnresolvedHtmlEntity(attrs[name])) report(`${page}: unresolved HTML entity in ${name} attribute`);
    }
  }

  if (hasForbiddenGradient(decodeHtmlEntities(html))) report(`${page}: gradients are not allowed`);
  for (const match of inspection.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const styleSource = decodeHtmlEntities(match[1]);
    if (hasCssImport(styleSource)) report(`${page}: CSS @import is not allowed`);
    verifyCssSvgReferences(page, pagePath, styleSource);
  }
  for (const attrs of tags(document, '[a-z][\\w:-]*')) {
    if (attrs.style) verifyCssSvgReferences(page, pagePath, attrs.style);
  }

  verifyRequiredAsset(page, pagePath, inspection, 'style.css', 'link');
  verifyRequiredAsset(page, pagePath, inspection, 'search.js', 'script');
  verifyRequiredAsset(page, pagePath, inspection, 'site.js', 'script');

  for (const attrs of tags(inspection, 'link')) {
    if (tokens(attrs.rel).includes('stylesheet')) verifyStylesheetReference(page, pagePath, attrs.href);
  }

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
    if (attrs.src) verifyLocalAsset(page, pagePath, attrs.src, 'image');
    verifySrcset(page, pagePath, attrs.srcset, 'image');
  }

  for (const attrs of tags(document, 'source')) {
    verifySrcset(page, pagePath, attrs.srcset, 'source');
  }
}

for (const stylesheet of cssFiles()) {
  const name = relative(root, stylesheet).replace(/\\/g, '/');
  if (!isRegularFile(stylesheet, `missing stylesheet: ${name}`, `stylesheet is not a file: ${name}`, `stylesheet is a symlink: ${name}`, `stylesheet escapes real site root: ${name}`)) continue;
  const css = readText(stylesheet, `could not read stylesheet: ${name}`);
  if (css === null) continue;
  if (hasCssImport(css)) report(`${name}: CSS @import is not allowed`);
  if (hasForbiddenGradient(css)) report(`${name}: gradients are not allowed`);
  verifyCssSvgReferences(name, stylesheet, css);
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
