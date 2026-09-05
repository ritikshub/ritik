/* ritik.wtf — the lamp, the ghari, the aangan, the paintings, the fade-up.
   The theme itself is set before first paint by the inline snippet in
   every <head>, which defaults to raat. This file only handles what
   happens after: the toggle, the clock, the count, and the observer. */
(function () {
  var root = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* SWAP: the aangan endpoint. Deploy worker/ (see worker/README.md),
     then paste the URL it prints here — no trailing slash. Leave it
     empty and the courtyard never runs and never appears; nothing
     else on the page depends on it. */
  var AANGAN = '';

  /* ---- the lamp. raat (dark) is the default, we never follow the OS. ---- */
  var lamp = document.getElementById('lamp');
  var meta = document.querySelector('meta[name="theme-color"]');
  /* the icons swap via CSS on html[data-time]; here we only keep the
     label and the browser chrome colour honest */
  function paint() {
    var raat = root.dataset.time === 'raat';
    if (lamp) lamp.setAttribute('aria-label', raat ? 'Switch to din — light' : 'Switch to raat — dark');
    if (meta) meta.setAttribute('content', raat ? '#11141f' : '#f5f0e7');
  }
  function setTime(t) {
    root.dataset.time = t;
    paint();
    try { localStorage.setItem('ritik-lamp', t); } catch (e) {}
  }
  paint();
  if (lamp) {
    lamp.addEventListener('click', function () {
      var next = root.dataset.time === 'raat' ? 'din' : 'raat';

      /* the light spreads from the lamp: a circle wipe, drawn on the
         browser's own view-transition snapshot so nothing on the page
         has to know it happened. no support, or a reader who asked
         for no motion, and the room simply changes. */
      if (still || typeof document.startViewTransition !== 'function') { setTime(next); return; }

      var r = lamp.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      root.classList.add('flipping');
      var vt = document.startViewTransition(function () { setTime(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + reach + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      vt.finished.then(unflip, unflip);
      function unflip() { root.classList.remove('flipping'); }
    });
  }

  /* ---- the paintings. each one hangs on a nail and is alive to the
         reader: it turns a little toward a cursor that crosses it, and
         a click or a tap gives it a push it takes a moment to shrug off.
         both are custom properties on the svg; the motion is in css. ---- */
  (function () {
    if (still) return;
    var panels = document.querySelectorAll('.art .figure, .top-art .panel, .lost .figure');
    if (!panels.length) return;
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* where along the width the pointer is: -.5 at the left edge, .5 at the right */
    function across(el, e) {
      var r = el.getBoundingClientRect();
      return Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5));
    }

    panels.forEach(function (el) {
      if (fine) {
        el.addEventListener('pointermove', function (e) {
          el.style.setProperty('--nudge', (across(el, e) * -6).toFixed(2) + 'deg');
        });
        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--nudge', '0deg');
        });
      }
      el.addEventListener('click', function (e) {
        /* pushed on the right, it swings left, and back */
        el.style.setProperty('--push', (across(el, e) < 0 ? 7 : -7) + 'deg');
        el.classList.remove('pushed');
        void el.getBoundingClientRect();        // let the removal land, so it can restart
        el.classList.add('pushed');
      });
      el.addEventListener('animationend', function (e) {
        if (e.animationName === 'push') el.classList.remove('pushed');
      });
    });
  })();

  /* ---- the ghari. the day and the hour in India, never the
         reader's own clock — they already have one of those.
         Ticks on the minute, and catches up when a backgrounded
         tab comes forward. No seconds: this bar stays still. ---- */
  (function () {
    var box = document.getElementById('ghari');
    var day = document.getElementById('ghari-d');
    var hm  = document.getElementById('ghari-hm');
    var tag = document.getElementById('ghari-t');
    if (!box || !day || !hm) return;

    var fmt;
    try {
      /* en-US so the parts are always "Wed" and "PM"; we lowercase
         them ourselves to sit with the nav. */
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', weekday: 'short',
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      fmt.formatToParts(new Date());
    } catch (e) { return; }        // no Intl, no tz data — stay hidden

    function tick() {
      var now = new Date(), p = {};
      fmt.formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
      day.textContent = p.weekday.toLowerCase();
      hm.textContent = p.hour + ':' + p.minute + ' ' + p.dayPeriod.toLowerCase();
      if (tag) tag.setAttribute('datetime', now.toISOString());
      box.hidden = false;
    }
    tick();

    /* land just past each minute boundary rather than drifting by one
       setInterval's worth of lateness every hour */
    (function next() {
      setTimeout(function () { tick(); next(); }, 60000 - (Date.now() % 60000) + 40);
    })();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tick();
    });
  })();

  /* ---- the aangan. how many people have come through the page you
         are on, set small in the foot. runs on every page; each page
         keeps its own number.

         what leaves this browser: the path, and whether this browser
         has been here before. no id, no cookie, no session — the
         "have I been counted" list lives in localStorage and is never
         sent. a reader who clears it counts once more, which is the
         honest cost of not tracking anybody. ---- */
  (function () {
    if (!AANGAN) return;                       // not deployed yet: do nothing at all
    if (root.dataset.lost === '1') return;     // 404s are not a page anyone visited

    var box = document.getElementById('visits');
    var out = document.getElementById('visits-n');
    var plural = document.getElementById('visits-s');
    if (!box || !out) return;

    var path = location.pathname;
    if (path.slice(-11) === '/index.html') path = path.slice(0, -10);

    var seen = [];
    try { seen = JSON.parse(localStorage.getItem('ritik-seen') || '[]'); } catch (e) {}
    if (!Array.isArray(seen)) seen = [];
    var fresh = seen.indexOf(path) === -1;

    /* text/plain keeps this a CORS-simple request, so there is no
       preflight round-trip in front of it. */
    fetch(AANGAN + '/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ path: path, count: fresh })
    }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (d) {
      if (!d || typeof d.count !== 'number' || d.count < 1) return;
      /* the path is only written down once the count is actually in, so
         a dropped request retries on the next visit rather than losing
         this reader for good. */
      if (fresh) {
        seen.push(path);
        try { localStorage.setItem('ritik-seen', JSON.stringify(seen.slice(-64))); } catch (e) {}
      }
      out.textContent = d.count;
      if (plural) plural.textContent = d.count === 1 ? '' : 's';
      box.hidden = false;                      // a good answer opens the slot
    }).catch(function () {});                  // worker down: stay hidden, say nothing
  })();

  /* ---- sections fade up once, then get out of the way ---- */
  window.__revealed = true;           // tells the head snippet's failsafe to stand down
  var reveals = document.querySelectorAll('[data-reveal]');

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
