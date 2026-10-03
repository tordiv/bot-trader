import { describe, expect, it } from 'vitest'
import { Clock, bootstrap, diff, fromRecords, merge, newer, type Records, type SyncState } from '../src/sync/merge'
import { DEFAULT_SETTINGS, buildPlan } from '../src/store/useStore'
import type { Purchase } from '../src/types'

const vuoto = (): SyncState => ({
  custom: {},
  purchases: [],
  rivals: Array.from({ length: 3 }, (_, i) => ({ id: `r${i + 1}`, name: `Rivale ${i + 1}` })),
  pairs: [],
  settings: DEFAULT_SETTINGS,
  plan: buildPlan(DEFAULT_SETTINGS),
  myName: 'La mia squadra',
})
const clone = <T,>(x: T): T => structuredClone(x)

/** Server finto: tiene i record più recenti. */
class Server {
  recs: Records = {}
  push(r: Records) {
    for (const [k, v] of Object.entries(r)) if (newer(v, this.recs[k])) this.recs[k] = v
  }
}

/** Dispositivo: stato locale + coda di modifiche da inviare quando è online. */
class Device {
  recs: Records = {}
  coda: Records = {}
  online = true
  clock: Clock
  conflitti: string[] = []
  constructor(
    public dev: string,
    public state: SyncState = vuoto(),
    now: () => number = () => tempo,
  ) {
    this.clock = new Clock(now)
  }
  /** primo collegamento: i dati già presenti sul dispositivo diventano record */
  attiva(s?: Server) {
    const r = bootstrap(this.state, this.clock, this.dev, !!s && Object.keys(s.recs).length > 0)
    Object.assign(this.recs, r)
    Object.assign(this.coda, r)
  }
  edit(fn: (s: SyncState) => void, prev: SyncState = this.state) {
    const next = clone(this.state)
    fn(next)
    const d = diff(prev, next, this.clock, this.dev)
    Object.assign(this.recs, d)
    Object.assign(this.coda, d)
    this.state = next
    tempo += 1000
  }
  sync(s: Server) {
    if (!this.online) return
    s.push(this.coda)
    this.coda = {}
    merge(this.recs, s.recs, this.clock)
    const { state, conflitti } = fromRecords(this.recs, this.state)
    this.state = state
    this.conflitti.push(...conflitti.map((c) => `${c.playerId}: tenuto ${c.tenuto.price}, scartato ${c.scartato.price}`))
  }
}

let tempo = 1_000_000
const acquisto = (id: string, playerId: string, buyer: string, price: number): Purchase => ({ id, playerId, ruolo: 'A', buyer, price, ts: tempo })

