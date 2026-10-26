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
