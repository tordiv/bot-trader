import { useMemo, useState } from 'react'
import { CalendarRange, Grid3x3, ShieldPlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useMyRoster, useOwnership, useBuyerName } from '../store/hooks'
import { GK_MATRIX, TEAMS, TEAM_BY_SLUG, bestPartners, gkColor, teamName } from '../lib/data'
import { cn } from '../lib/utils'
import { Card, Crest, StarButton, StatoBadge } from '../components/ui'

export default function GoalkeeperGrid() {
  const roster = useMyRoster()
  const myGkTeams = useMemo(() => [...new Set(roster.filter((x) => x.player.ruolo === 'P').map((x) => x.player.squadra))], [roster])
  const lastGk = myGkTeams[myGkTeams.length - 1] ?? null
  const [sel, setSel] = useState<string | null>(lastGk)
  const [partner, setPartner] = useState<string | null>(null)
  const [seenGk, setSeenGk] = useState(lastGk)
  // quando acquisto un portiere la griglia si posiziona sulla sua squadra
  if (seenGk !== lastGk) {
    setSeenGk(lastGk)
    if (lastGk) {
      setSel(lastGk)
      setPartner(null)
    }
  }

  const partners = sel ? bestPartners(sel, 5) : []
  const partnerSet = new Set(partners.map((p) => p.slug))
  const effPartner = partner ?? partners[0]?.slug ?? null

  return (
    <div className="grid gap-4 2xl:grid-cols-12">
      <div className="2xl:col-span-8">
        <Card
          title="Griglia portieri · alternanza casa/trasferta 2026/27"
          icon={<Grid3x3 size={16} className="text-emerald-400" />}
          actions={
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-emerald-200">0–4 ottimale</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">5–8 medio</span>
              <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-rose-200">9+ scontro</span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0.5 text-[11px]">
              <thead>
                <tr>
                  <th />
                  {TEAMS.map((t) => (
                    <th key={t.slug} className={cn('px-0.5 pb-1', (t.slug === sel || t.slug === effPartner) && 'rounded-t bg-white/10')}>
                      <button type="button" onClick={() => setSel(t.slug)} title={t.nome}>
                        <Crest slug={t.slug} size={22} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEAMS.map((r) => (
                  <tr key={r.slug}>
                    <th className={cn('whitespace-nowrap pr-2 text-left', r.slug === sel && 'text-emerald-300')}>
                      <button type="button" onClick={() => (setSel(r.slug), setPartner(null))} className="flex items-center gap-1.5 font-semibold">
                        <Crest slug={r.slug} size={18} />
                        <span className="w-20 truncate">{r.nome}</span>
                        {myGkTeams.includes(r.slug) && <span className="rounded bg-emerald-500 px-1 text-[9px] font-black text-emerald-950">MIO</span>}
                      </button>
                    </th>
                    {TEAMS.map((c) => {
                      const v = GK_MATRIX[r.slug]?.[c.slug]
                      const inSel = r.slug === sel || c.slug === sel
                      const best = sel && ((r.slug === sel && partnerSet.has(c.slug)) || (c.slug === sel && partnerSet.has(r.slug)))
                      return (
                        <td key={c.slug} className="p-0">
                          <button
                            type="button"
                            disabled={v == null}
                            onClick={() => (setSel(r.slug), setPartner(c.slug))}
                            title={v == null ? '' : `${r.nome} + ${c.nome}: ${v}`}
                            className={cn(
                              'h-7 w-8 rounded font-mono font-bold transition',
                              gkColor(v),
                              sel && !inSel && 'opacity-35',
                              best && 'ring-2 ring-emerald-300',
                              r.slug === sel && c.slug === effPartner && 'ring-2 ring-white',
                            )}
                          >
                            {v == null ? '' : Math.round(v)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Coefficiente 0–10 calcolato sul calendario ufficiale: giornate in cui i due portieri giocano entrambi in casa o entrambi fuori (peggio se fuori contro big), più gli scontri diretti. Più è basso, più la coppia si alterna.
          </p>
        </Card>
      </div>
      <div className="space-y-4 2xl:col-span-4">
        <PartnerPanel sel={sel} partners={partners} onPick={setPartner} active={effPartner} />
        {sel && effPartner && <CalendarStrip a={sel} b={effPartner} />}
      </div>
    </div>
  )
}

function PartnerPanel({ sel, partners, onPick, active }: { sel: string | null; partners: { slug: string; score: number }[]; onPick: (s: string) => void; active: string | null }) {
  const players = useStore((s) => s.players)
  const openQuick = useStore((s) => s.openQuick)
  const owned = useOwnership()
  const name = useBuyerName()
  if (!sel) return <Card title="Seleziona una squadra">Clicca una riga della griglia o acquista un portiere: la griglia evidenzierà i partner ideali.</Card>
  const gks = (slug: string) => players.filter((p) => p.ruolo === 'P' && p.squadra === slug).sort((a, b) => b.qt - a.qt)
  return (
    <Card title={`Partner ideali per ${teamName(sel)}`} icon={<ShieldPlus size={16} className="text-emerald-400" />}>
      <div className="mb-3">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Portieri {teamName(sel)} (blocco / secondi)</div>
        {gks(sel).map((p) => {
          const o = owned.get(p.id)
          return (
            <div key={p.id} className={cn('flex items-center gap-2 py-0.5 text-xs', o && 'opacity-50')}>
              <StarButton id={p.id} size={12} />
              <button type="button" disabled={!!o} onClick={() => openQuick(p.id)} className="flex-1 truncate text-left font-semibold">
                {p.nome}
              </button>
              <StatoBadge s={p.stato} />
              <span className="w-6 text-right font-mono text-slate-400">{p.qt}</span>
              {o && <span className="text-[10px] text-rose-300">{name(o.buyer)}</span>}
            </div>
          )
        })}
      </div>
      <div className="space-y-2">
        {partners.map((pt, i) => (
          <div key={pt.slug} className={cn('rounded-lg p-2 ring-1', pt.slug === active ? 'bg-emerald-500/10 ring-emerald-500/50' : 'bg-slate-950/50 ring-slate-800')}>
            <button type="button" onClick={() => onPick(pt.slug)} className="flex w-full items-center gap-2 text-sm font-bold">
              <span className="text-slate-500">#{i + 1}</span>
              <Crest slug={pt.slug} size={20} />
              <span className="flex-1 text-left">{teamName(pt.slug)}</span>
              <span className={cn('rounded px-1.5 font-mono', gkColor(pt.score))}>{pt.score.toFixed(1)}</span>
            </button>
            <div className="mt-1 pl-6">
              {gks(pt.slug)
                .slice(0, 3)
                .map((p) => {
                  const o = owned.get(p.id)
                  return (
                    <div key={p.id} className={cn('flex items-center gap-2 text-xs', o && 'line-through opacity-40')}>
                      <button type="button" disabled={!!o} onClick={() => openQuick(p.id)} className="flex-1 truncate text-left text-slate-300 hover:text-white">
                        {p.nome}
                      </button>
                      <span className="text-[10px] text-slate-500">{p.stato}</span>
                      <span className="w-6 text-right font-mono text-slate-400">{p.qt}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CalendarStrip({ a, b }: { a: string; b: string }) {
  const ta = TEAM_BY_SLUG.get(a)!
  const tb = TEAM_BY_SLUG.get(b)!
  const alt = ta.calendario.filter((g, i) => g.campo !== tb.calendario[i].campo).length
  return (
    <Card title={`Calendario ${ta.nome} + ${tb.nome}`} icon={<CalendarRange size={16} className="text-sky-400" />}>
      <div className="mb-2 text-xs text-slate-400">
        Alternanza in <b className="text-emerald-300">{alt}</b>/38 giornate
      </div>
      <div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-0.5">
        {ta.calendario.map((g, i) => {
          const gb = tb.calendario[i]
          const ok = g.campo !== gb.campo
          return (
            <div key={g.g} title={`G${g.g}: ${ta.nome} ${g.campo === 'C' ? 'in casa' : 'fuori'} vs ${teamName(g.avversario)} · ${tb.nome} ${gb.campo === 'C' ? 'in casa' : 'fuori'} vs ${teamName(gb.avversario)}`} className={cn('rounded py-0.5 text-center text-[9px] leading-tight', ok ? 'bg-emerald-500/25 text-emerald-100' : 'bg-rose-500/25 text-rose-100')}>
              <div className="text-slate-400">{g.g}</div>
              <div className="font-bold">{g.campo}</div>
              <div className="font-bold">{gb.campo}</div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Riga 1: {ta.nome} · Riga 2: {tb.nome} (C = casa, T = trasferta). Verde = alternanza garantita.</p>
    </Card>
  )
}
