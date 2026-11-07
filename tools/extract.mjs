#!/usr/bin/env node
// Split a built single-file Bending Boosters HTML back into the src/ tree.
//
//   node tools/extract.mjs GAME.html [--out DIR]     (default DIR: the project root)
//
// This is how src/ was recovered from the shipped game. Keep it for the case where someone
// edits a built HTML directly: extract into a scratch directory and diff it against src/.
// Needs the devDependencies (acorn, eslint-scope): run `npm install` first.
//
// What it does:
//  - CSS: the first <style> is split at its major section comments into src/styles/main/NN-*.css;
//    the second (id="visual-edition") becomes src/styles/visual-edition.css.
//  - Pack simulator script: split at its `/* ===== Section ===== */` comments into
//    src/boosters/NN-*.js. The DATA/DECKS/PRICES lines become pretty-printed JSON in src/catalog/.
//  - Journey script: the esbuild IIFE is split at its `// src/...` module comments back into
//    ES modules at those paths. Imports/exports are recomputed with scope analysis.
//  - Everything else becomes the src/index.html template with <!-- @slot --> markers.
// It then runs the build and refuses to finish unless the rebuild is byte-identical to the input.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as eslintScope from 'eslint-scope';
import { build, PRELUDE } from './build.mjs';

const args = process.argv.slice(2);
const input = args.find(a => !a.startsWith('--'));
if (!input) { console.error('usage: node tools/extract.mjs GAME.html [--out DIR]'); process.exit(1); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : ROOT);
const html = fs.readFileSync(input, 'utf8');
if (html.includes('\r')) throw Error('CRLF input is not supported');

const written = [];
function write(p, text) {
  const full = path.join(OUT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  written.push(p);
}
const slug = (title, max = 4) => title
  .replace(/\(.*?\)/g, ' ').split(/[:→/]/)[0]
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, max).join('-');
const pad = n => String(n).padStart(2, '0');

// ---------- locate regions ----------
function region(open, close, from = 0) {
  const a = html.indexOf(open, from);
  if (a < 0) throw Error('missing ' + open);
  const s = a + open.length;
  const e = html.indexOf(close, s);
  if (e < 0) throw Error('missing ' + close);
  return { s, e, text: html.slice(s, e) };
}
const cssMain = region('<style>\n', '</style>\n');
const cssVisual = region('<style id="visual-edition">\n', '</style>\n', cssMain.e);
const js1 = region('<script>\n', '</script>\n', cssVisual.e);
const js2 = region('<script>\n', '</script>\n', js1.e);

// Split trailing blank lines off a slot so every source file ends with exactly one newline.
function trimTail(text) {
  const m = text.match(/\n*$/)[0];
  return { body: text.slice(0, text.length - m.length) + '\n', rest: m.slice(1) };
}

// ---------- CSS ----------
const MAJOR_CSS = /^\/\* (?:-{10}|={17}) (.+?) (?:-+|=+)/;
function splitCss(text) {
  const lines = text.split('\n');
  lines.pop(); // text ends with \n
  const parts = [];
  let cur = { title: 'root', lines: [] };
  for (const line of lines) {
    const m = line.match(MAJOR_CSS);
    if (m && cur.lines.length) { parts.push(cur); cur = { title: m[1], lines: [] }; }
    else if (m) cur.title = m[1];
    cur.lines.push(line);
  }
  parts.push(cur);
  return parts.map((p, i) => ({ file: `src/styles/main/${pad(i)}-${slug(p.title)}.css`, text: p.lines.join('\n') + '\n' }));
}
const cssMainT = trimTail(cssMain.text);
const cssParts = splitCss(cssMainT.body);
cssParts.forEach(p => write(p.file, p.text));
const cssVisualT = trimTail(cssVisual.text);
write('src/styles/visual-edition.css', cssVisualT.body);

// ---------- JSON formatting: one record per line ----------
function pretty(value, depth = 0, ind = '') {
  const inner = ind + '  ';
  if (depth < 2 && Array.isArray(value) && value.length) {
    return '[\n' + value.map(v => inner + pretty(v, depth + 1, inner)).join(',\n') + '\n' + ind + ']';
  }
  if (depth < 2 && value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
    return '{\n' + Object.entries(value).map(([k, v]) => inner + JSON.stringify(k) + ': ' + pretty(v, depth + 1, inner)).join(',\n') + '\n' + ind + '}';
  }
  return JSON.stringify(value);
}

