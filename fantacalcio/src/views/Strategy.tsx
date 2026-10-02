import { useMemo, useState } from 'react'
import { Calculator, RefreshCw, Settings2, ShieldCheck, Wand2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useMyRoster, useOwnership } from '../store/hooks'
import { MOD_SOGLIE, mediaModificatore, modificatore } from '../lib/calc'
import { teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { Card, Crest, Delta, Disponibilita, Gerarchie, RoleBadge, StarButton } from '../components/ui'
import { RUOLI, RUOLO_LABEL, type Player, type Ruolo } from '../types'

const RANGE: Record<Ruolo, [number, number]> = { P: [7, 8], D: [18, 20], C: [28, 30], A: [42, 45] }

export default function Strategy() {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-7">
        <SettingsCard />
        <SlotGrid />
      </div>
      <div className="space-y-4 xl:col-span-5">
        <ModEngine />
        <DefenderBoards />
      </div>
    </div>
  )
}

function NumInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  return <input inputMode="numeric" value={value} onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))} className={cn('w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-sm outline-none focus:border-emerald-500', className)} />
}

function SettingsCard() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const regenerate = useStore((s) => s.regeneratePlan)
  const splitTot = RUOLI.reduce((a, r) => a + settings.split[r], 0)
  return (
    <Card title="Impostazioni lega & ripartizione" icon={<Settings2 size={16} className="text-emerald-400" />}>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-slate-400">
          Crediti
          <NumInput value={settings.budget} onChange={(n) => setSettings({ budget: Math.max(25, n) })} className="mt-1 block w-24" />
        </label>
        {RUOLI.map((r) => (
          <label key={r} className="text-xs text-slate-400">
            Slot {r}
            <NumInput value={settings.slots[r]} onChange={(n) => setSettings({ slots: { ...settings.slots, [r]: Math.max(1, Math.min(15, n)) } })} className="mt-1 block w-16" />
          </label>
        ))}
        <span className="pb-1.5 text-xs text-slate-500">
          Rosa {settings.slots.P}-{settings.slots.D}-{settings.slots.C}-{settings.slots.A} = {RUOLI.reduce((a, r) => a + settings.slots[r], 0)} giocatori
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {RUOLI.map((r) => {
          const v = settings.split[r]
          const [lo, hi] = RANGE[r]
          const ok = v >= lo && v <= hi
          return (
            <div key={r} className="rounded-lg bg-slate-950/60 p-3 ring-1 ring-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <RoleBadge r={r} /> {RUOLO_LABEL[r]}
                </span>
                <span className={cn('text-[10px]', ok ? 'text-emerald-400' : 'text-amber-400')}>
                  ideale {lo}–{hi}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input type="range" min={1} max={70} value={v} onChange={(e) => setSettings({ split: { ...settings.split, [r]: parseInt(e.target.value, 10) } })} className="flex-1 accent-emerald-500" />
                <span className="w-10 text-right font-mono text-sm font-bold">{v}%</span>
              </div>
              <div className="text-[11px] text-slate-500">≈ {Math.round((settings.budget * v) / 100)} crediti</div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={cn('text-xs font-semibold', splitTot === 100 ? 'text-emerald-400' : 'text-rose-400')}>Totale ripartizione: {splitTot}% {splitTot !== 100 && '(deve fare 100%)'}</span>
        <button type="button" onClick={regenerate} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400">
          <Wand2 size={14} /> Rigenera piano slot
        </button>
      </div>
    </Card>
  )
}

function SlotGrid() {
  const plan = useStore((s) => s.plan)
  const settings = useStore((s) => s.settings)
  const setSlot = useStore((s) => s.setPlanSlot)
  const roster = useMyRoster()
  const plannedTot = RUOLI.reduce((a, r) => a + plan[r].reduce((x, y) => x + y, 0), 0)
  const spentTot = roster.reduce((a, x) => a + x.price, 0)
  return (
    <Card
      title="Piano slot per slot"
      icon={<RefreshCw size={16} className="text-sky-400" />}
      actions={
        <span className="text-xs text-slate-400">
          Pianificato <b className={cn('font-mono', plannedTot === settings.budget ? 'text-emerald-300' : 'text-amber-300')}>{plannedTot}</b>/{settings.budget} · Speso <b className="font-mono text-slate-100">{spentTot}</b>
        </span>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {RUOLI.map((r) => {
          const mine = roster.filter((x) => x.player.ruolo === r).sort((a, b) => b.price - a.price)
          const rolePlan = plan[r].reduce((a, b) => a + b, 0)
          const roleSpent = mine.reduce((a, x) => a + x.price, 0)
          return (
            <div key={r} className="rounded-lg bg-slate-950/60 ring-1 ring-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-bold">
                  <RoleBadge r={r} /> {RUOLO_LABEL[r]}
                </span>
                <span className="font-mono text-slate-400">
                  {roleSpent}/{rolePlan} <Delta value={roleSpent - rolePlan} />
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500">
                    <th className="px-2 py-1 text-left font-semibold">Slot</th>
                    <th className="text-right font-semibold">Piano</th>
                    <th className="text-right font-semibold">Reale</th>
                    <th className="px-2 text-right font-semibold">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {plan[r].map((v, i) => {
                    const real = mine[i]
                    return (
                      <tr key={i} className="border-t border-slate-800/60" title={real ? real.player.nome : undefined}>
                        <td className="px-2 py-1 font-mono text-slate-400">
                          {r}
                          {i + 1}
                          {real && <span className="ml-1 font-sans text-[10px] text-slate-500">{real.player.nome.split(' ').slice(-1)[0]}</span>}
                        </td>
                        <td className="text-right">
                          <NumInput value={v} onChange={(n) => setSlot(r, i, n)} className="w-12 px-1 py-0.5 text-xs" />
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-300">{real ? real.price : '–'}</td>
                        <td className="px-2 text-right">{real ? <Delta value={real.price - v} /> : null}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Gli acquisti reali vengono assegnati agli slot in ordine di prezzo (il più caro va nello slot 1). Δ positivo = hai speso più del previsto.</p>
    </Card>
  )
}

function ModEngine() {
  const roster = useMyRoster()
  const [votes, setVotes] = useState([6.5, 6.5, 6.0, 6.0])
  const media = votes.reduce((a, b) => a + b, 0) / 4
  const bonus = modificatore(media)

  // proiezione sulla mia rosa con le medie voto stimate
  const gk = roster.filter((x) => x.player.ruolo === 'P').map((x) => x.player.mvStimata ?? 6).sort((a, b) => b - a)[0] ?? null
  const ds = roster.filter((x) => x.player.ruolo === 'D').map((x) => x.player.mvStimata ?? 6)
  const proj = mediaModificatore(gk, ds)

  return (
    <Card title="Modificatore di difesa (Classic)" icon={<ShieldCheck size={16} className="text-emerald-400" />}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500">
            <th className="pb-1 text-left font-semibold">Media (P + 3 migliori D)</th>
            <th className="pb-1 text-right font-semibold">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {MOD_SOGLIE.slice()
            .reverse()
            .map((s) => (
              <tr key={s.label} className={cn('border-t border-slate-800', bonus === s.bonus && 'bg-emerald-500/15')}>
                <td className="py-1 font-mono">{s.label}</td>
                <td className="text-right font-mono font-black text-emerald-300">+{s.bonus}</td>
              </tr>
            ))}
          <tr className={cn('border-t border-slate-800 text-slate-500', bonus === 0 && 'bg-rose-500/10')}>
            <td className="py-1 font-mono">&lt; 6,00</td>
            <td className="text-right font-mono">0</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-slate-500">Si attiva schierando almeno 4 difensori: conta la media voto del portiere e dei 3 migliori difensori.</p>

      <div className="mt-4 rounded-lg bg-slate-950/60 p-3 ring-1 ring-slate-800">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Calculator size={13} /> Simulatore
        </div>
        {['Portiere', 'Difensore 1', 'Difensore 2', 'Difensore 3'].map((l, i) => (
          <label key={l} className="flex items-center gap-2 py-0.5 text-xs text-slate-400">
            <span className="w-20">{l}</span>
            <input type="range" min={4} max={8.5} step={0.25} value={votes[i]} onChange={(e) => setVotes(votes.map((v, k) => (k === i ? parseFloat(e.target.value) : v)))} className="flex-1 accent-emerald-500" />
            <span className="w-10 text-right font-mono text-slate-100">{votes[i].toFixed(2)}</span>
          </label>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
          <span className="text-sm">
            Media <b className="font-mono">{media.toFixed(2)}</b>
          </span>
          <span className={cn('rounded-lg px-3 py-1 font-mono text-lg font-black', bonus > 0 ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-800 text-slate-400')}>+{bonus}</span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-950/60 p-3 text-sm ring-1 ring-slate-800">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Proiezione sulla mia rosa</div>
        {proj == null ? (
          <p className="mt-1 text-xs text-slate-500">Servono almeno 1 portiere e 4 difensori in rosa (attuali: {gk == null ? 0 : 1} P, {ds.length} D).</p>
        ) : (
          <p className="mt-1">
            Media stimata <b className="font-mono">{proj.toFixed(2)}</b> → bonus atteso <b className="font-mono text-emerald-300">+{modificatore(proj)}</b> a giornata
          </p>
        )}
      </div>
    </Card>
  )
}

function DefenderBoards() {
  const players = useStore((s) => s.players)
  const owned = useOwnership()
  const [onlyFree, setOnlyFree] = useState(true)
  const { centrali, terzini, portieri } = useMemo(() => {
    const free = (p: Player) => !onlyFree || !owned.has(p.id)
    const ds = players.filter((p) => p.ruolo === 'D' && free(p))
    return {
      centrali: ds.filter((p) => p.dettaglio === 'Difensore centrale' && (p.mvStimata ?? 0) >= 6.2).sort((a, b) => (b.mvStimata ?? 0) - (a.mvStimata ?? 0) || b.qt - a.qt).slice(0, 18),
      terzini: ds
        .filter((p) => p.dettaglio === 'Terzino / Esterno' && p.stato !== 'riserva')
        .sort((a, b) => bonusScore(b) - bonusScore(a))
        .slice(0, 18),
      portieri: players.filter((p) => p.ruolo === 'P' && p.stato === 'titolare' && free(p)).sort((a, b) => (b.mvStimata ?? 0) - (a.mvStimata ?? 0)).slice(0, 8),
    }
  }, [players, owned, onlyFree])

  return (
    <Card
      title="Centrali da modificatore vs esterni da bonus"
      icon={<ShieldCheck size={16} className="text-sky-400" />}
      actions={
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> solo liberi
        </label>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">Centrali MV ≥ 6,20</div>
          {centrali.map((p) => (
            <DefRow key={p.id} p={p} right={<span className="font-mono text-xs font-bold text-emerald-300">{p.mvStimata?.toFixed(2)}</span>} />
          ))}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-fuchsia-300">Terzini / esterni da bonus</div>
          {terzini.map((p) => (
            <DefRow key={p.id} p={p} right={<span className="font-mono text-[10px] text-fuchsia-300">{p.golCarriera}g/{p.presenzeCarriera}</span>} />
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">Portieri titolari per MV stimata</div>
        <div className="grid gap-x-3 sm:grid-cols-2">
          {portieri.map((p) => (
            <DefRow key={p.id} p={p} right={<span className="font-mono text-xs text-amber-300">{p.mvStimata?.toFixed(2)}</span>} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">MV stimata pre-stagione (forza squadra, ruolo, gerarchie). Importa un file con colonna "Mv" dal Listone per usare le medie reali.</p>
    </Card>
  )
}

function bonusScore(p: Player) {
  const goalRate = p.presenzeCarriera > 20 ? p.golCarriera / p.presenzeCarriera : 0
  return p.qt + goalRate * 60 + (p.punizioni ? 3 : 0) + (p.corner ? 3 : 0) + (p.rigorista ? 4 : 0)
}

function DefRow({ p, right }: { p: Player; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-slate-800/50 py-1 text-xs" title={`${p.nome} · ${teamName(p.squadra)} · ${p.dettaglio}`}>
      <StarButton id={p.id} size={12} />
      <Crest slug={p.squadra} size={16} />
      <span className="flex-1 truncate font-semibold text-slate-200">{p.nome}</span>
      <Disponibilita p={p} />
      <Gerarchie p={p} />
      <span className="w-6 text-right font-mono text-slate-500">{p.qt}</span>
      {right}
    </div>
  )
}
