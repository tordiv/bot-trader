// Scarica (con cache) le voci Wikipedia dei giocatori per ruolo dettagliato, data di nascita e statistiche club.
import fs from 'node:fs';
const UA = 'FantaWarRoom/1.0 (https://github.com/tordiv/bot-trader)';
const squads = JSON.parse(fs.readFileSync('.cache/squads.json', 'utf8'));
fs.mkdirSync('.cache/players', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (a) => `.cache/players/${encodeURIComponent(a).replace(/%/g, '_')}.wiki`;
async function raw(title, tries = 0) {
  const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw`, { headers: { 'User-Agent': UA } });
  if (r.status === 429 || r.status >= 500) { if (tries > 5) return ''; await sleep(2000 * 2 ** tries); return raw(title, tries + 1); }
  if (!r.ok) return '';
  let t = await r.text();
  const red = t.match(/^#REDIRECT\s*\[\[([^\]#|]+)/i);
  if (red && tries < 3) return raw(red[1], tries + 1);
  return t;
}
const queue = Object.values(squads).flat().filter((p) => p.article && !fs.existsSync(file(p.article)));
console.log('da scaricare:', queue.length);
let done = 0;
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    const t = await raw(p.article);
    fs.writeFileSync(file(p.article), t);
    if (++done % 50 === 0) console.log(done);
    await sleep(250);
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log('ok');
