#!/usr/bin/env node
// Bending Boosters build: assembles the self-contained single-file game from src/.
// Zero dependencies. Deterministic: the same src/ always produces the same bytes.
//
//   node tools/build.mjs                    -> writes dist/bending-boosters.html
//   node tools/build.mjs --out FILE         -> writes FILE instead
//   node tools/build.mjs --check FILE       -> builds in memory, fails unless identical to FILE
//
// Layout and order live in build.config.json. See README.md ("How the build works").
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let root = ROOT;
const read = p => {
  const text = fs.readFileSync(path.join(root, p), 'utf8');
  if (text.includes('\r')) fail(`${p}: contains CR characters; use LF line endings`);
  return text;
};
// Thrown so callers (tests, tools/extract.mjs) can catch it; the command line prints it and exits 1.
function fail(msg) {
  throw new Error(msg);
}
let extraSets = [];

// esbuild's IIFE runtime prelude, exactly as the original bundle printed it.
export const PRELUDE = `  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);`;

const DECL = /^(?:var|let|const|class|function\*?|async\s+function\*?)\s+([A-Za-z_$][\w$]*)/;

// Turn one ES module of the Journey code into its bundled form:
// drop the leading import block, drop `export ` keywords, indent by two spaces.
function unmodule(file, { entry = false } = {}) {
  const text = read(file);
  if (!text.endsWith('\n')) fail(`${file}: must end with a newline`);
  const lines = text.slice(0, -1).split('\n');
  let i = 0;
  let sawImport = false;
  while (i < lines.length && lines[i].startsWith('import ')) {
    sawImport = true;
    while (i < lines.length && !/;\s*$/.test(lines[i])) i++;
    if (i >= lines.length) fail(`${file}: unterminated import statement`);
    if (!/from\s+["'][^"']+["'];\s*$/.test(lines[i])) fail(`${file}:${i + 1}: only \`import { ... } from "./x.js";\` is supported`);
    i++;
  }
  if (sawImport) {
    if (lines[i] !== '') fail(`${file}:${i + 1}: put exactly one blank line after the imports`);
    i++;
  }
  const out = [];
  const declared = [];
  const reexports = [];
  for (; i < lines.length; i++) {
    let line = lines[i];
    const n = i + 1;
    if (/^import\b/.test(line)) fail(`${file}:${n}: imports must be at the top of the file`);
    if (/^export\b/.test(line)) {
      const re = line.match(/^export\s*\{([^}]*)\}\s*from\s*["'][^"']+["'];\s*$/);
      if (entry && re) {
        for (const spec of re[1].split(',').map(s => s.trim()).filter(Boolean)) {
          if (/\s/.test(spec)) fail(`${file}:${n}: renamed re-exports are not supported`);
          reexports.push(spec);
        }
        continue;
      }
      if (!/^export (?:var|let|const|class|function\*?|async\s+function\*?)\s/.test(line)) {
        fail(`${file}:${n}: only \`export function/var/let/const/class\` at the start of a line is supported`);
      }
      line = line.slice('export '.length);
    }
    const d = line.match(DECL);
    if (d) declared.push(d[1]);
    out.push(line);
  }
  return { lines: out.map(l => (l === '' ? '' : '  ' + l)), declared, reexports };
}

function journeyBundle(spec) {
  const owner = new Map();
  const note = (name, file) => {
    if (owner.has(name)) fail(`top-level name \`${name}\` is declared in both ${owner.get(name)} and ${file}. The build puts every module in one scope, so names must be unique.`);
    owner.set(name, file);
  };
  const entry = unmodule(spec.entry, { entry: true });
  const exportNames = [...entry.reexports, ...entry.declared].sort();
  const out = [`var ${spec.globalName} = (() => {`, PRELUDE, '', `  // ${spec.entry}`, '  var index_exports = {};', '  __export(index_exports, {'];
  exportNames.forEach((n, k) => out.push(`    ${n}: () => ${n}${k < exportNames.length - 1 ? ',' : ''}`));
  out.push('  });', '');
  for (const file of spec.modules) {
    const m = unmodule(file);
    m.declared.forEach(n => note(n, file));
    out.push(`  // ${file}`, ...m.lines, '');
  }
  entry.declared.forEach(n => note(n, spec.entry));
  for (const n of entry.reexports) if (!owner.has(n)) fail(`${spec.entry} re-exports \`${n}\`, but no module declares it`);
  out.push(`  // ${spec.entry}`, ...entry.lines, '  return __toCommonJS(index_exports);', '})();');
  return out.join('\n') + '\n';
}

