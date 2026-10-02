import { useState, type ReactNode } from 'react'
import { Crosshair, Flag, Shield, Star, Target } from 'lucide-react'
import type { Player, Ruolo, Stato } from '../types'
import { TAGS } from '../types'
import { TEAM_BY_SLUG, teamName } from '../lib/data'
import { asset, cn } from '../lib/utils'
import { useStore } from '../store/useStore'

/** Stemma locale con fallback a scudo generico se l'asset non si carica. */
export function Crest({ slug, size = 20, className }: { slug: string; size?: number; className?: string }) {
  const team = TEAM_BY_SLUG.get(slug)
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }
  if (!team?.stemma || failed) {
    return (
      <span title={teamName(slug)} style={box} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-300', className)}>
        <Shield size={size * 0.65} />
      </span>
    )
  }
  return (
    <span title={team.nome} style={box} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-white p-[2px] shadow-sm ring-1 ring-black/10', className)}>
      <img src={asset(team.stemma)} alt={team.nome} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
    </span>
  )
}

const ROLE_COLORS: Record<Ruolo, string> = {
  P: 'bg-amber-400 text-amber-950',
  D: 'bg-emerald-500 text-emerald-950',
  C: 'bg-sky-500 text-sky-950',
  A: 'bg-rose-500 text-rose-950',
}
export function RoleBadge({ r, className }: { r: Ruolo; className?: string }) {
  return <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-black', ROLE_COLORS[r], className)}>{r}</span>
}

const STATO_STYLE: Record<Stato, string> = {
  titolare: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/30',
  ballottaggio: 'text-amber-300 bg-amber-500/10 ring-amber-500/30',
  riserva: 'text-slate-400 bg-slate-500/10 ring-slate-500/30',
}
const STATO_LABEL: Record<Stato, string> = { titolare: 'Titolare', ballottaggio: 'Ballottaggio', riserva: 'Riserva' }
export function StatoBadge({ s }: { s: Stato }) {
  return <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', STATO_STYLE[s])}>{STATO_LABEL[s]}</span>
}

/** Icone gerarchie: rigori, punizioni, corner. */
export function Gerarchie({ p }: { p: Player }) {
  return (
    <span className="inline-flex items-center gap-1">
      {p.rigorista > 0 && (
        <span title={p.rigorista === 1 ? '1° rigorista' : '2° rigorista'} className={cn('inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-bold ring-1', p.rigorista === 1 ? 'bg-fuchsia-500/20 text-fuchsia-200 ring-fuchsia-400/40' : 'bg-fuchsia-500/5 text-fuchsia-300/80 ring-fuchsia-400/20')}>
          <Target size={10} />R{p.rigorista}
        </span>
      )}
      {p.punizioni && (
        <span title="Punizioni" className="inline-flex items-center rounded bg-cyan-500/10 px-1 text-[10px] font-bold text-cyan-300 ring-1 ring-cyan-400/30">
          <Crosshair size={10} />
        </span>
      )}
      {p.corner && (
        <span title="Calci d'angolo" className="inline-flex items-center rounded bg-lime-500/10 px-1 text-[10px] font-bold text-lime-300 ring-1 ring-lime-400/30">
          <Flag size={10} />
        </span>
      )}
    </span>
  )
}

export function StarButton({ id, size = 16 }: { id: string; size?: number }) {
  const starred = useStore((s) => !!s.custom[id]?.starred)
  const toggle = useStore((s) => s.toggleStar)
  return (
    <button type="button" title={starred ? 'Rimuovi dai pupilli' : 'Aggiungi ai pupilli'} onClick={(e) => (e.stopPropagation(), toggle(id))} className="rounded p-0.5 hover:bg-white/10">
      <Star size={size} className={starred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'} />
    </button>
  )
}

export function TagChips({ id, editable = false }: { id: string; editable?: boolean }) {
  const tags = useStore((s) => s.custom[id]?.tags) ?? []
  const toggle = useStore((s) => s.toggleTag)
  const list = editable ? TAGS : TAGS.filter((t) => tags.includes(t.id))
  return (
    <span className="inline-flex flex-wrap gap-1">
      {list.map((t) => (
        <button
          type="button"
          key={t.id}
          disabled={!editable}
          onClick={(e) => (e.stopPropagation(), toggle(id, t.id))}
          title={t.label}
          className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 transition', tags.includes(t.id) ? t.color : 'bg-transparent text-slate-500 ring-slate-700 hover:text-slate-300', !editable && 'cursor-default')}
        >
          {t.short}
        </button>
      ))}
    </span>
  )
}

export function Card({ title, icon, actions, children, className }: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/20', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
            {icon}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{children}</kbd>
}

export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  // value = reale - pianificato: positivo = speso di più (rosso)
  const bad = invert ? value < 0 : value > 0
  if (value === 0) return <span className="font-mono text-xs text-slate-400">±0</span>
  return <span className={cn('font-mono text-xs font-bold', bad ? 'text-rose-400' : 'text-emerald-400')}>{value > 0 ? `+${value}` : value}</span>
}

export function PlayerLine({ p, right, onClick, dim }: { p: Player; right?: ReactNode; onClick?: () => void; dim?: boolean }) {
  return (
    <div onClick={onClick} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5', onClick && 'cursor-pointer hover:bg-white/5', dim && 'opacity-40')}>
      <RoleBadge r={p.ruolo} />
      <Crest slug={p.squadra} size={20} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-100">{p.nome}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>{teamName(p.squadra)}</span>
          <span>·</span>
          <span>Qt {p.qt}</span>
          <Gerarchie p={p} />
        </div>
      </div>
      {right}
    </div>
  )
}
