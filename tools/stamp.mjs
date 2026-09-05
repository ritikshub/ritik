#!/usr/bin/env node
/* ritik.wtf — re-stamp the sprite.

   The marks are drawn once in index.html and inlined on every page,
   because <use> cannot reach across files. Edit the sprite in
   index.html, then run this to copy it into every other page:

       node tools/stamp.mjs

   It also gives every shape a pathLength="1", which is what lets one
   stroke-dashoffset rule in site.css draw a whole panel in on load
   without knowing how long any line is. Zero dependencies. */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  'index.html',
  'blogs/index.html',
  'projects/index.html',
  'blogs/one-hour-at-the-tapri.html',
  '404.html',
];

const OPEN = '<svg class="sprite"';
const CLOSE = '\n</svg>\n';

function cut(html, file) {
  const a = html.indexOf(OPEN);
  if (a < 0) throw new Error(`${file}: no sprite`);
  const b = html.indexOf(CLOSE, a);
  if (b < 0) throw new Error(`${file}: sprite never closes`);
  return [a, b + CLOSE.length];
}

/* every drawn shape gets a normalised length. the pattern's own line
   (inside <defs>) is skipped: it is a fill, not a stroke to draw. */
function normalise(sprite) {
  const [d0, d1] = [sprite.indexOf('<defs>'), sprite.indexOf('</defs>')];
  const defs = sprite.slice(d0, d1);
  const body = sprite.slice(d1);
  const fixed = body.replace(
    /<(path|circle|line|rect|ellipse|polyline|polygon)\b([^>]*?)(\/?)>/g,
    (m, tag, attrs, close) =>
      /\bpathLength=/.test(attrs) ? m : `<${tag} pathLength="1"${attrs}${close}>`
  );
  return sprite.slice(0, d0) + defs + fixed;
}

const src = readFileSync(join(root, pages[0]), 'utf8');
const [s0, s1] = cut(src, pages[0]);
const sprite = normalise(src.slice(s0, s1));

let touched = 0;
for (const file of pages) {
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  const [a, b] = cut(html, file);
  const next = html.slice(0, a) + sprite + html.slice(b);
  if (next !== html) { writeFileSync(path, next); touched++; }
}
console.log(`sprite stamped on ${touched} of ${pages.length} pages`);
