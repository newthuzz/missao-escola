/* Ambientação decorativa: sem relógio de animação JS e sem acesso ao progresso. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const connection = navigator.connection;
  let card, inView = false;

  function update() {
    if (!card) return;
    const compact = mobile.matches || navigator.hardwareConcurrency <= 4 ||
      navigator.deviceMemory <= 4 || Boolean(connection?.saveData);
    card.dataset.lifeDetail = compact ? 'compact' : 'full';
    card.dataset.lifeState = reduced.matches ? 'reduced' :
      document.hidden || !inView ? 'hidden' : 'running';
  }

  function initialize() {
    card = document.querySelector('.journey-map');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        update();
      }, {threshold: 0});
      observer.observe(document.getElementById('map-art'));
    } else {
      // Older browsers: stop on page changes even without IntersectionObserver.
      const home = document.getElementById('page-inicio');
      inView = home.classList.contains('active');
      new MutationObserver(() => {
        inView = home.classList.contains('active');
        update();
      }).observe(home, {attributes:true, attributeFilter:['class']});
    }
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pagehide', () => { inView = false; update(); });
    window.addEventListener('pageshow', () => {
      const rect = document.getElementById('map-art').getBoundingClientRect();
      inView = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      update();
    });
    for (const query of [reduced, mobile]) {
      if (query.addEventListener) query.addEventListener('change', update);
      else query.addListener(update);
    }
    connection?.addEventListener?.('change', update);
    update();
  }

  function group(parent, className, markup, x, y) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'life-decoration ' + className);
    g.setAttribute('aria-hidden', 'true');
    g.setAttribute('focusable', 'false');
    if (x !== undefined) g.setAttribute('transform', `translate(${x} ${y})`);
    g.innerHTML = markup;
    parent.append(g);
    return g;
  }

  const bird = '<g class="life-bird-flight"><g class="life-wing" fill="none" stroke="#e7f7e2" stroke-width="2.2" stroke-linecap="round"><path d="M-10 0Q-6-6 0 0Q6-6 10 0"/></g></g>';
  const butterfly = '<g class="life-butterfly"><g class="life-wing"><path d="M0 0C-19-14-16 10-2 5M0 0C19-14 16 10 2 5" fill="#ffb9cd" stroke="#e480a5" stroke-width=".8"/></g><path d="M0-3V6" stroke="#49694f" stroke-width="2" stroke-linecap="round"/></g>';
  const firefly = '<g class="life-firefly"><circle r="5" fill="#ffe583" opacity=".2"/><circle r="1.7" fill="#fff3af"/></g>';
  const fish = '<g class="life-fish"><path d="M-6 0Q0-5 6 0Q0 5-6 0L-10-3V3Z" fill="#4b82b3" opacity=".8"/><circle cx="3" cy="-.5" r=".7" fill="#e4fcff"/></g>';
  const drone = '<g class="life-drone"><path d="M-8 0h16l-2 6H-6Z" fill="#dceeff" stroke="#608fc8"/><path d="M-9 1-15-3M9 1l6-4" stroke="#dceeff" stroke-width="2"/><path d="M-20-4h10m20 0h10" stroke="#8ee7ff" stroke-width="2"/><circle cy="3" r="1.5" fill="#ffe4a0"/></g>';
  const satellite = '<g class="life-satellite"><path d="M-5-5H5V5H-5Z" fill="#e6dbff" stroke="#8872b8"/><path d="M-8-6H-20V6H-8ZM8-6H20V6H8Z" fill="#5c81b9" stroke="#a9ddec"/><path d="M-14-6V6M14-6V6M-20 0H-8M8 0H20" stroke="#a9ddec" stroke-width=".7"/><path d="M0-5V-10" stroke="#ffdc82"/></g>';

  function breeze(svg, limit) {
    // Keep the existing placement/scale on the outer group; animate a new inner group.
    const trees = [...svg.querySelectorAll('[data-life-prop="tree"]')].slice(0, limit);
    trees.forEach((prop, i) => {
      const source = prop.firstElementChild;
      const movement = document.createElementNS(ns, 'g');
      movement.setAttribute('class', 'life-breeze' + (i ? ' life-secondary' : ''));
      movement.style.setProperty('--life-delay', `${-i * 2.3 - 1.1}s`);
      [...source.children].filter(child => child.tagName !== 'ellipse').forEach(child => movement.append(child));
      source.append(movement);
    });
  }

  function mount(svg, theme, view) {
    const island = svg.querySelector('.world-island');
    if (!island || island.dataset.lifeMounted) return;
    if (!card) initialize();
    island.dataset.lifeMounted = 'true';
    svg.dataset.lifeKind = theme.kind;
    // Stable across renders; all children, including checkpoints, share this transform.
    island.style.setProperty('--life-duration', `${6 + view % 6 * .43}s`);
    island.style.setProperty('--life-delay', `${-(view % 11 + 1) * .79}s`);
    island.style.setProperty('--life-lift', `${-(4 + view % 3 * .6)}px`);
    svg.style.setProperty('--life-scene-delay', `${-(view % 7) * 1.37}s`);

    const sky = svg.querySelector('.world-sky');
    sky.setAttribute('aria-hidden', 'true');
    // The existing clouds/stars remain the same shapes and colors.
    sky.querySelector('path[fill="#c9e8ff"]')?.classList.add('life-cloud', 'life-secondary');
    if (theme.kind === 'garden') {
      breeze(svg, 1);
      group(island, 'life-animal', butterfly, 455, 243);
      group(island, 'life-secondary', '<ellipse class="life-pond-ring" rx="13" ry="3" fill="none" stroke="#e0ffff" stroke-width="1"/>', 270, 163);
    } else if (theme.kind === 'forest') {
      breeze(svg, 2);
      group(island, 'life-animal', bird, 169, 109);
      group(island, 'life-animal life-secondary', firefly, 411, 246);
    } else if (theme.kind === 'crystal') {
      group(island, 'life-animal', fish, 268, 164);
      const crystals = [...svg.querySelectorAll('[data-life-prop="crystal"]')].slice(0, 2);
      crystals.forEach((prop, i) => group(prop.firstElementChild, i ? 'life-secondary' : '',
        '<path class="life-crystal-glint" d="m0-46 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f3ffff"/>'));
    } else if (theme.kind === 'moon') {
      group(island, 'life-object', drone, 454, 77);
      group(island, 'life-secondary', '<circle class="life-beacon" r="2.5" fill="#ffdc82"/>', 298, 78);
      // No birds or vegetation on the lunar surface.
      sky.querySelector('path[fill="#c9e8ff"]')?.classList.remove('life-cloud');
    } else if (theme.kind === 'mountain') {
      group(island, 'life-animal', bird, 393, 71);
      group(island, 'life-secondary', '<g class="life-mist"><path d="M-25 0Q-13-5 0 0T25 0" fill="none" stroke="#e1f7f4" stroke-width="2" opacity=".55"/></g>', 355, 260);
    } else if (theme.kind === 'stars') {
      group(island, 'life-object', satellite, 438, 58);
      const stars = sky.lastElementChild;
      stars.classList.add('life-starlight', 'life-secondary');
      group(island, 'life-secondary', '<path class="life-observatory-light" d="M0 0h8" stroke="#ffdc82" stroke-width="2" stroke-linecap="round"/>', 333, 108);
    }
    card.classList.add('life-ready');
    update();
  }
  window.IslandLife = Object.freeze({mount});
})();
