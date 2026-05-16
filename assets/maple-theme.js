(function () {
  if (!document.documentElement.classList.contains('maple-theme')) return;

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function ensureCursor() {
    if (!finePointer) return;
    if (!document.getElementById('cur')) {
      const dot = document.createElement('div');
      dot.id = 'cur';
      document.body.prepend(dot);
    }
    if (!document.getElementById('cur-r')) {
      const ring = document.createElement('div');
      ring.id = 'cur-r';
      document.body.prepend(ring);
    }
  }

  function bindCursor() {
    if (!finePointer) return;
    const cur = document.getElementById('cur');
    const curR = document.getElementById('cur-r');
    if (!cur || !curR || cur.dataset.mapleBound) return;
    cur.dataset.mapleBound = '1';
    let rx = 0, ry = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => {
      cx = e.clientX;
      cy = e.clientY;
      cur.style.left = cx + 'px';
      cur.style.top = cy + 'px';
    });
    (function loop() {
      rx += (cx - rx) * .12;
      ry += (cy - ry) * .12;
      curR.style.left = rx + 'px';
      curR.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
  }

  function bindParallax() {
    const movers = ['.o1', '.o2', '.o3', '.blob-1', '.blob-2', '.blob-3', '.ambient-light']
      .map(selector => document.querySelector(selector))
      .filter(Boolean);
    if (!movers.length) return;
    document.addEventListener('mousemove', e => {
      const xp = (e.clientX / innerWidth - .5) * 26;
      const yp = (e.clientY / innerHeight - .5) * 26;
      movers.forEach((el, i) => {
        const dir = i % 2 ? -1 : 1;
        el.style.transform = `translate(${xp * (.35 + i * .08) * dir}px,${yp * (.35 + i * .08)}px)`;
      });
    });
  }

  function bindTiltAndRipple() {
    const selector = '.post-card, .proj, .bento-card, .code-container, .video-container, .warning-container';
    document.querySelectorAll(selector).forEach(card => {
      if (card.dataset.mapleTiltBound) return;
      card.dataset.mapleTiltBound = '1';
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        card.style.setProperty('--mx', (x / r.width * 100) + '%');
        card.style.setProperty('--my', (y / r.height * 100) + '%');
        card.style.transform = `perspective(900px) rotateX(${((y - r.height / 2) / r.height) * -6}deg) rotateY(${((x - r.width / 2) / r.width) * 6}deg) translateY(-5px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
      card.addEventListener('mousedown', e => {
        const r = card.getBoundingClientRect();
        const rip = document.createElement('span');
        const s = Math.max(r.width, r.height);
        rip.className = 'maple-rip';
        rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
        card.appendChild(rip);
        setTimeout(() => rip.remove(), 700);
      });
    });
  }

  function observeEntrance() {
    const targets = document.querySelectorAll('.stagger, .bento-card, .section-header, .code-container, .timeline-item, .video-container, .warning-container');
    if (!targets.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = +(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        obs.unobserve(entry.target);
      });
    }, { threshold: .12 });
    targets.forEach(el => obs.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureCursor();
    bindCursor();
    bindParallax();
    bindTiltAndRipple();
    observeEntrance();
  });
})();
