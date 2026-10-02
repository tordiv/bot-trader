import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Search, X, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useBuyerName, useOwnership, usePlayerMap } from '../store/hooks'
import { fuzzyScore, prezzoConsigliato, summarize } from '../lib/calc'
import { teamName } from '../lib/data'
import { beep, celebrate, cn } from '../lib/utils'
import { infortunioTesto } from '../lib/infortuni'
import { Crest, Delta, Disponibilita, Forma, Gerarchie, Kbd, RoleBadge, StatoBadge } from './ui'
import type { Player } from '../types'

export default function QuickModal() {
  const open = useStore((s) => s.quickOpen)
  const preset = useStore((s) => s.quickPreset)
  const close = useStore((s) => s.closeQuick)
  const players = useStore((s) => s.players)
  const rivals = useStore((s) => s.rivals)
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const purchases = useStore((s) => s.purchases)
  const buy = useStore((s) => s.buy)
  const toast = useStore((s) => s.toast)
  const owned = useOwnership()
  const map = usePlayerMap()
  const buyerName = useBuyerName()

  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const [selected, setSelected] = useState<Player | null>(null)
  const [buyerMode, setBuyerMode] = useState<'me' | 'rival'>('me')
  const [rivalId, setRivalId] = useState<string>(rivals[0]?.id ?? '')
  const [price, setPrice] = useState('1')
  const searchRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const p = preset ? map.get(preset) ?? null : null
    setSelected(p)
    setQuery('')
    setHi(0)
    setPrice('1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset])

  useEffect(() => {
    if (!rivals.some((r) => r.id === rivalId)) setRivalId(rivals[0]?.id ?? '')
  }, [rivals, rivalId])

  const results = useMemo(() => {
    if (!open) return []
    const q = query.trim()
    const avail = players.filter((p) => !owned.has(p.id))
    if (!q) return avail.filter((p) => custom[p.id]?.starred).slice(0, 8).concat(avail.filter((p) => !custom[p.id]?.starred).slice(0, 8)).slice(0, 8)
    return avail
      .map((p) => ({ p, s: Math.max(fuzzyScore(q, p.nome) * 1.2, fuzzyScore(q, `${p.nome} ${teamName(p.squadra)}`), fuzzyScore(q, teamName(p.squadra)) * 0.6) }))
      .filter((x) => x.s > 1)
      .map((x) => ({ p: x.p, s: x.s + x.p.qt / 20 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.p)
  }, [open, query, players, owned, custom])

  if (!open) return null

  const buyer = buyerMode === 'me' ? 'me' : rivalId
  const sum = summarize(purchases, buyer, settings, map)
  const priceNum = Math.max(0, parseInt(price || '0', 10) || 0)
  const target = selected ? custom[selected.id]?.target ?? prezzoConsigliato(selected, settings.budget) : null
  const overMax = priceNum > sum.maxBid
  const slotFull = selected ? sum.perRuolo[selected.ruolo] >= settings.slots[selected.ruolo] : false

  const pick = (p: Player) => {
    setSelected(p)
    setPrice('1')
  }

  const commit = () => {
    if (!selected) return
    const pur = buy(selected.id, buyer, priceNum)
    if (!pur) {
      toast(`${selected.nome} è già stato acquistato`, 'warn')
      return
    }
    beep(buyer === 'me' ? 'ok' : 'rival')
    toast(`${selected.nome} → ${buyerName(buyer)} a ${priceNum}`, buyer === 'me' ? 'ok' : 'info')
    if (buyer === 'me') {
      const c = custom[selected.id]
      const willComplete = sum.count + 1 >= Object.values(settings.slots).reduce((a, b) => a + b, 0)
      if (c?.starred || c?.tags?.includes('must') || willComplete) celebrate()
    }
    close()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (selected && !preset) {
        setSelected(null)
      } else close()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      setBuyerMode((m) => (m === 'me' ? 'rival' : 'me'))
      return
    }
    if (e.altKey && /^Digit\d$/.test(e.code)) {
      e.preventDefault()
      const n = parseInt(e.code.slice(5), 10)
      if (n === 0) setBuyerMode('me')
      else if (rivals[n - 1]) {
        setBuyerMode('rival')
        setRivalId(rivals[n - 1].id)
      }
      return
    }
    if (!selected) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHi((h) => Math.min(results.length - 1, h + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHi((h) => Math.max(0, h - 1))
      } else if (e.key === 'Enter' && results[hi]) {
        e.preventDefault()
        pick(results[hi])
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'ArrowUp' && document.activeElement === priceRef.current) {
      e.preventDefault()
      setPrice(String(priceNum + 1))
    } else if (e.key === 'ArrowDown' && document.activeElement === priceRef.current) {
      e.preventDefault()
      setPrice(String(Math.max(1, priceNum - 1)))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={close}>
      <div role="dialog" aria-label="Acquisto rapido" onKeyDown={onKey} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-emerald-500/10">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300">
            <Zap size={16} /> Acquisto rapido
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBuyerMode('me')}
              className={cn('rounded-l-lg px-3 py-1.5 text-xs font-bold', buyerMode === 'me' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-800 text-slate-400')}
            >
              Io
            </button>
            <button
              type="button"
              onClick={() => setBuyerMode('rival')}
              className={cn('rounded-r-lg px-3 py-1.5 text-xs font-bold', buyerMode === 'rival' ? 'bg-rose-500 text-rose-950' : 'bg-slate-800 text-slate-400')}
            >
              Rivale
            </button>
            {buyerMode === 'rival' && (
              <select value={rivalId} onChange={(e) => setRivalId(e.target.value)} className="ml-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100">
                {rivals.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    {i + 1}. {r.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={close} className="ml-2 rounded p-1 text-slate-400 hover:bg-white/10" aria-label="Chiudi">
              <X size={16} />
            </button>
          </div>
        </div>

        {!selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-slate-800 px-4">
              <Search size={18} className="text-slate-500" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => (setQuery(e.target.value), setHi(0))}
                placeholder="Cerca giocatore o squadra… (es. lautaro, mctom, como)"
                className="w-full bg-transparent py-3 text-lg text-slate-100 outline-none placeholder:text-slate-600"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Nessun giocatore disponibile trovato</li>}
              {results.map((p, i) => (
                <li
                  key={p.id}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(p)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', i === hi ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : 'hover:bg-white/5')}
                >
                  <RoleBadge r={p.ruolo} />
                  <Crest slug={p.squadra} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-100">{p.nome}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {teamName(p.squadra)} <StatoBadge s={p.stato} /> <Gerarchie p={p} /> <Disponibilita p={p} /> <Forma p={p} compact />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-slate-200">Qt {p.qt}</div>
                    <div className="text-[10px] text-slate-500">obiettivo {custom[p.id]?.target ?? prezzoConsigliato(p, settings.budget)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <RoleBadge r={selected.ruolo} className="h-7 w-7 text-sm" />
              <Crest slug={selected.squadra} size={40} />
              <div className="flex-1">
                <div className="text-xl font-black text-white">{selected.nome}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {teamName(selected.squadra)} · {selected.dettaglio} <StatoBadge s={selected.stato} /> <Gerarchie p={selected} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Forma p={selected} />
                  {selected.stagione && (
                    <span className="text-[11px] text-slate-500">
                      {selected.stagione.gol} gol · {selected.stagione.assist} assist
                    </span>
                  )}
                </div>
              </div>
              {!preset && (
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">
                  Cambia
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prezzo</span>
                <input
                  ref={priceRef}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                  className={cn('w-full rounded-xl border bg-slate-950 px-3 py-2 text-center font-mono text-3xl font-black outline-none', overMax ? 'border-rose-500 text-rose-300' : 'border-emerald-500/50 text-emerald-300')}
                />
              </label>
              <div className="rounded-xl bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Obiettivo</div>
                <div className="font-mono text-2xl font-bold text-slate-100">{target}</div>
                <div className="text-xs">
                  Delta <Delta value={priceNum - (target ?? 0)} />
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{buyerName(buyer)}</div>
                <div className="font-mono text-2xl font-bold text-slate-100">
                  {sum.residuo}
                  <span className="text-sm text-slate-500"> cr</span>
                </div>
                <div className="text-xs text-slate-400">
                  MaxBid <span className="font-mono font-bold text-amber-300">{sum.maxBid}</span>
                </div>
              </div>
            </div>
            {target != null && (
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={cn('h-full transition-all', priceNum <= target ? 'bg-emerald-500' : priceNum <= target * 1.25 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.min(100, (priceNum / Math.max(1, target * 1.5)) * 100)}%` }} />
              </div>
            )}
            {(selected.infortunio || selected.squalifica) && (
              <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1', selected.infortunio && ['lungo', 'stagione'].includes(selected.infortunio.durata) ? 'bg-rose-500/15 text-rose-200 ring-rose-500/40' : 'bg-amber-500/10 text-amber-200 ring-amber-500/30')}>
                <AlertTriangle size={16} />
                <span>
                  {selected.infortunio ? `Infortunato: ${infortunioTesto(selected)}.` : ''} {selected.squalifica ? 'Squalificato per la prossima giornata.' : ''}
                </span>
              </div>
            )}
            {(overMax || slotFull) && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/30">
                <AlertTriangle size={16} />
                {overMax ? `Oltre il MaxBid (${sum.maxBid}) di ${buyerName(buyer)}.` : `Slot ${selected.ruolo} già completi per ${buyerName(buyer)}.`} Puoi comunque confermare.
              </div>
            )}
            <button type="button" onClick={commit} className={cn('w-full rounded-xl py-3 text-lg font-black uppercase tracking-wide', buyerMode === 'me' ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : 'bg-rose-500 text-rose-950 hover:bg-rose-400')}>
              Conferma per {priceNum} → {buyerName(buyer)}
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 bg-slate-950/60 px-4 py-2 text-[11px] text-slate-500">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> naviga/prezzo
          </span>
          <span>
            <Kbd>Invio</Kbd> seleziona/conferma
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Tab</Kbd> <ArrowLeftRight size={11} /> Io / Rivale
          </span>
          <span>
            <Kbd>Alt+1…9</Kbd> rivale N · <Kbd>Alt+0</Kbd> Io
          </span>
          <span>
            <Kbd>Esc</Kbd> indietro
          </span>
        </div>
      </div>
    </div>
  )
}
