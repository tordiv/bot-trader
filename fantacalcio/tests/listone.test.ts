import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { detectColumns, matrixToRows, mergeListone } from '../src/lib/importer'
import { INITIAL_PLAYERS, TEAM_SLUGS } from '../src/lib/data'

const file = path.join(__dirname, '..', 'scripts', 'fonti', 'Quotazioni_Fantacalcio_Stagione_2026_27.xlsx')
const wb = XLSX.read(fs.readFileSync(file))
const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['Tutti'], { header: 1, defval: null })
const { headers, rows } = matrixToRows(matrix)

describe('Dataset allineato al listone ufficiale 2026/27', () => {
  it('ogni riga del listone è nel database con Id, ruolo, Qt.A e FVM', () => {
    const byId = new Map(INITIAL_PLAYERS.map((p) => [p.fantaId, p]))
    expect(rows.length).toBe(INITIAL_PLAYERS.length)
    for (const r of rows) {
      const p = byId.get(String(r['Id']))
      expect(p, String(r['Nome'])).toBeDefined()
      expect(p!.ruolo).toBe(r['R'])
      expect(p!.qt).toBe(r['Qt.A'])
      expect(p!.fvm).toBe(r['FVM'])
    }
  })
  it("reimportare il listone dall'app non crea doppioni", () => {
    const res = mergeListone(INITIAL_PLAYERS, rows, detectColumns(headers), TEAM_SLUGS)
    expect(res.added).toBe(0)
    expect(res.updated).toBe(rows.length)
  })
})
