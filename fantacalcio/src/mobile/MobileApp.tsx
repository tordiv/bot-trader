import { useLayoutEffect, useRef, useState } from 'react'
import { Gavel, Monitor, MoreVertical, PieChart, Search, Star, Undo2, Users } from 'lucide-react'
import { useStore, type MobileTab } from '../store/useStore'
import { useSummary } from '../store/hooks'
import { annullaUltimo } from '../store/actions'
import { cn } from '../lib/utils'
import Toasts from '../components/Toasts'
import BidSheet from './BidSheet'
import AuctionTab from './AuctionTab'
import ListsTab from './ListsTab'
import PlanTab from './PlanTab'
import RosterTab from './RosterTab'
import { EV_CERCA, mobileBus } from './bus'
import { RUOLI } from '../types'

const TABS: { id: MobileTab; label: string; icon: typeof Gavel }[] = [
  { id: 'asta', label: 'Asta', icon: Gavel },
  { id: 'liste', label: 'Liste', icon: Star },
  { id: 'piano', label: 'Piano', icon: PieChart },
  { id: 'rosa', label: 'Rosa', icon: Users },
]

/** Versione per telefono: pensata per l'asta dal vivo, con i propri acquisti e le liste preparate in primo piano. */
export default function MobileApp() {
  const tab = useStore((s) => s.mobileTab)
  const setTab = useStore((s) => s.setMobileTab)
  const headerRef = useRef<HTMLElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // altezza della barra in alto, per agganciare sotto di essa le barre di ricerca/filtri
  useLayoutEffect(() => {
    const h = headerRef.current
    const root = rootRef.current
    if (!h || !root) return
    const ro = new ResizeObserver(() => root.style.setProperty('--mh', `${h.offsetHeight}px`))
    ro.observe(h)
    return () => ro.disconnect()
  }, [])

  const cerca = () => {
    setTab('asta')
    // la scheda Asta potrebbe non essere ancora montata
    requestAnimationFrame(() => mobileBus.dispatchEvent(new Event(EV_CERCA)))
  }

  return (
    <div ref={rootRef} className="min-h-dvh bg-slate-950 text-slate-200 [--mh:96px]">
      <Header ref={headerRef} />
      <main className="px-3 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {tab === 'asta' && <AuctionTab onUndo={annullaUltimo} />}
        {tab === 'liste' && <ListsTab />}
        {tab === 'piano' && <PlanTab />}
        {tab === 'rosa' && <RosterTab />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-5 items-end">
          {TABS.slice(0, 2).map((t) => (
            <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
          <div className="flex justify-center">
            <button type="button" onClick={cerca} aria-label="Cerca giocatore all'asta" className="-mt-5 mb-1.5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30 ring-4 ring-slate-950 active:scale-95">
              <Search size={26} strokeWidth={2.75} />
            </button>
          </div>
          {TABS.slice(2).map((t) => (
            <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>
      </nav>
      <BidSheet />
      <Toasts compact className="left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] items-stretch" />
    </div>
  )
}

function TabBtn({ t, active, onClick }: { t: (typeof TABS)[number]; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', active ? 'text-emerald-300' : 'text-slate-500')}>
      <t.icon size={22} />
      {t.label}
    </button>
  )
}

function Header({ ref }: { ref: React.Ref<HTMLElement> }) {
  const me = useSummary('me')
  const settings = useStore((s) => s.settings)
  const hasPurchases = useStore((s) => s.purchases.length > 0)
  const setLayout = useStore((s) => s.setLayout)
  const [menu, setMenu] = useState(false)
  const total = RUOLI.reduce((a, r) => a + settings.slots[r], 0)
  return (
    <header ref={ref} className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur">
      <div className="flex items-end gap-3">
        <div className="leading-none">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Residuo</div>
          <div className="font-mono text-3xl font-black text-emerald-300">
            {me.residuo}
            <span className="text-sm font-bold text-slate-600">/{settings.budget}</span>
          </div>
        </div>
        <div className="leading-none">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">MaxBid</div>
          <div className="font-mono text-3xl font-black text-amber-300">{me.maxBid}</div>
        </div>
        <div className="leading-none">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Media</div>
          <div className="font-mono text-2xl font-black text-sky-300">{me.mediaSlot}</div>
        </div>
        <div className="ml-auto flex items-center self-center">
          <button type="button" disabled={!hasPurchases} onClick={annullaUltimo} aria-label="Annulla ultimo acquisto" className="rounded-full p-2 text-amber-200 active:bg-white/10 disabled:opacity-30">
            <Undo2 size={20} />
          </button>
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu} className="rounded-full p-2 text-slate-400 active:bg-white/10">
              <MoreVertical size={20} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute top-full right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
                  <button type="button" onClick={() => setLayout('desktop')} className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-slate-200 active:bg-white/10">
                    <Monitor size={16} /> Versione completa
                  </button>
                  <p className="border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500">Piano, coppie, note e import si preparano nella versione completa; i dati sono gli stessi.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {RUOLI.map((r) => {
          const n = me.perRuolo[r]
          const max = settings.slots[r]
          return (
            <div key={r} className={cn('rounded-lg py-1 text-center ring-1', n >= max ? 'bg-emerald-500/15 ring-emerald-500/40' : 'bg-slate-900 ring-slate-800')}>
              <span className="text-[10px] font-black text-slate-500">{r} </span>
              <span className={cn('font-mono text-sm font-bold', n >= max ? 'text-emerald-300' : 'text-slate-100')}>
                {n}/{max}
              </span>
            </div>
          )
        })}
        <div className="rounded-lg bg-slate-900 py-1 text-center ring-1 ring-slate-800">
          <span className="text-[10px] font-black text-slate-500">Tot </span>
          <span className="font-mono text-sm font-bold text-slate-100">
            {me.count}/{total}
          </span>
        </div>
      </div>
    </header>
  )
}