describe('sincronizzazione tra dispositivi', () => {
  it('primo collegamento: il telefono vuoto riceve tutta la preparazione del computer', () => {
    const srv = new Server()
    const pc = new Device('pc')
    pc.state.custom = { lautaro: { starred: true, tags: ['must'], target: 120, note: 'rigorista' }, kean: { starred: true } }
    pc.state.pairs = [{ id: 'k1', a: 'carnesecchi', b: 'martinez' }]
    pc.state.settings = { ...DEFAULT_SETTINGS, budget: 600 }
    pc.state.rivals[1].name = 'Giulia'
    pc.attiva()
    pc.sync(srv)
    const tel = new Device('tel')
    tel.state.custom = { pulisic: { starred: true } } // pupillo segnato solo sul telefono
    tel.attiva(srv)
    tel.sync(srv)
    pc.sync(srv)
    expect(tel.state.custom).toEqual(pc.state.custom)
    expect(Object.keys(pc.state.custom).sort()).toEqual(['kean', 'lautaro', 'pulisic'])
    expect(tel.state.pairs).toEqual(pc.state.pairs)
    expect(tel.state.settings.budget).toBe(600)
    expect(tel.state.rivals.map((r) => r.name)).toEqual(['Rivale 1', 'Giulia', 'Rivale 3'])
  })

  it("in asta: acquisto sul telefono e nota sul computer nello stesso momento, non si perde niente (salvataggio unico ne perderebbe uno)", () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel')
    pc.attiva()
    pc.sync(srv)
    tel.sync(srv)
    tel.edit((s) => s.purchases.push(acquisto('a1', 'lautaro', 'me', 130)))
    pc.edit((s) => (s.custom.dimarco = { starred: true, note: 'alzare a 40' }))
    tel.sync(srv)
    pc.sync(srv)
    tel.sync(srv)
    for (const d of [pc, tel]) {
      expect(d.state.purchases.map((p) => p.playerId)).toEqual(['lautaro'])
      expect(d.state.custom.dimarco?.note).toBe('alzare a 40')
    }
    // confronto: copiare lo stato intero (vince l'ultimo che salva) avrebbe cancellato l'acquisto
    const ultimoVince = clone(pc.state)
    ultimoVince.purchases = []
    expect(ultimoVince.purchases).toHaveLength(0)
  })

  it('telefono senza rete: 5 acquisti in coda arrivano tutti al ritorno della connessione', () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel')
    pc.attiva()
    pc.sync(srv)
    tel.sync(srv)
    tel.online = false
    for (let i = 1; i <= 5; i++) tel.edit((s) => s.purchases.push(acquisto(`t${i}`, `g${i}`, i % 2 ? 'me' : 'r2', i * 10)))
    pc.edit((s) => (s.rivals[0].name = 'Marco'))
    pc.sync(srv)
    tel.sync(srv)
    expect(pc.state.purchases).toHaveLength(0)
    tel.online = true
    tel.sync(srv)
    pc.sync(srv)
    expect(pc.state.purchases.map((p) => p.id)).toEqual(['t1', 't2', 't3', 't4', 't5'])
    expect(tel.state.rivals[0].name).toBe('Marco')
  })

  it('stesso giocatore registrato su due dispositivi: vale il primo, ovunque uguale', () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel')
    pc.attiva()
    pc.sync(srv)
    tel.sync(srv)
    tel.edit((s) => s.purchases.push(acquisto('x1', 'kean', 'me', 31)))
    pc.edit((s) => s.purchases.push(acquisto('x2', 'kean', 'r2', 33)))
    pc.sync(srv)
    tel.sync(srv)
    pc.sync(srv)
    expect(pc.state.purchases).toEqual(tel.state.purchases)
    expect(pc.state.purchases.map((p) => `${p.buyer}:${p.price}`)).toEqual(['me:31'])
    expect(pc.conflitti).toEqual(['kean: tenuto 31, scartato 33'])
  })

  it("annulla sul telefono: l'acquisto sparisce anche dal computer e non risorge", () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel')
    pc.attiva()
    pc.edit((s) => s.purchases.push(acquisto('u1', 'thuram', 'me', 50)))
    pc.sync(srv)
    tel.sync(srv)
    tel.edit((s) => (s.purchases = s.purchases.filter((p) => p.id !== 'u1')))
    pc.edit((s) => (s.custom.thuram = { starred: true })) // il computer non ha ancora visto l'annullamento
    tel.sync(srv)
    pc.sync(srv)
    tel.sync(srv)
    expect(pc.state.purchases).toHaveLength(0)
    expect(tel.state.purchases).toHaveLength(0)
    expect(tel.state.custom.thuram?.starred).toBe(true)
  })

  it("orologio del telefono indietro di 5 minuti: la sua modifica successiva vince comunque", () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel', vuoto(), () => tempo - 300_000)
    pc.attiva()
    pc.edit((s) => (s.custom.bastoni = { starred: true, target: 15 }))
    pc.sync(srv)
    tel.sync(srv)
    tel.edit((s) => (s.custom.bastoni = { starred: true, target: 22 }))
    tel.sync(srv)
    pc.sync(srv)
    expect(pc.state.custom.bastoni.target).toBe(22)
  })

  it('rivale eliminato con i suoi acquisti: ordine dei rivali e acquisti coerenti ovunque', () => {
    const srv = new Server()
    const pc = new Device('pc')
    const tel = new Device('tel')
    pc.attiva()
    pc.edit((s) => s.purchases.push(acquisto('q1', 'pulisic', 'r2', 40), acquisto('q2', 'leao', 'r3', 45)))
    pc.sync(srv)
    tel.sync(srv)
    pc.edit((s) => {
      s.rivals = s.rivals.filter((r) => r.id !== 'r2')
      s.purchases = s.purchases.filter((p) => p.buyer !== 'r2')
    })
    pc.sync(srv)
    tel.sync(srv)
    expect(tel.state.rivals.map((r) => r.id)).toEqual(['r1', 'r3'])
    expect(tel.state.purchases.map((p) => p.id)).toEqual(['q2'])
  })

  it('peso: un intero acquisto produce un solo record da inviare', () => {
    const c = new Clock(() => 1)
    const a = vuoto()
    const b = clone(a)
    b.purchases.push(acquisto('z', 'kvara', 'me', 70))
    expect(Object.keys(diff(a, b, c, 'tel'))).toEqual(['p:z'])
  })
})
