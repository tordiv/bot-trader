import { useMemo } from 'react'
import { useStore } from './useStore'
import { summarize, type BuyerSummary } from '../lib/calc'
import type { Player, Purchase } from '../types'

export function usePlayerMap(): Map<string, Player> {
  const players = useStore((s) => s.players)
  return useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
}

export function useOwnership(): Map<string, Purchase> {
  const purchases = useStore((s) => s.purchases)
  return useMemo(() => new Map(purchases.filter((p) => p.playerId).map((p) => [p.playerId!, p])), [purchases])
}

export function useSummary(buyer: string): BuyerSummary {
  const purchases = useStore((s) => s.purchases)
  const settings = useStore((s) => s.settings)
  const map = usePlayerMap()
  return useMemo(() => summarize(purchases, buyer, settings, map), [purchases, buyer, settings, map])
}

export function useBuyerName(): (id: string) => string {
  const rivals = useStore((s) => s.rivals)
  const myName = useStore((s) => s.myName)
  return useMemo(() => {
    const m = new Map(rivals.map((r) => [r.id, r.name]))
    return (id: string) => (id === 'me' ? myName || 'Io' : m.get(id) ?? 'Rivale rimosso')
  }, [rivals, myName])
}

/** Giocatori acquistati da me, con prezzo. */
export function useMyRoster(): { player: Player; price: number; purchase: Purchase }[] {
  const purchases = useStore((s) => s.purchases)
  const map = usePlayerMap()
  return useMemo(
    () =>
      purchases
        .filter((p) => p.buyer === 'me' && p.playerId && map.has(p.playerId))
        .map((p) => ({ player: map.get(p.playerId!)!, price: p.price, purchase: p })),
    [purchases, map],
  )
}
