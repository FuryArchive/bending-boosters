#!/usr/bin/env node
// Static checks for the Journey ES modules (src/data, src/engine, src/ui).
// The build places every module in one shared scope, so in addition to normal ES module
// hygiene this guards the rules that the bundle relies on:
//   1. top-level names are unique across all modules (otherwise the bundle breaks or silently shadows)
//   2. every name a module uses from another module is imported, and every import exists
//   3. no module assigns to an imported binding
// Needs the devDependencies (acorn, eslint-scope).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as eslintScope from 'eslint-scope';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'build.config.json'), 'utf8'));
const spec = Object.values(config.slots).flat().find(p => p && p.journey).journey;
const files = [...spec.modules, spec.entry];
const problems = [];

const mods = files.map(file => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true });
  } catch (err) {
    problems.push(`${file}: ${err.message}`);
    return null;
  }
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const scope = sm.globalScope.childScopes[0];
  const imported = new Map(); // local name -> {from, name}
  const exported = new Set();
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      const from = path.posix.join(path.posix.dirname(file), node.source.value);
      for (const s of node.specifiers) {
        if (s.type !== 'ImportSpecifier' || s.imported.name !== s.local.name) problems.push(`${file}:${s.loc.start.line}: only plain named imports are supported`);
        imported.set(s.local.name, { from, name: s.imported.name, line: s.loc.start.line });
      }
    }
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        const d = node.declaration;
        if (d.declarations) d.declarations.forEach(x => exported.add(x.id.name));
        else exported.add(d.id.name);
      }
      for (const s of node.specifiers || []) exported.add(s.exported.name);
    }
  }
  const own = scope.variables.filter(v => !imported.has(v.name)).map(v => v.name);
  return { file, scope, sm, imported, exported, own };
}).filter(Boolean);

const byFile = new Map(mods.map(m => [m.file, m]));
const owner = new Map();
for (const m of mods) for (const n of m.own) {
  if (owner.has(n)) problems.push(`top-level \`${n}\` is declared in both ${owner.get(n)} and ${m.file}`);
  else owner.set(n, m.file);
}
for (const m of mods) {
  for (const [local, imp] of m.imported) {
    const target = byFile.get(imp.from);
    if (!target) problems.push(`${m.file}:${imp.line}: imports from ${imp.from}, which is not in build.config.json`);
    else if (!target.exported.has(imp.name)) problems.push(`${m.file}:${imp.line}: ${imp.from} does not export \`${imp.name}\``);
    const v = m.scope.variables.find(x => x.name === local);
    if (v && v.references.some(r => r.isWrite())) problems.push(`${m.file}: assigns to imported \`${local}\``);
    if (v && !v.references.length) problems.push(`${m.file}:${imp.line}: unused import \`${local}\``);
  }
  for (const ref of m.sm.globalScope.through) {
    const n = ref.identifier.name;
    if (owner.has(n) && owner.get(n) !== m.file) {
      problems.push(`${m.file}:${ref.identifier.loc.start.line}: uses \`${n}\` from ${owner.get(n)} without importing it`);
    }
  }
}
const order = new Map(files.map((f, i) => [f, i]));
for (const m of mods) for (const imp of m.imported.values()) {
  if (m.file !== spec.entry && order.get(imp.from) > order.get(m.file)) {
    console.warn(`note: ${m.file} imports ${imp.from}, which comes later in build.config.json (fine if only used inside functions)`);
  }
}
if (problems.length) {
  console.error([...new Set(problems)].join('\n'));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`modules ok: ${mods.length} modules, ${owner.size} top-level names, all cross-module references imported`);
