import type { Player, Ruolo } from '../types'
import { normalizza } from './calc'

export type Row = Record<string, unknown>

export interface ColumnMap {
  id?: string
  ruolo?: string
  nome?: string
  squadra?: string
  qt?: string
  fvm?: string
  mv?: string
}

const ALIASES: Record<keyof ColumnMap, string[]> = {
  id: ['id', 'cod', 'codice'],
  ruolo: ['r', 'ruolo', 'role', 'ruolo classic'],
  nome: ['nome', 'giocatore', 'calciatore', 'name', 'player'],
  squadra: ['squadra', 'sq', 'team', 'club'],
  qt: ['qt. a', 'qt.a', 'qta', 'qt a', 'quotazione', 'quot.', 'quot', 'qt.attuale', 'qt. attuale', 'qt'],
  fvm: ['fvm', 'fvm m', 'fantavalore'],
  mv: ['mv', 'media voto', 'media'],
}

const clean = (s: string) => normalizza(String(s)).replace(/\s+/g, ' ').trim()

/** Riconosce le colonne del listone (Leghe Fantacalcio e varianti). */
export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {}
  const norm = headers.map((h) => ({ raw: h, n: clean(h) }))
  for (const key of Object.keys(ALIASES) as (keyof ColumnMap)[]) {
    for (const alias of ALIASES[key]) {
      const hit = norm.find((h) => h.n === alias && !Object.values(map).includes(h.raw))
      if (hit) {
        map[key] = hit.raw
        break
      }
    }
  }
  // Leghe: "Qt.A" assente ma "FVM" presente -> la quotazione segue l'FVM
  if (!map.qt && map.fvm) map.qt = map.fvm
  return map
}

/** Il file Leghe ha una riga titolo prima delle intestazioni: trova la riga header. */
export function findHeaderRow(matrix: unknown[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const cells = matrix[i].map((c) => clean(String(c ?? '')))
    if (cells.includes('nome') && (cells.includes('r') || cells.includes('ruolo') || cells.includes('squadra'))) return i
  }
  return 0
}

export function matrixToRows(matrix: unknown[][]): { headers: string[]; rows: Row[] } {
  const h = findHeaderRow(matrix)
  const headers = (matrix[h] ?? []).map((c) => String(c ?? '').trim())
  const rows: Row[] = []
  for (const line of matrix.slice(h + 1)) {
    if (!line || line.every((c) => c === null || c === undefined || String(c).trim() === '')) continue
    const r: Row = {}
    headers.forEach((k, i) => (r[k] = line[i]))
    rows.push(r)
  }
  return { headers, rows }
}

export async function parseFile(file: File): Promise<{ headers: string[]; rows: Row[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const Papa = (await import('papaparse')).default
    const text = await file.text()
    const res = Papa.parse<string[]>(text, { skipEmptyLines: true, delimiter: '' })
    return matrixToRows(res.data)
  }
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, blankrows: false })
  return matrixToRows(matrix)
}

const TEAM_ALIASES: Record<string, string> = {
  internazionale: 'inter', 'hellas verona': 'verona', 'ac milan': 'milan', 'as roma': 'roma', 'ss lazio': 'lazio',
}

export function teamSlug(raw: string, known: string[]): string {
  const n = clean(raw)
  if (TEAM_ALIASES[n]) return TEAM_ALIASES[n]
  const hit = known.find((k) => k === n || n.startsWith(k) || k.startsWith(n.slice(0, 4)))
  return hit ?? n.replace(/\s+/g, '-')
}

