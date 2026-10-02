// Estrae le rose "Current squad" dalle pagine Wikipedia in cache (.cache/*.wiki)
import fs from 'node:fs';
export const TEAMS = [
  ['atalanta','Atalanta','Atalanta_BC'],['bologna','Bologna','Bologna_FC_1909'],['cagliari','Cagliari','Cagliari_Calcio'],
  ['como','Como','Como_1907'],['fiorentina','Fiorentina','ACF_Fiorentina'],['frosinone','Frosinone','Frosinone_Calcio'],
  ['genoa','Genoa','Genoa_CFC'],['inter','Inter','Inter_Milan'],['juventus','Juventus','Juventus_FC'],['lazio','Lazio','SS_Lazio'],
  ['lecce','Lecce','US_Lecce'],['milan','Milan','AC_Milan'],['monza','Monza','AC_Monza'],['napoli','Napoli','SSC_Napoli'],
  ['parma','Parma','Parma_Calcio_1913'],['roma','Roma','AS_Roma'],['sassuolo','Sassuolo','US_Sassuolo_Calcio'],
  ['torino','Torino','Torino_FC'],['udinese','Udinese','Udinese_Calcio'],['venezia','Venezia','Venezia_FC'],
];
export function parseSquad(wiki) {
  const h = wiki.search(/=+\s*(Current squad|First[- ]team squad|Players)\s*=+/i);
  const from = h >= 0 ? h : 0;
  const start = wiki.toLowerCase().indexOf('{{fs start', from);
  const end = wiki.toLowerCase().indexOf('{{fs end', start);
  const block = wiki.slice(start, end);
  const out = [];
  for (const m of block.matchAll(/\{\{fs player\s*\|([^\n]*)\}\}/gi)) {
    const f = {}; let s = m[1];
    // split top-level pipes (ignore pipes inside [[...]])
    let depth = 0, cur = '', parts = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i], n = s[i + 1];
      if ((c === '[' && n === '[') || (c === '{' && n === '{')) { depth++; cur += c + n; i++; continue; }
      if ((c === ']' && n === ']') || (c === '}' && n === '}')) { depth--; cur += c + n; i++; continue; }
      if (c === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    parts.push(cur);
    for (const p of parts) { const k = p.indexOf('='); if (k > 0) f[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim(); }
    const nm = f.name || '';
    const link = nm.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    const name = (link ? (link[2] || link[1]) : nm).replace(/\(.*?\)/g, '').replace(/<[^>]+>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    out.push({ no: parseInt(f.no) || null, pos: (f.pos || '').toUpperCase(), nat: f.nat || '', name, article: link ? link[1] : null, other: (f.other || '').replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1') });
  }
  return out;
}
if (process.argv[1]?.endsWith('parse-squads.mjs')) {
  const all = {};
  for (const [slug, , title] of TEAMS) all[slug] = parseSquad(fs.readFileSync(`.cache/${title}.wiki`, 'utf8'));
  fs.writeFileSync('.cache/squads.json', JSON.stringify(all, null, 1));
  for (const [s, l] of Object.entries(all)) console.log(s, l.length, l.map(p => `${p.pos}:${p.name}`).join(', '));
}
