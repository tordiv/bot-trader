import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { fuzzyScore } from '../lib/calc'
import { teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { Crest, RoleBadge } from './ui'
import type { Player } from '../types'

export default function PlayerPicker({ value, onChange, placeholder, filter }: { value: Player | null; onChange: (p: Player | null) => void; placeholder: string; filter?: (p: Player) => boolean }) {
  const players = useStore((s) => s.players)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const results = useMemo(() => {
    if (!q.trim()) return []
    return players
      .filter((p) => !filter || filter(p))
      .map((p) => ({ p, s: Math.max(fuzzyScore(q, p.nome), fuzzyScore(q, `${p.nome} ${teamName(p.squadra)}`)) }))
      .filter((x) => x.s > 1)
      .sort((a, b) => b.s - a.s)
      .slice(0, 7)
      .map((x) => x.p)
  }, [q, players, filter])

  if (value)
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-1.5 text-sm">
        <RoleBadge r={value.ruolo} />
        <Crest slug={value.squadra} size={18} />
        <span className="flex-1 truncate font-semibold">{value.nome}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-slate-400 hover:text-white">
          cambia
        </button>
      </div>
    )
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => (setQ(e.target.value), setOpen(true), setHi(0))}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHi((h) => Math.min(results.length - 1, h + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHi((h) => Math.max(0, h - 1))
          } else if (e.key === 'Enter' && results[hi]) {
            e.preventDefault()
            onChange(results[hi])
            setQ('')
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {results.map((p, i) => (
            <li key={p.id} onMouseDown={() => (onChange(p), setQ(''))} className={cn('flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm', i === hi ? 'bg-emerald-500/15' : 'hover:bg-white/5')}>
              <RoleBadge r={p.ruolo} />
              <Crest slug={p.squadra} size={16} />
              <span className="flex-1 truncate">{p.nome}</span>
              <span className="text-xs text-slate-500">{teamName(p.squadra)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
