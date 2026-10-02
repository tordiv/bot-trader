// Gerarchie dalle partite giocate (match report ESPN) e indisponibili (Transfermarkt).
import { norm } from './listone.mjs';

export const OGGI = process.env.OGGI || new Date().toISOString().slice(0, 10);

// ---------- abbinamento nomi ----------
const TEAM_ALIAS = { internazionale: 'inter', 'ac milan': 'milan', 'as roma': 'roma', 'ss lazio': 'lazio', 'ssc napoli': 'napoli' };
export function teamSlugFrom(name, slugs) {
  const n = norm(name);
  if (TEAM_ALIAS[n]) return TEAM_ALIAS[n];
  return slugs.find((s) => n.split(' ').includes(s)) ?? null;
}

/** Trova il giocatore della squadra che corrisponde a un nome "esterno" (ESPN, Transfermarkt). */
// nomi ESPN/Transfermarkt non riconducibili automaticamente
const NAME_ALIAS = { 'amar ahmed': 'amar fatah' };

export function findPlayer(list, name, minScore = 45) {
  const n = NAME_ALIAS[norm(name)] ?? norm(name);
  const t = n.split(' ');
  const last = t[t.length - 1];
  let best = null;
  let bestScore = 0;
  for (const p of list) {
    const pn = norm(p.nome);
    const pt = pn.split(' ');
    const ln = norm(p.nomeListone ?? '').replace(/ [a-z]{1,3}$/, '');
    let s = 0;
    if (pn === n || pn.replace(/ /g, '') === n.replace(/ /g, '')) s = 100; // "Del Prato" / "Delprato"
    else if (pt.length > 1 && t.length > 1 && pt[pt.length - 1] === last && pt[0][0] === t[0][0]) s = 85;
    else if (pn.endsWith(' ' + n) || n.endsWith(' ' + pn)) s = 80; // "Pio Esposito" / "Francesco Pio Esposito"
    else if (pt.length === 1 && t.includes(pt[0])) s = 75; // "Bremer" / "Gleison Bremer"
    else if (ln && (n === ln || n.endsWith(' ' + ln))) s = 70;
    else {
      const common = t.filter((x) => x.length > 2 && pt.includes(x)).length;
      if (common >= 2) s = 65;
      else if (common === 1 && pt.includes(last)) s = 45;
      else if (common === 1 && pt[pt.length - 1].length >= 4 && t.includes(pt[pt.length - 1])) s = 45; // "Bayo Youssouf" / "Vakoun Bayo"
    }
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return bestScore >= minScore ? best : null;
}

// ---------- statistiche dalle partite ----------
/**
 * Restituisce Map<id giocatore, stats> e l'elenco dei nomi ESPN non abbinati.
 * stats: { tit, sub, min, gol, assist, amm, esp, distinte, seq: ['T'|'S'|'P'|'-' per giornata], rigori, rigoriSegnati, golPunizione }
 */
export function statsFromMatches(partite, players, slugs, calendario) {
  const byTeam = new Map();
  for (const p of players) {
    if (!byTeam.has(p.squadra)) byTeam.set(p.squadra, []);
    byTeam.get(p.squadra).push(p);
  }
  const stats = new Map();
  const nonAbbinati = [];
  const giornataDi = (data, slug) => calendario[slug].find((g) => g.data === data)?.g ?? null;
  const maxG = Math.max(...partite.map((m) => Math.max(...m.rosters.map((r) => giornataDi(m.data, teamSlugFrom(r.squadra, slugs)) ?? 0))));
  const blank = () => ({ tit: 0, sub: 0, min: 0, gol: 0, assist: 0, amm: 0, esp: 0, distinte: 0, seq: Array(maxG).fill('-'), rigori: 0, rigoriSegnati: 0, golPunizione: 0, rossoUltima: false });
  const espnToPlayer = new Map();
  for (const m of partite) {
    for (const r of m.rosters) {
      const slug = teamSlugFrom(r.squadra, slugs);
      if (!slug) throw new Error('Squadra ESPN sconosciuta: ' + r.squadra);
      const g = giornataDi(m.data, slug);
      for (const gx of r.giocatori) {
        let p = findPlayer(byTeam.get(slug) ?? [], gx.nome);
        let altroClub = false;
        if (!p && gx.minuti > 0) {
          // trasferito a fine mercato: giocava ancora con il club precedente
          p = findPlayer(players, gx.nome, 85);
          altroClub = !!p;
        }
        if (!p) {
          if (gx.minuti > 0) nonAbbinati.push(`${slug}: ${gx.nome} (${gx.minuti}')`);
          continue;
        }
        espnToPlayer.set(gx.id, p.id);
        const s = stats.get(p.id) ?? blank();
        if (altroClub) {
          // le presenze con l'ex squadra non contano per la gerarchia nel club attuale
          if (g) s.seq[g - 1] = 'x';
          s.exClub = slug;
          stats.set(p.id, s);
          continue;
        }
        s.distinte++;
        if (gx.titolare) s.tit++;
        else if (gx.minuti > 0) s.sub++;
        s.min += gx.minuti;
        s.gol += gx.gol;
        s.assist += gx.assist;
        s.amm += gx.gialli;
        s.esp += gx.rossi;
        if (g) s.seq[g - 1] = gx.titolare ? 'T' : gx.minuti > 0 ? 'S' : 'P';
        if (gx.rossi && g === maxG) s.rossoUltima = true;
        stats.set(p.id, s);
      }
    }
    for (const rg of m.rigori ?? []) {
      const pid = espnToPlayer.get(rg.id);
      if (!pid) continue;
      const s = stats.get(pid);
      s.rigori++;
      if (rg.segnato) s.rigoriSegnati++;
    }
    for (const pu of m.punizioni ?? []) {
      const pid = espnToPlayer.get(pu.id);
      if (pid) stats.get(pid).golPunizione++;
    }
  }
  return { stats, nonAbbinati, giornate: maxG };
}

// ---------- infortuni ----------
const DAY = 86400000;
const addDays = (iso, d) => new Date(Date.parse(iso) + d * DAY).toISOString().slice(0, 10);

/** Rientro stimato quando Transfermarkt non lo indica, in base al tipo di infortunio. */
export function stimaRientro(inf) {
  const t = (inf.infortunio || '').toLowerCase();
  const dal = inf.dal || OGGI;
  let giorni = 14;
  if (/crociato/.test(t)) giorni = /operazion|rottura/.test(t) ? 210 : 120;
  else if (/frattura|achille|menisco|operazion/.test(t)) giorni = 75;
  else if (/spalla|legamento|lesione/.test(t)) giorni = 35;
  else if (/stiramento|bicipite|polpaccio|coscia|adduttor|anca|caviglia|ginocchio/.test(t)) giorni = 21;
  else if (/raffreddore|influenza|febbre|ritardo di condizione|affaticamento/.test(t)) giorni = 7;
  let fino = addDays(dal, giorni);
  // infortunio "vecchio" senza data: si assume almeno un'altra settimana di stop
  if (fino < addDays(OGGI, 7)) fino = addDays(OGGI, 7);
  return fino;
}

export function durata(giorniRimanenti) {
  if (giorniRimanenti <= 14) return 'breve';
  if (giorniRimanenti <= 42) return 'medio';
  if (giorniRimanenti <= 120) return 'lungo';
  return 'stagione';
}

/** Giornate (dalla prossima) che cadono prima del rientro. */
export function giornateSaltate(fino, calendarioSquadra) {
  return calendarioSquadra.filter((g) => g.data >= OGGI && g.data < fino).length;
}

// ---------- stato in gerarchia ----------
/**
 * Classifica titolare / ballottaggio / riserva dalle giornate giocate, contando solo quelle in cui il
 * giocatore era disponibile (in distinta) e, per i trasferiti, solo quelle nel nuovo club.
 * - titolare: >= 2 partenze e titolare in >= 80% delle disponibili, oppure >= 60% con l'ultima da titolare
 * - ballottaggio: >= 2 partenze, titolare nell'ultima disponibile, >= 3 ingressi o >= 120'
 * - riserva: il resto (anche chi non è mai stato convocato)
 */
export function statoDaPartite(s, Gtot) {
  if (!s) return 'riserva';
  const arrivo = s.seq.lastIndexOf('x') + 1;
  if (Gtot - arrivo <= 0) return 'ballottaggio';
  const seq = s.seq.slice(arrivo).filter((x) => x !== '-');
  const disp = seq.length;
  if (!disp) return 'riserva';
  const tit = seq.filter((x) => x === 'T').length;
  const sub = seq.filter((x) => x === 'S').length;
  const ultima = seq[disp - 1];
  if (tit >= 2 && (tit / disp >= 0.8 || (tit / disp >= 0.6 && ultima === 'T'))) return 'titolare';
  if (tit >= 2 || ultima === 'T' || sub >= 3 || s.min >= 120) return 'ballottaggio';
  return 'riserva';
}
