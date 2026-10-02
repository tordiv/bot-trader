import { describe, expect, it } from 'vitest'
import { distribuisci, fuzzyScore, maxBid, mediaModificatore, modificatore, summarize } from '../src/lib/calc'
import type { Player, Purchase, Settings } from '../src/types'

const settings: Settings = { budget: 500, slots: { P: 3, D: 8, C: 8, A: 6 }, split: { P: 7, D: 19, C: 29, A: 45 } }

describe('MaxBid', () => {
  it('residuo - (slot vuoti - 1)', () => {
    expect(maxBid(500, 25)).toBe(476)
    expect(maxBid(120, 11)).toBe(110)
    expect(maxBid(5, 1)).toBe(5)
    expect(maxBid(10, 0)).toBe(0)
    expect(maxBid(3, 10)).toBe(0)
  })
  it('riepilogo del compratore', () => {
    const map = new Map<string, Player>([['x', { id: 'x', ruolo: 'A' } as Player]])
    const pur: Purchase[] = [
      { id: '1', playerId: 'x', ruolo: null, buyer: 'me', price: 100, ts: 0 },
      { id: '2', playerId: null, ruolo: 'D', buyer: 'r1', price: 30, ts: 0 },
    ]
    const s = summarize(pur, 'me', settings, map)
    expect(s).toMatchObject({ spent: 100, residuo: 400, count: 1, slotVuoti: 24, maxBid: 377 })
    expect(s.perRuolo.A).toBe(1)
    expect(summarize(pur, 'r1', settings, map).perRuolo.D).toBe(1)
  })
})

describe('Modificatore di difesa classic', () => {
  it('soglie', () => {
    expect(modificatore(5.99)).toBe(0)
    expect(modificatore(6)).toBe(1)
    expect(modificatore(6.24)).toBe(1)
    expect(modificatore(6.25)).toBe(3)
    expect(modificatore(6.49)).toBe(3)
    expect(modificatore(6.5)).toBe(5)
    expect(modificatore(6.99)).toBe(5)
    expect(modificatore(7)).toBe(6)
  })
  it('portiere + 3 migliori difensori, servono 4 difensori', () => {
    expect(mediaModificatore(6, [7, 6, 6])).toBeNull()
    expect(mediaModificatore(6, [7, 6.5, 6, 4])).toBeCloseTo(6.375)
  })
})

describe('Piano slot', () => {
  it('somma esatta e slot ordinati', () => {
    for (const [b, n] of [[225, 6], [95, 8], [35, 3], [8, 8], [5, 8]] as const) {
      const d = distribuisci(b, n, 'D')
      expect(d).toHaveLength(n)
      expect(d.every((v) => v >= 1)).toBe(true)
      if (b >= n) expect(d.reduce((a, c) => a + c, 0)).toBe(b)
      expect([...d].sort((x, y) => y - x)).toEqual(d)
    }
  })
})

describe('Ricerca fuzzy', () => {
  it('trova abbreviazioni e ignora gli accenti', () => {
    expect(fuzzyScore('mctom', 'Scott McTominay')).toBeGreaterThan(0)
    expect(fuzzyScore('yildiz', 'Kenan Yıldız')).toBeGreaterThan(0)
    expect(fuzzyScore('calha', 'Hakan Çalhanoğlu')).toBeGreaterThan(0)
    expect(fuzzyScore('zzz', 'Lautaro Martínez')).toBe(0)
    expect(fuzzyScore('mancini gianl', 'Gianluca Mancini Roma')).toBeGreaterThan(0)
    expect(fuzzyScore('mancini gianl', 'Rasmus Højlund Napoli')).toBe(0)
    expect(fuzzyScore('lau', 'Lautaro Martínez')).toBeGreaterThan(fuzzyScore('lau', 'Nicolò Barella'))
  })
})
