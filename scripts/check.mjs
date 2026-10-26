#!/usr/bin/env node
// Comprueba que cada componente cumple la estructura de la librería
// y que las páginas HTML no enlazan archivos locales inexistentes.
import { readFile, readdir, access, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const exists = p => access(p).then(() => true, () => false);

const hasDocs = await exists(join(root, 'docs'));   // la documentación con playground vive en el repositorio del catálogo
const { components } = JSON.parse(await readFile(join(root, 'components.json'), 'utf8'));
const ids = new Set();
for (const c of components) {
  if (ids.has(c.id)) errors.push(`components.json: id repetido "${c.id}"`);
  ids.add(c.id);
  for (const key of ['id', 'name', 'description', 'files', 'api', 'selector']) {
    if (!c[key]) errors.push(`components.json → ${c.id || '?'}: falta "${key}"`);
  }
  const dir = join(root, 'components', c.id);
  for (const f of [...(c.files || []), 'README.md', 'demo.html']) {
    if (!(await exists(join(dir, f)))) errors.push(`components/${c.id}/${f} no existe`);
  }
  if (hasDocs && !(await exists(join(root, 'docs', `${c.id}.html`)))) errors.push(`docs/${c.id}.html no existe`);
  for (const f of (c.files || []).filter(f => f.endsWith('.js'))) {
    const src = await readFile(join(dir, f), 'utf8').catch(() => '');
    const api = (c.api || '').split('.').pop();
    if (src && !src.includes(`ElementUI.${api}`)) errors.push(`components/${c.id}/${f}: no expone window.${c.api}`);
  }
}
for (const d of await readdir(join(root, 'components'))) {
  if ((await stat(join(root, 'components', d))).isDirectory() && !ids.has(d)) {
    errors.push(`components/${d}/ no está registrado en components.json`);
  }
}

// Enlaces locales rotos en las páginas HTML
async function htmlFiles(dir) {
  const list = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'templates', 'dist', 'release'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) list.push(...await htmlFiles(p));
    else if (e.name.endsWith('.html')) list.push(p);
  }
  return list;
}
for (const file of await htmlFiles(root)) {
  // Ignora el código de ejemplo mostrado dentro de <pre>/<code>.
  const html = (await readFile(file, 'utf8'))
    .replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<script type="text\/plain"[\s\S]*?<\/script>/g, '');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#|data:|\/\/)/.test(url)) continue;
    const clean = url.split(/[?#]/)[0];
    if (!clean) continue;
    if (!(await exists(resolve(dirname(file), clean)))) {
      errors.push(`${file.slice(root.length + 1)} → enlace roto: ${url}`);
    }
  }
}

if (errors.length) {
  console.error('✖ ' + errors.join('\n✖ '));
  process.exit(1);
}
console.log(`✔ ${components.length} componentes correctos; sin enlaces locales rotos.`);
