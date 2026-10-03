import { fuzzyScore } from './calc'
import { teamName } from './data'
import type { Player } from '../types'

/** Ricerca per nome e squadra (stessa logica dell'acquisto rapido): i più quotati salgono a parità di corrispondenza. */
export function cercaGiocatori(players: Player[], query: string, limit = 30): Player[] {
  const q = query.trim()
  if (!q) return []
  return players
    .map((p) => ({ p, s: Math.max(fuzzyScore(q, p.nome) * 1.2, fuzzyScore(q, `${p.nome} ${teamName(p.squadra)}`), fuzzyScore(q, teamName(p.squadra)) * 0.6) }))
    .filter((x) => x.s > 1)
    .map((x) => ({ p: x.p, s: x.s + x.p.qt / 20 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p)
}
