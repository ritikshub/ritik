/* ritik.wtf — the lamp, and the fade-up.
   The theme itself is set before first paint by the inline snippet in
   every <head>, which defaults to raat. This file only handles the
   toggle and the observer. */
(function () {
  var root = document.documentElement;

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
