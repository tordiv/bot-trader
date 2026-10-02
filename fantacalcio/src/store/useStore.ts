import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BuyerId, Custom, Formation, Pair, Player, Purchase, Rival, Ruolo, Settings, Tag, View } from '../types'
import { RUOLI } from '../types'
import { INITIAL_PLAYERS } from '../lib/data'
import { distribuisci } from '../lib/calc'
import { uid } from '../lib/utils'

export const DEFAULT_SETTINGS: Settings = {
  budget: 500,
  slots: { P: 3, D: 8, C: 8, A: 6 },
  split: { P: 7, D: 19, C: 29, A: 45 },
}

export function buildPlan(s: Settings): Record<Ruolo, number[]> {
  const plan = {} as Record<Ruolo, number[]>
  // arrotondamento: l'ultima voce assorbe il resto così il totale coincide col budget
  let used = 0
  RUOLI.forEach((r, i) => {
    const b = i === RUOLI.length - 1 ? s.budget - used : Math.round((s.budget * s.split[r]) / 100)
    used += b
    plan[r] = distribuisci(b, s.slots[r], r)
  })
  return plan
}

const defaultRivals = (n = 9): Rival[] => Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, name: `Rivale ${i + 1}` }))

export interface Toast {
  id: string
  text: string
  tone: 'ok' | 'warn' | 'info'
}

interface State {
  players: Player[]
  custom: Record<string, Custom>
  purchases: Purchase[]
  rivals: Rival[]
  pairs: Pair[]
  settings: Settings
  plan: Record<Ruolo, number[]>
  view: View
  rosterMode: 'pitch' | 'table'
  formation: Formation
  quickOpen: boolean
  quickPreset: string | null
  toasts: Toast[]
  myName: string

  setView: (v: View) => void
  setRosterMode: (m: 'pitch' | 'table') => void
  setFormation: (f: Formation) => void
  openQuick: (playerId?: string | null) => void
  closeQuick: () => void

  buy: (playerId: string | null, buyer: BuyerId, price: number, ruolo?: Ruolo | null) => Purchase | null
  undo: () => Purchase | null
  removePurchase: (id: string) => void

  toggleStar: (id: string) => void
  toggleTag: (id: string, tag: Tag) => void
  setTarget: (id: string, v: number | null) => void
  setNote: (id: string, note: string) => void

  addPair: (a: string, b: string, label?: string) => void
  removePair: (id: string) => void

  setRivalName: (id: string, name: string) => void
  setRivalCount: (n: number) => void
  setMyName: (n: string) => void

  setSettings: (s: Partial<Settings>) => void
  setPlanSlot: (r: Ruolo, i: number, v: number) => void
  regeneratePlan: () => void

  replacePlayers: (p: Player[]) => void
  resetDatabase: () => void
  resetAuction: () => void
  importBackup: (json: string) => boolean

  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      players: INITIAL_PLAYERS,
      custom: {},
      purchases: [],
      rivals: defaultRivals(),
      pairs: [],
      settings: DEFAULT_SETTINGS,
      plan: buildPlan(DEFAULT_SETTINGS),
      view: 'war',
      rosterMode: 'pitch',
      formation: '3-4-3',
      quickOpen: false,
      quickPreset: null,
      toasts: [],
      myName: 'La mia squadra',

      setView: (view) => set({ view }),
      setRosterMode: (rosterMode) => set({ rosterMode }),
      setFormation: (formation) => set({ formation }),
      openQuick: (playerId = null) => set({ quickOpen: true, quickPreset: playerId }),
      closeQuick: () => set({ quickOpen: false, quickPreset: null }),

      buy: (playerId, buyer, price, ruolo = null) => {
        const { purchases, players } = get()
        if (playerId && purchases.some((p) => p.playerId === playerId)) return null
        const r = ruolo ?? (playerId ? players.find((p) => p.id === playerId)?.ruolo ?? null : null)
        const pur: Purchase = { id: uid(), playerId, ruolo: r, buyer, price: Math.max(0, Math.round(price)), ts: Date.now() }
        set({ purchases: [...purchases, pur] })
        return pur
      },
      undo: () => {
        const { purchases } = get()
        const last = purchases[purchases.length - 1]
        if (!last) return null
        set({ purchases: purchases.slice(0, -1) })
        return last
      },
      removePurchase: (id) => set({ purchases: get().purchases.filter((p) => p.id !== id) }),

