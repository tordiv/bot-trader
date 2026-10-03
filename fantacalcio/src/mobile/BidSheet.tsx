import { useMemo, useState } from 'react'
import { AlertTriangle, Link2, Minus, Plus, StickyNote, Undo2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useMyRoster, useOwnership, usePlayerMap, useSummary } from '../store/hooks'
import { summarize } from '../lib/calc'
import { teamName } from '../lib/data'
import { obiettivo, statoRuolo } from '../lib/piano'
import { infortunioTesto } from '../lib/infortuni'
import { beep, celebrate, cn } from '../lib/utils'
import { Crest, Delta, Forma, Gerarchie, RoleBadge, StarButton, StatoBadge, TagChips } from '../components/ui'
import { EV_ACQUISTO, mobileBus, vibra } from './bus'
import { RUOLO_LABEL, type Player } from '../types'

/** Scheda di rilancio a comparsa dal basso: tutto quello che serve per decidere e registrare un acquisto. */
export default function BidSheet() {
  const id = useStore((s) => s.sheetId)
  const map = usePlayerMap()
  const p = id ? map.get(id) : undefined
  if (!p) return null
  // key: ogni giocatore riparte da uno stato pulito (prezzo, acquirente)
  return <Sheet key={p.id} p={p} />
}

function Sheet({ p }: { p: Player }) {
  const close = () => useStore.getState().openSheet(null)
  const custom = useStore((s) => s.custom[p.id])
  const settings = useStore((s) => s.settings)
  const plan = useStore((s) => s.plan)
  const rivals = useStore((s) => s.rivals)
  const purchases = useStore((s) => s.purchases)
  const pairs = useStore((s) => s.pairs)
  const buy = useStore((s) => s.buy)
  const removePurchase = useStore((s) => s.removePurchase)
  const setTarget = useStore((s) => s.setTarget)
  const toast = useStore((s) => s.toast)
  const owned = useOwnership()
  const map = usePlayerMap()
  const buyerName = useBuyerName()
  const me = useSummary('me')
  const roster = useMyRoster()

  const target = obiettivo(p, custom, settings.budget)
  const [price, setPrice] = useState(1)
  const [buyer, setBuyer] = useState<string>('me')
  const own = owned.get(p.id)

  const ruolo = useMemo(
    () =>
      statoRuolo(
        p.ruolo,
        plan[p.ruolo],
        roster.filter((x) => x.player.ruolo === p.ruolo).map((x) => x.price),
        settings,
      ),
    [p.ruolo, plan, roster, settings],
  )
  const sum = buyer === 'me' ? me : summarize(purchases, buyer, settings, map)
  const overMax = price > sum.maxBid
  const slotFull = sum.perRuolo[p.ruolo] >= settings.slots[p.ruolo]
  const myPairs = pairs.filter((x) => x.a === p.id || x.b === p.id)

  const set = (n: number) => setPrice(Math.max(1, Math.min(9999, Math.round(n) || 1)))

  const commit = () => {
    const pur = buy(p.id, buyer, price)
    if (!pur) {
      toast(`${p.nome} è già stato acquistato`, 'warn')
      return
    }
    const mine = buyer === 'me'
    beep(mine ? 'ok' : 'rival')
    vibra(mine ? [30, 40, 60] : 25)
    toast(`${p.nome} → ${buyerName(buyer)} a ${price}`, mine ? 'ok' : 'info')
    if (mine && (custom?.starred || me.slotVuoti <= 1)) celebrate()
    mobileBus.dispatchEvent(new Event(EV_ACQUISTO))
    close()
  }

  const annulla = () => {
    if (!own || !confirm(`Annullare l'acquisto di ${p.nome} (${buyerName(own.buyer)}, ${own.price} cr)?`)) return
    removePurchase(own.id)
    beep('undo')
    toast(`Annullato: ${p.nome}`, 'warn')
  }

  const chips: { label: string; v: number }[] = [
    { label: 'Obiettivo', v: target },
    ...(buyer === 'me' && ruolo.prossimo != null ? [{ label: 'Piano', v: ruolo.prossimo }] : []),
    { label: 'MaxBid', v: sum.maxBid },
  ].filter((c) => c.v > 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px]" onClick={close}>
      <div
        role="dialog"
        aria-label={`Scheda ${p.nome}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] flex-col rounded-t-3xl border-t border-slate-700 bg-slate-900 shadow-2xl shadow-black"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-700" />
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-2 pb-3">
          {/* intestazione */}
          <div className="flex items-start gap-3">
            <Crest slug={p.squadra} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <RoleBadge r={p.ruolo} />
                <h2 className="truncate text-xl font-black text-white">{p.nome}</h2>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                {teamName(p.squadra)} · {p.dettaglio} <StatoBadge s={p.stato} /> <Gerarchie p={p} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <Forma p={p} />
                {p.stagione && (
                  <span>
                    {p.stagione.gol}g · {p.stagione.assist}a
                  </span>
                )}
              </div>
            </div>
            <StarButton id={p.id} size={22} />
            <button type="button" onClick={close} aria-label="Chiudi" className="-mr-1 rounded-full p-1.5 text-slate-400 active:bg-white/10">
              <X size={22} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <Info k="Qt" v={p.qt} />
            <Info k="FVM" v={p.fvm} />
            <Info k={custom?.target != null ? 'Obiettivo' : 'Consigl.'} v={target} accent />
            <Info k="Età" v={p.eta ?? '–'} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <TagChips id={p.id} editable />
            {!own && price > 1 && price !== target && (
              <button type="button" onClick={() => setTarget(p.id, price)} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/40 active:bg-sky-500/20">
                Obiettivo = {price}
              </button>
            )}
          </div>

          {custom?.note && (
            <div className="flex gap-2 rounded-xl bg-yellow-500/5 px-3 py-2 text-sm text-yellow-100/90 ring-1 ring-yellow-500/20">
              <StickyNote size={15} className="mt-0.5 shrink-0 text-yellow-400" />
              <span className="whitespace-pre-wrap">{custom.note}</span>
            </div>
          )}

          {(p.infortunio || p.squalifica) && (
            <Alert tone={p.infortunio && ['lungo', 'stagione'].includes(p.infortunio.durata) ? 'red' : 'amber'}>
              {p.infortunio ? `Infortunato: ${infortunioTesto(p)}.` : ''} {p.squalifica ? 'Squalificato per la prossima giornata.' : ''}
            </Alert>
          )}

          {myPairs.map((pr) => {
            const other = map.get(pr.a === p.id ? pr.b : pr.a)
            if (!other) return null
            const o = owned.get(other.id)
            return (
              <div key={pr.id} className="flex items-center gap-2 rounded-xl bg-sky-500/5 px-3 py-2 text-sm text-sky-100 ring-1 ring-sky-500/25">
                <Link2 size={15} className="shrink-0 text-sky-400" />
                <span>
                  Coppia con <b>{other.nome}</b>
                  {o ? (
                    <span className={o.buyer === 'me' ? 'text-emerald-300' : 'text-rose-300'}>
                      {' '}
                      · {o.buyer === 'me' ? 'già tuo' : `preso da ${buyerName(o.buyer)}`} ({o.price})
                    </span>
                  ) : (
                    <span className="text-slate-400"> · ancora libero</span>
                  )}
                </span>
              </div>
            )
          })}

          {own ? (
            <div className={cn('rounded-2xl p-4 text-center ring-1', own.buyer === 'me' ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-rose-500/10 ring-rose-500/30')}>
              <div className="text-sm text-slate-300">{own.buyer === 'me' ? 'Nella tua rosa' : `Preso da ${buyerName(own.buyer)}`}</div>
              <div className="font-mono text-4xl font-black text-white">{own.price}</div>
              {own.buyer === 'me' && (
                <div className="text-xs text-slate-400">
                  rispetto all'obiettivo <Delta value={own.price - target} />
                </div>
              )}
              <button type="button" onClick={annulla} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-amber-200 ring-1 ring-amber-500/40 active:bg-amber-500/20">
                <Undo2 size={15} /> Annulla acquisto
              </button>
            </div>
          ) : (
            <>
              {/* strategia sul ruolo */}
              <div className="rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wider">
                    {RUOLO_LABEL[p.ruolo]} {ruolo.presi}/{ruolo.slot}
                  </span>
                  <span>
                    piano {ruolo.speso}/{ruolo.pianificato} cr
                  </span>
                </div>
                <div className="mt-1 text-slate-300">
                  {ruolo.prossimo == null ? (
                    <span className="text-amber-300">Slot del ruolo già completi.</span>
                  ) : (
                    <>
                      Prossimo slot da piano <b className="font-mono text-sky-300">{ruolo.prossimo}</b> · restano <b className={cn('font-mono', ruolo.residuoPiano < 0 ? 'text-rose-300' : 'text-slate-100')}>{ruolo.residuoPiano}</b> cr per {ruolo.slot - ruolo.presi} slot
                    </>
                  )}
                </div>
              </div>

              {/* prezzo */}
              <div className="flex items-stretch gap-2">
                <StepBtn onClick={() => set(price - 1)} label="Meno 1">
                  <Minus size={26} />
                </StepBtn>
                <input
                  aria-label="Prezzo"
                  inputMode="numeric"
                  value={price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPrice(Math.min(9999, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))}
                  onBlur={() => set(price)}
                  className={cn('min-w-0 flex-1 rounded-2xl border-2 bg-slate-950 text-center font-mono text-5xl font-black outline-none', overMax ? 'border-rose-500 text-rose-300' : 'border-emerald-500/60 text-emerald-300')}
                />
                <StepBtn onClick={() => set(price + 1)} label="Più 1">
                  <Plus size={26} />
                </StepBtn>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 25].map((n) => (
                  <button key={n} type="button" onClick={() => set(price + n)} className="rounded-xl bg-slate-800 py-2.5 font-mono text-base font-bold text-slate-100 active:bg-slate-700">
                    +{n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {chips.map((c) => (
                  <button key={c.label} type="button" onClick={() => set(c.v)} className="flex-1 rounded-xl px-2 py-1.5 text-xs text-slate-400 ring-1 ring-slate-700 active:bg-white/10">
                    {c.label} <b className="font-mono text-sm text-slate-100">{c.v}</b>
                  </button>
                ))}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn('h-full transition-all', price <= target ? 'bg-emerald-500' : price <= target * 1.25 ? 'bg-amber-500' : 'bg-rose-500')}
                  style={{ width: `${Math.min(100, (price / Math.max(1, target * 1.5)) * 100)}%` }}
                />
              </div>

            </>
          )}
        </div>

        {!own && (
          <div className="shrink-0 space-y-2 border-t border-slate-800 bg-slate-900 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4" role="radiogroup" aria-label="Chi lo prende">
              <button
                type="button"
                role="radio"
                aria-checked={buyer === 'me'}
                onClick={() => setBuyer('me')}
                className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-black ring-1', buyer === 'me' ? 'bg-emerald-500 text-emerald-950 ring-emerald-400' : 'text-emerald-300 ring-emerald-500/40')}
              >
                Io
              </button>
              {rivals.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={buyer === r.id}
                  onClick={() => setBuyer(r.id)}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ring-1', buyer === r.id ? 'bg-rose-500 text-rose-950 ring-rose-400' : 'text-slate-300 ring-slate-700')}
                >
                  {r.name}
                </button>
              ))}
            </div>
            {(overMax || slotFull) && (
              <div className="flex items-center gap-1.5 text-xs text-rose-300">
                <AlertTriangle size={13} className="shrink-0" />
                {overMax ? `Oltre il MaxBid (${sum.maxBid}) di ${buyerName(buyer)}` : `Slot ${p.ruolo} già completi per ${buyerName(buyer)}`}: puoi comunque confermare.
              </div>
            )}
            <button
              type="button"
              onClick={commit}
              className={cn('w-full rounded-2xl py-3.5 text-lg leading-tight font-black uppercase tracking-wide active:scale-[0.99]', buyer === 'me' ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950')}
            >
              {buyer === 'me' ? `Preso a ${price}!` : `${buyerName(buyer)} a ${price}`}
              <span className="block text-[11px] font-semibold tracking-normal normal-case opacity-75">
                {buyerName(buyer)} · residuo {sum.residuo} → {sum.residuo - price} · MaxBid {sum.maxBid}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ k, v, accent }: { k: string; v: number | string; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl px-1 py-1.5 ring-1', accent ? 'bg-sky-500/10 ring-sky-500/30' : 'bg-slate-950/60 ring-slate-800')}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className={cn('font-mono text-lg font-black', accent ? 'text-sky-300' : 'text-slate-100')}>{v}</div>
    </div>
  )
}

function StepBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-100 active:bg-slate-700">
      {children}
    </button>
  )
}

function Alert({ tone, children }: { tone: 'red' | 'amber'; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-sm ring-1', tone === 'red' ? 'bg-rose-500/10 text-rose-200 ring-rose-500/40' : 'bg-amber-500/10 text-amber-200 ring-amber-500/30')}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
