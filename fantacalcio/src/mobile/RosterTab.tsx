import { useMemo, useState } from 'react'
import { ChevronDown, Swords, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useMyRoster, usePlayerMap } from '../store/hooks'
import { summarize } from '../lib/calc'
import { obiettivo } from '../lib/piano'
import { cn } from '../lib/utils'
import { Delta, RoleBadge } from '../components/ui'
import { Empty, MRow, Section } from './shared'
import { RUOLI, RUOLO_LABEL } from '../types'

export default function RosterTab() {
  const roster = useMyRoster()
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const myName = useStore((s) => s.myName)
  return (
    <div className="space-y-3">
      <Section title={<><Users size={14} className="text-emerald-400" /> {myName || 'La mia rosa'}</>} right={<span className="font-mono text-xs text-slate-400">{roster.reduce((a, x) => a + x.price, 0)} cr</span>}>
        {roster.length === 0 && <Empty>Ancora nessun acquisto: cerca il giocatore all'asta dalla scheda Asta.</Empty>}
        {RUOLI.map((r) => {
          const list = roster.filter((x) => x.player.ruolo === r).sort((a, b) => b.price - a.price)
          if (!list.length) return null
          return (
            <div key={r}>
              <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>
                  {RUOLO_LABEL[r]} {list.length}/{settings.slots[r]}
                </span>
                <span className="font-mono">{list.reduce((a, x) => a + x.price, 0)} cr</span>
              </div>
              <div className="divide-y divide-slate-800/70">
                {list.map((x) => (
                  <MRow
                    key={x.purchase.id}
                    p={x.player}
                    right={
                      <span className="shrink-0 text-right leading-tight">
                        <span className="block font-mono text-lg font-black text-emerald-300">{x.price}</span>
                        <span className="block text-[10px]">
                          <Delta value={x.price - obiettivo(x.player, custom[x.player.id], settings.budget)} />
                        </span>
                      </span>
                    }
                  />
                ))}
              </div>
            </div>
          )
        })}
      </Section>
      <Rivals />
    </div>
  )
}

function Rivals() {
  const rivals = useStore((s) => s.rivals)
  const purchases = useStore((s) => s.purchases)
  const settings = useStore((s) => s.settings)
  const map = usePlayerMap()
  const [open, setOpen] = useState<string | null>(null)
  const total = RUOLI.reduce((a, r) => a + settings.slots[r], 0)
  const rows = useMemo(() => rivals.map((r) => ({ r, s: summarize(purchases, r.id, settings, map) })), [rivals, purchases, settings, map])
  const maxDanger = Math.max(0, ...rows.map((x) => x.s.maxBid))
  return (
    <Section title={<><Swords size={14} className="text-rose-400" /> Rivali ({rivals.length})</>} right={<span className="text-[11px] text-slate-500">residuo · rosa · MaxBid</span>}>
      <ul className="divide-y divide-slate-800/70">
        {rows.map(({ r, s }) => {
          const list = purchases.filter((p) => p.buyer === r.id)
          const isOpen = open === r.id
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-white/10">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{r.name}</span>
                <span className="w-10 text-right font-mono text-sm text-slate-200">{s.residuo}</span>
                <span className="w-12 text-right font-mono text-xs text-slate-400">
                  {s.count}/{total}
                </span>
                <span className={cn('w-10 text-right font-mono text-sm font-bold', s.maxBid === maxDanger && maxDanger > 0 ? 'text-rose-300' : 'text-amber-300')}>{s.maxBid}</span>
                <ChevronDown size={16} className={cn('shrink-0 text-slate-500 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="space-y-0.5 bg-slate-950/50 px-3 py-2">
                  <div className="mb-1 flex gap-2 text-[11px] text-slate-500">
                    {RUOLI.map((ro) => (
                      <span key={ro}>
                        {ro} {s.perRuolo[ro]}/{settings.slots[ro]}
                      </span>
                    ))}
                  </div>
                  {list.length === 0 && <div className="text-xs text-slate-500">Nessun acquisto.</div>}
                  {list.map((pur) => {
                    const p = pur.playerId ? map.get(pur.playerId) : null
                    const ro = p?.ruolo ?? pur.ruolo
                    return (
                      <div key={pur.id} className="flex items-center gap-2 text-sm">
                        {ro ? <RoleBadge r={ro} /> : <span className="w-5" />}
                        <span className="flex-1 truncate text-slate-300">{p ? p.nome : 'Spesa rapida'}</span>
                        <span className="font-mono text-slate-100">{pur.price}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
