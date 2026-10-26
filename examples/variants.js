/* ELEMENT UI · selector de variantes de los ejemplos.
 * Cada página declara su grupo y su variante en <body data-group="login" data-variant="olas">.
 * Dentro de un iframe (galería del catálogo) se ocultan el selector y el botón de volver. */
(() => {
  'use strict';
  const GROUPS = {
    hero:      [['grilla', 'Grilla', 'hero.html'], ['preguntas', 'Preguntas', 'preguntas.html'], ['olas', 'Olas', 'hero-olas.html']],
    login:     [['cubos', 'Cubos', 'login.html'], ['olas', 'Olas', 'login-olas.html'], ['grilla', 'Grilla', 'login-grilla.html']],
    carga:     [['cubos', 'Cubos', 'loading.html'], ['olas', 'Olas', 'carga-olas.html']],
    pie:       [['cubos', 'Cubos', 'footer.html'], ['olas', 'Olas', 'footer-olas.html']],
    perfil:    [['olas', 'Olas', 'perfil-olas.html'], ['cubos', 'Cubos', 'perfil-cubos.html']],
    banners:   [['olas', 'Olas', 'banners-olas.html'], ['cubos', 'Cubos', 'banners-cubos.html']],
    transicion:[['olas', 'Olas', 'transicion-olas.html']],
    portafolio:[['cubos', 'Cubos', 'portafolio.html']],
    integraciones:[['cubos', 'Cubos', 'integraciones.html']]
  };
  window.EUIExamples = GROUPS;
  const html = document.documentElement;
  let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (framed) html.classList.add('in-frame');
  const g = document.body.dataset.group, v = document.body.dataset.variant, list = GROUPS[g];
  if (framed || !list || list.length < 2) return;
  const nav = document.createElement('nav');
  nav.className = 'ex-variants'; nav.setAttribute('aria-label', 'Variantes de este ejemplo');
  nav.innerHTML = '<span>Variante</span>' + list.map(([id, name, href]) =>
    `<a href="${href}"${id === v ? ' aria-current="page"' : ''}>${name}</a>`).join('');
  document.body.append(nav);
})();