// Each set package dir holds set.json, cards.json and prices.json. The game gets them as one constant.
function setPackages(dirs) {
  const codes = new Set();
  const pkgs = dirs.map((dir) => {
    const load = (f) => {
      const file = path.join(dir, f);
      if (!fs.existsSync(path.join(root, file))) fail(`${dir}: missing ${f}`);
      try { return JSON.parse(read(file)); } catch (err) { fail(`${file}: ${err.message}`); }
    };
    const set = load('set.json');
    if (codes.has(set.code)) fail(`duplicate set code ${set.code}`);
    codes.add(set.code);
    return { ...set, cards: load('cards.json'), prices: load('prices.json') };
  });
  return `const SET_PACKAGES = ${JSON.stringify(pkgs)};\n`;
}

function part(p) {
  if (typeof p === 'string') {
    const text = read(p);
    if (!text.endsWith('\n')) fail(`${p}: must end with a newline`);
    return text;
  }
  if (p.json) {
    // Catalog files are pretty-printed for editing; the game embeds them minified.
    let value;
    try { value = JSON.parse(read(p.json)); } catch (err) { fail(`${p.json}: ${err.message}`); }
    return `const ${p.const} = ${JSON.stringify(value)};\n`;
  }
  if (p.sets) return setPackages([...p.sets, ...extraSets]);
  if (p.journey) return journeyBundle(p.journey);
  fail(`unknown part ${JSON.stringify(p)}`);
}

// withSets: extra set package dirs (relative to dir), added after the shipped ones; test builds only.
export function build(dir = ROOT, { withSets = [] } = {}) {
  root = dir;
  extraSets = withSets;
  const config = JSON.parse(read('build.config.json'));
  const template = read(config.template);
  const used = new Set();
  const html = template.replace(/^<!-- @slot ([\w-]+) -->\n/gm, (_, name) => {
    const parts = config.slots[name];
    if (!parts) fail(`${config.template}: unknown slot "${name}"`);
    used.add(name);
    return parts.map(part).join('');
  });
  for (const name of Object.keys(config.slots)) if (!used.has(name)) fail(`slot "${name}" is not used in ${config.template}`);
  return { html, config };
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const withSets = args.flatMap((a, i) => a === '--with-set' ? [args[i + 1]] : []);
  let html, config;
  try {
    ({ html, config } = build(ROOT, { withSets }));
  } catch (err) {
    console.error(`build: ${err.message}`);
    process.exit(1);
  }
  const ci = args.indexOf('--check');
  if (ci >= 0) {
    const target = args[ci + 1];
    if (!target) { console.error('build: --check needs a file'); process.exit(1); }
    const want = fs.readFileSync(path.resolve(target), 'utf8');
    if (want === html) {
      console.log(`identical to ${target}\nsha256 ${sha256(html)}`);
    } else {
      const a = html.split('\n'), b = want.split('\n');
      let k = 0;
      while (k < a.length && a[k] === b[k]) k++;
      console.error(`build differs from ${target} at line ${k + 1}:\n  built:  ${JSON.stringify((a[k] ?? '<eof>').slice(0, 160))}\n  target: ${JSON.stringify((b[k] ?? '<eof>').slice(0, 160))}`);
      process.exit(1);
    }
  } else {
    const oi = args.indexOf('--out');
    const out = path.resolve(ROOT, oi >= 0 ? args[oi + 1] : config.output);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    console.log(`built ${path.relative(process.cwd(), out) || out} (${Buffer.byteLength(html)} bytes)\nsha256 ${sha256(html)}`);
  }
}
