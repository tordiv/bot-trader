// Lettura del listone ufficiale Leghe Fantacalcio e abbinamento ai giocatori delle rose Wikipedia.
import fs from 'node:fs';
import * as XLSX from 'xlsx';

export const LISTONE_FILE = 'fonti/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx';

export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/ı/g, 'i').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function readListone(file = LISTONE_FILE) {
  const wb = XLSX.read(fs.readFileSync(file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Tutti'], { header: 1, defval: null });
  const h = rows.findIndex((r) => r && r.includes('Nome') && r.includes('Id'));
  const head = rows[h];
  const col = (n) => head.indexOf(n);
  return rows.slice(h + 1).filter((r) => r && r[col('Nome')]).map((r) => ({
    id: String(r[col('Id')]), r: r[col('R')], rm: r[col('RM')], nome: String(r[col('Nome')]).trim(), squadra: String(r[col('Squadra')]).trim(),
    qtA: r[col('Qt.A')], qtI: r[col('Qt.I')], fvm: r[col('FVM')],
  }));
}

// "Martinez L." -> { key: "martinez", initial: "l" }
function parseListName(n) {
  // iniziali: "L.", "Jo.", "Mas.", "D.S.", "F.P."
  const m = n.trim().match(/^(.*?)(?:\s+((?:[A-Za-zÀ-ÿ]{1,3}\.)+))?$/);
  return { key: norm(m[1]), initial: m[2] ? norm(m[2].split('.')[0]) : null };
}

/** Indice del giocatore della rosa che corrisponde al nome del listone (stessa squadra), o -1. */
export function matchIndex(listName, squad, aliases = {}) {
  if (aliases[listName]) return squad.findIndex((p) => p.name === aliases[listName]);
  const { key, initial } = parseListName(listName);
  const scored = squad.map((p, i) => {
    const full = norm(p.name);
    const toks = full.split(' ');
    let s = 0;
    if (full === key) s = 100;
    else if (full.endsWith(' ' + key)) s = 80;
    else if (toks.slice(1).join(' ').startsWith(key + ' ')) s = 60; // cognomi composti
    else if (toks.length === 1 && toks[0] === key) s = 90;
    else if (toks.includes(key)) s = 50;
    else if (key.length >= 5 && full.replace(/ /g, '').includes(key.replace(/ /g, ''))) s = 40;
    if (s && initial) s += toks[0].startsWith(initial) ? 10 : -30;
    return { i, s };
  }).filter((x) => x.s > 20).sort((a, b) => b.s - a.s);
  return scored.length ? scored[0].i : -1;
}
