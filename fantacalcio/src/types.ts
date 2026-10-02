export type Ruolo = 'P' | 'D' | 'C' | 'A'
export const RUOLI: Ruolo[] = ['P', 'D', 'C', 'A']
export const RUOLO_LABEL: Record<Ruolo, string> = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' }

export type Stato = 'titolare' | 'ballottaggio' | 'riserva'

export interface Player {
  id: string
  nome: string
  squadra: string // slug squadra (es. "inter") oppure nome libero da import
  ruolo: Ruolo
  dettaglio: string
  qt: number
  fvm: number
  stato: Stato
  rigorista: 0 | 1 | 2
  punizioni: boolean
  corner: boolean
  numero: number | null
  nazionalita: string
  eta: number | null
  altezza: number | null
  presenzeClub: number
  golClub: number
  presenzeCarriera: number
  golCarriera: number
  presenzeNazionale: number
  mvStimata: number | null
  prestito: string | null
  fantaId?: string // Id del listone Leghe Fantacalcio
  nomeListone?: string
  importato?: boolean
}

export type Tag = 'must' | 'budget' | 'scommessa'
export const TAGS: { id: Tag; label: string; short: string; color: string }[] = [
  { id: 'must', label: 'Must-Have', short: 'MUST', color: 'bg-rose-500/20 text-rose-300 ring-rose-500/40' },
  { id: 'budget', label: 'Solo sotto budget', short: 'BUDGET', color: 'bg-amber-500/20 text-amber-300 ring-amber-500/40' },
  { id: 'scommessa', label: 'Scommessa a 1', short: 'A 1', color: 'bg-sky-500/20 text-sky-300 ring-sky-500/40' },
]

export interface Custom {
  starred?: boolean
  tags?: Tag[]
  target?: number | null
  note?: string
}

export type BuyerId = 'me' | string

export interface Purchase {
  id: string
  playerId: string | null // null = spesa rapida del rivale senza giocatore
  ruolo: Ruolo | null
  buyer: BuyerId
  price: number
  ts: number
}

export interface Rival {
  id: string
  name: string
}

export interface Pair {
  id: string
  a: string // titolare
  b: string // riserva diretta
  label?: string
}

export type View = 'war' | 'strategy' | 'watch' | 'gk' | 'listone'
export type Formation = '3-4-3' | '4-3-3' | '4-4-2'

export interface Settings {
  budget: number
  slots: Record<Ruolo, number>
  split: Record<Ruolo, number> // percentuali obiettivo
}

export interface Team {
  slug: string
  nome: string
  stemma: string | null
  fascia: number
  calendario: { g: number; campo: 'C' | 'T'; avversario: string }[]
}
