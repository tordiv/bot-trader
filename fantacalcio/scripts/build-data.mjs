// Genera src/data/initialPlayers.json, src/data/goalkeeperMatrix.json e src/data/teams.json
// Fonti: rose "Current squad" e infobox giocatori da Wikipedia (cache in .cache/), calendario
// ufficiale 2026/27 da openfootball (football.json), curatela fantacalcistica in curation.mjs.
// Listone ufficiale: fonti/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx (Leghe Fantacalcio).
// Uso:  node parse-squads.mjs && node fetch-players.mjs && node fetch-crests.mjs && node build-data.mjs
import fs from 'node:fs';
import { TEAMS, parseSquad } from './parse-squads.mjs';
import { ALIASES, CURATION } from './curation.mjs';
import { matchIndex, readListone } from './listone.mjs';

const OUT = '../src/data';
const CAL_NAMES = {
  'Atalanta BC': 'atalanta', 'Bologna FC 1909': 'bologna', 'Cagliari Calcio': 'cagliari', 'Como 1907': 'como',
  'ACF Fiorentina': 'fiorentina', 'Frosinone Calcio': 'frosinone', 'Genoa CFC': 'genoa', 'FC Internazionale Milano': 'inter',
  'Juventus FC': 'juventus', 'SS Lazio': 'lazio', 'US Lecce': 'lecce', 'AC Milan': 'milan', 'AC Monza': 'monza',
  'SSC Napoli': 'napoli', 'Parma Calcio 1913': 'parma', 'AS Roma': 'roma', 'US Sassuolo Calcio': 'sassuolo',
  'Torino FC': 'torino', 'Udinese Calcio': 'udinese', 'Venezia FC': 'venezia',
};
const crests = JSON.parse(fs.readFileSync(`${OUT}/crests.json`, 'utf8'));

const normId = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pfile = (a) => `.cache/players/${encodeURIComponent(a).replace(/%/g, '_')}.wiki`;

function infobox(article) {
  if (!article || !fs.existsSync(pfile(article))) return {};
  const w = fs.readFileSync(pfile(article), 'utf8');
  const field = (k) => {
    const m = w.match(new RegExp(`^\\s*\\|\\s*${k}\\s*=\\s*(.*)$`, 'im'));
    return m ? m[1].trim() : '';
  };
  const posRaw = field('position').replace(/<ref.*$/i, '').replace(/\{\{\s*(?:hlist|flatlist|ubl|plainlist)\s*\|/gi, '').replace(/\}\}/g, '').replace(/\|(?![^\[]*\]\])/g, ', ').replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{[^}]*\}\}/g, '');
  const by = field('birth_date').match(/(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/);
  const height = parseFloat((field('height').match(/1[.,]\d{2}/) || ['0'])[0].replace(',', '.')) || null;
  // statistiche per club (campionato)
  let apps = 0, goals = 0, lastApps = 0, lastGoals = 0;
  for (let i = 1; i <= 30; i++) {
    const c = parseInt(field(`caps${i}`)); const g = parseInt(field(`goals${i}`));
    if (!Number.isNaN(c)) { apps += c; goals += Number.isNaN(g) ? 0 : g; }
  }
  // riga del club attuale: l'ultima con years "xxxx–" aperto
  for (let i = 30; i >= 1; i--) {
    const y = field(`years${i}`);
    if (/\d{4}\s*[–—-]\s*$/.test(y.replace(/<[^>]+>/g, '').trim())) {
      lastApps = parseInt(field(`caps${i}`)) || 0; lastGoals = parseInt(field(`goals${i}`)) || 0; break;
    }
  }
  let natCaps = 0;
  for (let i = 1; i <= 15; i++) {
    const t = field(`nationalteam${i}`);
    if (t && !/U-?\d{2}|under|olympic|B team| B\]/i.test(t)) natCaps = Math.max(natCaps, parseInt(field(`nationalcaps${i}`)) || 0);
  }
  return { posRaw, born: by ? Number(by[1]) : null, height, apps, goals, lastApps, lastGoals, natCaps };
}

// difensori con infobox generica ("Defender"): esterni noti, tutti gli altri trattati da centrali
const GENERIC_FULLBACKS = new Set(['Emanuele Valeri', 'Fali Candé', 'Filippo Terracciano', 'David Puczka', 'Enzo Tchato', 'Marcelo Vaz', 'Mamedi Doucouré', 'Elijah Scott']);
function detailFor(role, posRaw, name) {
  if (role === 'D' && GENERIC_FULLBACKS.has(name)) return 'Terzino / Esterno';
  const p = posRaw.toLowerCase();
  if (role === 'P') return 'Portiere';
  if (role === 'D') {
    if (/centre-back|center-back|central defender|centre back|sweeper/.test(p.split(/[,/]| or /)[0] || p)) return 'Difensore centrale';
    if (/full-back|wing-back|right-back|left-back|fullback/.test(p)) return 'Terzino / Esterno';
    return 'Difensore centrale';
  }
  if (role === 'C') {
    if (/defensive midfielder|holding/.test(p)) return 'Mediano / Regista';
    if (/attacking midfielder|playmaker/.test(p)) return 'Trequartista';
    if (/winger|wide/.test(p)) return 'Esterno offensivo';
    if (/wing-back/.test(p)) return 'Esterno a tutta fascia';
    return 'Centrocampista';
  }
  if (/winger/.test(p) && !/striker|centre-forward|center forward/.test(p.split(/,/)[0])) return 'Ala / Esterno';
  if (/second striker|attacking midfielder/.test(p)) return 'Seconda punta';
  return 'Punta centrale';
}

