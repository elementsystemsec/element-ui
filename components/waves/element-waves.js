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
