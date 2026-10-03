import { useStore } from './useStore'
import { beep } from '../lib/utils'

/** Annulla l'ultimo acquisto registrato, con beep e notifica. */
export function annullaUltimo() {
  const st = useStore.getState()
  const last = st.undo()
  if (!last) {
    st.toast('Nessun acquisto da annullare', 'info')
    return
  }
  const p = last.playerId ? st.players.find((x) => x.id === last.playerId) : null
  beep('undo')
  st.toast(`Annullato: ${p ? p.nome : 'spesa rapida'} (${last.price} cr)`, 'warn')
}
