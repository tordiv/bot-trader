import type { ReactNode } from 'react'
import { teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'
import { Crest, Disponibilita, Gerarchie, RoleBadge } from '../components/ui'
import type { Player, Purchase, Ruolo } from '../types'
import { RUOLI } from '../types'

const STATO_DOT: Record<Player['stato'], string> = { titolare: 'bg-emerald-400', ballottaggio: 'bg-amber-400', riserva: 'bg-slate-500' }
const STATO_TXT: Record<Player['stato'], string> = { titolare: 'Tit.', ballottaggio: 'Ball.', riserva: 'Ris.' }

/** Riga giocatore a tutta larghezza, pensata per il tocco: apre la scheda di rilancio. */
export function MRow({ p, owner, right, below }: { p: Player; owner?: { purchase: Purchase; name: string } | null; right?: ReactNode; below?: ReactNode }) {
  const open = useStore((s) => s.openSheet)
  const mine = owner?.purchase.buyer === 'me'
  return (
    <button
      type="button"
      onClick={() => open(p.id)}
      className={cn('flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:bg-white/10', owner && !mine && 'opacity-45', mine && 'bg-emerald-500/5')}
    >
      <RoleBadge r={p.ruolo} className="h-6 w-6 text-xs" />
      <Crest slug={p.squadra} size={26} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px] font-semibold text-slate-100', owner && !mine && 'line-through')}>{p.nome}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATO_DOT[p.stato])} />
          <span className="shrink-0">{STATO_TXT[p.stato]}</span>
          <span className="truncate">{teamName(p.squadra)}</span>
          <Gerarchie p={p} />
          <Disponibilita p={p} />
        </span>
        {below}
      </span>
      {owner ? (
        <span className={cn('shrink-0 text-right text-[11px] leading-tight', mine ? 'text-emerald-300' : 'text-rose-300')}>
          <span className="block font-mono text-base font-black">{owner.purchase.price}</span>
          <span className="block max-w-20 truncate">{mine ? 'TUO' : owner.name}</span>
        </span>
      ) : (
        right
      )}
    </button>
  )
}

/** Prezzo obiettivo a destra della riga. */
export function TargetCell({ value, custom }: { value: number; custom: boolean }) {
  return (
    <span className="shrink-0 text-right leading-tight">
      <span className="block font-mono text-lg font-black text-slate-100">{value}</span>
      <span className="block text-[10px] uppercase tracking-wide text-slate-500">{custom ? 'obiettivo' : 'consigl.'}</span>
    </span>
  )
}

export function Section({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  )
}

/** Filtro per ruolo a pillole (tocco di nuovo per togliere). */
export function RoleFilter({ value, onChange, extra }: { value: Ruolo | null; onChange: (r: Ruolo | null) => void; extra?: (r: Ruolo) => ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => onChange(null)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold ring-1', value === null ? 'bg-slate-100 text-slate-900 ring-slate-100' : 'text-slate-400 ring-slate-700')}>
        Tutti
      </button>
      {RUOLI.map((r) => (
        <button
          type="button"
          key={r}
          onClick={() => onChange(value === r ? null : r)}
          className={cn('flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold ring-1', value === r ? 'bg-slate-100 text-slate-900 ring-slate-100' : 'text-slate-300 ring-slate-700')}
        >
          {r}
          {extra?.(r)}
        </button>
      ))}
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="px-4 py-6 text-center text-sm text-slate-500">{children}</p>
