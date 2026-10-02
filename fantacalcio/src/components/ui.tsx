import { useState, type ReactNode } from 'react'
import { Ban, Crosshair, Flag, Shield, Star, Target } from 'lucide-react'
import type { Durata, Player, Ruolo, Stato } from '../types'
import { DURATA_LABEL, TAGS } from '../types'
import { fmtData, infortunioTesto } from '../lib/infortuni'
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
          <Disponibilita p={p} />
        </div>
      </div>
      {right}
    </div>
  )
}

const DURATA_STYLE: Record<Durata, string> = {
  breve: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/40',
  medio: 'bg-orange-500/20 text-orange-200 ring-orange-500/40',
  lungo: 'bg-rose-500/25 text-rose-200 ring-rose-500/50',
  stagione: 'bg-rose-900/60 text-rose-100 ring-rose-400/60',
}
const DURATA_SHORT: Record<Durata, string> = { breve: 'INF', medio: 'INF', lungo: 'INF', stagione: 'OUT' }

/** Badge indisponibilità: colore per durata, giornate saltate; più squalifica/diffida. */
export function Disponibilita({ p, full = false }: { p: Player; full?: boolean }) {
  const i = p.infortunio
  return (
    <span className="inline-flex items-center gap-1">
      {i && (
        <span title={infortunioTesto(p)} className={cn('inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1 text-[10px] font-bold ring-1', DURATA_STYLE[i.durata])}>
          <span aria-hidden>✚</span>
          {full ? `${DURATA_LABEL[i.durata]} · ${i.stimato ? '~' : ''}${fmtData(i.fino)}` : i.giornate > 0 ? `${DURATA_SHORT[i.durata]} ${i.giornate}g` : 'recupera'}
        </span>
      )}
      {p.squalifica ? (
        <span title={`Squalificato per ${p.squalifica} giornata (espulso nell'ultima)`} className="inline-flex items-center gap-0.5 rounded bg-red-600/30 px-1 text-[10px] font-bold text-red-100 ring-1 ring-red-500/50">
          <Ban size={10} />
          SQ
        </span>
      ) : null}
      {p.diffidato && <span title="Diffidato (4 ammonizioni)" className="rounded bg-yellow-400/20 px-1 text-[10px] font-bold text-yellow-200 ring-1 ring-yellow-400/40">DIFF</span>}
    </span>
  )
}

const SEQ_STYLE: Record<string, string> = {
  T: 'bg-emerald-500 text-emerald-950',
  S: 'bg-amber-400 text-amber-950',
  P: 'bg-slate-600 text-slate-300',
  '-': 'bg-slate-800 text-slate-600',
  x: 'bg-violet-500/60 text-violet-100',
}
const SEQ_LABEL: Record<string, string> = { T: 'titolare', S: 'subentrato', P: 'in panchina, non entrato', '-': 'non convocato', x: "con l'ex squadra" }

/** Striscia G1..Gn delle giornate giocate. */
export function Forma({ p, compact = false }: { p: Player; compact?: boolean }) {
  const st = p.stagione
  if (!st) return null
  const title = `${st.tit} da titolare, ${st.sub} da subentrato, ${st.min}' · ${st.gol} gol, ${st.assist} assist${st.exClub ? ` · prime giornate con ${teamName(st.exClub)}` : ''}`
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className="inline-flex gap-px">
        {st.seq.split('').map((c, i) => (
          <span key={i} title={`G${i + 1}: ${SEQ_LABEL[c] ?? c}`} className={cn('inline-flex items-center justify-center rounded-[2px] font-mono font-bold', compact ? 'h-3 w-2.5 text-[7px]' : 'h-4 w-3.5 text-[9px]', SEQ_STYLE[c] ?? SEQ_STYLE['-'])}>
            {compact ? '' : c === '-' ? '' : c}
          </span>
        ))}
      </span>
      {!compact && <span className="font-mono text-[10px] text-slate-400">{st.min}'</span>}
    </span>
  )
}
