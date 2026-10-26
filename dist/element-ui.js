/*! Element UI v2.0.0 · grid, cubes, waves · MIT · ELEMENT SYSTEMS */

/* ── Grilla viva (components/grid/element-grid.js) ── */
/*!
 * ELEMENT UI / Grilla viva
 * Una retícula dibujada en canvas: cada pocos segundos una celda crece, sus vecinas la acompañan
 * y dentro aparece una imagen o un texto. Nunca tapa el contenido marcado con data-grid-avoid.
 * Sin dependencias · MIT · ELEMENT SYSTEMS
 */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');

  const num = (v, def, min, max) => {
    const n = parseFloat(v);
    return v == null || String(v).trim() === '' || !Number.isFinite(n) ? def : Math.min(max, Math.max(min, n));
  };
  const pair = (v, def) => {
    if (v == null || String(v).trim() === '') return def;
    const p = String(v).split(/[\s,x×]+/).map(parseFloat).filter(Number.isFinite);
    if (!p.length) return def;
    return [Math.max(1, p[0]), Math.max(1, p[1] ?? p[0])];
  };
  // Posiciones acumuladas a partir de pesos relativos: [0, x1, x2, …, total]
  const acum = (a, total) => {
    let sum = 0; for (const v of a) sum += v;
    const o = [0]; let x = 0;
    for (const v of a) { x += v / sum * total; o.push(x); }
    return o;
  };

  class LiveGrid {
    constructor(root) {
      if (root.__euiGrid) return root.__euiGrid;
      this.root = root;
      root.__euiGrid = this;

      let cv = root.querySelector(':scope > canvas.eui-grid-canvas');
      this.ownCanvas = !cv;
      if (!cv) {
        cv = document.createElement('canvas');
        cv.className = 'eui-grid-canvas';
        cv.setAttribute('aria-hidden', 'true');
        root.prepend(cv);
      }
      this.cv = cv;
      this.g = cv.getContext('2d');

      this.W = 0; this.H = 0; this.dpr = 1; this.cols = 0; this.rows = 0;
      this.cw = []; this.rw = []; this.ct = []; this.rt = [];
      this.act = null; this.aA = 0; this.prev = null; this.pA = 0;
      this.raf = 0; this.last = 0; this.timer = 0; this.queue = 0;
      this.visible = true; this.paused = false; this.lastHover = 0;

      this._readItems();
      this._configure();
      this._readColors();

      this.onResize = () => this._measure();
      this.ro = 'ResizeObserver' in window ? new ResizeObserver(this.onResize) : null;
      this.ro ? this.ro.observe(root) : addEventListener('resize', this.onResize);

      this.io = 'IntersectionObserver' in window
        ? new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }) : null;
      this.io?.observe(root);

      // Cambios de tema: atributo data-theme/clase en <html> o en el propio componente, o el sistema.
      this.onTheme = () => { this._readColors(); this._draw(); };
      this.mo = new MutationObserver(this.onTheme);
      this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      this.mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      darkScheme.addEventListener?.('change', this.onTheme);

      this.onMotion = () => this._schedule(this.delay);
      reduced.addEventListener?.('change', this.onMotion);

      this.onMove = e => this._hover(e);
      root.addEventListener('pointermove', this.onMove, { passive: true });

      document.fonts?.ready.then(() => this._draw());
      this._measure();
      this._schedule(this.delay);
    }

    /* ---------- Contenido ---------- */
    _readItems() {
      const tpl = this.root.querySelector(':scope > template[data-grid-items]');
      const nodes = tpl ? Array.from(tpl.content.children) : [];
      this.items = nodes.map(el => {
        if (el.tagName === 'IMG' && el.getAttribute('src')) {
          const it = { type: 'image', img: new Image(), ok: false, alt: el.alt || '' };
          it.img.decoding = 'async';
          it.img.onload = () => { it.ok = true; };
          it.img.src = new URL(el.getAttribute('src'), document.baseURI).href;
          return it;
        }
        const text = el.textContent.trim();
        return text ? { type: 'label', text } : null;
      }).filter(Boolean);
    }

    _nextItem() {
      if (!this.items.length) return null;
      const ready = this.items.filter(it => it.type === 'label' || it.ok);
      const list = ready.length ? ready : this.items;
      return list[this.queue++ % list.length];
    }

    /* ---------- Configuración ---------- */
    _configure() {
      const ds = this.root.dataset;
      this.cell = num(ds.gridCell, 96, 24, 400);
      this.cellMobile = num(ds.gridCellMobile, Math.round(this.cell * 2 / 3), 24, 400);
      this.interval = num(ds.gridInterval, 3000, 600, 60000);
      this.delay = num(ds.gridDelay, 900, 0, 60000);
      this.grow = pair(ds.gridGrow, [2.9, 2.3]);
      this.neighbor = num(ds.gridNeighbor, 1.5, 1, 4);
      this.ease = num(ds.gridEase, 0.045, 0.005, 0.5);
      this.radius = num(ds.gridRadius, 6, 0, 60);
      this.gap = num(ds.gridGap, 2, 0, 24);
      this.avoidPad = num(ds.gridAvoidPad, 30, 0, 300);
      this.avoid = ds.gridAvoid || '[data-grid-avoid]';
      this.interactive = ds.gridInteractive === 'true';
      this.autoplay = ds.gridAutoplay !== 'false';
    }

    _readColors() {
      const cs = getComputedStyle(this.root);
      const v = (name, def) => cs.getPropertyValue(name).trim() || def;
      this.colors = {
        line: v('--eui-grid-line', 'rgba(23,24,26,.07)'),
        cell: v('--eui-grid-cell', '#fbfafd'),
        accent: v('--eui-grid-accent', '#dd6330'),
        label: v('--eui-grid-label', '#ffffff')
      };
      this.font = v('--eui-grid-font', cs.fontFamily || 'sans-serif');
    }

    /* ---------- Medidas y dibujo ---------- */
    _measure() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = this.root.clientWidth; this.H = this.root.clientHeight;
      if (!this.W || !this.H) return;
      this.cv.width = Math.round(this.W * this.dpr);
      this.cv.height = Math.round(this.H * this.dpr);
      const side = this.W < 640 ? this.cellMobile : this.cell;
      this.cols = Math.max(1, Math.ceil(this.W / side));
      this.rows = Math.max(1, Math.ceil(this.H / side));
      this.cw = new Array(this.cols).fill(1); this.rw = new Array(this.rows).fill(1);
      this.ct = this.cw.slice(); this.rt = this.rw.slice();
      this.act = this.prev = null; this.aA = this.pA = 0;
      this._draw();
    }

    _rect(x, y, w, h, r) {
      const g = this.g; g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else g.rect(x, y, w, h);
    }

    _box(cell, xs, ys) {
      const h = this.gap / 2;
      return [xs[cell.c] + h, ys[cell.r] + h, xs[cell.c + 1] - xs[cell.c] - this.gap, ys[cell.r + 1] - ys[cell.r] - this.gap];
    }

    _wrap(text, width) {
      const out = []; let cur = '';
      for (const word of text.split(/\s+/)) {
        const t = cur ? cur + ' ' + word : word;
        if (!cur || this.g.measureText(t).width <= width) cur = t; else { out.push(cur); cur = word; }
      }
      if (cur) out.push(cur);
      return out;
    }

    _tile(cell, alpha, xs, ys) {
      if (!cell || alpha < 0.02) return;
      const g = this.g, [x, y, w, h] = this._box(cell, xs, ys), it = cell.item;
      g.save();
      if (!it || it.type === 'label') {
        g.globalAlpha = alpha * (it ? 0.94 : 0.2);
        g.fillStyle = this.colors.accent; this._rect(x, y, w, h, this.radius + 2); g.fill();
        if (it) this._label(it.text, x, y, w, h, alpha);
      } else {
        g.globalAlpha = alpha; this._rect(x, y, w, h, this.radius + 2); g.clip();
        if (it.ok && it.img.naturalWidth) {
          const s = Math.max(w / it.img.naturalWidth, h / it.img.naturalHeight);
          const iw = it.img.naturalWidth * s, ih = it.img.naturalHeight * s;
          g.drawImage(it.img, x + (w - iw) / 2, y, iw, ih); // alineada arriba: ideal para capturas de sitios
        } else { g.fillStyle = this.colors.accent; g.fillRect(x, y, w, h); }
      }
      g.restore();
    }

    _label(text, x, y, w, h, alpha) {
      const g = this.g, side = Math.min(w, h), pad = Math.max(8, Math.round(side * 0.09));
      const aw = w - pad * 2, ah = h - pad * 2;
      let fs = Math.round(Math.min(24, Math.max(11, side * 0.15))), lines, lh;
      for (;;) {
        g.font = `500 ${fs}px ${this.font}`;
        lines = this._wrap(text, aw); lh = fs * 1.16;
        const widest = Math.max(...lines.map(l => g.measureText(l).width));
        if ((lines.length * lh <= ah && widest <= aw) || fs <= 9) break;
        fs--;
      }
      g.save(); this._rect(x, y, w, h, this.radius + 2); g.clip();
      g.globalAlpha = alpha; g.fillStyle = this.colors.label; g.textBaseline = 'alphabetic';
      const y0 = y + h - pad - (lines.length - 1) * lh;
      lines.forEach((l, k) => g.fillText(l, x + pad, y0 + k * lh));
      g.restore();
    }

    _draw() {
      if (!this.W) return;
      const g = this.g;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      const xs = acum(this.cw, this.W), ys = acum(this.rw, this.H), h = this.gap / 2;
      g.fillStyle = this.colors.line; g.fillRect(0, 0, this.W, this.H);
      g.fillStyle = this.colors.cell;
      for (let i = 0; i < this.rows; i++) for (let j = 0; j < this.cols; j++) {
        this._rect(xs[j] + h, ys[i] + h, xs[j + 1] - xs[j] - this.gap, ys[i + 1] - ys[i] - this.gap, this.radius);
        g.fill();
      }
      this._tile(this.prev, this.pA, xs, ys);
      this._tile(this.act, this.aA, xs, ys);
    }

    _step(ts) {
      const dt = this.last ? Math.min(4, (ts - this.last) / 16.666) : 1; this.last = ts;
      const k = 1 - Math.pow(1 - this.ease, dt); let mov = 0;
      for (let i = 0; i < this.cols; i++) { this.cw[i] += (this.ct[i] - this.cw[i]) * k; mov = Math.max(mov, Math.abs(this.ct[i] - this.cw[i])); }
      for (let i = 0; i < this.rows; i++) { this.rw[i] += (this.rt[i] - this.rw[i]) * k; mov = Math.max(mov, Math.abs(this.rt[i] - this.rw[i])); }
      this.aA += (1 - this.aA) * k * 1.4; this.pA += (0 - this.pA) * k * 1.8;
      this._draw();
      if (mov > 0.002 || this.aA < 0.99 || this.pA > 0.01) this.raf = requestAnimationFrame(t => this._step(t));
      else { this.raf = 0; this.last = 0; }
    }

    /* ---------- Elegir y hacer crecer una celda ---------- */
    _targets(c, r) {
      const tc = new Array(this.cols).fill(1), tr = new Array(this.rows).fill(1);
      tc[c] = this.grow[0]; tr[r] = this.grow[1];
      if (c > 0) tc[c - 1] = this.neighbor; if (c < this.cols - 1) tc[c + 1] = this.neighbor;
      if (r > 0) tr[r - 1] = this.neighbor; if (r < this.rows - 1) tr[r + 1] = this.neighbor;
      return [tc, tr];
    }

    _avoidBoxes() {
      const hr = this.root.getBoundingClientRect(), p = this.avoidPad;
      let els = [];
      try { els = Array.from(this.root.querySelectorAll(this.avoid)); } catch (e) {}
      return els.map(el => {
        const t = el.getBoundingClientRect();
        return [t.left - hr.left - p, t.top - hr.top - p, t.right - hr.left + p, t.bottom - hr.top + p];
      });
    }

    // ¿La celda, ya crecida, chocaría con el contenido?
    _collides(c, r, boxes) {
      if (!boxes.length) return false;
      const [tc, tr] = this._targets(c, r), xs = acum(tc, this.W), ys = acum(tr, this.H);
      return boxes.some(b => xs[c + 1] > b[0] && xs[c] < b[2] && ys[r + 1] > b[1] && ys[r] < b[3]);
    }

    _grow(c, r) {
      [this.ct, this.rt] = this._targets(c, r);
      this.prev = this.act; this.pA = this.aA;
      this.act = { r, c, item: this._nextItem() }; this.aA = 0;
      if (!this.raf) this.raf = requestAnimationFrame(t => this._step(t));
    }

    /** Hace crecer una celda al azar que no tape el contenido. */
    next() {
      if (!this.cols || reduced.matches) return this;
      const boxes = this._avoidBoxes();
      let r, c, n = 0;
      do { r = Math.floor(Math.random() * this.rows); c = Math.floor(Math.random() * this.cols); n++; }
      while (n < 120 && this._collides(c, r, boxes));
      if (!this._collides(c, r, boxes)) this._grow(c, r);
      return this;
    }

    _hover(e) {
      if (!this.interactive || reduced.matches || !this.cols) return;
      const now = performance.now(); if (now - this.lastHover < 280) return;
      // Sobre el propio componente, offsetX/offsetY ya vienen en coordenadas locales: funciona aunque
      // la grilla esté girada en 3D (rotateX, perspective). Si el puntero está sobre un hijo, se usa el rectángulo.
      let x, y;
      if (e.target === this.root && Number.isFinite(e.offsetX)) { x = e.offsetX; y = e.offsetY; }
      else { const hr = this.root.getBoundingClientRect(); x = e.clientX - hr.left; y = e.clientY - hr.top; }
      const xs = acum(this.cw, this.W), ys = acum(this.rw, this.H);
      const c = Math.max(0, xs.findIndex(v => v > x) - 1), r = Math.max(0, ys.findIndex(v => v > y) - 1);
      if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
      if (this.act && this.act.c === c && this.act.r === r) return;
      if (this._collides(c, r, this._avoidBoxes())) return;
      this.lastHover = now;
      this._grow(c, r);
      this._schedule(this.interval);
    }

    _schedule(ms) {
      clearTimeout(this.timer);
      if (!this.autoplay || this.paused || reduced.matches) return;
      this.timer = setTimeout(() => {
        if (this.visible && !document.hidden) this.next();
        this._schedule(this.interval);
      }, ms);
    }

    /* ---------- API pública ---------- */
    pause() { this.paused = true; clearTimeout(this.timer); return this; }
    resume() { this.paused = false; this._schedule(400); return this; }

    // Cambia en vivo la separación y el radio sin volver a medir ni reiniciar el ritmo: sirve para animarlos.
    set(opts = {}) {
      if (opts.gap != null && Number.isFinite(+opts.gap)) this.gap = Math.min(24, Math.max(0, +opts.gap));
      if (opts.radius != null && Number.isFinite(+opts.radius)) this.radius = Math.min(60, Math.max(0, +opts.radius));
      this._draw();
      return this;
    }
    update(opts = {}) {
      const keys = {
        cell: 'gridCell', cellMobile: 'gridCellMobile', interval: 'gridInterval', delay: 'gridDelay',
        grow: 'gridGrow', neighbor: 'gridNeighbor', ease: 'gridEase', radius: 'gridRadius', gap: 'gridGap',
        avoid: 'gridAvoid', avoidPad: 'gridAvoidPad', interactive: 'gridInteractive', autoplay: 'gridAutoplay'
      };
      for (const [k, v] of Object.entries(opts)) if (keys[k]) this.root.dataset[keys[k]] = Array.isArray(v) ? v.join(',') : String(v);
      if (opts.items) { this._readItems(); this.queue = 0; }
      this._configure(); this._readColors(); this._measure(); this._schedule(this.delay);
      return this;
    }

    destroy() {
      clearTimeout(this.timer); cancelAnimationFrame(this.raf);
      this.ro ? this.ro.disconnect() : removeEventListener('resize', this.onResize);
      this.io?.disconnect(); this.mo.disconnect();
      darkScheme.removeEventListener?.('change', this.onTheme);
      reduced.removeEventListener?.('change', this.onMotion);
      this.root.removeEventListener('pointermove', this.onMove);
      if (this.ownCanvas) this.cv.remove();
      delete this.root.__euiGrid;
    }
  }

  window.ElementUI = window.ElementUI || {};
  window.ElementUI.Grid = {
    mount(el) { return el.__euiGrid || new LiveGrid(el); },
    mountAll() { document.querySelectorAll('[data-element-grid]').forEach(el => this.mount(el)); },
    get(el) { return el.__euiGrid || null; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.ElementUI.Grid.mountAll(), { once: true });
  else window.ElementUI.Grid.mountAll();
})();

