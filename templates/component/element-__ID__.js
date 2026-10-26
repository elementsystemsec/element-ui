/* ELEMENT UI / __NAME__. Sin dependencias. El contenido se escribe en HTML. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  class __CLASS__ {
    constructor(root) {
      if (root.__eui__CLASS__) return root.__eui__CLASS__;
      this.root = root;
      this._configure();
      this.onEnter = () => { if (!reduced.matches) this.root.classList.add('is-active'); };
      this.onLeave = () => this.root.classList.remove('is-active');
      root.addEventListener('pointerenter', this.onEnter);
      root.addEventListener('pointerleave', this.onLeave);
      root.__eui__CLASS__ = this;
    }

    // Lee los atributos data-* del elemento raíz.
    _configure() {
      const ds = this.root.dataset;
      this.motion = ds.__CAMEL__Motion !== 'off';
    }

    update(opts = {}) {
      if ('motion' in opts) this.root.dataset.__CAMEL__Motion = opts.motion ? 'on' : 'off';
      this._configure();
      return this;
    }

    destroy() {
      this.root.removeEventListener('pointerenter', this.onEnter);
      this.root.removeEventListener('pointerleave', this.onLeave);
      this.root.classList.remove('is-active');
      delete this.root.__eui__CLASS__;
    }
  }

  window.ElementUI = window.ElementUI || {};
  window.ElementUI.__CLASS__ = {
    mount(el) { return el.__eui__CLASS__ || new __CLASS__(el); },
    mountAll() { document.querySelectorAll('[data-element-__ID__]').forEach(el => this.mount(el)); },
    get(el) { return el.__eui__CLASS__ || null; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.ElementUI.__CLASS__.mountAll(), { once: true });
  else window.ElementUI.__CLASS__.mountAll();
})();
