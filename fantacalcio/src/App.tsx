import { useEffect } from 'react'
import { Database, Gavel, Grid3x3, Heart, PieChart, Smartphone, Zap } from 'lucide-react'
import { useStore } from './store/useStore'
import { useSummary } from './store/hooks'
import { annullaUltimo } from './store/actions'
import { cn, isTyping } from './lib/utils'
import { Kbd } from './components/ui'
import QuickModal from './components/QuickModal'
import Toasts from './components/Toasts'
import MobileApp from './mobile/MobileApp'
import { useIsMobile } from './mobile/useIsMobile'
import WarRoom from './views/WarRoom'
import Strategy from './views/Strategy'
import Watchlist from './views/Watchlist'
import GoalkeeperGrid from './views/GoalkeeperGrid'
import Listone from './views/Listone'
import type { View } from './types'

const NAV: { id: View; label: string; short: string; icon: typeof Gavel }[] = [
  { id: 'war', label: 'Asta Live', short: 'War Room', icon: Gavel },
  { id: 'strategy', label: 'Strategia & Budget', short: 'Strategia', icon: PieChart },
  { id: 'watch', label: 'Pupilli, Ballottaggi & Coppie', short: 'Pupilli', icon: Heart },
  { id: 'gk', label: 'Griglia Portieri', short: 'Portieri', icon: Grid3x3 },
  { id: 'listone', label: 'Listone & Import', short: 'Listone', icon: Database },
]

export default function App() {
  const layout = useStore((s) => s.layout)
  const small = useIsMobile()
  const mobile = layout === 'mobile' || (layout === 'auto' && small)
  return mobile ? <MobileApp /> : <DesktopApp />
}

function DesktopApp() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const openQuick = useStore((s) => s.openQuick)
  const setLayout = useStore((s) => s.setLayout)
  const quickOpen = useStore((s) => s.quickOpen)
  const me = useSummary('me')
  const slots = useStore((s) => s.settings.slots)
  const total = slots.P + slots.D + slots.C + slots.A

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (st.quickOpen) st.closeQuick()
        else st.openQuick()
        return
      }
      if (st.quickOpen) return
      // Ctrl+Z: annulla l'ultimo acquisto (nei campi di testo resta l'undo nativo)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTyping(e)) {
        e.preventDefault()
        annullaUltimo()
        return
      }
      const digit = /^Digit([1-5])$/.exec(e.code)
      if (digit && !e.ctrlKey && !e.metaKey && (e.altKey || !isTyping(e))) {
        e.preventDefault()
        st.setView(NAV[parseInt(digit[1], 10) - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2">
          <div className="flex items-center gap-2 pr-2">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
            <div className="hidden leading-tight xl:block">
              <div className="text-sm font-black tracking-tight text-white">FANTA WAR ROOM</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Serie A 2026/27 · Classic</div>
            </div>
          </div>
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                  view === n.id ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                )}
              >
                <n.icon size={16} />
                <span className="hidden 2xl:inline">{n.label}</span>
                <span className="2xl:hidden">{n.short}</span>
                <Kbd>{i + 1}</Kbd>
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs md:flex">
            <span className="text-slate-400">
              Residuo <b className="font-mono text-emerald-300">{me.residuo}</b>
            </span>
            <span className="text-slate-400">
              MaxBid <b className="font-mono text-amber-300">{me.maxBid}</b>
            </span>
            <span className="text-slate-400">
              Rosa{' '}
              <b className="font-mono text-slate-100">
                {me.count}/{total}
              </b>
            </span>
          </div>
          <button type="button" onClick={() => setLayout('mobile')} title="Versione mobile per l'asta" aria-label="Versione mobile" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-200">
            <Smartphone size={18} />
          </button>
          <button type="button" onClick={() => openQuick()} className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-emerald-950 hover:bg-emerald-400">
            <Zap size={16} /> <span className="hidden sm:inline">Acquisto</span> <Kbd>Ctrl K</Kbd>
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-[1600px] px-3 py-4">
        {view === 'war' && <WarRoom />}
        {view === 'strategy' && <Strategy />}
        {view === 'watch' && <Watchlist />}
        {view === 'gk' && <GoalkeeperGrid />}
        {view === 'listone' && <Listone />}
      </main>
      {quickOpen && <QuickModal />}
      <Toasts />
    </div>
  )
}