// ---------- pack simulator script ----------
const js1T = trimTail(js1.text);
const boosterParts = [];
{
  const lines = js1T.body.split('\n');
  lines.pop();
  let cur = { title: 'prelude', lines: [] };
  let n = 0;
  const flush = () => {
    if (!cur.lines.length) return;
    const file = `src/boosters/${pad(n++)}-${slug(cur.title)}.js`;
    write(file, cur.lines.join('\n') + '\n');
    boosterParts.push(file);
  };
  for (const line of lines) {
    const data = line.match(/^const ([A-Z][A-Z0-9_]*) = (\{.*\}|\[.*\]);$/);
    if (data) {
      const value = JSON.parse(data[2]);
      if (JSON.stringify(value) !== data[2]) throw Error(`${data[1]} does not round-trip through JSON`);
      flush();
      cur = { title: 'continued', lines: [] };
      const file = `src/catalog/${data[1].toLowerCase()}.json`;
      write(file, pretty(value) + '\n');
      boosterParts.push({ const: data[1], json: file });
      continue;
    }
    const h = line.match(/^\/\* =+ (.+?) =+ \*\/$/);
    if (h) { flush(); cur = { title: h[1], lines: [] }; }
    cur.lines.push(line);
  }
  flush();
}

// ---------- Journey bundle ----------
const js2Lines = js2.text.split('\n');
const iifeStart = js2Lines.findIndex(l => /^var \w+ = \(\(\) => \{$/.test(l));
const globalName = js2Lines[iifeStart].match(/^var (\w+)/)[1];
const iifeEnd = js2Lines.indexOf('})();', iifeStart);
if (iifeStart !== 0 || iifeEnd < 0) throw Error('unexpected Journey script shape');
const chunks = [];
{
  let cur = { path: null, lines: [] };
  for (const line of js2Lines.slice(1, iifeEnd)) {
    const m = line.match(/^ {2}\/\/ (src\/\S+\.js)$/);
    if (m) { chunks.push(cur); cur = { path: m[1], lines: [] }; }
    else cur.lines.push(line);
  }
  chunks.push(cur);
}
const [prelude, entryHead, ...rest] = chunks;
const entryTail = rest.pop();
const entryPath = entryHead.path;
if (entryTail.path !== entryPath) throw Error('entry module markers do not match');
for (const c of chunks) {
  if (c.lines.some(l => l !== '' && !l.startsWith('  '))) throw Error(`${c.path}: line without the bundle indent`);
}
const strip2 = l => (l === '' ? '' : l.slice(2));
// module bodies end with one blank separator line
for (const c of [prelude, entryHead, ...rest]) {
  if (c.lines.at(-1) !== '') throw Error(`${c.path}: missing separator line`);
  c.lines = c.lines.slice(0, -1);
}
const headNames = entryHead.lines.join('\n').match(/__export\(index_exports, \{\n([\s\S]*?)\n {2}\}\);/)[1]
  .split('\n').map(l => l.trim().match(/^([\w$]+): \(\) => \1,?$/)[1]);
if (entryTail.lines.at(-1) !== '  return __toCommonJS(index_exports);') throw Error('unexpected entry tail');

const modules = rest.map(c => {
  const src = c.lines.map(strip2).join('\n') + '\n';
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const scope = sm.globalScope.childScopes[0];
  return { path: c.path, src, ast, declared: new Set(scope.variables.map(v => v.name)), through: sm.globalScope.through };
});
const owner = new Map();
for (const m of modules) for (const n of m.declared) {
  if (owner.has(n)) throw Error(`duplicate top-level ${n}: ${owner.get(n)} and ${m.path}`);
  owner.set(n, m.path);
}
const exportsOf = new Map(modules.map(m => [m.path, new Set()]));
const importsOf = new Map(modules.map(m => [m.path, new Map()]));
const order = new Map(modules.map((m, i) => [m.path, i]));
for (const m of modules) {
  for (const ref of m.through) {
    const n = ref.identifier.name;
    const from = owner.get(n);
    if (!from || from === m.path) continue;
    if (ref.isWrite()) throw Error(`${m.path} assigns to ${n} owned by ${from}; not expressible as an import`);
    exportsOf.get(from).add(n);
    const imp = importsOf.get(m.path);
    if (!imp.has(from)) imp.set(from, new Set());
    imp.get(from).add(n);
  }
}
// the entry's re-exports
const tailSrc = entryTail.lines.slice(0, -1).map(strip2);
const tailDeclared = new Set(tailSrc.map(l => (l.match(/^(?:var|let|const|function|class) ([\w$]+)/) || [])[1]).filter(Boolean));
const reexports = new Map();
for (const n of headNames) {
  if (tailDeclared.has(n)) continue;
  const from = owner.get(n);
  if (!from) throw Error(`entry exports unknown ${n}`);
  exportsOf.get(from).add(n);
  if (!reexports.has(from)) reexports.set(from, []);
  reexports.get(from).push(n);
}
const relImport = (fromFile, toFile) => {
  let r = path.posix.relative(path.posix.dirname(fromFile), toFile);
  return r.startsWith('.') ? r : './' + r;
};
const importLine = (names, spec) => {
  const one = `import { ${names.join(', ')} } from "${spec}";`;
  return one.length <= 100 ? one : `import {\n${names.map(n => `  ${n},`).join('\n')}\n} from "${spec}";`;
};
for (const m of modules) {
  const ex = exportsOf.get(m.path);
  const lines = m.src.slice(0, -1).split('\n');
  for (const stmt of m.ast.body) {
    let names = [];
    if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') names = [stmt.id.name];
    else if (stmt.type === 'VariableDeclaration') names = stmt.declarations.map(d => d.id.name);
    if (!names.some(n => ex.has(n))) continue;
    if (stmt.loc.start.column !== 0 || names.includes(undefined)) throw Error(`${m.path}:${stmt.loc.start.line}: cannot place export`);
    lines[stmt.loc.start.line - 1] = 'export ' + lines[stmt.loc.start.line - 1];
  }
  const imp = [...importsOf.get(m.path)].sort((a, b) => order.get(a[0]) - order.get(b[0]))
    .map(([from, ns]) => importLine([...ns].sort(), relImport(m.path, from)));
  write(m.path, (imp.length ? imp.join('\n') + '\n\n' : '') + lines.join('\n') + '\n');
}
{
  const re = [...reexports].sort((a, b) => order.get(a[0]) - order.get(b[0]))
    .map(([from, ns]) => `export { ${ns.sort().join(', ')} } from "${relImport(entryPath, from)}";`);
  const body = tailSrc.map(l => (/^(?:var|let|const|function|class) /.test(l) ? 'export ' + l : l));
  write(entryPath, re.join('\n') + '\n' + body.join('\n') + '\n');
}
const afterIife = js2Lines.slice(iifeEnd + 1).join('\n'); // text after "})();\n"
const leading = afterIife.match(/^\n*/)[0];
const recovery = trimTail(afterIife.slice(leading.length));
const recoveryFile = 'src/journey-recovery.js';
write(recoveryFile, recovery.body);

// ---------- template + config ----------
const marker = name => `<!-- @slot ${name} -->\n`;
const template =
  html.slice(0, cssMain.s) + marker('styles') + cssMainT.rest +
  html.slice(cssMain.e, cssVisual.s) + marker('visual-edition') + cssVisualT.rest +
  html.slice(cssVisual.e, js1.s) + marker('boosters') + js1T.rest +
  html.slice(js1.e, js2.s) + marker('journey') + leading + marker('journey-recovery') + recovery.rest +
  html.slice(js2.e);
write('src/index.html', template);

const config = {
  template: 'src/index.html',
  output: 'dist/bending-boosters.html',
  slots: {
    styles: cssParts.map(p => p.file),
    'visual-edition': ['src/styles/visual-edition.css'],
    boosters: boosterParts,
    journey: [{ journey: { globalName, entry: entryPath, modules: modules.map(m => m.path) } }],
    'journey-recovery': [recoveryFile],
  },
};
write('build.config.json', JSON.stringify(config, null, 2) + '\n');
if (prelude.lines.join('\n') !== PRELUDE) throw Error('esbuild prelude differs from the one the build emits');
const rebuilt = build(OUT).html;
if (rebuilt !== html) throw Error('extraction is not lossless: rebuilding src/ does not reproduce the input');
console.log(`extracted ${written.length} files into ${OUT}; rebuild is byte-identical to ${input}`);
