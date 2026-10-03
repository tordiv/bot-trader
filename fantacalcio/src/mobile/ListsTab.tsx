import { useMemo, useState } from 'react'
import { HeartPulse, Link2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useOwnership, usePlayerMap } from '../store/hooks'
import { obiettivo, ordinaObiettivi } from '../lib/piano'
import { cn } from '../lib/utils'
import { Crest, RoleBadge, TagChips } from '../components/ui'
import { Empty, MRow, RoleFilter, Section, TargetCell } from './shared'
import { TAGS, type Player, type Ruolo, type Tag } from '../types'

type Lista = 'tutti' | Tag | 'coppie' | 'infermeria'

const LISTE: { id: Lista; label: string }[] = [{ id: 'tutti', label: 'Pupilli' }, ...TAGS.map((t) => ({ id: t.id as Lista, label: t.label })), { id: 'coppie', label: 'Coppie' }, { id: 'infermeria', label: 'Infortunati' }]

export default function ListsTab() {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const pairs = useStore((s) => s.pairs)
  const [lista, setLista] = useState<Lista>('tutti')
  const [ruolo, setRuolo] = useState<Ruolo | null>(null)

  const starred = useMemo(() => players.filter((p) => custom[p.id]?.starred), [players, custom])
  const count = (l: Lista) => (l === 'tutti' ? starred.length : l === 'coppie' ? pairs.length : l === 'infermeria' ? starred.filter((p) => p.infortunio || p.squalifica).length : starred.filter((p) => custom[p.id]?.tags?.includes(l)).length)

  return (
    <div className="space-y-3">
      <div className="sticky top-[var(--mh)] z-20 -mx-3 space-y-2 bg-slate-950/95 px-3 pt-1 pb-2 backdrop-blur">
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3">
          {LISTE.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLista(l.id)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1', lista === l.id ? 'bg-emerald-500 text-emerald-950 ring-emerald-400' : 'text-slate-300 ring-slate-700')}
            >
              {l.label} <span className="font-mono opacity-70">{count(l.id)}</span>
            </button>
          ))}
        </div>
        {lista !== 'coppie' && <RoleFilter value={ruolo} onChange={setRuolo} />}
      </div>
      {lista === 'coppie' ? <Coppie /> : <PlayerList list={starred.filter((p) => (!ruolo || p.ruolo === ruolo) && (lista === 'tutti' || (lista === 'infermeria' ? p.infortunio || p.squalifica : custom[p.id]?.tags?.includes(lista))))} infermeria={lista === 'infermeria'} />}
    </div>
  )
}

function PlayerList({ list, infermeria }: { list: Player[]; infermeria: boolean }) {
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const owned = useOwnership()
  const name = useBuyerName()
  const sorted = ordinaObiettivi(list, custom)
  const free = sorted.filter((p) => !owned.has(p.id))
  const taken = sorted.filter((p) => owned.has(p.id))
  const row = (p: Player) => {
    const o = owned.get(p.id)
    const c = custom[p.id]
    return (
      <MRow
        key={p.id}
        p={p}
        owner={o ? { purchase: o, name: name(o.buyer) } : null}
        below={
          (c?.tags?.length || c?.note) && (
            <span className="mt-1 flex items-center gap-1.5">
              <TagChips id={p.id} />
              {c?.note && <span className="truncate text-[11px] italic text-yellow-200/70">{c.note}</span>}
            </span>
          )
        }
        right={<TargetCell value={obiettivo(p, c, settings.budget)} custom={c?.target != null} />}
      />
    )
  }
  if (!list.length) return <Section title="Lista vuota"><Empty>{infermeria ? 'Nessun pupillo infortunato o squalificato.' : 'Nessun giocatore in questa lista. Usa la stellina e le etichette nella scheda giocatore.'}</Empty></Section>
  return (
    <>
      <Section title={infermeria ? <><HeartPulse size={14} className="text-rose-400" /> Liberi ({free.length})</> : `Liberi (${free.length})`}>
        {free.length ? <div className="divide-y divide-slate-800/70">{free.map(row)}</div> : <Empty>Tutti già acquistati.</Empty>}
      </Section>
      {taken.length > 0 && (
        <details className="rounded-2xl border border-slate-800 bg-slate-900/40" open={taken.length <= 6}>
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Già acquistati ({taken.length})</summary>
          <div className="divide-y divide-slate-800/70">{taken.map(row)}</div>
        </details>
      )}
    </>
  )
}

function Coppie() {
  const pairs = useStore((s) => s.pairs)
  const open = useStore((s) => s.openSheet)
  const map = usePlayerMap()
  const owned = useOwnership()
  const name = useBuyerName()
  if (!pairs.length) return <Section title="Coppie"><Empty>Nessuna coppia monitorata: si creano nella vista Pupilli della versione completa.</Empty></Section>
  return (
    <Section title={<><Link2 size={14} className="text-sky-400" /> Coppie titolare + riserva ({pairs.length})</>}>
      <ul className="divide-y divide-slate-800/70">
        {pairs.map((pr) => {
          const ps = [map.get(pr.a), map.get(pr.b)]
          if (!ps[0] || !ps[1]) return null
          const os = ps.map((p) => owned.get(p!.id))
          const mine = os.filter((o) => o?.buyer === 'me').length
          const lost = os.some((o) => o && o.buyer !== 'me')
          return (
            <li key={pr.id} className={cn('px-3 py-2', mine === 2 && 'bg-emerald-500/5', mine === 1 && !lost && 'bg-amber-500/5', lost && mine > 0 && 'bg-rose-500/5')}>
              {pr.label && <div className="mb-1 text-[11px] text-slate-500">{pr.label}</div>}
              {ps.map((p, i) => {
                const o = os[i]
                return (
                  <button key={p!.id} type="button" onClick={() => open(p!.id)} className="flex w-full items-center gap-2 py-1 text-left active:bg-white/10">
                    <RoleBadge r={p!.ruolo} />
                    <Crest slug={p!.squadra} size={20} />
                    <span className={cn('flex-1 truncate text-sm font-semibold', o && o.buyer !== 'me' ? 'text-slate-500 line-through' : 'text-slate-100')}>{p!.nome}</span>
                    <span className={cn('text-xs font-semibold', !o ? 'text-slate-500' : o.buyer === 'me' ? 'text-emerald-300' : 'text-rose-300')}>{o ? `${o.buyer === 'me' ? 'TUO' : name(o.buyer)} · ${o.price}` : 'libero'}</span>
                  </button>
                )
              })}
              {mine === 1 && !lost && <div className="text-[11px] font-semibold text-amber-300">Completa la coppia!</div>}
              {lost && mine > 0 && <div className="text-[11px] font-semibold text-rose-300">Coppia spezzata</div>}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
