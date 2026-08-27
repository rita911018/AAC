import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/knowledge-base');
const verifier = resolve('scripts/verify-knowledge-base.mjs');
const pages = ['index.html', 'learn.html', 'video.html', 'resources.html', 'detail.html', 'progress.html'];
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map(([, key, doubleQuoted, singleQuoted, bare]) => [key.toLowerCase(), doubleQuoted ?? singleQuoted ?? bare ?? '']));
}

for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const inputTag = html.match(/<input\b[^>]*\bid=["']searchInput["'][^>]*>/i)?.[0] ?? '';
  const input = attrs(inputTag);
  const hasExplicitLabel = Boolean(input['aria-label'] || input['aria-labelledby'])
    || new RegExp(`<label\\b[^>]*\\bfor=["']${input.id}["']`, 'i').test(html);
  expect(hasExplicitLabel, `${page}: #searchInput needs a persistent accessible name`);
  expect(!/<h6\b/i.test(html), `${page}: footer must not skip directly to h6 headings`);

  const navToggle = attrs(html.match(/<button\b[^>]*\bclass=["'][^"']*\bnav-toggle\b[^"']*["'][^>]*>/i)?.[0] ?? '');
  expect(Boolean(navToggle['aria-label']), `${page}: nav toggle needs a visible-state accessible label`);
}

const css = readFileSync(resolve(root, 'style.css'), 'utf8');
expect(/\.brand\s*\{[^}]*min-height\s*:\s*44px/is.test(css), 'brand link must expose a 44px minimum target');
expect(/\.nav-toggle\s*\{[^}]*width\s*:\s*44px[^}]*height\s*:\s*44px/is.test(css), 'nav toggle must be a 44px target');
expect(/@media\(max-width:820px\)[\s\S]*?\.(?:video|resources)-hero \.hero-mascot[^\{]*\{[^}]*?(?:width|max-width)\s*:\s*(?:2(?:0|1|2|3|4)\d|clamp\()/i.test(css), '820px video/resources mascots should be larger than the generic tablet mascot');

function verifierRejects(mutator, expectedText, description) {
  const fixture = mkdtempSync(join(tmpdir(), 'kb-task8-'));
  try {
    cpSync(root, fixture, { recursive: true });
    mutator(fixture);
    try {
      execFileSync(process.execPath, [verifier, fixture], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      failures.push(`${description}: verifier incorrectly passed`);
    } catch (error) {
      const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
      expect(output.includes(expectedText), `${description}: verifier failed without the expected diagnostic (${expectedText})`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

function verifierAccepts(mutator, description) {
  const fixture = mkdtempSync(join(tmpdir(), 'kb-task8-'));
  try {
    cpSync(root, fixture, { recursive: true });
    mutator(fixture);
    try {
      execFileSync(process.execPath, [verifier, fixture], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      failures.push(`${description}: verifier incorrectly failed (${error.stderr || error.stdout || error.message})`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', '<style>.bad{background:repeating-linear-gradient(red,blue)}</style></head>'));
}, 'index.html: gradients are not allowed', 'inline HTML gradient');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</body>', '<svg aria-hidden="true"><defs><linearGradient id="bad"><stop offset="0"/></linearGradient></defs></svg></body>'));
}, 'index.html: gradients are not allowed', 'inline SVG linearGradient element');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  const svg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><defs><linearGradient id='bad'/></defs></svg>";
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', `<style>.bad{background-image:url("${svg}")}</style></head>`));
}, 'index.html: gradients are not allowed', 'raw SVG linearGradient data URI');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  const svg = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3CradialGradient%20id=%22bad%22/%3E%3C/defs%3E%3C/svg%3E';
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', `<style>.bad{background-image:url("${svg}")}</style></head>`));
}, 'index.html: gradients are not allowed', 'percent-encoded SVG radialGradient data URI');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bad"/></defs></svg>').toString('base64');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', `<style>.bad{background-image:url(data:image/svg+xml;base64,${svg})}</style></head>`));
}, 'index.html: gradients are not allowed', 'base64 SVG linearGradient data URI');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'bad.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bad"/></defs></svg>');
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</body>', '<img src="bad.svg" alt=""></body>'));
}, 'index.html: linked SVG gradients are not allowed: bad.svg', 'linked local SVG radialGradient asset');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'bad-css.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bad"/></defs></svg>');
  writeFileSync(join(fixture, 'extra.css'), '.bad { background: url("bad-css.svg"); }');
}, 'extra.css: CSS SVG gradients are not allowed: bad-css.svg', 'unreferenced CSS file with a gradient SVG URL');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'prefixed-linear.svg'), '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs><svg:linearGradient id="bad" spreadMethod="pad"/></defs></svg>');
  writeFileSync(join(fixture, 'prefixed-linear.css'), '.bad { background: url("prefixed-linear.svg"); }');
}, 'prefixed-linear.css: CSS SVG gradients are not allowed: prefixed-linear.svg', 'CSS-linked SVG namespace-prefixed linearGradient');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'prefixed-radial.svg'), '<svg xmlns="http://www.w3.org/2000/svg" xmlns:foo="http://www.w3.org/2000/svg"><defs><foo:radialGradient id="bad" cx="50%"/></defs></svg>');
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', '<style>.bad { background: url( prefixed-radial.svg ); }</style></head>'));
}, 'index.html: CSS SVG gradients are not allowed: prefixed-radial.svg', 'inline CSS-linked SVG namespace-prefixed radialGradient');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'bad-inline.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bad"/></defs></svg>');
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', '<style>.bad { background-image: url( "bad-inline.svg?cache=1#paint" ); }</style></head>'));
}, 'index.html: CSS SVG gradients are not allowed: bad-inline.svg?cache=1#paint', 'HTML style block with a queried gradient SVG URL');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'bad-attribute.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bad"/></defs></svg>');
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('<body>', '<body style="background-image:url(\'bad-attribute.svg\')">'));
}, 'index.html: CSS SVG gradients are not allowed: bad-attribute.svg', 'HTML style attribute with a gradient SVG URL');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('<body>', '<body style="background-image:url(\'../outside.svg\')">'));
}, 'index.html: CSS SVG escapes site root: ../outside.svg', 'HTML style attribute with an escaping SVG URL');

