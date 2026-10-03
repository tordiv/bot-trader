import { useMemo } from 'react'
import { Grid3x3, PieChart } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useMyRoster, useOwnership, useSummary } from '../store/hooks'
import { statoRuolo } from '../lib/piano'
import { bestPartners, teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { Crest, Delta, RoleBadge } from '../components/ui'
import { MRow, Section } from './shared'
import { RUOLI, RUOLO_LABEL } from '../types'

export default function PlanTab() {
  const settings = useStore((s) => s.settings)
  const plan = useStore((s) => s.plan)
  const roster = useMyRoster()
  const me = useSummary('me')
  const plannedTot = RUOLI.reduce((a, r) => a + plan[r].reduce((x, y) => x + y, 0), 0)

  return (
    <div className="space-y-3">
      <Section title={<><PieChart size={14} className="text-sky-400" /> Budget</>}>
        <div className="grid grid-cols-3 gap-2 p-3 text-center">
          <Big k="Speso" v={me.spent} sub={`piano ${plannedTot}`} />
          <Big k="Residuo" v={me.residuo} tone="text-emerald-300" sub={`su ${settings.budget}`} />
          <Big k="Media slot" v={me.mediaSlot} tone="text-sky-300" sub={`${me.slotVuoti} da riempire`} />
        </div>
        <div className="space-y-1.5 px-3 pb-3">
          {RUOLI.map((r) => {
            const spent = roster.filter((x) => x.player.ruolo === r).reduce((a, x) => a + x.price, 0)
            const planned = plan[r].reduce((a, b) => a + b, 0)
            return (
              <div key={r} className="flex items-center gap-2 text-xs">
                <RoleBadge r={r} />
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="absolute inset-y-0 left-0 bg-slate-600" style={{ width: `${(planned / settings.budget) * 100}%` }} />
                  <div className={cn('absolute inset-y-0 left-0', spent > planned ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, (spent / settings.budget) * 100)}%` }} />
                </div>
                <span className="w-16 text-right font-mono text-slate-300">
                  {spent}/{planned}
                </span>
              </div>
            )
          })}
          <p className="pt-1 text-[11px] text-slate-500">Grigio = piano ({settings.split.P}/{settings.split.D}/{settings.split.C}/{settings.split.A}%), colore = speso.</p>
        </div>
      </Section>

      {RUOLI.map((r) => {
        const mine = roster.filter((x) => x.player.ruolo === r).sort((a, b) => b.price - a.price)
        const st = statoRuolo(r, plan[r], mine.map((x) => x.price), settings)
        const liberi = st.slot - st.presi
        return (
          <Section
            key={r}
            title={
              <>
                <RoleBadge r={r} /> {RUOLO_LABEL[r]} {st.presi}/{st.slot}
              </>
            }
            right={
              <span className="font-mono text-xs text-slate-400">
                {st.speso}/{st.pianificato} {st.presi > 0 && <Delta value={st.speso - plan[r].slice(0, st.presi).reduce((a, b) => a + b, 0)} />}
              </span>
            }
          >
            {liberi > 0 && (
              <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
                Restano <b className={cn('font-mono', st.residuoPiano < 0 ? 'text-rose-300' : 'text-slate-100')}>{st.residuoPiano}</b> cr di piano per {liberi} slot · media <b className="font-mono text-sky-300">{Math.max(0, Math.round(st.residuoPiano / liberi))}</b>
              </div>
            )}
            <ol className="divide-y divide-slate-800/60">
              {plan[r].map((v, i) => {
                const real = mine[i]
                return (
                  <li key={i} className={cn('flex items-center gap-2 px-3 py-1.5 text-sm', real ? 'text-slate-100' : 'text-slate-500')}>
                    <span className="w-7 font-mono text-[11px] text-slate-500">
                      {r}
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{real ? real.player.nome : <i className="text-slate-600">da prendere</i>}</span>
                    <span className="w-9 text-right font-mono text-xs text-slate-500">{v}</span>
                    <span className="w-9 text-right font-mono font-bold text-emerald-300">{real ? real.price : ''}</span>
                    <span className="w-9 text-right">{real ? <Delta value={real.price - v} /> : null}</span>
                  </li>
                )
              })}
            </ol>
          </Section>
        )
      })}

      <GkPartners />
      <p className="px-1 text-center text-[11px] text-slate-500">Il piano si modifica nella vista Strategia della versione completa: gli acquisti occupano gli slot in ordine di prezzo.</p>
    </div>
  )
}

/** Portieri da affiancare a quelli già presi, per alternanza casa/trasferta. */
function GkPartners() {
  const roster = useMyRoster()
  const players = useStore((s) => s.players)
  const owned = useOwnership()
  const gks = roster.filter((x) => x.player.ruolo === 'P')
  const suggestions = useMemo(() => {
    if (!gks.length) return []
    const mine = new Set(gks.map((g) => g.player.squadra))
    return bestPartners(gks[0].player.squadra, 8)
      .filter((t) => !mine.has(t.slug))
      .slice(0, 4)
      .map((t) => ({ ...t, gk: players.filter((p) => p.ruolo === 'P' && p.squadra === t.slug && !owned.has(p.id)).sort((a, b) => (a.stato === 'titolare' ? -1 : 0) - (b.stato === 'titolare' ? -1 : 0) || b.qt - a.qt)[0] }))
      .filter((t) => t.gk)
  }, [gks, players, owned])
  return (
    <Section title={<><Grid3x3 size={14} className="text-amber-400" /> Griglia portieri</>}>
      {!gks.length ? (
        <p className="px-3 py-3 text-sm text-slate-500">Prendi il primo portiere: qui compariranno i partner migliori per alternanza casa/trasferta.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            Partner per <Crest slug={gks[0].player.squadra} size={18} /> <b className="text-slate-200">{teamName(gks[0].player.squadra)}</b> (coefficiente più basso = alternanza migliore)
          </div>
          <div className="divide-y divide-slate-800/70">
            {suggestions.map((s) => (
              <MRow
                key={s.slug}
                p={s.gk!}
                right={
                  <span className="shrink-0 text-right leading-tight">
                    <span className="block font-mono text-lg font-black text-emerald-300">{s.score}</span>
                    <span className="block text-[10px] uppercase text-slate-500">coeff.</span>
                  </span>
                }
              />
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

function Big({ k, v, sub, tone = 'text-slate-100' }: { k: string; v: number; sub: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 py-2 ring-1 ring-slate-800">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
      <div className={cn('font-mono text-2xl font-black', tone)}>{v}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  )
}
