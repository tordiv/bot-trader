import type { Player, Purchase, Ruolo, Settings } from '../types'
import { RUOLI } from '../types'

export const totalSlots = (s: Settings) => RUOLI.reduce((a, r) => a + s.slots[r], 0)

/** MaxBid = crediti residui - (slot vuoti - 1): devi poter chiudere ogni altro slot a 1. */
export function maxBid(residuo: number, slotVuoti: number): number {
  if (slotVuoti <= 0) return 0
  return Math.max(0, residuo - (slotVuoti - 1))
}

export interface BuyerSummary {
  spent: number
  residuo: number
  count: number
  perRuolo: Record<Ruolo, number>
  slotVuoti: number
  maxBid: number
  mediaSlot: number
}

export function summarize(purchases: Purchase[], buyer: string, settings: Settings, players: Map<string, Player>): BuyerSummary {
  const mine = purchases.filter((p) => p.buyer === buyer)
  const perRuolo: Record<Ruolo, number> = { P: 0, D: 0, C: 0, A: 0 }
  let spent = 0
  for (const p of mine) {
    spent += p.price
    const r = p.ruolo ?? (p.playerId ? players.get(p.playerId)?.ruolo : undefined)
    if (r) perRuolo[r]++
  }
  const tot = totalSlots(settings)
  const residuo = settings.budget - spent
  const slotVuoti = Math.max(0, tot - mine.length)
  return {
    spent,
    residuo,
    count: mine.length,
    perRuolo,
    slotVuoti,
    maxBid: maxBid(residuo, slotVuoti),
    mediaSlot: slotVuoti > 0 ? Math.round((residuo / slotVuoti) * 10) / 10 : 0,
  }
}

/** Soglie del Modificatore di Difesa (classic) usate nella lega. */
export const MOD_SOGLIE = [
  { min: 7.0, max: Infinity, bonus: 6, label: '≥ 7,00' },
  { min: 6.5, max: 6.99, bonus: 5, label: '6,50 – 6,99' },
  { min: 6.25, max: 6.49, bonus: 3, label: '6,25 – 6,49' },
  { min: 6.0, max: 6.24, bonus: 1, label: '6,00 – 6,24' },
]

export function modificatore(media: number): number {
  const m = Math.round(media * 100) / 100
  if (m >= 7) return 6
  if (m >= 6.5) return 5
  if (m >= 6.25) return 3
  if (m >= 6) return 1
  return 0
}

/** Media modificatore: portiere + i 3 migliori difensori (servono almeno 4 difensori schierati). */
export function mediaModificatore(portiere: number | null, difensori: number[]): number | null {
  if (portiere == null || difensori.length < 4) return null
  const best3 = [...difensori].sort((a, b) => b - a).slice(0, 3)
  return (portiere + best3.reduce((a, b) => a + b, 0)) / 4
}

/** Ripartisce il budget di un ruolo sugli slot con pesi decrescenti (top player -> slot a 1). */
export function distribuisci(budgetRuolo: number, slots: number, ruolo: Ruolo): number[] {
  if (slots <= 0) return []
  // pesi: ripidi per A (si spende sui big), più piatti per D e C
  const decay: Record<Ruolo, number> = { P: 0.18, D: 0.62, C: 0.66, A: 0.6 }
  const w = Array.from({ length: slots }, (_, i) => Math.pow(decay[ruolo], i))
  const sum = w.reduce((a, b) => a + b, 0)
  const raw = w.map((x) => Math.max(1, Math.floor((x / sum) * budgetRuolo)))
  let diff = budgetRuolo - raw.reduce((a, b) => a + b, 0)
  let i = 0
  while (diff > 0) {
    raw[i % slots]++
    diff--
    i++
  }
  while (diff < 0) {
    // budget insufficiente per tenere tutti gli slot a >= 1: si toglie dal più caro
    const max = Math.max(...raw)
    if (max <= 1) break
    raw[raw.indexOf(max)]--
    diff++
  }
  return raw.sort((a, b) => b - a)
}

/** Prezzo consigliato: quotazione riportata sul budget della lega. */
export function prezzoConsigliato(p: Player, budget: number): number {
  return Math.max(1, Math.round((p.qt * budget) / 500))
}

/** Ricerca fuzzy senza accenti: punteggio > 0 se tutte le lettere compaiono in ordine. */
export function normalizza(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/ð/g, 'd')
    .replace(/þ/g, 'th')
    .toLowerCase()
}

export function fuzzyScore(query: string, target: string): number {
  // più parole: ognuna deve trovare corrispondenza (in qualsiasi ordine)
  const tokens = normalizza(query).trim().split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    let tot = 0
    for (const tk of tokens) {
      const s = fuzzyToken(tk, target)
      if (s === 0) return 0
      tot += s
    }
    return tot
  }
  return fuzzyToken(query, target)
}

function fuzzyToken(query: string, target: string): number {
  const q = normalizza(query).replace(/\s+/g, '')
  const t = normalizza(target)
  if (!q) return 1
  const idx = t.replace(/\s+/g, '').indexOf(q)
  if (idx >= 0) {
    // match contiguo: bonus se a inizio parola
    const words = t.split(/[\s'-]+/)
    const wordStart = words.some((w) => w.startsWith(q))
    return 100 - idx + (wordStart ? 50 : 0) + q.length * 2
  }
  let ti = 0
  let score = 0
  let streak = 0
  const flat = t.replace(/\s+/g, '')
  for (const ch of q) {
    const found = flat.indexOf(ch, ti)
    if (found < 0) return 0
    streak = found === ti ? streak + 1 : 0
    score += 1 + streak
    ti = found + 1
  }
  return score
}