export function parseRuolo(raw: unknown): Ruolo | null {
  const s = clean(String(raw ?? '')).toUpperCase()
  if (['P', 'POR', 'PORTIERE', 'GK'].includes(s)) return 'P'
  if (['D', 'DIF', 'DIFENSORE', 'DC', 'DD', 'DS', 'DF'].includes(s)) return 'D'
  if (['C', 'CEN', 'CENTROCAMPISTA', 'M', 'MF'].includes(s)) return 'C'
  if (['A', 'ATT', 'ATTACCANTE', 'FW', 'PC'].includes(s)) return 'A'
  return null
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Cognome del listone ("Martinez L." -> "martinez"; "Di Lorenzo" -> "di lorenzo"). */
function surnameKey(s: string) {
  return clean(s)
    .replace(/\s+[a-z]\.?$/i, '')
    .replace(/[^a-z ]/g, '')
    .trim()
}

function matchesName(p: Player, listName: string): boolean {
  const key = surnameKey(listName)
  const full = clean(p.nome).replace(/[^a-z ]/g, '')
  if (!key) return false
  if (full === key) return true
  if (full.endsWith(' ' + key)) return true
  // nomi singoli tipo "Bremer", "Wesley", "Dodô"
  if (!full.includes(' ') && full === key.split(' ')[0]) return true
  const parts = full.split(' ')
  return parts.length > 1 && parts.slice(1).join(' ') === key
}

export interface MergeResult {
  players: Player[]
  updated: number
  added: number
  skipped: number
}

/**
 * Unisce il listone importato col database: aggiorna quotazioni, FVM, ruolo e Id ufficiale
 * dei giocatori riconosciuti; aggiunge i mancanti. Note, pupilli e prezzi obiettivo sono
 * salvati per id separatamente e quindi restano intatti.
 */
export function mergeListone(base: Player[], rows: Row[], map: ColumnMap, knownTeams: string[]): MergeResult {
  const out = base.map((p) => ({ ...p }))
  const byFantaId = new Map(out.filter((p) => p.fantaId).map((p) => [p.fantaId!, p]))
  let updated = 0
  let added = 0
  let skipped = 0
  for (const r of rows) {
    const nome = map.nome ? String(r[map.nome] ?? '').trim() : ''
    if (!nome) {
      skipped++
      continue
    }
    const fantaId = map.id ? String(r[map.id] ?? '').trim() || undefined : undefined
    const squadra = map.squadra ? teamSlug(String(r[map.squadra] ?? ''), knownTeams) : ''
    const ruolo = map.ruolo ? parseRuolo(r[map.ruolo]) : null
    const qt = map.qt ? num(r[map.qt]) : null
    const fvm = map.fvm ? num(r[map.fvm]) : null
    const mv = map.mv ? num(r[map.mv]) : null

    let target = fantaId ? byFantaId.get(fantaId) : undefined
    if (!target) {
      const candidates = out.filter((p) => (!squadra || p.squadra === squadra) && matchesName(p, nome))
      target = candidates.find((p) => !ruolo || p.ruolo === ruolo) ?? candidates[0]
    }
    if (target) {
      if (fantaId) target.fantaId = fantaId
      target.nomeListone = nome
      if (ruolo) target.ruolo = ruolo
      if (qt != null) target.qt = Math.max(1, Math.round(qt))
      if (fvm != null) target.fvm = Math.round(fvm)
      if (mv != null && mv > 0) target.mvStimata = mv
      if (squadra && squadra !== target.squadra) target.squadra = squadra
      updated++
    } else {
      if (!ruolo) {
        skipped++
        continue
      }
      const id = `imp-${fantaId ?? clean(nome).replace(/\s+/g, '-')}-${squadra}`
      const np: Player = {
        id,
        nome,
        squadra: squadra || 'svincolati',
        ruolo,
        dettaglio: '—',
        qt: Math.max(1, Math.round(qt ?? 1)),
        fvm: Math.round(fvm ?? qt ?? 1),
        stato: 'riserva',
        rigorista: 0,
        punizioni: false,
        corner: false,
        numero: null,
        nazionalita: '',
        eta: null,
        altezza: null,
        presenzeClub: 0,
        golClub: 0,
        presenzeCarriera: 0,
        golCarriera: 0,
        presenzeNazionale: 0,
        mvStimata: mv,
        prestito: null,
        fantaId,
        nomeListone: nome,
        importato: true,
      }
      out.push(np)
      if (fantaId) byFantaId.set(fantaId, np)
      added++
    }
  }
  return { players: out, updated, added, skipped }
}
