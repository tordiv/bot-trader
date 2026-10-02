import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import players from '../src/data/initialPlayers.json'
import gk from '../src/data/goalkeeperMatrix.json'
import teams from '../src/data/teams.json'
import crests from '../src/data/crests.json'

describe('Dataset 2026/27', () => {
  it('20 squadre con stemma locale presente in public/crests', () => {
    expect(teams).toHaveLength(20)
    for (const t of teams) {
      expect(t.stemma, t.slug).toBe((crests as Record<string, string>)[t.slug])
      expect(fs.existsSync(path.join(__dirname, '..', 'public', t.stemma!)), t.stemma!).toBe(true)
      expect(t.calendario).toHaveLength(38)
    }
  })
  it('ogni squadra ha rosa completa con rigoristi e titolari', () => {
    for (const t of teams) {
      const rosa = players.players.filter((p) => p.squadra === t.slug)
      expect(rosa.length, t.slug).toBeGreaterThanOrEqual(20)
      // gerarchie reali: 11 titolari più chi ruota o è fermo ai box
      const tit = rosa.filter((p) => p.stato === 'titolare').length
      expect(tit, t.slug).toBeGreaterThanOrEqual(9)
      expect(tit, t.slug).toBeLessThanOrEqual(15)
      expect(rosa.filter((p) => p.rigorista === 1), t.slug).toHaveLength(1)
      expect(rosa.filter((p) => p.rigorista === 2).length, t.slug).toBeLessThanOrEqual(1)
      expect(rosa.filter((p) => p.ruolo === 'P' && p.stato === 'titolare'), t.slug).toHaveLength(1)
      // ogni squadra ha 5 partite analizzate: almeno 11 giocatori partiti titolari
      expect(rosa.filter((p) => (p.stagione?.tit ?? 0) > 0).length, t.slug).toBeGreaterThanOrEqual(11)
    }
    expect(new Set(players.players.map((p) => p.id)).size).toBe(players.players.length)
  })
  it('infortuni con durata coerente con il rientro', () => {
    const inf = players.players.filter((p) => p.infortunio)
    expect(inf.length).toBeGreaterThan(30)
    for (const p of inf) {
      const i = p.infortunio!
      const atteso = i.giorni <= 14 ? 'breve' : i.giorni <= 42 ? 'medio' : i.giorni <= 120 ? 'lungo' : 'stagione'
      expect(i.durata, p.nome).toBe(atteso)
      expect(i.giornate).toBeGreaterThanOrEqual(0)
    }
  })
  it('matrice portieri 20x20 simmetrica in 0-10', () => {
    for (const a of gk.squadre)
      for (const b of gk.squadre) {
        const v = (gk.matrice as Record<string, Record<string, number | null>>)[a][b]
        if (a === b) expect(v).toBeNull()
        else {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(10)
          expect(v).toBe((gk.matrice as Record<string, Record<string, number | null>>)[b][a])
        }
      }
  })
})