/* ── Cubos isométricos (components/cubes/element-cubes.js) ── */
/**
 * ELEMENT UI — Cubos isométricos
 * ELEMENT SYSTEMS · Vanilla JavaScript · MIT
 * Approved geometry and edge animation from the ELEMENT SYSTEMS component source.
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Los iconos por defecto se resuelven junto a este script (components/cubes/assets/),
  // así funcionan desde cualquier página o CDN. data-eui-assets lo sobrescribe.
  const scriptAssets = (() => {
    try { return new URL('assets/', document.currentScript.src).href; } catch (e) { return 'assets/'; }
  })();
  const create = (tag, cls) => { const node = document.createElement(tag); node.className = cls || ''; return node; };
  const defaults = {
    icons: ['icon-star.svg', 'icon-play.svg', 'icon-spark.svg'],
    images: ['visual-01.svg', 'visual-02.svg', 'visual-03.svg']
  };
  const number = (value, fallback, min, max) => {
    const n = Number(value);
    return value == null || String(value).trim() === '' || !Number.isFinite(n)
      ? fallback : Math.min(max, Math.max(min, n));
  };
  const selected = (rows, cols, count) => {
    const r = Math.floor(rows / 2), c = Math.floor(cols / 2);
    const spots = [[r,c],[r-1,c-2],[r+1,c+1],[r-2,c+2],[r+2,c-3],[r-1,c+2],[r+1,c-1]];
    const result = new Map();
    spots.slice(0, count).forEach(([row, col], idx) => {
      result.set(`${Math.max(0,Math.min(rows-1,row))}:${Math.max(0,Math.min(cols-1,col))}`,idx);
    });
    return result;
  };

  // Para muchas piezas: casillas alternas (sin tocarse), ordenadas de dentro hacia fuera
  const spread = (rows, cols, count) => {
    const r0 = (rows - 1) / 2, c0 = (cols - 1) / 2, spots = [], rest = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      ((r + c * 2) % 3 === 0 ? spots : rest).push([r, c, Math.hypot(r - r0, (c - c0) * 1.15)]);
    }
    spots.sort((a, b) => a[2] - b[2]); rest.sort((a, b) => a[2] - b[2]);
    if (spots.length < count) spots.push(...rest); // si no caben separadas, se completan con las vecinas
    const result = new Map();
    spots.slice(0, count).forEach(([r, c], idx) => result.set(`${r}:${c}`, idx));
    return result;
  };
  const absolute = p => /^(?:https?:|data:|blob:|file:|\/)/i.test(p);

  class Cubes {
    constructor(stage) {
      if (!stage) throw new Error('ELEMENT UI: falta el elemento contenedor.');
      if (stage.__elementCubes) return stage.__elementCubes;
      this.stage = stage;
      this.scene = stage.querySelector('.exhibit-scene');
      this.wall = stage.querySelector('.co-cube-wall');
      if (!this.scene || !this.wall) throw new Error('ELEMENT UI: se necesitan .exhibit-scene y .co-cube-wall.');
      this.nodes = [];
      this.key = '';
      this.point = null;
      this.frame = 0;
      this.resizeFrame = 0;
      this.idleTimer = null;
      this.loadingTimer = null;
      this.disposed = false;
      this.lastInteraction = performance.now();
      this.timers = new Set();
      this.paused = false;
      this.visible = true;
      this._read();
      this.onMove = event => {
        if (this.mode !== 'interactive' || this.paused) return;
        this.lastInteraction = performance.now();
        const pt = this.pointer(event);
        this.setWave(pt);
        if (this.linkNodes && this.linkNodes.length) {
          const hit = this._linkAt(pt);
          this.stage.style.cursor = hit ? 'pointer' : '';
          this.stage.title = hit ? hit.item.label : '';
        }
      };
      this.onClick = event => {
        const hit = this._linkAt(this.pointer(event));
        if (!hit) return;
        if (hit.item.target === '_blank') window.open(hit.item.href, '_blank', 'noopener');
        else location.href = hit.item.href;
      };
      this.onLeave = () => { if (this.mode === 'interactive') { this.lastInteraction = performance.now(); this.setWave(null); } };
      this.onBlur = () => { if (this.mode === 'interactive') this.setWave(null); };
      this.onKey = event => {
        if (event.target !== stage || this.mode !== 'interactive' || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        this.pulse();
      };
      this.onResize = () => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.build());
      };
      this.observer = new ResizeObserver(this.onResize);
      this.observer.observe(this.scene);
      if ('IntersectionObserver' in window) {
        this.visibilityObserver = new IntersectionObserver(entries => {
          this.visible = entries.some(e => e.isIntersecting);
          if (!this.visible) this.setWave(null);
        }, { rootMargin:'100px' });
        this.visibilityObserver.observe(this.stage);
      }
      stage.addEventListener('pointermove', this.onMove, {passive:true});
      stage.addEventListener('pointerleave', this.onLeave);
      stage.addEventListener('pointerdown', this.onMove, {passive:true});
      stage.addEventListener('keydown', this.onKey);
      stage.addEventListener('click', this.onClick);
      window.addEventListener('blur', this.onBlur);
      stage.__elementCubes = this;
      this.build();
      this._scheduleMotion();
      if (stage.dataset.euiIntro === 'true' && !reducedMotion.matches && this.mode === 'interactive') {
        this.delay(() => this.pulse(), 600);
      }
    }

    _read() {
      const d = this.stage.dataset;
      this.rows = number(d.euiRows, 0, 0, 24);
      this.columns = number(d.euiColumns, 0, 0, 32);
      this.size = number(d.euiSize, 0, 0, 260);
      this.gap = number(d.euiGap, -1, -1, 100);
      this.maxCubes = number(d.euiMax, 150, 4, 600);
      // data-eui-rest: apertura mínima en reposo (0–0.6). Útil con pocos cubos grandes para que se lean como cubos.
      this.rest = number(d.euiRest, 0, 0, .6);
      this.wall.classList.toggle('has-rest', this.rest > 0);
      this.radius = number(d.euiRadius, 112, 40, 380);
      this.speed = number(d.euiSpeed, 1, .4, 2.2);
      this.mode = ['interactive','ambient','loading','static'].includes(d.euiMode) ? d.euiMode : 'interactive';
      this.visuals = ['none','icons','images','mixed'].includes(d.euiVisuals) ? d.euiVisuals : 'none';
      this.assets = d.euiAssets || scriptAssets;
      this.customArtwork = d.euiArtwork ? d.euiArtwork.split(',').map(v=>v.trim()).filter(Boolean).slice(0, 12) : null;
      this.repeat = d.euiRepeat === 'true';
      // <template data-eui-items>: una pieza por elemento. <img> (logo o foto) dentro de un <a> opcional;
      // data-top colorea la tapa abierta y data-edge las aristas de ese cubo.
      const tpl = this.stage.querySelector(':scope > template[data-eui-items]');
      this.items = tpl ? Array.from(tpl.content.children).map(el => {
        const a = el.matches('a') ? el : el.querySelector('a');
        const img = el.matches('img') ? el : el.querySelector('img');
        if (!img || !img.getAttribute('src')) return null;
        const src = img.getAttribute('src');
        return {
          src: absolute(src) ? src : new URL(src, document.baseURI).href,
          href: a ? a.getAttribute('href') || '' : '', target: a ? a.getAttribute('target') || '' : '',
          label: (a && (a.getAttribute('aria-label') || a.textContent.trim())) || img.getAttribute('alt') || '',
          top: el.dataset.top || '', edge: el.dataset.edge || '', fit: el.dataset.fit || '',
          text: el.dataset.text || ''
        };
      }).filter(Boolean).slice(0, 40).map((it, i) => Object.assign(it, { index: i })) : null;
      this.idleEnabled = d.euiIdle !== 'false';
      this.wall.dataset.iconVisibility = d.iconVisibility === 'always' ? 'always' : 'reveal';
      if (d.euiBorder) this.wall.style.setProperty('--co-wall-stroke', d.euiBorder);
      if (d.euiFace) this.wall.style.setProperty('--co-wall-face', d.euiFace);
      this.wall.style.setProperty('--eui-face-time', `${Math.round(240 / this.speed)}ms`);
      this.wall.style.setProperty('--eui-edge-time', `${Math.round(560 / this.speed)}ms`);
      this.wall.style.setProperty('--eui-drop-time', `${Math.round(700 / this.speed)}ms`);
      this.wall.style.setProperty('--eui-drop-delay', `${Math.round(40 / this.speed)}ms`);
    }

    delay(callback, ms) {
      const id = setTimeout(() => { this.timers.delete(id); if (!this.disposed) callback(); }, ms);
      this.timers.add(id);
      return id;
    }

    build() {
      const width = this.scene.clientWidth;
      const height = this.scene.clientHeight;
      if (!width || !height) return;
      const compact = window.matchMedia('(max-width:600px)').matches;
      let size = this.size || (compact ? 50 : 62);
      let gap = this.gap < 0 ? (compact ? 8 : 11) : this.gap;
      let step = size + gap;
      const fitCols = () => this.columns || Math.max(2, Math.min(32, Math.floor((width-16) / step)));
      const fitRows = () => this.rows || Math.max(2, Math.min(24, Math.floor((height-16) / step)));
      let cols = fitCols(), rows = fitRows();
      // Rendimiento: con filas o columnas automáticas nunca se pasa de data-eui-max cubos.
      // En pantallas grandes (o a pantalla completa) los cubos crecen en lugar de multiplicarse.
      for (let guard = 0; cols * rows > this.maxCubes && guard < 60; guard++) {
        size *= 1.06; gap *= 1.06; step = size + gap; cols = fitCols(); rows = fitRows();
      }
      // Proporción: si la matriz no cabe en el contenedor, se escala entera (tamaño y separación),
      // así conserva sus filas y columnas en pantallas pequeñas.
      // Las filas alternas se desplazan medio paso; con una sola fila no hay desplazamiento
      const spanCols = rows > 1 ? cols - .5 : cols - 1;
      const needW = spanCols * step + size * 1.5, needH = (rows - 1) * step + size * 1.5;
      const k = Math.min(1, (width - 20) / needW, (height - 20) / needH);
      if (k < 1) { size *= k; gap *= k; step = size + gap; }
      const key = `${width}:${height}:${size}:${gap}:${cols}:${rows}:${this.visuals}:${this.customArtwork?.join(',')||''}:${this.repeat}:${this.items ? this.items.length : 0}`;
      if (key === this.key) return;
      this.key = key;
      this.nodes = [];
      this.wall.replaceChildren();
      const fragment = document.createDocumentFragment();
      const fieldWidth = (rows > 1 ? cols-.5 : cols-1)*step;
      const fieldHeight = (rows-1)*step;
      const x0 = (width-fieldWidth)/2;
      const y0 = (height-fieldHeight)/2 + size*.20;
      const prefixed = this.assets.endsWith('/') ? this.assets : this.assets+'/';
      const media = this.items || this.customArtwork || (this.visuals === 'mixed'
        ? [...defaults.icons,...defaults.images]
        : this.visuals === 'none' ? [] : defaults[this.visuals]);
      // Si las piezas llenan casi toda la pared, van en orden de lectura; si no, repartidas desde el centro
      const reading = this.items && media.length >= rows * cols * .8;
      const chosen = reading ? new Map(media.map((_, i) => [`${Math.floor(i / cols)}:${i % cols}`, i]))
        : this.items || media.length > 7 ? spread(rows, cols, media.length) : selected(rows, cols, media.length);

      for (let row=0; row<rows; row++) {
        for (let col=0; col<cols; col++) {
          const x = x0 + col*step + (row%2)*step*.5;
          const y = y0 + row*step;
          const cell = create('div','co-wall-cube');
          cell.style.left = `${x}px`; cell.style.top = `${y}px`;
          cell.style.width = `${size}px`; cell.style.height = `${size}px`;
          const wrap = create('div','cubes-wrap');
          wrap.style.transform = `scale(${(size/200).toFixed(4)})`;
          const cube = create('div','cube');
          let upper = null;
          for (const face of ['front','back','top','bottom','left','right']) {
            const f = create('div',face);
            if (face==='top') { upper = f; for(const p of ['first','second','third','fourth']) f.append(create('span',p)); }
            if (face==='front' || face==='left') for(const p of ['first','second']) f.append(create('span',p));
            cube.append(f);
          }
          // data-eui-repeat="true": las imágenes se reparten por toda la pared, no solo en el centro
          const idx = this.repeat && media.length
            ? ((row + col * 2) % 3 === 0 ? (row * 5 + col * 3) % media.length : undefined)
            : chosen.get(`${row}:${col}`);
          let item = null;
          if (upper && idx !== undefined) {
            item = typeof media[idx] === 'object' ? media[idx] : null;
            const path = item ? item.src : media[idx];
            const image = create('img');
            // Las rutas relativas se resuelven en data-eui-assets (también las de data-eui-artwork)
            image.src = absolute(path) ? path : prefixed+path;
            image.alt = '';
            image.decoding = 'async';
            // Las fotografías (no SVG) cubren toda la cara superior; los SVG se muestran como logotipo
            const isSvg = /\.svg(?:[?#]|$)/i.test(path);
            const cls = item ? (item.fit === 'cover' || !isSvg ? 'image photo' : 'image logo')
              : /icon-/i.test(path) ? 'icon' : isSvg ? 'image' : 'image photo';
            const holder = create('div', cls);
            holder.append(image); upper.append(holder);
            cube.classList.add('has-top-asset');
            if (item && (item.top || item.edge)) {
              cube.classList.add('has-brand');
              if (item.top) cell.style.setProperty('--eui-top', item.top);
              if (item.edge) cell.style.setProperty('--co-wall-stroke', item.edge);
            }
          }
          wrap.append(cube); cell.append(wrap); fragment.append(cell);
          cell.style.zIndex = row * 4;
          this.nodes.push({el:cell,cube,x,y,row,item,lastStrength:0,wasActive:false});
        }
      }
      this.wall.append(fragment);
      this._links();
      if (this.point || this.rest) this.setWave(this.point);
    }

    // Gaussian wave & original hover class geometry from approved effect.
    draw() {
      this.frame = 0;
      let top = null, topK = 0;
      for (const item of this.nodes) {
        const dist = this.point ? Math.hypot(this.point.x-item.x,this.point.y-item.y) : Infinity;
        const weight = Math.exp(-Math.pow(dist/this.radius,2));
        const k0 = reducedMotion.matches ? (dist<35?1:0) : weight>.04?weight:0;
        const k = this.items && !item.item ? k0 : Math.max(k0, this.rest);
        if (k===0 && !item.wasActive) continue;
        if (Math.abs(k-item.lastStrength)>.012 || (k===0)!==(item.lastStrength===0)) {
          item.el.style.setProperty('--co-wave',k.toFixed(3)); item.lastStrength=k;
          // Orden de pintado: un cubo que sube se dibuja por encima de sus vecinos más bajos,
          // así la tapa (y su fotografía) no queda recortada por el cubo de delante.
          item.el.style.zIndex = item.row * 4 + Math.round(k * 12);
        }
        if (item.item && k > topK) { topK = k; top = item; }
        const active = k>.018;
        if (active!==item.wasActive) { item.cube.classList.toggle('hover',active); item.wasActive=active; }
      }
      // 'eui-cubes:item': avisa qué pieza de la plantilla está abierta (o null), para sincronizar textos
      const current = top && topK > .5 ? top.item : null;
      if (current !== this.currentItem) {
        this.currentItem = current;
        this.stage.dispatchEvent(new CustomEvent('eui-cubes:item', { detail: current ? { index: current.index, label: current.label, href: current.href, text: current.text } : null }));
      }
    }
    // Abre la pieza número index de la plantilla (por ejemplo, para un carrusel automático)
    openItem(index) {
      const n = this.nodes.find(x => x.item && x.item.index === index);
      if (n) this.setWave({ x: n.x, y: n.y });
      return this;
    }
    setWave(point) {
      if(this.disposed) return;
      this.point=point;
      if(!this.frame) this.frame=requestAnimationFrame(()=>this.draw());
    }
    // Piezas con enlace: se pueden pulsar y, para el teclado, una lista oculta enciende su cubo al enfocarla
    _links() {
      this.linkNodes = this.nodes.filter(n => n.item && n.item.href);
      this.linkList?.remove(); this.linkList = null;
      if (!this.linkNodes.length) return;
      const list = create('ul', 'eui-cubes-links');
      for (const n of this.linkNodes) {
        const li = create('li'), a = create('a');
        a.href = n.item.href; a.textContent = n.item.label || n.item.href;
        if (n.item.target) { a.target = n.item.target; a.rel = 'noopener'; }
        a.addEventListener('focus', () => { this.lastInteraction = performance.now(); this.setWave({ x: n.x, y: n.y }); });
        a.addEventListener('blur', () => this.setWave(null));
        li.append(a); list.append(li);
      }
      this.stage.append(list); this.linkList = list;
    }
    _linkAt(pt) {
      if (!pt || !this.linkNodes || !this.linkNodes.length) return null;
      const size = parseFloat(this.nodes[0]?.el.style.width) || 60;
      let best = null, bd = size * .85;
      for (const n of this.linkNodes) { const d = Math.hypot(pt.x - n.x, pt.y - n.y); if (d < bd) { bd = d; best = n; } }
      return best;
    }
    pointer(event) {
      const b=this.scene.getBoundingClientRect();
      return {x:event.clientX-b.left,y:event.clientY-b.top};
    }
    pulse(index) {
      if (!this.nodes.length || this.paused) return;
      const cube = typeof index==='number' ? this.nodes[Math.max(0,Math.min(this.nodes.length-1,index))] : this.nodes[Math.floor(this.nodes.length*.5)];
      if(cube) this.setWave({x:cube.x,y:cube.y});
      this.delay(()=>{if(this.mode!=='loading')this.setWave(null)},950/this.speed);
    }
    _scheduleMotion() {
      clearInterval(this.idleTimer); clearInterval(this.loadingTimer);
      this.idleTimer=null; this.loadingTimer=null;
      if(this.mode==='static' || this.paused) return;
      if(this.mode==='loading') {
        let i=0;
        this.loadingTimer=setInterval(()=>{
          if (document.hidden || !this.visible || this.paused || !this.nodes.length || reducedMotion.matches) return;
          const colCount=this.columns || Math.max(1, Math.round(Math.sqrt(this.nodes.length)));
          const node=this.nodes[(i++ * Math.max(1,Math.floor(colCount/2))) % this.nodes.length];
          this.setWave({x:node.x,y:node.y});
        },Math.round(700/this.speed));
      } else if(this.idleEnabled) {
        this.idleTimer=setInterval(()=>{
          if (document.hidden || !this.visible || this.paused || reducedMotion.matches || performance.now()-this.lastInteraction<3000 || !this.nodes.length) return;
          // Con fotografías repartidas, el reposo abre sobre todo cubos con imagen
          const pool=this.repeat || this.items ? this.nodes.filter(x=>x.cube.classList.contains('has-top-asset')) : this.nodes;
          const list=pool.length ? pool : this.nodes;
          const n=list[Math.floor(Math.random()*list.length)];
          if(n) this.setWave({x:n.x,y:n.y});
          this.delay(()=>{if(performance.now()-this.lastInteraction>=3000)this.setWave(null)},1050/this.speed);
        },2200);
      }
    }
    pause() { this.paused=true;this._scheduleMotion();this.setWave(null); }
    resume() { this.paused=false;this._scheduleMotion(); }
    update(options={}) {
      const toAttr={rows:'euiRows',columns:'euiColumns',size:'euiSize',gap:'euiGap',border:'euiBorder',face:'euiFace',radius:'euiRadius',speed:'euiSpeed',mode:'euiMode',visuals:'euiVisuals',artwork:'euiArtwork',repeat:'euiRepeat',max:'euiMax',rest:'euiRest',iconVisibility:'iconVisibility'};
      for(const [key,value] of Object.entries(options)) {
        if(!(key in toAttr)) continue;
        this.stage.dataset[toAttr[key]]=String(value);
      }
      this._read();this.key='';this.build();this._scheduleMotion();
      return this;
    }
    destroy() {
      this.disposed=true;
      this.observer.disconnect();
      if(this.visibilityObserver)this.visibilityObserver.disconnect();
      this.stage.removeEventListener('pointermove',this.onMove);
      this.stage.removeEventListener('pointerleave',this.onLeave);
      this.stage.removeEventListener('pointerdown',this.onMove);
      this.stage.removeEventListener('keydown',this.onKey);
      this.stage.removeEventListener('click',this.onClick);
      this.linkList?.remove();
      window.removeEventListener('blur',this.onBlur);
      cancelAnimationFrame(this.frame);cancelAnimationFrame(this.resizeFrame);
      clearInterval(this.idleTimer);clearInterval(this.loadingTimer);
      for(const id of this.timers)clearTimeout(id);
      this.wall.replaceChildren();delete this.stage.__elementCubes;
    }
  }

  window.ElementUI=window.ElementUI||{};
  window.ElementUI.Cubes={
    mount(element){return element.__elementCubes || new Cubes(element);},
    mountAll(){ document.querySelectorAll('[data-element-cubes]').forEach(el=>this.mount(el)); },
    get(element){return element.__elementCubes || null;}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.ElementUI.Cubes.mountAll(),{once:true});
  else window.ElementUI.Cubes.mountAll();
})();

/* ── Olas (components/waves/element-waves.js) ── */
/*!
 * ELEMENT UI / Olas
 * Agua animada que llena un espacio hasta un nivel: oleaje con tres capas que giran a distinto ritmo,
 * marea opcional y nivel animable (ideal para cargas). Casi todo es CSS; el JS lee las opciones,
 * ajusta el tamaño del oleaje al contenedor y ofrece una API pequeña.
 * Sin dependencias · MIT · ELEMENT SYSTEMS
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const num = (v, def, min, max) => {
    const n = parseFloat(v);
    return v == null || String(v).trim() === '' || !Number.isFinite(n) ? def : Math.min(max, Math.max(min, n));
  };
  // Curvatura: cuanto más grande el bloque que gira, más suave la ola
  const CURVE = { soft: 4.2, medium: 3, strong: 2 };
  // Las transiciones de escena aceleran y frenan parejo, para que se vea el agua en movimiento
  const EASE = 'cubic-bezier(.7,0,.3,1)';

  class Waves {
    constructor(root) {
      if (root.__euiWaves) return root.__euiWaves;
      this.root = root; root.__euiWaves = this;
      let sea = root.querySelector(':scope > .eui-waves-sea');
      this.ownSea = !sea;
      if (!sea) {
        sea = document.createElement('div');
        sea.className = 'eui-waves-sea'; sea.setAttribute('aria-hidden', 'true');
        sea.innerHTML = '<div class="eui-waves-tide"><div class="eui-waves-water"><i></i><i></i><i></i></div></div>';
        root.prepend(sea);
      }
      this.sea = sea;
      this.root.classList.add('eui-waves');
      this._read();
      this.onResize = () => this._size();
      this.ro = 'ResizeObserver' in window ? new ResizeObserver(this.onResize) : null;
      this.ro ? this.ro.observe(root) : addEventListener('resize', this.onResize);
      // Fuera de pantalla no gira nada
      this.io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { this.visible = es[0].isIntersecting; this._play(); }) : null;
      this.io?.observe(root);
      this.visible = true;
      this._size();
    }
    _read() {
      const d = this.root.dataset;
      this.level = num(d.wavesLevel, 50, -25, 125);
      this.speed = num(d.wavesSpeed, 1, .2, 4);
      this.curve = CURVE[d.wavesCurve] ? d.wavesCurve : 'medium';
      this.paused = d.wavesPaused === 'true';
      const s = this.root.style;
      s.setProperty('--eui-waves-level', this.level);
      s.setProperty('--eui-waves-period', `${(12 / this.speed).toFixed(2)}s`);
      s.setProperty('--eui-waves-tide', `${num(d.wavesTideAmp, 6, 0, 40)}%`);
      s.setProperty('--eui-waves-tide-time', `${(num(d.wavesTideTime, 6, 1, 30) / this.speed).toFixed(2)}s`);
      s.setProperty('--eui-waves-rise', `${num(d.wavesRise, 1200, 0, 10000)}ms`);
      this._play();
    }
    _size() {
      const r = this.root.getBoundingClientRect();
      const base = Math.max(r.width, r.height * 1.2, 200);
      this.root.style.setProperty('--eui-waves-size', `${Math.round(base * CURVE[this.curve])}px`);
    }
    _play() {
      this.root.style.setProperty('--eui-waves-play', this.paused || !this.visible || reduced.matches ? 'paused' : 'running');
    }
    /** Lleva el agua a un nivel de 0 a 100 (con transición). Entre -25 y 125 sirve para tapar o vaciar del todo. */
    setLevel(level) {
      this.level = Math.min(125, Math.max(-25, +level || 0));
      this.root.dataset.wavesLevel = String(this.level);
      this.root.style.setProperty('--eui-waves-level', this.level);
      return this;
    }
    // Cambia de nivel sin animación (para preparar una transición)
    _jump(level, direction) {
      const s = this.root.style, prev = s.getPropertyValue('--eui-waves-rise');
      s.setProperty('--eui-waves-rise', '0ms');
      if (direction) this.root.dataset.wavesDirection = direction;
      this.setLevel(level);
      void this.root.offsetHeight;
      s.setProperty('--eui-waves-rise', prev);
    }
    _wait(ms) { return new Promise(r => setTimeout(r, reduced.matches ? 0 : ms)); }
    /** Transición: el agua tapa todo. from 'bottom' (sube) o 'top' (cae desde arriba). Promesa al terminar. */
    cover({ from = 'bottom', ms = 900 } = {}) {
      if (typeof arguments[0] === 'number') ms = arguments[0];
      if (this._home == null) this._home = this.root.dataset.wavesDirection || 'up';
      const dir = from === 'top' ? 'down' : 'up';
      if ((this.root.dataset.wavesDirection || 'up') !== dir) this._jump(this.level >= 100 ? 125 : -25, dir);
      this.root.style.setProperty('--eui-waves-rise', `${ms}ms`);
      this.root.style.setProperty('--eui-waves-ease', EASE);
      this.setLevel(125);
      return this._wait(ms).then(() => this);
    }
    /** Transición: destapa. exit 'up' = el agua sale por arriba; 'down' = se vacía hacia abajo. */
    async uncover({ exit = 'up', ms = 900 } = {}) {
      // Tapado, la orientación no se nota: se gira para que la cresta quede del lado por donde sale
      this._jump(125, exit === 'up' ? 'down' : 'up');
      this.root.style.setProperty('--eui-waves-rise', `${ms}ms`);
      this.root.style.setProperty('--eui-waves-ease', EASE);
      this.setLevel(-25);
      await this._wait(ms);
      this._jump(-25, this._home || 'up'); this._home = null;
      this.root.style.removeProperty('--eui-waves-ease');
      return this;
    }
    pause() { this.paused = true; this._play(); return this; }
    resume() { this.paused = false; this._play(); return this; }
    update(opts = {}) {
      const keys = { level: 'wavesLevel', speed: 'wavesSpeed', curve: 'wavesCurve', tide: 'wavesTide', tideAmp: 'wavesTideAmp', tideTime: 'wavesTideTime', direction: 'wavesDirection', rise: 'wavesRise' };
      for (const [k, v] of Object.entries(opts)) if (keys[k]) this.root.dataset[keys[k]] = String(v);
      this._read(); this._size();
      return this;
    }
    destroy() {
      this.ro ? this.ro.disconnect() : removeEventListener('resize', this.onResize);
      this.io?.disconnect();
      if (this.ownSea) this.sea.remove();
      delete this.root.__euiWaves;
    }
  }

  const mount = (scope = document) => (scope.matches && scope.matches('[data-element-waves]') ? [scope] : Array.from(scope.querySelectorAll('[data-element-waves]'))).map(el => new Waves(el));
  const get = el => el && el.__euiWaves;
  window.ElementUI = window.ElementUI || {};
  window.ElementUI.Waves = { mount, get, Waves };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount());
  else mount();
})();
