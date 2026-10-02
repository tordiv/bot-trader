import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { detectColumns, matrixToRows, mergeListone } from '../src/lib/importer'
import { INITIAL_PLAYERS, TEAM_SLUGS } from '../src/lib/data'

describe('Import listone', () => {
  it('riconosce il formato xlsx di Leghe Fantacalcio (riga titolo + intestazioni)', () => {
    const aoa = [
      ['Quotazioni Fantacalcio Stagione 2026 27'],
      ['Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M'],
      [2764, 'A', 'Pc', 'Martinez L.', 'Inter', 39, 38, 1, 39, 38, 1, 350, 340],
      [4312, 'C', 'T', 'Mctominay', 'Napoli', 27, 25, 2, 27, 25, 2, 260, 250],
      [9999, 'D', 'Dc', 'Nuovo Acquisto', 'Como', 6, 6, 0, 6, 6, 0, 30, 30],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tutti')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const back = XLSX.read(buf, { type: 'array' })
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets[back.SheetNames[0]], { header: 1, defval: null })
    const { headers, rows } = matrixToRows(matrix)
    const map = detectColumns(headers)
    expect(map).toMatchObject({ id: 'Id', ruolo: 'R', nome: 'Nome', squadra: 'Squadra', qt: 'Qt.A', fvm: 'FVM' })
    const res = mergeListone(INITIAL_PLAYERS, rows, map, TEAM_SLUGS)
    expect(res.updated).toBe(2)
    expect(res.added).toBe(1)
    const lautaro = res.players.find((p) => p.id === 'inter-lautaro-martinez')!
    expect(lautaro.qt).toBe(39)
    expect(lautaro.fantaId).toBe('2764')
    expect(res.players.find((p) => p.nomeListone === 'Nuovo Acquisto')?.squadra).toBe('como')
    // il secondo import con lo stesso Id aggiorna, non duplica
    const again = mergeListone(res.players, rows, map, TEAM_SLUGS)
    expect(again.added).toBe(0)
    expect(again.players.length).toBe(res.players.length)
  })

  it('csv con intestazioni alternative (Ruolo, Qt. A)', () => {
    const csv = 'Ruolo;Nome;Squadra;Qt. A\nP;Svilar;Roma;21\nD;Di Lorenzo;Napoli;14\n'
    const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true, delimiter: '' })
    const { headers, rows } = matrixToRows(parsed.data)
    const map = detectColumns(headers)
    expect(map).toMatchObject({ ruolo: 'Ruolo', nome: 'Nome', squadra: 'Squadra', qt: 'Qt. A' })
    const res = mergeListone(INITIAL_PLAYERS, rows, map, TEAM_SLUGS)
    expect(res.updated).toBe(2)
    expect(res.players.find((p) => p.nome === 'Giovanni Di Lorenzo')!.qt).toBe(14)
  })
})
