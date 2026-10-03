import { describe, expect, it } from 'vitest'
import { ordinaObiettivi, prioritaPupillo, statoRuolo } from '../src/lib/piano'
import { DEFAULT_SETTINGS } from '../src/store/useStore'
import type { Player } from '../src/types'

describe('statoRuolo', () => {
  it('assegna gli acquisti agli slot in ordine di prezzo e calcola il prossimo slot', () => {
    const plan = [60, 40, 25, 15, 10, 5, 3, 2]
    const st = statoRuolo('D', plan, [12, 45], DEFAULT_SETTINGS)
    expect(st.presi).toBe(2)
    expect(st.speso).toBe(57)
    expect(st.pianificato).toBe(160)
    expect(st.residuoPiano).toBe(103)
    expect(st.slotLiberi).toEqual([25, 15, 10, 5, 3, 2])
    expect(st.prossimo).toBe(25)
  })
  it('ruolo completo: nessun prossimo slot', () => {
    const st = statoRuolo('P', [10, 2, 1], [9, 1, 1], DEFAULT_SETTINGS)
    expect(st.prossimo).toBeNull()
    expect(st.residuoPiano).toBe(2)
  })
})

describe('priorità obiettivi', () => {
  it('Must-Have prima, poi sotto budget, senza etichetta, scommesse', () => {
    expect(prioritaPupillo({ tags: ['must'] })).toBe(0)
    expect(prioritaPupillo({ tags: ['scommessa', 'budget'] })).toBe(1)
    expect(prioritaPupillo({ starred: true })).toBe(2)
    expect(prioritaPupillo({ tags: ['scommessa'] })).toBe(3)
    const p = (id: string, qt: number) => ({ id, qt }) as Player
    const out = ordinaObiettivi([p('a', 10), p('b', 30), p('c', 20), p('d', 5)], { a: { tags: ['scommessa'] }, b: { starred: true }, c: { tags: ['must'] }, d: { tags: ['must'] } })
    expect(out.map((x) => x.id)).toEqual(['c', 'd', 'b', 'a'])
  })
})
