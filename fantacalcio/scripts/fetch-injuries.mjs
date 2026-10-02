// Scarica l'elenco degli infortunati di Serie A da Transfermarkt (vista estesa) in fonti/infortuni.json
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const URL = 'https://www.transfermarkt.it/serie-a/verletztespieler/wettbewerb/IT1/plus/1';
// Transfermarkt rifiuta il client HTTP di Node: si usa curl
const s = execFileSync('curl', ['-sS', '--fail', '-A', 'Mozilla/5.0', '-H', 'Accept-Language: it-IT,it;q=0.9', URL], { encoding: 'utf8', maxBuffer: 20e6 });
const unesc = (x) => x.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
const table = s.slice(s.indexOf('<table class="items">'));
const body = table.slice(table.indexOf('<tbody>'));
const rows = body.split(/<tr class="(?:odd|even)">/).slice(1);
const iso = (d) => { const m = d.match(/(\d\d)\/(\d\d)\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const out = rows.map((row) => {
  const nome = row.match(/class="hauptlink">\s*<a title="([^"]+)"/)?.[1];
  const tmId = row.match(/\/profil\/spieler\/(\d+)/)?.[1];
  const ruolo = row.match(/<\/tr>\s*<tr>\s*<td>([^<]+)<\/td>/)?.[1]?.trim();
  const squadra = row.match(/<a title="([^"]+)" href="\/[^"]+\/startseite\/verein/)?.[1];
  const tds = [...row.matchAll(/<td class="(?:links|zentriert|rechts)[^"]*">([\s\S]*?)<\/td>/g)].map((m) => unesc(m[1]));
  // colonne: [stemma, età, nazione, infortunio, dal, fino ca., valore]
  return { nome: unesc(nome ?? ''), tmId, ruolo, squadra, eta: Number(tds[1]) || null, infortunio: tds[3], dal: iso(tds[4] ?? ''), fino: iso(tds[5] ?? '') };
}).filter((x) => x.nome);
fs.mkdirSync('fonti', { recursive: true });
fs.writeFileSync('fonti/infortuni.json', JSON.stringify({ fonte: URL, scaricato: new Date().toISOString().slice(0, 10), infortunati: out }, null, 1));
console.log('infortunati', out.length, 'con rientro previsto', out.filter((x) => x.fino).length);
