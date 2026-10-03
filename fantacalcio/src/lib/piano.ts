import type { Custom, Player, Ruolo, Settings } from '../types'
import { prezzoConsigliato } from './calc'

export interface StatoRuolo {
  ruolo: Ruolo
  presi: number
  slot: number
  speso: number
  pianificato: number
  /** crediti del piano ancora da spendere sul ruolo (può essere negativo) */
  residuoPiano: number
  /** piano degli slot ancora vuoti, dal più caro */
  slotLiberi: number[]
  /** cifra del piano per il prossimo slot del ruolo (null se completo) */
  prossimo: number | null
}

/**
 * Confronto piano / reale per un ruolo. Come nella griglia della Strategia, gli acquisti
 * occupano gli slot in ordine di prezzo: il più caro va nello slot 1.
 */
export function statoRuolo(ruolo: Ruolo, plan: number[], prezzi: number[], settings: Settings): StatoRuolo {
  const slot = settings.slots[ruolo]
  const ordinati = [...prezzi].sort((a, b) => b - a)
  const pianificato = plan.reduce((a, b) => a + b, 0)
  const speso = ordinati.reduce((a, b) => a + b, 0)
  const slotLiberi = plan.slice(ordinati.length, slot)
  return {
    ruolo,
    presi: ordinati.length,
    slot,
    speso,
    pianificato,
    residuoPiano: pianificato - speso,
    slotLiberi,
    prossimo: slotLiberi.length ? slotLiberi[0] : null,
  }
}

const PRIORITA_TAG = { must: 0, budget: 1, scommessa: 3 } as const

/** Priorità di un pupillo nella lista obiettivi: Must-Have, poi Solo sotto budget, senza etichetta, Scommesse a 1. */
export function prioritaPupillo(c: Custom | undefined): number {
  const tags = c?.tags ?? []
  if (!tags.length) return 2
  return Math.min(...tags.map((t) => PRIORITA_TAG[t]))
}

/** Prezzo obiettivo: quello impostato dall'utente o il consigliato dalla quotazione. */
export const obiettivo = (p: Player, c: Custom | undefined, budget: number) => c?.target ?? prezzoConsigliato(p, budget)

/** Pupilli ordinati per priorità, poi per quotazione. */
export function ordinaObiettivi(list: Player[], custom: Record<string, Custom>): Player[] {
  return [...list].sort((a, b) => prioritaPupillo(custom[a.id]) - prioritaPupillo(custom[b.id]) || b.qt - a.qt)
}