      toggleStar: (id) => {
        const c = get().custom[id] ?? {}
        set({ custom: { ...get().custom, [id]: { ...c, starred: !c.starred } } })
      },
      toggleTag: (id, tag) => {
        const c = get().custom[id] ?? {}
        const tags = c.tags ?? []
        const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
        // aggiungere un tag implica mettere il giocatore tra i pupilli
        set({ custom: { ...get().custom, [id]: { ...c, tags: next, starred: next.length ? true : c.starred } } })
      },
      setTarget: (id, v) => {
        const c = get().custom[id] ?? {}
        set({ custom: { ...get().custom, [id]: { ...c, target: v } } })
      },
      setNote: (id, note) => {
        const c = get().custom[id] ?? {}
        set({ custom: { ...get().custom, [id]: { ...c, note } } })
      },

      addPair: (a, b, label) => {
        if (a === b || get().pairs.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))) return
        set({ pairs: [...get().pairs, { id: uid(), a, b, label }] })
      },
      removePair: (id) => set({ pairs: get().pairs.filter((p) => p.id !== id) }),

      setRivalName: (id, name) => set({ rivals: get().rivals.map((r) => (r.id === id ? { ...r, name } : r)) }),
      setRivalCount: (n) => {
        const cur = get().rivals
        const count = Math.max(8, Math.min(12, n))
        if (count > cur.length) {
          const extra = Array.from({ length: count - cur.length }, (_, i) => {
            const k = cur.length + i + 1
            return { id: `r${k}-${uid().slice(0, 4)}`, name: `Rivale ${k}` }
          })
          set({ rivals: [...cur, ...extra] })
        } else {
          const removed = new Set(cur.slice(count).map((r) => r.id))
          set({ rivals: cur.slice(0, count), purchases: get().purchases.filter((p) => !removed.has(p.buyer)) })
        }
      },
      setMyName: (myName) => set({ myName }),

      setSettings: (s) => {
        const settings = { ...get().settings, ...s, slots: { ...get().settings.slots, ...s.slots }, split: { ...get().settings.split, ...s.split } }
        const slotsChanged = RUOLI.some((r) => settings.slots[r] !== get().settings.slots[r]) || settings.budget !== get().settings.budget
        set({ settings, ...(slotsChanged ? { plan: buildPlan(settings) } : {}) })
      },
      setPlanSlot: (r, i, v) => {
        const plan = { ...get().plan, [r]: [...get().plan[r]] }
        plan[r][i] = Math.max(0, Math.round(v))
        set({ plan })
      },
      regeneratePlan: () => set({ plan: buildPlan(get().settings) }),

      replacePlayers: (players) => set({ players }),
      resetDatabase: () => set({ players: INITIAL_PLAYERS }),
      resetAuction: () => set({ purchases: [] }),
      importBackup: (json) => {
        try {
          const d = JSON.parse(json)
          if (!d || !Array.isArray(d.players) || !Array.isArray(d.purchases)) return false
          set({
            players: d.players,
            purchases: d.purchases,
            custom: d.custom ?? {},
            rivals: d.rivals ?? defaultRivals(),
            pairs: d.pairs ?? [],
            settings: d.settings ?? DEFAULT_SETTINGS,
            plan: d.plan ?? buildPlan(d.settings ?? DEFAULT_SETTINGS),
            myName: d.myName ?? 'La mia squadra',
          })
          return true
        } catch {
          return false
        }
      },

      toast: (text, tone = 'ok') => {
        const id = uid()
        set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] })
        setTimeout(() => get().dismissToast(id), 3200)
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    {
      name: 'fanta-warroom-2627',
      // v2: database allineato al listone ufficiale 2026/27 -> sostituisce i giocatori salvati,
      // mantenendo acquisti, note, pupilli, coppie e impostazioni (gli id restano gli stessi)
      version: 2,
      migrate: (persisted, from) => {
        const s = persisted as Partial<State>
        if (from < 2) return { ...s, players: INITIAL_PLAYERS }
        return s
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        players: s.players,
        custom: s.custom,
        purchases: s.purchases,
        rivals: s.rivals,
        pairs: s.pairs,
        settings: s.settings,
        plan: s.plan,
        view: s.view,
        rosterMode: s.rosterMode,
        formation: s.formation,
        myName: s.myName,
      }),
    },
  ),
)

export function backupJson(): string {
  const s = useStore.getState()
  return JSON.stringify(
    { versione: 1, data: new Date().toISOString(), players: s.players, purchases: s.purchases, custom: s.custom, rivals: s.rivals, pairs: s.pairs, settings: s.settings, plan: s.plan, myName: s.myName },
    null,
    1,
  )
}
