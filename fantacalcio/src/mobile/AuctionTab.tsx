import { useEffect, useMemo, useRef, useState } from 'react'
import { History, Search, Star, Undo2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useOwnership, usePlayerMap, useSummary } from '../store/hooks'
import { cercaGiocatori } from '../lib/ricerca'
import { obiettivo, ordinaObiettivi } from '../lib/piano'
import { teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { RoleBadge, TagChips } from '../components/ui'
import { EV_ACQUISTO, EV_CERCA, mobileBus } from './bus'
import { Empty, MRow, RoleFilter, Section, TargetCell } from './shared'
import type { Ruolo } from '../types'

export default function AuctionTab({ onUndo }: { onUndo: () => void }) {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const owned = useOwnership()
  const name = useBuyerName()
  const me = useSummary('me')
  const [q, setQ] = useState('')
  const [ruolo, setRuolo] = useState<Ruolo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focus = () => inputRef.current?.focus()
    const clear = () => setQ('')
    mobileBus.addEventListener(EV_CERCA, focus)
    mobileBus.addEventListener(EV_ACQUISTO, clear)
    return () => {
      mobileBus.removeEventListener(EV_CERCA, focus)
      mobileBus.removeEventListener(EV_ACQUISTO, clear)
    }
  }, [])

  const results = useMemo(() => cercaGiocatori(ruolo ? players.filter((p) => p.ruolo === ruolo) : players, q, 30), [players, q, ruolo])

  // obiettivi: pupilli ancora liberi, prima i ruoli che devo ancora completare
  const targets = useMemo(() => {
    const free = players.filter((p) => custom[p.id]?.starred && !owned.has(p.id) && (!ruolo || p.ruolo === ruolo))
    const full = (r: Ruolo) => me.perRuolo[r] >= settings.slots[r]
    const sorted = ordinaObiettivi(free, custom)
    return { open: sorted.filter((p) => !full(p.ruolo)), full: sorted.filter((p) => full(p.ruolo)) }
  }, [players, custom, owned, ruolo, me.perRuolo, settings.slots])

  const owner = (id: string) => {
    const o = owned.get(id)
    return o ? { purchase: o, name: name(o.buyer) } : null
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[var(--mh)] z-20 -mx-3 space-y-2 bg-slate-950/95 px-3 pt-1 pb-2 backdrop-blur">
        <label className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 ring-1 ring-slate-700 focus-within:ring-emerald-500">
          <Search size={20} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                ;(e.target as HTMLInputElement).blur()
                useStore.getState().openSheet(results[0].id)
              }
            }}
            placeholder="Chi è all'asta? (nome o squadra)"
            className="w-full bg-transparent py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" aria-label="Svuota ricerca" onClick={() => (setQ(''), inputRef.current?.focus())} className="rounded-full p-1 text-slate-400 active:bg-white/10">
              <X size={18} />
            </button>
          )}
        </label>
        <RoleFilter
          value={ruolo}
          onChange={setRuolo}
          extra={(r) => (
            <span className={cn('font-mono text-[10px] font-semibold', me.perRuolo[r] >= settings.slots[r] ? 'text-emerald-500' : 'opacity-60')}>
              {me.perRuolo[r]}/{settings.slots[r]}
            </span>
          )}
        />
      </div>

      {q.trim() ? (
        <Section title={`Risultati (${results.length})`}>
          {results.length === 0 ? (
            <Empty>Nessun giocatore trovato</Empty>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {results.map((p) => (
                <MRow key={p.id} p={p} owner={owner(p.id)} right={<TargetCell value={obiettivo(p, custom[p.id], settings.budget)} custom={custom[p.id]?.target != null} />} />
              ))}
            </div>
          )}
        </Section>
      ) : (
        <>
          <Section
            title={
              <>
                <Star size={14} className="fill-yellow-400 text-yellow-400" /> I miei obiettivi liberi ({targets.open.length})
              </>
            }
          >
            {targets.open.length === 0 ? (
              <Empty>{targets.full.length ? 'Ruoli dei tuoi pupilli rimasti già completi.' : 'Nessun pupillo libero: aggiungili con la stellina dalla scheda giocatore o dal Listone.'}</Empty>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {targets.open.map((p) => (
                  <MRow
                    key={p.id}
                    p={p}
                    below={custom[p.id]?.tags?.length ? <span className="mt-1 block"><TagChips id={p.id} /></span> : undefined}
                    right={<TargetCell value={obiettivo(p, custom[p.id], settings.budget)} custom={custom[p.id]?.target != null} />}
                  />
                ))}
              </div>
            )}
          </Section>
          {targets.full.length > 0 && (
            <details className="rounded-2xl border border-slate-800 bg-slate-900/40">
              <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Pupilli di ruoli già completi ({targets.full.length})</summary>
              <div className="divide-y divide-slate-800/70">
                {targets.full.map((p) => (
                  <MRow key={p.id} p={p} right={<TargetCell value={obiettivo(p, custom[p.id], settings.budget)} custom={custom[p.id]?.target != null} />} />
                ))}
              </div>
            </details>
          )}
          <Feed onUndo={onUndo} />
        </>
      )}
    </div>
  )
}

function Feed({ onUndo }: { onUndo: () => void }) {
  const purchases = useStore((s) => s.purchases)
  const open = useStore((s) => s.openSheet)
  const map = usePlayerMap()
  const name = useBuyerName()
  const last = purchases.slice(-8).reverse()
  return (
    <Section
      title={
        <>
          <History size={14} className="text-sky-400" /> Ultimi acquisti ({purchases.length})
        </>
      }
      right={
        purchases.length > 0 && (
          <button type="button" onClick={onUndo} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40 active:bg-amber-500/20">
            <Undo2 size={13} /> Annulla ultimo
          </button>
        )
      }
    >
      {last.length === 0 ? (
        <Empty>Ancora nessun acquisto registrato.</Empty>
      ) : (
        <ul className="divide-y divide-slate-800/70">
          {last.map((pur) => {
            const p = pur.playerId ? map.get(pur.playerId) : null
            const mine = pur.buyer === 'me'
            return (
              <li key={pur.id}>
                <button type="button" disabled={!p} onClick={() => p && open(p.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-white/10">
                  {p ? <RoleBadge r={p.ruolo} /> : pur.ruolo ? <RoleBadge r={pur.ruolo} /> : <span className="h-5 w-5" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">{p ? p.nome : 'Spesa rapida'}</span>
                    <span className="block truncate text-[11px] text-slate-500">{p ? teamName(p.squadra) : ''}</span>
                  </span>
                  <span className={cn('max-w-28 truncate text-xs font-semibold', mine ? 'text-emerald-300' : 'text-rose-300')}>{name(pur.buyer)}</span>
                  <span className="w-10 text-right font-mono text-base font-black text-slate-100">{pur.price}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
