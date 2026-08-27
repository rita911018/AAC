import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

verifierRejects((fixture) => {
  const file = join(fixture, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', '<style>.bad{background:repeating-linear-gradient(red,blue)}</style></head>'));
}, 'index.html: gradients are not allowed', 'inline HTML gradient');

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
