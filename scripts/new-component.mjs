#!/usr/bin/env node
// Crea un componente nuevo desde templates/ y lo registra en components.json.
// Uso: npm run new -- <id> ["Nombre visible"] ["Descripción"] ["Categoría"]
//   npm run new -- tabs "Pestañas" "Pestañas accesibles con indicador animado." "Navegación"
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, nameArg, descArg, catArg] = process.argv.slice(2);

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error('Uso: npm run new -- <id> ["Nombre"] ["Descripción"] ["Categoría"]\nEl id va en minúsculas con guiones: tabs, image-slider…');
  process.exit(1);
}
const dir = join(root, 'components', id);
if (await access(dir).then(() => true, () => false)) { console.error(`Ya existe components/${id}/`); process.exit(1); }

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const tokens = {
  __ID__: id,
  __CAMEL__: camel,
  __CLASS__: camel[0].toUpperCase() + camel.slice(1),
  __NAME__: nameArg || id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()),
  __DESCRIPTION__: descArg || 'Describe aquí qué hace el componente.'
};
const fill = s => s.replace(/__ID__|__CAMEL__|__CLASS__|__NAME__|__DESCRIPTION__/g, t => tokens[t]);

// 1. Carpeta del componente
const tpl = join(root, 'templates', 'component');
await mkdir(dir, { recursive: true });
for (const file of await readdir(tpl)) await writeFile(join(dir, fill(file)), fill(await readFile(join(tpl, file), 'utf8')));

// 2. Página de documentación con playground, si este repositorio tiene el catálogo (docs/)
const hasDocs = await access(join(root, 'docs')).then(() => true, () => false) && await access(join(root, 'templates', 'docs.html')).then(() => true, () => false);
if (hasDocs) {
  const docsTpl = await readFile(join(root, 'templates', 'docs.html'), 'utf8');
  const ref = await readFile(join(root, 'docs', 'grid.html'), 'utf8');
  const header = ref.slice(ref.indexOf('<header class="top">'), ref.indexOf('</header>') + 9).replace(' aria-current="page"', '');
  await writeFile(join(root, 'docs', `${id}.html`), fill(docsTpl).replace('{{HEADER}}', header));
}

// 3. Registro
const regPath = join(root, 'components.json');
const reg = JSON.parse(await readFile(regPath, 'utf8'));
reg.components.push({
  id, name: tokens.__NAME__, description: tokens.__DESCRIPTION__,
  categories: [catArg || 'Interacción'], tags: [],
  since: pkg.version, status: 'experimental',
  files: [`element-${id}.css`, `element-${id}.js`],
  api: `ElementUI.${tokens.__CLASS__}`, selector: `[data-element-${id}]`
});
await writeFile(regPath, JSON.stringify(reg, null, 2) + '\n');

// 4. dist/ (y la galería del sitio, si existe)
execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs')], { stdio: 'ignore' });

console.log(`✔ components/${id}/  element-${id}.css · element-${id}.js · README.md · demo.html${hasDocs ? `
✔ docs/${id}.html  documentación con playground` : ''}
✔ components.json  registrado como experimental

Siguientes pasos:
  1. Programa el componente: npm run serve → http://localhost:5173/components/${id}/demo.html
  2. Documenta atributos y API en components/${id}/README.md
  3. npm run check && npm run build
  4. Anota el cambio en CHANGELOG.md`);
