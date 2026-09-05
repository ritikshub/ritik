# aangan

The visit counter behind ritik.wtf — the one server this site has.

It answers one question: **how many people have visited the page you are on.**
The number is set small in the footer of every page, beside "Made in Bihar."

## What it stores

One integer per path. That is the entire data model:

```json
{ "/": 412, "/log/": 96, "/projects/": 140 }
```

No cookies. No IP or user-agent logging. No referrers. No visitor ids, no
sessions, nothing that can be joined back to a person. The "have I already
counted this reader" decision is made in the reader's own browser — a list of
paths in their `localStorage` under `ritik-seen` — and is **never sent here**.
There is nothing on this server to leak, sell, or hand over.

That is deliberately less than any analytics product keeps, which is the point:
the site's design rules say no analytics, and this stays on the right side of
that line by never learning anything about anybody.

## Deploy

```sh
cd worker
npx wrangler login       # once
npx wrangler deploy
```

Wrangler prints the URL it deployed to, e.g.
`https://aangan.<your-subdomain>.workers.dev`.

Then put that URL — **no trailing slash** — into `assets/site.js`:

```js
var AANGAN = 'https://aangan.your-subdomain.workers.dev';
```

Until that constant is filled in, the client does nothing at all and the footer
number stays hidden. **The site ships safe with the worker undeployed** — no
errors, no empty slot, no stray middot.

## Endpoints

| | |
|---|---|
| `POST /visit` | `{path, count}` → `{count}`. Returns the page's number; increments it first when `count: true`. |
| `GET /counts` | `{path: n, …}` for every page. Read-only — handy for checking in on the numbers. |

Requests go out as `text/plain` on purpose: that keeps them
[CORS-simple](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests),
so there is no preflight round-trip in front of the one request each page makes.

`ALLOWED_ORIGINS` in `wrangler.toml` is the list of sites allowed to read the
counts. Add your local server there while working on the site.

## What counts as a page

- `/log/` and `/log/index.html` are one page, not two.
- Query strings and hashes are stripped, so `/?utm_source=…` does not split
  the count.
- Paths must look like paths: leading slash, ≤128 chars, no `..`, no `//`,
  and only `A–Z a–z 0–9 - . _ ~ /`. Anything else is refused and never stored.
- At most 200 distinct paths are ever stored. A personal site does not have 200
  pages; past that it is someone inventing paths, and each one would cost a row
  forever. Pages already known keep counting after the cap.
- The 404 page never counts — `404.html` carries `data-lost="1"` on `<html>`
  and the client skips it. Otherwise every junk URL a crawler tried would mint
  its own row.

## Local

```sh
npx wrangler dev
```

Then serve the site on `localhost:8080` (already in `ALLOWED_ORIGINS`) and point
`AANGAN` at `http://localhost:8787`.

## Known limits

- **This is an honest counter, not an audited one.** A reader who clears
  `localStorage` and comes back counts twice. Someone determined can POST
  `{"count": true}` in a loop and inflate a page. Nothing here stops that,
  because the alternatives — an IP hash, a fingerprint, a persistent id — all
  mean storing something about the reader, which is exactly what this is built
  to avoid. If it ever matters, put Cloudflare's rate limiting on the route;
  that happens at the edge, before the worker, and still stores nothing.
- **It counts browsers, not humans.** One person on a phone and a laptop is two.
- **It starts at zero.** There is no history to import; the number begins the
  day you deploy it.
