import { useMemo } from 'react'
import { useStore } from './useStore'
import { useBuyerName, useOwnership, usePlayerMap } from './hooks'
import { teamName } from '../lib/data'
import type { Pair } from '../types'

export interface PairAlert {
  pair: Pair
  level: 'rotta' | 'completa'
  text: string
}

/** Stato delle coppie monitorate rispetto agli acquisti. */
export function usePairAlerts(): PairAlert[] {
  const pairs = useStore((s) => s.pairs)
  const owned = useOwnership()
  const map = usePlayerMap()
  const name = useBuyerName()
  return useMemo(() => {
    const out: PairAlert[] = []
    for (const pair of pairs) {
      const a = map.get(pair.a)
      const b = map.get(pair.b)
      if (!a || !b) continue
      const oa = owned.get(a.id)
      const ob = owned.get(b.id)
      if (!oa && !ob) continue
      if (oa && ob) {
        if ((oa.buyer === 'me') !== (ob.buyer === 'me')) {
          const mine = oa.buyer === 'me' ? a : b
          const lost = oa.buyer === 'me' ? b : a
          out.push({ pair, level: 'rotta', text: `Coppia spezzata: hai ${mine.nome}, ma ${lost.nome} è andato a ${name((oa.buyer === 'me' ? ob : oa).buyer)}.` })
        }
        continue
      }
      const taken = oa ? a : b
      const free = oa ? b : a
      const pur = (oa ?? ob)!
      if (pur.buyer === 'me') out.push({ pair, level: 'completa', text: `Completa la coppia: hai ${taken.nome}, manca ${free.nome} (${teamName(free.squadra)}).` })
      else out.push({ pair, level: 'rotta', text: `⚠ ${taken.nome} preso da ${name(pur.buyer)} a ${pur.price}: ${free.nome} ora vale meno come riserva (o di più come titolare!).` })
    }
    return out
  }, [pairs, owned, map, name])
}
