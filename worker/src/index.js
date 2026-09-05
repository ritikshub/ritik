/* ==========================================================
   aangan — the courtyard. Who has come through each page.

   The only server ritik.wtf has. It answers one question:
   how many people have visited the page you are standing on.

   What it stores, in full: one integer per path. That is the
   entire data model.

   No cookies, no IP logging, no user-agent, no referrer, no
   visitor ids, no sessions, nothing that could be joined back to
   a person. The "have I already counted this reader" decision is
   made in the reader's own browser and never leaves it, so there
   is nothing here to leak, sell, or hand over.
   ========================================================== */

var MAX_PATH = 128;
/* a personal site does not have 200 pages. past that it is someone
   inventing paths, and each one would cost a row forever. */
var MAX_PAGES = 200;

/* the client sends location.pathname and nothing else, but it is
   still the open internet, so treat it as hostile: known shape, known
   characters, known length, or it is not a path. */
function tidy(p) {
  if (typeof p !== 'string') return '';
  p = p.split('?')[0].split('#')[0];
  if (p.charAt(0) !== '/' || p.length > MAX_PATH) return '';
  if (!/^[A-Za-z0-9\-._~/]*$/.test(p.slice(1))) return '';
  if (p.indexOf('//') !== -1 || p.indexOf('..') !== -1) return '';
  /* /log/index.html and /log/ are one page, not two. */
  if (p.slice(-11) === '/index.html') p = p.slice(0, -10);
  return p;
}

export class Aangan {
  constructor(state) {
    this.state = state;
    this.counts = new Map();
    state.blockConcurrencyWhile(async () => {
      /* one key per page rather than one blob, so a visit writes a
         single integer instead of rewriting every page's count. */
      var rows = await state.storage.list({ prefix: 'c:' });
      for (var row of rows) this.counts.set(row[0].slice(2), row[1]);
    });
  }

  async fetch(request) {
    var url = new URL(request.url);

    if (url.pathname === '/counts') {
      return Response.json(Object.fromEntries(this.counts));
    }

    var body = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch (e) { body = {}; }
    }
    var path = tidy(body.path);
    if (!path) return Response.json({ count: 0 });

    /* the browser decides whether this reader is new to this page; it
       keeps that list in its own localStorage and only asks for the
       increment on the visit that changes it. */
    if (body.count === true && (this.counts.has(path) || this.counts.size < MAX_PAGES)) {
      var n = (this.counts.get(path) || 0) + 1;
      this.counts.set(path, n);
      await this.state.storage.put('c:' + path, n);
    }

    return Response.json({ count: this.counts.get(path) || 0 });
  }
}


/* ---- the edge in front of it ---------------------------------- */

function cors(origin, allowed) {
  var h = { 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (origin && allowed.indexOf(origin) !== -1) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var origin = request.headers.get('Origin') || '';
    var allowed = (env.ALLOWED_ORIGINS || '')
      .split(',').map(function (s) { return s.trim(); })
      .filter(Boolean);
    var head = cors(origin, allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: head });
    }
    if (['/visit', '/counts'].indexOf(url.pathname) === -1) {
      return new Response('not found', { status: 404, headers: head });
    }

    /* one courtyard, one object. every page's count lives in the
       same room so they can never disagree about themselves. */
    var res = await env.AANGAN.get(env.AANGAN.idFromName('ritik.wtf')).fetch(request);

    /* the DO cannot know the origin rules, so the headers go on here. */
    var out = new Response(res.body, res);
    for (var k in head) out.headers.set(k, head[k]);
    return out;
  }
};