// ---------- calendario ----------
const cal = JSON.parse(fs.readFileSync('.cache/calendar.json', 'utf8')).matches;
const slugs = TEAMS.map((t) => t[0]);
const venue = Object.fromEntries(slugs.map((s) => [s, Array(38).fill(null)]));
const opp = Object.fromEntries(slugs.map((s) => [s, Array(38).fill(null)]));
for (const m of cal) {
  const g = parseInt(m.round.replace(/\D/g, '')) - 1;
  const h = CAL_NAMES[m.team1], a = CAL_NAMES[m.team2];
  if (!h || !a) throw new Error('squadra sconosciuta ' + m.team1 + ' / ' + m.team2);
  venue[h][g] = 'C'; venue[a][g] = 'T'; opp[h][g] = a; opp[a][g] = h;
}
for (const s of slugs) if (venue[s].some((v) => !v)) throw new Error('calendario incompleto per ' + s);

// ---------- squadre ----------
const teams = TEAMS.map(([slug, nome]) => ({
  slug, nome, stemma: crests[slug] || null, fascia: CURATION[slug].tier,
  calendario: venue[slug].map((v, i) => ({ g: i + 1, campo: v, avversario: opp[slug][i] })),
}));

// ---------- matrice portieri ----------
// Coefficiente 0-10: quota di giornate in cui i due portieri giocano entrambi in casa o entrambi
// in trasferta (nessuna alternanza), +0,5 per ogni scontro diretto, pesato sulla forza degli avversari.
const tierOf = Object.fromEntries(slugs.map((s) => [s, CURATION[s].tier]));
const matrix = {};
for (const a of slugs) {
  matrix[a] = {};
  for (const b of slugs) {
    if (a === b) { matrix[a][b] = null; continue; }
    let clash = 0;
    for (let g = 0; g < 38; g++) {
      if (opp[a][g] === b) { clash += 0.5; continue; }
      if (venue[a][g] === venue[b][g]) {
        // in trasferta entrambi contro big = giornata peggiore
        const hard = (tierOf[opp[a][g]] <= 2 ? 0.25 : 0) + (tierOf[opp[b][g]] <= 2 ? 0.25 : 0);
        clash += venue[a][g] === 'T' ? 1 + hard : 1 - 0.15;
      }
    }
    matrix[a][b] = clash / 38;
  }
}
// scala lineare sui valori reali per usare tutto il range 0-10
const vals = Object.values(matrix).flatMap((r) => Object.values(r)).filter((v) => v !== null);
const lo = Math.min(...vals), hi = Math.max(...vals);
for (const a of slugs) for (const b of slugs) if (matrix[a][b] !== null) matrix[a][b] = Math.round(((matrix[a][b] - lo) / (hi - lo)) * 100) / 10;

