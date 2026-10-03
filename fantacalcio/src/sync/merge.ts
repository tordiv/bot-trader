/**
 * Motore di sincronizzazione (prototipo): trasforma lo stato dell'utente in "record" indipendenti,
 * ognuno con un orologio, e li unisce record per record (last-writer-wins per record).
 *
 * - Un acquisto, un pupillo, un rivale o una coppia sono record separati: modifiche fatte in
 *   contemporanea su due dispositivi a record diversi non si sovrascrivono mai.
 * - Le cancellazioni (annulla acquisto, togli rivale…) sono "lapidi": un dispositivo rimasto
 *   indietro non può far risorgere ciò che è stato cancellato.
 * - L'orologio è ibrido (Date.now + contatore che segue il massimo visto): uno scarto di orario
 *   tra telefono e computer non fa perdere modifiche fatte dopo aver ricevuto quelle dell'altro.
 * - Restano locali per dispositivo: vista, layout, formazione, scheda aperta.
 */
import type { Custom, Pair, Purchase, Rival, Ruolo, Settings } from '../types'

export interface SyncState {
  custom: Record<string, Custom>
  purchases: Purchase[]
  rivals: Rival[]
  pairs: Pair[]
  settings: Settings
  plan: Record<Ruolo, number[]>
  myName: string
}

export interface Rec {
  /** valore; assente se cancellato */
  v?: unknown
  /** orologio ibrido: confronto per (t, dev) */
  t: number
  dev: string
  del?: true
}

export type Records = Record<string, Rec>

/** Orologio ibrido: mai indietro rispetto a quanto già visto, anche se l'ora del dispositivo è sbagliata. */
export class Clock {
  private last = 0
  private now: () => number
  constructor(now: () => number = Date.now) {
    this.now = now
  }
  tick(): number {
    this.last = Math.max(this.now(), this.last + 1)
    return this.last
  }
  observe(t: number) {
    if (t > this.last) this.last = t
  }
}

export const newer = (a: Rec, b: Rec | undefined) => !b || a.t > b.t || (a.t === b.t && a.dev > b.dev)

const SINGLE = ['settings', 'plan', 'myName'] as const

/** Stato → valori dei record (senza orologio). */
export function toValues(s: SyncState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [id, c] of Object.entries(s.custom)) if (c && (c.starred || c.tags?.length || c.target != null || c.note)) out[`c:${id}`] = c
  for (const p of s.purchases) out[`p:${p.id}`] = p
  s.rivals.forEach((r, i) => (out[`r:${r.id}`] = { ...r, o: i }))
  for (const p of s.pairs) out[`k:${p.id}`] = p
  for (const k of SINGLE) out[`s:${k}`] = s[k]
  return out
}

/** Base "nessun dato": confrontata con lo stato locale al primo collegamento, lo carica tutto. */
export const nessunDato = (): SyncState => ({ custom: {}, purchases: [], rivals: [], pairs: [], settings: null as unknown as Settings, plan: null as unknown as SyncState['plan'], myName: null as unknown as string })

/**
 * Primo collegamento di un dispositivo. Se il cloud ha già dati, i record locali partono con
 * orologio 0: nei conflitti vince il cloud, ma ciò che esiste solo qui (acquisti, pupilli…) si aggiunge.
 */
export function bootstrap(s: SyncState, clock: Clock, dev: string, cloudPrevale: boolean): Records {
  const recs = diff(nessunDato(), s, clock, dev)
  if (cloudPrevale) for (const r of Object.values(recs)) r.t = 0
  return recs
}

/** Record cambiati tra due stati locali (modifiche fatte su questo dispositivo). */
export function diff(prev: SyncState, next: SyncState, clock: Clock, dev: string): Records {
  const a = toValues(prev)
  const b = toValues(next)
  const out: Records = {}
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in b)) out[k] = { t: clock.tick(), dev, del: true }
    else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = { v: b[k], t: clock.tick(), dev }
  }
  return out
}

/** Unisce record in arrivo; restituisce solo quelli che hanno cambiato qualcosa. */
export function merge(local: Records, incoming: Records, clock: Clock): Records {
  const changed: Records = {}
  for (const [k, r] of Object.entries(incoming)) {
    clock.observe(r.t)
    if (newer(r, local[k])) {
      local[k] = r
      changed[k] = r
    }
  }
  return changed
}

export interface Conflitto {
  playerId: string
  tenuto: Purchase
  scartato: Purchase
}

/**
 * Record → stato. Se lo stesso giocatore risulta acquistato due volte (registrato in contemporanea
 * su due dispositivi) vale il primo registrato: la regola è deterministica, quindi tutti i
 * dispositivi arrivano allo stesso risultato senza parlarsi.
 */
export function fromRecords(recs: Records, base: SyncState): { state: SyncState; conflitti: Conflitto[] } {
  const custom: Record<string, Custom> = {}
  const all: Purchase[] = []
  const rivals: (Rival & { o: number })[] = []
  const pairs: Pair[] = []
  const single: Partial<SyncState> = {}
  for (const [k, r] of Object.entries(recs)) {
    if (r.del) continue
    const [kind, ...rest] = k.split(':')
    const id = rest.join(':')
    if (kind === 'c') custom[id] = r.v as Custom
    else if (kind === 'p') all.push(r.v as Purchase)
    else if (kind === 'r') rivals.push(r.v as Rival & { o: number })
    else if (kind === 'k') pairs.push(r.v as Pair)
    else if (kind === 's') (single as Record<string, unknown>)[id] = r.v
  }
  all.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1))
  const seen = new Map<string, Purchase>()
  const conflitti: Conflitto[] = []
  const purchases = all.filter((p) => {
    if (!p.playerId) return true
    const prima = seen.get(p.playerId)
    if (prima) {
      conflitti.push({ playerId: p.playerId, tenuto: prima, scartato: p })
      return false
    }
    seen.set(p.playerId, p)
    return true
  })
  rivals.sort((a, b) => a.o - b.o || (a.id < b.id ? -1 : 1))
  // nessun record di rivali (né vivi né cancellati): si tengono quelli locali
  const haRivali = Object.keys(recs).some((k) => k.startsWith('r:'))
  return {
    state: {
      custom,
      purchases,
      rivals: haRivali ? rivals.map(({ o: _o, ...r }) => r) : base.rivals,
      pairs,
      settings: (single.settings as Settings) ?? base.settings,
      plan: (single.plan as SyncState['plan']) ?? base.plan,
      myName: (single.myName as string) ?? base.myName,
    },
    conflitti,
  }
}
