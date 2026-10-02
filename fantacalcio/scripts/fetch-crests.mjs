// Scarica gli stemmi ufficiali (file dell'infobox Wikipedia) in public/crests/<slug>.svg|png
import fs from 'node:fs';
import { TEAMS } from './parse-squads.mjs';
const UA = 'FantaWarRoom/1.0 (https://github.com/tordiv/bot-trader)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('../public/crests', { recursive: true });
const manifest = {};
for (const [slug, , title] of TEAMS) {
  const wiki = fs.readFileSync(`.cache/${title}.wiki`, 'utf8');
  const m = wiki.match(/^\s*\|\s*image\s*=\s*(?:\[\[)?(?:File:|Image:)?([^|\]\n{]+\.(svg|png))/im);
  if (!m) { console.warn('nessuna immagine per', slug); continue; }
  const name = m[1].trim().replace(/ /g, '_');
  const ext = m[2].toLowerCase();
  let ok = false;
  for (let t = 0; t < 5 && !ok; t++) {
    const r = await fetch(`https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      const head = buf.slice(0, 200).toString('utf8');
      if (ext === 'svg' && !/<svg|<\?xml/.test(head)) { console.warn(slug, 'non svg'); break; }
      fs.writeFileSync(`../public/crests/${slug}.${ext}`, buf);
      manifest[slug] = `crests/${slug}.${ext}`; ok = true;
      console.log(slug, name, buf.length);
    } else { console.warn(slug, r.status); await sleep(3000 * (t + 1)); }
  }
  await sleep(800);
}
fs.writeFileSync('../src/data/crests.json', JSON.stringify(manifest, null, 2));
