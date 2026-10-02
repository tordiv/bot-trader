import { describe, expect, it } from 'vitest'
import { durata, findPlayer, statoDaPartite, stimaRientro } from '../scripts/gerarchie.mjs'

const st = (seq: string, min = 0) => ({ seq: seq.split(''), min })

describe('Gerarchie dalle formazioni', () => {
  it('titolare, ballottaggio, riserva', () => {
    expect(statoDaPartite(st('TTTTT', 450), 5)).toBe('titolare')
    expect(statoDaPartite(st('TTTST', 380), 5)).toBe('titolare')
    expect(statoDaPartite(st('STTPS', 220), 5)).toBe('ballottaggio')
    expect(statoDaPartite(st('SSSSS', 100), 5)).toBe('ballottaggio')
    expect(statoDaPartite(st('PPPPS', 10), 5)).toBe('riserva')
    expect(statoDaPartite(st('-----', 0), 5)).toBe('riserva')
  })
  it('le giornate non convocato (infortunio/squalifica) non abbassano la gerarchia', () => {
    expect(statoDaPartite(st('TT---', 180), 5)).toBe('titolare')
    expect(statoDaPartite(st('T----', 90), 5)).toBe('ballottaggio')
  })
  it("i trasferiti si valutano solo dall'arrivo", () => {
    expect(statoDaPartite(st('xxTTT', 270), 5)).toBe('titolare')
    expect(statoDaPartite(st('x-PTT', 180), 5)).toBe('titolare')
  })
})

describe('Indisponibili', () => {
  it('durata per giorni di stop', () => {
    expect(durata(5)).toBe('breve')
    expect(durata(30)).toBe('medio')
    expect(durata(90)).toBe('lungo')
    expect(durata(200)).toBe('stagione')
  })
  it('rientro stimato dal tipo di infortunio', () => {
    expect(stimaRientro({ infortunio: 'Rottura del legamento crociato', dal: '2026-09-08' }) > '2027-03-01').toBe(true)
    expect(stimaRientro({ infortunio: 'Raffreddore', dal: '2099-01-01' })).toBe('2099-01-08')
  })
  it('abbinamento nomi tra fonti diverse', () => {
    const rosa = [
      { nome: 'Francesco Pio Esposito' },
      { nome: 'Enrico Delprato' },
      { nome: 'Vakoun Bayo' },
      { nome: 'Bremer' },
      { nome: 'Piotr Zieliński' },
    ]
    expect(findPlayer(rosa, 'Pio Esposito')?.nome).toBe('Francesco Pio Esposito')
    expect(findPlayer(rosa, 'Enrico Del Prato')?.nome).toBe('Enrico Delprato')
    expect(findPlayer(rosa, 'Bayo Youssouf')?.nome).toBe('Vakoun Bayo')
    expect(findPlayer(rosa, 'Gleison Bremer')?.nome).toBe('Bremer')
    expect(findPlayer(rosa, 'Piotr Zielinski')?.nome).toBe('Piotr Zieliński')
    expect(findPlayer(rosa, 'Mario Rossi')).toBeNull()
  })
})
