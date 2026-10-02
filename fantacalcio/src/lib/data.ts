import playersJson from '../data/initialPlayers.json'
import gkJson from '../data/goalkeeperMatrix.json'
import teamsJson from '../data/teams.json'
import type { Player, Team } from '../types'

export const INITIAL_PLAYERS = playersJson.players as Player[]
export const DATA_META = playersJson.meta
export const TEAMS = teamsJson as Team[]
export const TEAM_BY_SLUG = new Map(TEAMS.map((t) => [t.slug, t]))
export const TEAM_SLUGS = TEAMS.map((t) => t.slug)
export const GK_MATRIX = gkJson.matrice as Record<string, Record<string, number | null>>

export const teamName = (slug: string) => TEAM_BY_SLUG.get(slug)?.nome ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function gkColor(v: number | null | undefined): string {
  if (v == null) return 'bg-slate-800 text-slate-500'
  if (v <= 4) return 'bg-emerald-500/25 text-emerald-200'
  if (v <= 8) return 'bg-amber-500/20 text-amber-200'
  return 'bg-rose-500/25 text-rose-200'
}

/** Partner migliori per alternanza casa/trasferta (coefficiente più basso). */
export function bestPartners(slug: string, n = 5): { slug: string; score: number }[] {
  const row = GK_MATRIX[slug]
  if (!row) return []
  return Object.entries(row)
    .filter(([, v]) => v != null)
    .map(([s, v]) => ({ slug: s, score: v as number }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
}
