// Scarica i match report ESPN delle giornate giocate e salva un estratto compatto in fonti/partite.json:
// formazione, titolari, subentrati/sostituiti con minuto, gol, assist, rigori, cartellini.
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (FantaWarRoom)';
const GIORNATE = Number(process.env.GIORNATE || 5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cal = JSON.parse(fs.readFileSync('.cache/calendar.json', 'utf8')).matches;
fs.mkdirSync('.cache/espn', { recursive: true });

async function get(url, tries = 0) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) { if (tries > 4) throw new Error(`${r.status} ${url}`); await sleep(1500 * 2 ** tries); return get(url, tries + 1); }
  return r.json();
}
// minuto da "54'" o "45'+2'"
const minute = (v) => { const m = String(v || '').match(/(\d+)'?(?:\+(\d+))?/); return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0) : null; };

const dates = [...new Set(cal.filter((m) => parseInt(m.round.replace(/\D/g, '')) <= GIORNATE).map((m) => m.date))].sort();
const events = [];
for (const d of dates) {
  const sb = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=${d.replace(/-/g, '')}`);
  for (const e of sb.events ?? []) events.push({ id: e.id, date: d, name: e.name, done: e.status?.type?.completed });
  await sleep(300);
}
console.log('partite trovate', events.length, 'concluse', events.filter((e) => e.done).length);

const out = [];
for (const ev of events.filter((e) => e.done)) {
  const f = `.cache/espn/${ev.id}.json`;
  if (!fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/summary?event=${ev.id}`))); await sleep(400); }
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  const comp = s.header.competitions[0];
  const teams = comp.competitors.map((c) => ({ espnId: c.team.id, nome: c.team.displayName, casa: c.homeAway === 'home', gol: Number(c.score) }));
  const key = s.keyEvents ?? [];
  const subs = key.filter((k) => /substitution/i.test(k.type?.text || '')).map((k) => ({ min: minute(k.clock?.displayValue), in: k.participants?.[0]?.athlete?.id, out: k.participants?.[1]?.athlete?.id }));
  const reds = key.filter((k) => /red card/i.test(k.type?.text || '')).map((k) => ({ id: k.participants?.[0]?.athlete?.id, min: minute(k.clock?.displayValue) }));
  const pens = key.filter((k) => /^penalty - (scored|missed|saved)/i.test(k.type?.text || ''))
    .map((k) => ({ id: k.participants?.[0]?.athlete?.id, segnato: /scored/i.test(k.type?.text || ''), testo: k.text }));
  const punizioni = key.filter((k) => /free-kick/i.test(k.type?.text || '')).map((k) => ({ id: k.participants?.[0]?.athlete?.id, testo: k.text }));
  const rosters = (s.rosters ?? []).map((r) => ({
    espnId: r.team.id,
    squadra: r.team.displayName,
    modulo: r.formation ?? null,
    giocatori: r.roster.map((p) => {
      const st = Object.fromEntries((p.stats ?? []).map((x) => [x.name, x.value]));
      const id = p.athlete.id;
      const sin = subs.find((x) => x.in === id);
      const sout = subs.find((x) => x.out === id);
      const red = reds.find((x) => x.id === id);
      const da = p.starter ? 0 : sin ? Math.floor(sin.min) : null;
      const a = da === null ? null : sout ? Math.floor(sout.min) : red ? Math.floor(red.min) : 90;
      return {
        id, nome: p.athlete.displayName, pos: p.position?.abbreviation ?? null, titolare: !!p.starter,
        entrato: sin ? Math.floor(sin.min) : null, uscito: sout ? Math.floor(sout.min) : null,
        minuti: da === null ? 0 : Math.max(1, a - da),
        gol: st.totalGoals ?? 0, assist: st.goalAssists ?? 0, gialli: st.yellowCards ?? 0, rossi: red ? 1 : (st.redCards ?? 0),
      };
    }),
  }));
  out.push({ id: ev.id, data: ev.date, partita: ev.name, squadre: teams, rosters, rigori: pens, punizioni });
}
fs.mkdirSync('fonti', { recursive: true });
fs.writeFileSync('fonti/partite.json', JSON.stringify({ fonte: 'ESPN match reports', scaricato: new Date().toISOString().slice(0, 10), giornate: GIORNATE, partite: out }));
console.log('salvate', out.length, 'partite');
