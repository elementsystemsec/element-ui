#!/usr/bin/env node
// Genera:
//  · dist/element-ui.css y dist/element-ui.js con todos los componentes de components.json (+ dist/assets/)
//  · site/registry.js (solo si existe la carpeta site/ del catálogo), con el peso gzip de cada componente
// Sin dependencias.
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const { components } = JSON.parse(await readFile(join(root, 'components.json'), 'utf8'));
const repo = pkg.elementUI?.repo || 'elementsystemsec/element-ui';
const cdn = `https://cdn.jsdelivr.net/gh/${repo}@v${pkg.version}`;
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const banner = `/*! Element UI v${pkg.version} · ${components.map(c => c.id).join(', ')} · MIT · ELEMENT SYSTEMS */\n`;
const out = { css: [banner], js: [banner] };
const registry = [];

for (const c of components) {
  let bytes = '';
  for (const file of c.files) {
    const ext = file.endsWith('.css') ? 'css' : file.endsWith('.js') ? 'js' : null;
    if (!ext) continue;
    const src = await readFile(join(root, 'components', c.id, file), 'utf8');
    bytes += src;
    out[ext].push(`\n/* ── ${c.name} (components/${c.id}/${file}) ── */\n${src.trim()}\n`);
  }
  if (c.assets) {
    const from = join(root, 'components', c.id, c.assets);
    try { await access(from); await cp(from, join(dist, 'assets'), { recursive: true }); } catch {}
  }
  const { $comment, ...entry } = c;
  registry.push({ ...entry, size: { raw: Buffer.byteLength(bytes), gzip: gzipSync(bytes).length } });
}

await writeFile(join(dist, 'element-ui.css'), out.css.join(''));
await writeFile(join(dist, 'element-ui.js'), out.js.join(''));
const hasSite = await access(join(root, 'site')).then(() => true, () => false);
if (hasSite) await writeFile(join(root, 'site', 'registry.js'),
  `/* Generado por npm run build a partir de components.json. No editar a mano. */\n` +
  `window.EUI = ${JSON.stringify({ version: pkg.version, repo, cdn, components: registry }, null, 2)};\n`);

console.log(`✔ dist/${hasSite ? ' y site/registry.js' : ''} · ${components.length} componentes · v${pkg.version}`);
for (const r of registry) console.log(`  ${r.id.padEnd(16)} ${(r.size.gzip / 1024).toFixed(1)} kB gzip`);
