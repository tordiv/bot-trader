import { useMemo, useState } from 'react'
import { HeartPulse, Link2, Plus, Shuffle, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useOwnership, usePlayerMap } from '../store/hooks'
import { prezzoConsigliato } from '../lib/calc'
import { TEAMS } from '../lib/data'
import { cn } from '../lib/utils'
import { infortunioTesto } from '../lib/infortuni'
import { Card, Crest, Disponibilita, Forma, Gerarchie, RoleBadge, StarButton, StatoBadge, TagChips } from '../components/ui'
import PlayerPicker from '../components/PlayerPicker'
import { DURATA_LABEL, RUOLI, TAGS, type Durata, type Player, type Tag } from '../types'
import { usePairAlerts } from '../store/pairs'

export default function Watchlist() {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-8">
        <Boards />
        <Ballottaggi />
      </div>
      <div className="space-y-4 xl:col-span-4">
        <Infermeria />
        <Pairs />
      </div>
    </div>
  )
}

function Boards() {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const setTarget = useStore((s) => s.setTarget)
  const openQuick = useStore((s) => s.openQuick)
  const owned = useOwnership()
  const name = useBuyerName()
  const starred = players.filter((p) => custom[p.id]?.starred)
  const columns: { id: Tag | 'none'; label: string; color: string }[] = [...TAGS.map((t) => ({ id: t.id as Tag | 'none', label: t.label, color: t.color })), { id: 'none', label: 'Pupilli senza etichetta', color: 'bg-slate-500/10 text-slate-300 ring-slate-500/30' }]
  return (
    <Card title={`Pupilli (${starred.length})`} icon={<span className="text-yellow-400">★</span>}>
      {starred.length === 0 && <p className="mb-3 text-sm text-slate-500">Nessun pupillo: usa la stellina nel Listone o nel Rival feed. Le etichette si assegnano qui sotto.</p>}
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {columns.map((col) => {
          const list = starred.filter((p) => (col.id === 'none' ? !(custom[p.id]?.tags?.length) : custom[p.id]?.tags?.includes(col.id))).sort((a, b) => RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo) || b.qt - a.qt)
          return (
            <div key={col.id} className="rounded-lg bg-slate-950/50 ring-1 ring-slate-800">
              <div className={cn('rounded-t-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1', col.color)}>
                {col.label} ({list.length})
              </div>
              <ul className="max-h-[420px] space-y-1 overflow-y-auto p-2">
                {list.map((p) => {
                  const o = owned.get(p.id)
                  return (
                    <li key={p.id} className={cn('rounded-md bg-slate-900 p-2 ring-1 ring-slate-800', o && 'opacity-50')}>
                      <div className="flex items-center gap-1.5">
                        <RoleBadge r={p.ruolo} />
                        <Crest slug={p.squadra} size={16} />
                        <button type="button" onClick={() => !o && openQuick(p.id)} className={cn('flex-1 truncate text-left text-sm font-semibold', o && 'line-through')}>
                          {p.nome}
                        </button>
                        <StarButton id={p.id} size={14} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <TagChips id={p.id} editable />
                        {o ? (
                          <span className="text-[10px] text-rose-300">
                            {name(o.buyer)} · {o.price}
                          </span>
                        ) : (
                          <label className="flex items-center gap-1 text-[10px] text-slate-500">
                            obj
                            <input
                              value={custom[p.id]?.target ?? ''}
                              placeholder={String(prezzoConsigliato(p, settings.budget))}
                              onChange={(e) => setTarget(p.id, e.target.value ? parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 : null)}
                              className="w-10 rounded bg-slate-800 px-1 text-right font-mono text-xs text-slate-100"
                            />
                          </label>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Ballottaggi() {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const owned = useOwnership()
  const [team, setTeam] = useState<string>('tutte')
  const [onlyStar, setOnlyStar] = useState(false)
  const list = players.filter((p) => p.stato === 'ballottaggio' && (team === 'tutte' || p.squadra === team) && (!onlyStar || custom[p.id]?.starred))
  const byTeam = TEAMS.map((t) => ({ t, list: list.filter((p) => p.squadra === t.slug) })).filter((x) => x.list.length)
  return (
    <Card
      title="Ballottaggi"
      icon={<Shuffle size={16} className="text-amber-400" />}
      actions={
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 text-slate-400">
            <input type="checkbox" checked={onlyStar} onChange={(e) => setOnlyStar(e.target.checked)} /> solo pupilli
          </label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5">
            <option value="tutte">Tutte le squadre</option>
            {TEAMS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {byTeam.map(({ t, list }) => {
          const starters = players.filter((p) => p.squadra === t.slug && p.stato === 'titolare')
          return (
            <div key={t.slug} className="rounded-lg bg-slate-950/50 p-2 ring-1 ring-slate-800">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                <Crest slug={t.slug} size={20} /> {t.nome}
              </div>
              {list.map((p) => {
                // il titolare con cui si gioca il posto: stesso ruolo, quotazione più vicina
                const rival = starters.filter((s) => s.ruolo === p.ruolo).sort((a, b) => Math.abs(a.qt - p.qt) - Math.abs(b.qt - p.qt))[0]
                return (
                  <div key={p.id} className={cn('flex items-center gap-1.5 py-0.5 text-xs', owned.has(p.id) && 'line-through opacity-40')}>
                    <StarButton id={p.id} size={12} />
                    <RoleBadge r={p.ruolo} className="h-4 w-4 text-[9px]" />
                    <span className="font-semibold text-slate-200">{p.nome}</span>
                    <Disponibilita p={p} />
                    {rival && <span className="truncate text-slate-500">vs {rival.nome}</span>}
                    <span className="ml-auto">
                      <Forma p={p} compact />
                    </span>
                    <span className="w-5 text-right font-mono text-slate-400">{p.qt}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Pairs() {
  const pairs = useStore((s) => s.pairs)
  const players = useStore((s) => s.players)
  const addPair = useStore((s) => s.addPair)
  const removePair = useStore((s) => s.removePair)
  const owned = useOwnership()
  const map = usePlayerMap()
  const name = useBuyerName()
  const alerts = usePairAlerts()
  const alertById = new Map(alerts.map((a) => [a.pair.id, a]))
  const [a, setA] = useState<Player | null>(null)
  const [b, setB] = useState<Player | null>(null)

  // suggerimenti: portiere titolare + secondo della stessa squadra, e titolare + ballottaggio nello stesso ruolo
  const suggestions = useMemo(() => {
    const out: { a: Player; b: Player; why: string }[] = []
    for (const t of TEAMS) {
      const gks = players.filter((p) => p.squadra === t.slug && p.ruolo === 'P').sort((x, y) => y.qt - x.qt)
      if (gks.length >= 2 && gks[0].stato === 'titolare') out.push({ a: gks[0], b: gks[1], why: 'Blocco portieri' })
    }
    for (const p of players.filter((x) => x.stato === 'ballottaggio' && x.ruolo !== 'P' && x.qt >= 7)) {
      const st = players.filter((s) => s.squadra === p.squadra && s.ruolo === p.ruolo && s.stato === 'titolare').sort((x, y) => Math.abs(x.qt - p.qt) - Math.abs(y.qt - p.qt))[0]
      if (st) out.push({ a: st, b: p, why: 'Titolare + alternativa' })
    }
    return out.filter((s) => !pairs.some((pp) => (pp.a === s.a.id && pp.b === s.b.id) || (pp.a === s.b.id && pp.b === s.a.id))).slice(0, 14)
  }, [players, pairs])

  const status = (id: string) => {
    const o = owned.get(id)
    if (!o) return <span className="text-[10px] text-emerald-400">libero</span>
    return <span className={cn('text-[10px] font-bold', o.buyer === 'me' ? 'text-emerald-300' : 'text-rose-300')}>{o.buyer === 'me' ? `MIO · ${o.price}` : `${name(o.buyer)} · ${o.price}`}</span>
  }

  return (
    <>
      <Card title="Coppie monitorate" icon={<Link2 size={16} className="text-sky-400" />}>
        <div className="space-y-2">
          <PlayerPicker value={a} onChange={setA} placeholder="Titolare (es. Svilar)" />
          <PlayerPicker value={b} onChange={setB} placeholder="Riserva diretta / partner" filter={a ? (p) => p.id !== a.id : undefined} />
          <button
            type="button"
            disabled={!a || !b}
            onClick={() => {
              if (a && b) addPair(a.id, b.id)
              setA(null)
              setB(null)
            }}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-sky-500 py-1.5 text-sm font-bold text-sky-950 disabled:opacity-30"
          >
            <Plus size={14} /> Crea coppia
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {pairs.length === 0 && <li className="text-sm text-slate-500">Nessuna coppia. Usa i suggerimenti qui sotto.</li>}
          {pairs.map((pr) => {
            const pa = map.get(pr.a)
            const pb = map.get(pr.b)
            if (!pa || !pb) return null
            const al = alertById.get(pr.id)
            return (
              <li key={pr.id} className={cn('rounded-lg p-2 ring-1', al?.level === 'rotta' ? 'bg-rose-500/10 ring-rose-500/40' : al?.level === 'completa' ? 'bg-amber-500/10 ring-amber-500/40' : 'bg-slate-950/50 ring-slate-800')}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    {[pa, pb].map((p, i) => (
                      <div key={p.id} className="flex items-center gap-1.5 text-sm">
                        <span className="w-3 text-[10px] text-slate-500">{i === 0 ? 'T' : 'R'}</span>
                        <RoleBadge r={p.ruolo} className="h-4 w-4 text-[9px]" />
                        <Crest slug={p.squadra} size={16} />
                        <span className="flex-1 truncate font-semibold">{p.nome}</span>
                        {status(p.id)}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => removePair(pr.id)} className="rounded p-1 text-slate-600 hover:text-rose-400" title="Rimuovi coppia">
                    <Trash2 size={13} />
                  </button>
                </div>
                {al && <div className={cn('mt-1.5 rounded px-2 py-1 text-[11px] font-semibold', al.level === 'rotta' ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/20 text-amber-200')}>{al.text}</div>}
              </li>
            )
          })}
        </ul>
      </Card>
      <Card title="Coppie suggerite" icon={<Sparkles size={16} className="text-fuchsia-400" />}>
        <ul className="space-y-1">
          {suggestions.map((s) => (
            <li key={s.a.id + s.b.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-white/5">
              <Crest slug={s.a.squadra} size={16} />
              <span className="flex-1 truncate">
                <b>{s.a.nome}</b> + {s.b.nome} <span className="text-slate-500">· {s.why}</span>
              </span>
              <Gerarchie p={s.b} />
              <StatoBadge s={s.b.stato} />
              <button type="button" onClick={() => addPair(s.a.id, s.b.id, s.why)} className="rounded bg-slate-800 p-1 text-sky-300 hover:bg-sky-500/20" title="Monitora">
                <Plus size={12} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

const DURATE: Durata[] = ['breve', 'medio', 'lungo', 'stagione']
const DURATA_COLOR: Record<Durata, string> = { breve: 'text-yellow-300', medio: 'text-orange-300', lungo: 'text-rose-300', stagione: 'text-rose-200' }

/** Indisponibili raggruppati per durata dello stop. */
function Infermeria() {
  const players = useStore((s) => s.players)
  const owned = useOwnership()
  const [soloRilevanti, setSoloRilevanti] = useState(true)
  const ko = players.filter((p) => (p.infortunio || p.squalifica) && (!soloRilevanti || p.stato !== 'riserva' || p.qt >= 5))
  return (
    <Card
      title={`Infermeria (${ko.length})`}
      icon={<HeartPulse size={16} className="text-rose-400" />}
      actions={
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input type="checkbox" checked={soloRilevanti} onChange={(e) => setSoloRilevanti(e.target.checked)} /> solo rilevanti
        </label>
      }
    >
      <div className="max-h-[520px] space-y-3 overflow-y-auto">
        {DURATE.map((d) => {
          const list = ko.filter((p) => p.infortunio?.durata === d).sort((a, b) => b.qt - a.qt)
          if (!list.length) return null
          return (
            <div key={d}>
              <div className={cn('mb-1 text-[11px] font-bold uppercase tracking-wider', DURATA_COLOR[d])}>
                {DURATA_LABEL[d]} · {list.length}
              </div>
              {list.map((p) => (
                <div key={p.id} title={infortunioTesto(p)} className={cn('flex items-center gap-1.5 py-0.5 text-xs', owned.has(p.id) && 'opacity-40')}>
                  <RoleBadge r={p.ruolo} className="h-4 w-4 text-[9px]" />
                  <Crest slug={p.squadra} size={14} />
                  <span className="flex-1 truncate font-semibold text-slate-200">{p.nome}</span>
                  <span className="truncate text-[10px] text-slate-500">{p.infortunio!.tipo}</span>
                  <Disponibilita p={p} />
                  <span className="w-5 text-right font-mono text-slate-400">{p.qt}</span>
                </div>
              ))}
            </div>
          )
        })}
        {ko.some((p) => p.squalifica && !p.infortunio) && (
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-300">Squalificati</div>
            {ko
              .filter((p) => p.squalifica && !p.infortunio)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 py-0.5 text-xs">
                  <RoleBadge r={p.ruolo} className="h-4 w-4 text-[9px]" />
                  <Crest slug={p.squadra} size={14} />
                  <span className="flex-1 truncate font-semibold text-slate-200">{p.nome}</span>
                  <Disponibilita p={p} />
                </div>
              ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Rientro dalla fonte o, se mancante, stimato dal tipo di infortunio (~). Le giornate saltate sono contate sul calendario.</p>
    </Card>
  )
}