verifierRejects((fixture) => {
  writeFileSync(join(fixture, 'clean-target.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>');
  symlinkSync(join(fixture, 'clean-target.svg'), join(fixture, 'linked.svg'));
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('<body>', '<body style="background:url(linked.svg)">'));
}, 'index.html: CSS SVG is a symlink: linked.svg', 'HTML style attribute with a symlinked local SVG URL');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('<body>', '<body style="background:url(missing.svg)">'));
}, 'index.html: CSS SVG is missing: missing.svg', 'HTML style attribute with a missing local SVG URL');

verifierAccepts((fixture) => {
  const file = join(fixture, 'index.html');
  const payload = Buffer.from('not an SVG; the word linearGradient is harmless in a PNG payload test').toString('base64');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', `<style>.ok{background-image:url(data:image/png;base64,${payload})}</style></head>`));
}, 'ordinary non-SVG data image');

verifierAccepts((fixture) => {
  writeFileSync(join(fixture, 'clean.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>');
  const file = join(fixture, 'index.html');
  const style = 'background-image:url(clean.svg?cache=1#icon),url(https://example.com/remote.svg),url(data:image/png;base64,b2s=),url(missing.png)';
  writeFileSync(file, readFileSync(file, 'utf8').replace('<body>', `<body style="${style}">`));
}, 'clean local SVG and ignored external/data/non-SVG CSS URLs');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('srcset="img/xiaoa-home-480.webp"', 'srcset="img/missing.webp 1x, img/xiaoa-home-480.webp 2x"'));
}, 'source candidate is missing: img/missing.webp', 'missing local srcset candidate');

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('srcset="img/xiaoa-home-480.webp"', 'srcset="../outside.webp 1x"'));
}, 'source candidate escapes site root', 'escaping local srcset candidate');

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`PASS: Task 8 static accessibility and verifier contract (${pages.length} pages)`);