// ---------- giocatori ----------
// Fonte ufficiale: listone Leghe Fantacalcio (Id, ruolo, ruolo Mantra, Qt.A/Qt.I, FVM).
// Arricchimento: rose e infobox Wikipedia (età, presenze, gol, numero) + curatela (gerarchie).
const BASE = {
  P: [14, 11, 9, 7, 6], D: [9, 7, 6, 5, 4], C: [10, 8, 6, 5, 4], A: [16, 13, 10, 8, 7],
};
const RM_DETAIL = {
  Por: 'Portiere', Dc: 'Difensore centrale', B: 'Difensore centrale', Dd: 'Terzino / Esterno', Ds: 'Terzino / Esterno',
  E: 'Esterno a tutta fascia', M: 'Mediano / Regista', C: 'Centrocampista', T: 'Trequartista', W: 'Esterno offensivo',
  A: 'Seconda punta', Pc: 'Punta centrale',
};
function detailFromRm(ruolo, rm, fallback) {
  const first = String(rm || '').split(';')[0].trim();
  if (ruolo === 'D') return first === 'Dc' || first === 'B' ? 'Difensore centrale' : first ? 'Terzino / Esterno' : fallback;
  if (ruolo === 'A' && first === 'W') return 'Ala / Esterno';
  return RM_DETAIL[first] ?? fallback;
}
const listone = readListone();
const SLUG_BY_NAME = Object.fromEntries(TEAMS.map(([slug, nome]) => [nome, slug]));
const players = [];
const missing = [];
const ids = new Set();
for (const [slug, , title] of TEAMS) {
  const cur = CURATION[slug];
  const squad = parseSquad(fs.readFileSync(`.cache/${title}.wiki`, 'utf8'));
  const rows = listone.filter((r) => SLUG_BY_NAME[r.squadra] === slug);
  const matched = new Map(); // nome wiki -> riga listone
  const rowsOnly = [];
  for (const r of rows) {
    const i = matchIndex(r.nome, squad, ALIASES[slug] ?? {});
    if (i >= 0) matched.set(squad[i].name, r);
    else rowsOnly.push(r);
  }
  const inGame = new Set(matched.keys());
  for (const list of [cur.xi, cur.bal, cur.rig, cur.pun, cur.cor]) for (const n of list) if (!inGame.has(n)) missing.push(`${slug}: ${n}`);
  const entries = [...[...matched].map(([wikiName, r]) => ({ sp: squad.find((p) => p.name === wikiName), r })), ...rowsOnly.map((r) => ({ sp: null, r }))];
  for (const { sp, r } of entries) {
    const name = sp ? sp.name : r.nome;
    const ib = sp ? infobox(sp.article) : {};
    const ruolo = r.r;
    const stato = cur.xi.includes(name) ? 'titolare' : cur.bal.includes(name) ? 'ballottaggio' : 'riserva';
    const eta = ib.born ? 2026 - ib.born : null;
    const qt = Math.max(1, Math.round(r.qtA));
    const rig = cur.rig[0] === name ? 1 : cur.rig[1] === name ? 2 : 0;
    const dettaglio = detailFromRm(ruolo, r.rm, sp ? detailFor(ruolo, ib.posRaw || '', name) : '—');
    // media voto stimata (base per il modificatore di difesa classico)
    let mv = null;
    if (ruolo === 'D' || ruolo === 'P') {
      mv = [6.27, 6.2, 6.12, 6.05, 6.0][cur.tier - 1];
      if (dettaglio === 'Difensore centrale') mv += 0.04;
      if (dettaglio !== 'Difensore centrale' && ruolo === 'D') mv -= 0.03;
      if (ruolo === 'P') mv -= 0.05;
      if (stato === 'ballottaggio') mv -= 0.07;
      if (stato === 'riserva') mv -= 0.12;
      // a parità di squadra e ruolo, i più quotati prendono voti più alti
      mv += Math.max(-0.05, Math.min(0.1, (qt - BASE[ruolo][cur.tier - 1]) * 0.008));
      mv = Math.round(mv * 100) / 100;
    }
    let id = `${slug}-${normId(name)}`;
    if (ids.has(id)) id += `-${r.id}`;
    ids.add(id);
    players.push({
      id,
      nome: name,
      squadra: slug,
      ruolo,
      dettaglio,
      qt,
      qtI: Math.round(r.qtI ?? r.qtA),
      fvm: Math.round(r.fvm ?? qt),
      rm: r.rm ?? '',
      stato,
      rigorista: rig,
      punizioni: cur.pun.includes(name),
      corner: cur.cor.includes(name),
      numero: sp?.no ?? null,
      nazionalita: sp?.nat ?? '',
      eta,
      altezza: ib.height || null,
      presenzeClub: ib.lastApps || 0,
      golClub: ib.lastGoals || 0,
      presenzeCarriera: ib.apps || 0,
      golCarriera: ib.goals || 0,
      presenzeNazionale: ib.natCaps || 0,
      mvStimata: mv,
      prestito: sp && /loan/i.test(sp.other) ? 'In prestito' : null,
      fantaId: r.id,
      nomeListone: r.nome,
    });
  }
}
if (missing.length) { console.error('Nomi di curatela non presenti nel listone:\n' + missing.join('\n')); process.exitCode = 1; }
const unmapped = listone.filter((r) => !SLUG_BY_NAME[r.squadra]);
if (unmapped.length) { console.error('Squadre del listone sconosciute:', [...new Set(unmapped.map((r) => r.squadra))]); process.exitCode = 1; }
const order = { P: 0, D: 1, C: 2, A: 3 };
players.sort((a, b) => order[a.ruolo] - order[b.ruolo] || b.qt - a.qt || a.nome.localeCompare(b.nome));

const meta = { stagione: '2026/27', generato: new Date().toISOString().slice(0, 10), listone: 'Quotazioni Fantacalcio Stagione 2026/27 (Leghe Fantacalcio)', fonti: ['Listone ufficiale Leghe Fantacalcio (ruoli, Qt.A, Qt.I, FVM)', 'Wikipedia (rose e infobox)', 'openfootball/football.json (calendario)', 'Curatela War Room (rigoristi, titolari, ballottaggi)'] };
fs.writeFileSync(`${OUT}/initialPlayers.json`, JSON.stringify({ meta, players }));
fs.writeFileSync(`${OUT}/goalkeeperMatrix.json`, JSON.stringify({ meta, squadre: slugs, matrice: matrix }, null, 1));
fs.writeFileSync(`${OUT}/teams.json`, JSON.stringify(teams));
const byRole = players.reduce((a, p) => ((a[p.ruolo] = (a[p.ruolo] || 0) + 1), a), {});
console.log('giocatori', players.length, byRole);
