import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, History, LayoutGrid, Rows3, Swords, Trash2, Users, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useMyRoster, useOwnership, usePlayerMap, useSummary } from '../store/hooks'
import { summarize } from '../lib/calc'
import { teamName } from '../lib/data'
import { beep, cn } from '../lib/utils'
import { Card, Crest, Delta, Gerarchie, PlayerLine, RoleBadge } from '../components/ui'
import { RUOLI, RUOLO_LABEL, type Formation, type Player, type Ruolo } from '../types'
import { usePairAlerts } from '../store/pairs'

export default function WarRoom() {
  return (
    <div className="space-y-4">
      <StickyBar />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Roster />
          <Feed />
        </div>
        <div className="space-y-4 xl:col-span-5">
          <PairAlerts />
          <RivalTracker />
          <HotTargets />
        </div>
      </div>
    </div>
  )
}

function StickyBar() {
  const me = useSummary('me')
  const settings = useStore((s) => s.settings)
  const plan = useStore((s) => s.plan)
  const roster = useMyRoster()
  const total = RUOLI.reduce((a, r) => a + settings.slots[r], 0)
  const pct = Math.min(100, (me.spent / settings.budget) * 100)
  const spentByRole = (r: Ruolo) => roster.filter((x) => x.player.ruolo === r).reduce((a, x) => a + x.price, 0)
  const plannedByRole = (r: Ruolo) => plan[r].reduce((a, b) => a + b, 0)
  return (
    <div className="sticky top-[57px] z-30 -mx-3 border-b border-slate-800 bg-slate-950/95 px-3 py-3 backdrop-blur">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[1.4fr_2fr_1fr_1fr]">
        <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Wallet size={13} /> Budget residuo
          </div>
          <div className="font-mono text-3xl font-black text-emerald-300">
            {me.residuo}
            <span className="text-base text-slate-500"> / {settings.budget}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800 md:col-span-2 xl:col-span-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Completamento slot</span>
            <span className="font-mono text-sm text-slate-100">
              Totale {me.count}/{total}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RUOLI.map((r) => {
              const n = me.perRuolo[r]
              const max = settings.slots[r]
              const d = spentByRole(r) - plannedByRole(r)
              return (
                <div key={r} className={cn('rounded-lg px-2 py-1.5 ring-1', n >= max ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-slate-950 ring-slate-800')}>
                  <div className="flex items-center gap-1.5">
                    <RoleBadge r={r} />
                    <span className="font-mono text-lg font-bold text-slate-100">
                      {n}/{max}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {spentByRole(r)}/{plannedByRole(r)} cr {n > 0 && <Delta value={d} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/30">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80" title="MaxBid = Residuo − (Slot vuoti − 1)">
            Max Bid
          </div>
          <div className="font-mono text-3xl font-black text-amber-300">{me.maxBid}</div>
          <div className="text-[10px] text-amber-200/60">
            {me.residuo} − ({me.slotVuoti} − 1)
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Media per slot</div>
          <div className="font-mono text-3xl font-black text-sky-300">{me.mediaSlot}</div>
          <div className="text-[10px] text-slate-500">{me.slotVuoti} slot da riempire</div>
        </div>
      </div>
    </div>
  )
}

const FORMATIONS: Record<Formation, [number, number, number]> = { '3-4-3': [3, 4, 3], '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2] }

function Roster() {
  const mode = useStore((s) => s.rosterMode)
  const setMode = useStore((s) => s.setRosterMode)
  const formation = useStore((s) => s.formation)
  const setFormation = useStore((s) => s.setFormation)
  const roster = useMyRoster()
  return (
    <Card
      title="La mia rosa"
      icon={<Users size={16} className="text-emerald-400" />}
      actions={
        <div className="flex items-center gap-2">
          {mode === 'pitch' && (
            <select value={formation} onChange={(e) => setFormation(e.target.value as Formation)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs">
              {Object.keys(FORMATIONS).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          )}
          <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-700">
            <button type="button" onClick={() => setMode('pitch')} className={cn('flex items-center gap-1 px-2 py-1 text-xs', mode === 'pitch' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400')}>
              <LayoutGrid size={13} /> Campo
            </button>
            <button type="button" onClick={() => setMode('table')} className={cn('flex items-center gap-1 px-2 py-1 text-xs', mode === 'table' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400')}>
              <Rows3 size={13} /> Tabella
            </button>
          </div>
        </div>
      }
    >
      {mode === 'pitch' ? <Pitch roster={roster} formation={formation} /> : <RosterTable roster={roster} />}
    </Card>
  )
}

type RosterItem = { player: Player; price: number }

function Pitch({ roster, formation }: { roster: RosterItem[]; formation: Formation }) {
  const [d, c, a] = FORMATIONS[formation]
  const byRole = (r: Ruolo) => roster.filter((x) => x.player.ruolo === r).sort((x, y) => y.player.qt - x.player.qt || y.price - x.price)
  const need: Record<Ruolo, number> = { P: 1, D: d, C: c, A: a }
  const lines = (['A', 'C', 'D', 'P'] as Ruolo[]).map((r) => {
    const list = byRole(r)
    return { r, starters: Array.from({ length: need[r] }, (_, i) => list[i] ?? null) }
  })
  const starterIds = new Set(lines.flatMap((l) => l.starters.filter(Boolean).map((x) => x!.player.id)))
  const bench = roster.filter((x) => !starterIds.has(x.player.id))
  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl p-4 ring-1 ring-emerald-900"
        style={{
          background: 'repeating-linear-gradient(0deg, #065f46 0 48px, #047857 48px 96px)',
        }}
      >
        <div className="pointer-events-none absolute inset-3 rounded border-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t-2 border-white/20" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-14 w-48 -translate-x-1/2 border-2 border-b-0 border-white/25" />
        <div className="relative flex flex-col gap-5 py-2">
          {lines.map((l) => (
            <div key={l.r} className="flex justify-center gap-2 sm:gap-4">
              {l.starters.map((x, i) => (
                <PitchToken key={i} item={x} r={l.r} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Panchina ({bench.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {bench.length === 0 && <span className="text-xs text-slate-600">Nessun giocatore in panchina</span>}
          {bench.map((x) => (
            <span key={x.player.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1 text-xs">
              <RoleBadge r={x.player.ruolo} className="h-4 w-4 text-[9px]" />
              <Crest slug={x.player.squadra} size={14} />
              {x.player.nome}
              <b className="font-mono text-emerald-300">{x.price}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PitchToken({ item, r }: { item: RosterItem | null; r: Ruolo }) {
  if (!item)
    return (
      <div className="flex w-20 flex-col items-center gap-1 sm:w-24">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/40 text-sm font-bold text-white/50">{r}</div>
        <div className="text-[10px] text-white/50">vuoto</div>
      </div>
    )
  const p = item.player
  return (
    <div className="flex w-20 flex-col items-center gap-0.5 sm:w-24" title={`${p.nome} · ${teamName(p.squadra)}`}>
      <div className="relative">
        <Crest slug={p.squadra} size={44} className="ring-2 ring-white/70" />
        <span className="absolute -bottom-1 -right-2 rounded bg-slate-950 px-1 font-mono text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/50">{item.price}</span>
      </div>
      <div className="w-full truncate rounded bg-slate-950/80 px-1 text-center text-[11px] font-bold text-white">{p.nome.split(' ').slice(-1)[0]}</div>
    </div>
  )
}

function RosterTable({ roster }: { roster: RosterItem[] }) {
  const plan = useStore((s) => s.plan)
  const slots = useStore((s) => s.settings.slots)
  return (
    <div className="space-y-3">
      {RUOLI.map((r) => {
        const list = roster.filter((x) => x.player.ruolo === r).sort((a, b) => b.price - a.price)
        const sub = list.reduce((a, x) => a + x.price, 0)
        const planned = plan[r].reduce((a, b) => a + b, 0)
        return (
          <div key={r} className="overflow-hidden rounded-lg ring-1 ring-slate-800">
            <div className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 text-xs">
              <span className="flex items-center gap-2 font-bold text-slate-200">
                <RoleBadge r={r} /> {RUOLO_LABEL[r]} {list.length}/{slots[r]}
              </span>
              <span className="text-slate-400">
                Subtotale <b className="font-mono text-slate-100">{sub}</b> / piano {planned} <Delta value={sub - planned} />
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: slots[r] }, (_, i) => {
                  const x = list[i]
                  const pl = plan[r][i] ?? 0
                  return (
                    <tr key={i} className="border-t border-slate-800/60">
                      <td className="w-12 px-3 py-1 font-mono text-xs text-slate-500">
                        {r}
                        {i + 1}
                      </td>
                      {x ? (
                        <>
                          <td className="py-1">
                            <span className="flex items-center gap-2">
                              <Crest slug={x.player.squadra} size={18} />
                              <span className="font-semibold">{x.player.nome}</span>
                              <Gerarchie p={x.player} />
                            </span>
                          </td>
                          <td className="w-16 text-right font-mono font-bold text-emerald-300">{x.price}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1 text-xs text-slate-600">— slot libero —</td>
                          <td className="w-16 text-right font-mono text-slate-600">–</td>
                        </>
                      )}
                      <td className="w-16 text-right font-mono text-xs text-slate-500">{pl}</td>
                      <td className="w-14 pr-3 text-right">{x ? <Delta value={x.price - pl} /> : null}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
      {/* acquisti oltre gli slot previsti */}
      {RUOLI.some((r) => roster.filter((x) => x.player.ruolo === r).length > slots[r]) && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/30">
          <AlertTriangle size={14} /> Hai più giocatori degli slot previsti in almeno un ruolo.
        </div>
      )}
    </div>
  )
}

function RivalTracker() {
  const rivals = useStore((s) => s.rivals)
  const purchases = useStore((s) => s.purchases)
  const settings = useStore((s) => s.settings)
  const setName = useStore((s) => s.setRivalName)
  const setCount = useStore((s) => s.setRivalCount)
  const buy = useStore((s) => s.buy)
  const toast = useStore((s) => s.toast)
  const map = usePlayerMap()
  const [sel, setSel] = useState(rivals[0]?.id ?? '')
  const [cost, setCost] = useState('')
  const [ruolo, setRuolo] = useState<Ruolo | ''>('')
  const costRef = useRef<HTMLInputElement>(null)
  const total = RUOLI.reduce((a, r) => a + settings.slots[r], 0)

  const rows = useMemo(() => rivals.map((r) => ({ r, s: summarize(purchases, r.id, settings, map) })), [rivals, purchases, settings, map])
  const maxDanger = Math.max(0, ...rows.map((x) => x.s.maxBid))

  const submit = () => {
    const n = parseInt(cost, 10)
    if (!sel || !Number.isFinite(n) || n < 0) return
    buy(null, sel, n, ruolo || null)
    beep('rival')
    toast(`${rivals.find((r) => r.id === sel)?.name}: −${n} crediti`, 'info')
    setCost('')
    costRef.current?.focus()
  }

  return (
    <Card
      title="Rival Tracker"
      icon={<Swords size={16} className="text-rose-400" />}
      actions={
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Rivali
          <select value={rivals.length} onChange={(e) => setCount(parseInt(e.target.value, 10))} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs">
            {[8, 9, 10, 11, 12].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mb-3 flex gap-2"
      >
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm">
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo | '')} className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-1 py-1.5 text-sm" title="Ruolo (opzionale)">
          <option value="">–</option>
          {RUOLI.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input ref={costRef} value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Costo ↵" className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono text-sm" />
        <button className="rounded-lg bg-rose-500 px-3 text-sm font-bold text-rose-950 hover:bg-rose-400">−</button>
      </form>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
            <th className="pb-1 font-semibold">Manager</th>
            <th className="pb-1 text-right font-semibold">Spesi</th>
            <th className="pb-1 text-right font-semibold">Residuo</th>
            <th className="pb-1 text-right font-semibold">Rosa</th>
            <th className="pb-1 text-right font-semibold">MaxBid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ r, s }) => (
            <tr key={r.id} className={cn('border-t border-slate-800', sel === r.id && 'bg-rose-500/5')} onClick={() => setSel(r.id)}>
              <td className="py-1 pr-2">
                <input value={r.name} onChange={(e) => setName(r.id, e.target.value)} className="w-full rounded bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-200 hover:bg-white/5 focus:bg-slate-800 focus:outline-none" />
              </td>
              <td className="text-right font-mono text-slate-400">{s.spent}</td>
              <td className="text-right font-mono font-bold text-slate-100">{s.residuo}</td>
              <td className="text-right font-mono text-xs text-slate-400">
                {s.count}/{total}
                <div className="text-[9px] text-slate-600">
                  {s.perRuolo.P}-{s.perRuolo.D}-{s.perRuolo.C}-{s.perRuolo.A}
                </div>
              </td>
              <td className={cn('text-right font-mono font-black', s.maxBid === maxDanger && maxDanger > 0 ? 'text-rose-400' : 'text-amber-300')}>{s.maxBid}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">In rosso il rivale con il MaxBid più alto: è lui che può superarti su ogni offerta.</p>
    </Card>
  )
}

function Feed() {
  const purchases = useStore((s) => s.purchases)
  const remove = useStore((s) => s.removePurchase)
  const map = usePlayerMap()
  const name = useBuyerName()
  const list = [...purchases].reverse().slice(0, 40)
  return (
    <Card title={`Cronologia asta (${purchases.length})`} icon={<History size={16} className="text-sky-400" />} actions={<span className="text-[11px] text-slate-500">Ctrl+Z annulla l'ultimo</span>}>
      {list.length === 0 && <p className="text-sm text-slate-500">Nessun acquisto registrato. Premi Ctrl+K per iniziare.</p>}
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {list.map((pu) => {
          const p = pu.playerId ? map.get(pu.playerId) : null
          return (
            <li key={pu.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-white/5">
              {p ? <RoleBadge r={p.ruolo} /> : pu.ruolo ? <RoleBadge r={pu.ruolo} /> : <span className="h-5 w-5" />}
              {p && <Crest slug={p.squadra} size={18} />}
              <span className="flex-1 truncate">{p ? p.nome : <i className="text-slate-500">spesa rapida</i>}</span>
              <span className={cn('rounded px-1.5 text-xs font-semibold', pu.buyer === 'me' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/10 text-rose-300')}>{name(pu.buyer)}</span>
              <b className="w-10 text-right font-mono">{pu.price}</b>
              <button type="button" title="Elimina" onClick={() => remove(pu.id)} className="rounded p-1 text-slate-600 hover:bg-rose-500/10 hover:text-rose-400">
                <Trash2 size={13} />
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function HotTargets() {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const openQuick = useStore((s) => s.openQuick)
  const owned = useOwnership()
  const targets = players.filter((p) => custom[p.id]?.starred && !owned.has(p.id)).sort((a, b) => b.qt - a.qt)
  return (
    <Card title={`Pupilli disponibili (${targets.length})`} icon={<span className="text-yellow-400">★</span>}>
      {targets.length === 0 && <p className="text-sm text-slate-500">Aggiungi pupilli dal Listone (stellina) o dalla vista Pupilli.</p>}
      <div className="max-h-72 overflow-y-auto">
        {targets.map((p) => (
          <PlayerLine key={p.id} p={p} onClick={() => openQuick(p.id)} right={<span className="font-mono text-xs text-slate-400">obj {custom[p.id]?.target ?? '–'}</span>} />
        ))}
      </div>
    </Card>
  )
}

function PairAlerts() {
  const alerts = usePairAlerts()
  if (alerts.length === 0) return null
  return (
    <Card title="Allarmi coppie" icon={<AlertTriangle size={16} className="text-amber-400" />}>
      <ul className="space-y-1.5">
        {alerts.map((a) => (
          <li key={a.pair.id} className={cn('rounded-lg px-3 py-2 text-xs ring-1', a.level === 'rotta' ? 'bg-rose-500/10 text-rose-200 ring-rose-500/30' : 'bg-amber-500/10 text-amber-200 ring-amber-500/30')}>
            {a.text}
          </li>
        ))}
      </ul>
    </Card>
  )
}
