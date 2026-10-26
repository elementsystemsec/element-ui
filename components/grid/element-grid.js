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
