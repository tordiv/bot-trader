import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

export default function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ring-1',
            t.tone === 'ok' && 'bg-emerald-950 text-emerald-200 ring-emerald-500/40',
            t.tone === 'warn' && 'bg-amber-950 text-amber-200 ring-amber-500/40',
            t.tone === 'info' && 'bg-slate-900 text-slate-200 ring-slate-600',
          )}
        >
          {t.tone === 'ok' ? <CheckCircle2 size={16} /> : t.tone === 'warn' ? <TriangleAlert size={16} /> : <Info size={16} />}
          {t.text}
        </button>
      ))}
    </div>
  )
}
