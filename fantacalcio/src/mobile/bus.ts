/** Eventi tra le schede mobile (focus sulla ricerca, acquisto concluso). */
export const mobileBus = new EventTarget()
export const EV_CERCA = 'cerca'
export const EV_ACQUISTO = 'acquisto'

export function vibra(ms: number | number[] = 30) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* non supportato */
  }
}
