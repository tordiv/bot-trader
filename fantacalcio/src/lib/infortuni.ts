import { DURATA_LABEL, type Player } from '../types'

export const fmtData = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

export function infortunioTesto(p: Player): string {
  const i = p.infortunio
  if (!i) return ''
  return `${i.tipo} · ${DURATA_LABEL[i.durata]} · rientro ${i.stimato ? 'stimato ' : ''}${fmtData(i.fino)} · ${i.giornate > 0 ? `salta ~${i.giornate} giornat${i.giornate === 1 ? 'a' : 'e'}` : 'dovrebbe recuperare per la prossima giornata'}`
}
