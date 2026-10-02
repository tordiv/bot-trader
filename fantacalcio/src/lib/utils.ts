import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import confetti from 'canvas-confetti'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** Asset statici con base relativa (GitHub Pages su sottopercorso). */
export const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`

let ctx: AudioContext | null = null
/** Beep di conferma via WebAudio (nessun file audio esterno). */
export function beep(kind: 'ok' | 'rival' | 'undo' = 'ok') {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    const notes = kind === 'ok' ? [880, 1320] : kind === 'rival' ? [520, 390] : [440, 330]
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx!.currentTime + i * 0.09
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      o.connect(g).connect(ctx!.destination)
      o.start(t)
      o.stop(t + 0.13)
    })
  } catch {
    /* audio non disponibile */
  }
}

export const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function celebrate() {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 }, colors: ['#10b981', '#38bdf8', '#facc15', '#f43f5e'] })
}
