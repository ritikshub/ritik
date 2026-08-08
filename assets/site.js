/* ritik.wtf — the lamp, and the fade-up.
   The theme itself is set before first paint by the inline snippet in
   every <head>. This file only handles the toggle and the observer. */
(function () {
  var root = document.documentElement;

  /* ---- the lamp. light is the default, we never follow the OS. ---- */
  var lamp = document.getElementById('lamp');
  var meta = document.querySelector('meta[name="theme-color"]');
  /* the icons swap via CSS on html[data-time]; here we only keep the
     label and the browser chrome colour honest */
  function paint() {
    var raat = root.dataset.time === 'raat';
    if (lamp) lamp.setAttribute('aria-label', raat ? 'Switch to din \u2014 light' : 'Switch to raat \u2014 dark');
    if (meta) meta.setAttribute('content', raat ? '#11141f' : '#f5f0e7');
  }
  paint();
  if (lamp) {
    lamp.addEventListener('click', function () {
      root.dataset.time = root.dataset.time === 'raat' ? 'din' : 'raat';
      paint();
      try { localStorage.setItem('ritik-lamp', root.dataset.time); } catch (e) {}
    });
  }

  /* ---- sections fade up once, then get out of the way ---- */
  window.__revealed = true;           // tells the head snippet's failsafe to stand down
  var reveals = document.querySelectorAll('[data-reveal]');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (still || !('IntersectionObserver' in window)) {
    root.classList.remove('reveal-ready');
    return;
  }
  var up = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('seen'); up.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  reveals.forEach(function (el) { up.observe(el); });
})();
