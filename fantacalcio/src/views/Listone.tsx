import { useMemo, useRef, useState } from 'react'
import { ArrowDownUp, Download, FileSpreadsheet, RotateCcw, Search, Upload, Zap } from 'lucide-react'
import { backupJson, useStore } from '../store/useStore'
import { useBuyerName, useOwnership } from '../store/hooks'
import { fuzzyScore, prezzoConsigliato } from '../lib/calc'
import { DATA_META, TEAMS, TEAM_SLUGS, teamName } from '../lib/data'
import { detectColumns, mergeListone, parseFile, type ColumnMap, type Row } from '../lib/importer'
import { cn } from '../lib/utils'
import { Card, Crest, Disponibilita, Forma, Gerarchie, RoleBadge, StarButton, StatoBadge, TagChips } from '../components/ui'
import { RUOLI, type Player, type Ruolo, type Stato } from '../types'

type SortKey = 'qt' | 'fvm' | 'nome' | 'mv' | 'eta' | 'min'
type Disp = '' | 'disponibili' | 'no-lunghi' | 'infortunati'

export default function Listone() {
  return (
    <div className="space-y-4">
      <Importer />
      <Table />
    </div>
  )
}

const FIELD_LABEL: Record<keyof ColumnMap, string> = { id: 'Id', ruolo: 'Ruolo (R)', nome: 'Nome', squadra: 'Squadra', qt: 'Qt. A', fvm: 'FVM', mv: 'Mv (opz.)' }

function Importer() {
  const players = useStore((s) => s.players)
  const replace = useStore((s) => s.replacePlayers)
  const resetDb = useStore((s) => s.resetDatabase)
  const resetAuction = useStore((s) => s.resetAuction)
  const importBackup = useStore((s) => s.importBackup)
  const toast = useStore((s) => s.toast)
  const [drag, setDrag] = useState(false)
  const [parsed, setParsed] = useState<{ name: string; headers: string[]; rows: Row[]; map: ColumnMap } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)

  const handle = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      const { headers, rows } = await parseFile(f)
      setParsed({ name: f.name, headers, rows, map: detectColumns(headers) })
    } catch (e) {
      toast(`Impossibile leggere il file: ${(e as Error).message}`, 'warn')
    } finally {
      setBusy(false)
    }
  }

  const merge = () => {
    if (!parsed) return
    if (!parsed.map.nome) return toast('Seleziona almeno la colonna Nome', 'warn')
    const res = mergeListone(players, parsed.rows, parsed.map, TEAM_SLUGS)
    replace(res.players)
    toast(`Listone unito: ${res.updated} aggiornati, ${res.added} aggiunti, ${res.skipped} scartati`, 'ok')
    setParsed(null)
  }

  const download = () => {
    const blob = new Blob([backupJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fanta-war-room-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Importa listone (.csv / .xlsx)" icon={<FileSpreadsheet size={16} className="text-emerald-400" />} className="lg:col-span-2">
        {!parsed ? (
          <div
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              handle(e.dataTransfer.files[0])
            }}
            onClick={() => fileRef.current?.click()}
            className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition', drag ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500')}
          >
            <Upload className="text-slate-400" />
            <div className="text-sm font-semibold">{busy ? 'Lettura in corso…' : 'Trascina qui il file delle quotazioni di Leghe Fantacalcio'}</div>
            <div className="text-xs text-slate-500">oppure clicca per sceglierlo · colonne riconosciute: Id, R/Ruolo, Nome, Squadra, Qt.A/FVM, Mv</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          </div>
        ) : (
          <div>
            <div className="mb-2 text-sm">
              <b>{parsed.name}</b> · {parsed.rows.length} righe · verifica la mappatura delle colonne:
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(Object.keys(FIELD_LABEL) as (keyof ColumnMap)[]).map((k) => (
                <label key={k} className="text-xs text-slate-400">
                  {FIELD_LABEL[k]}
                  <select value={parsed.map[k] ?? ''} onChange={(e) => setParsed({ ...parsed, map: { ...parsed.map, [k]: e.target.value || undefined } })} className={cn('mt-0.5 block w-full rounded border bg-slate-800 px-1.5 py-1 text-xs text-slate-100', parsed.map[k] ? 'border-emerald-600' : 'border-slate-700')}>
                    <option value="">— non usare —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-2 overflow-x-auto rounded ring-1 ring-slate-800">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-800/60">
                  <tr>
                    {parsed.headers.slice(0, 10).map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 4).map((r, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      {parsed.headers.slice(0, 10).map((h) => (
                        <td key={h} className="px-2 py-1 text-slate-400">
                          {String(r[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={merge} className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400">
                Unisci al database
              </button>
              <button type="button" onClick={() => setParsed(null)} className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm">
                Annulla
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">L'unione aggiorna quotazioni, FVM e ruoli dei giocatori riconosciuti (per Id o cognome + squadra) e aggiunge i nuovi. Note, pupilli, etichette e prezzi obiettivo restano intatti.</p>
          </div>
        )}
      </Card>
      <Card title="Dati & backup" icon={<Download size={16} className="text-sky-400" />}>
        <div className="space-y-2 text-xs text-slate-400">
          <p>
            Database {DATA_META.stagione}: <b className="text-slate-200">{players.length}</b> giocatori · generato il {DATA_META.generato}
          </p>
          <p className="text-[11px]">
            Gerarchie dalle formazioni delle prime <b className="text-slate-200">{DATA_META.giornateAnalizzate}</b> giornate (match report del {DATA_META.partite}), infortunati aggiornati al {DATA_META.infortuni}.
          </p>
          <p className="text-[11px]">Fonti: {DATA_META.fonti.join(' · ')}. Ruoli, Qt.A, Qt.I e FVM vengono dal listone ufficiale; titolari e ballottaggi dalle formazioni reali (con * = infortunato, stato pre-stagione); rigoristi dalla curatela e dai rigori battuti. Puoi reimportare un listone aggiornato in qualsiasi momento.</p>
          <p className="text-[11px]">Tutto viene salvato automaticamente nel browser (localStorage): ricaricare o chiudere la pagina non perde l'asta.</p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={download} className="flex items-center justify-center gap-1 rounded-lg bg-sky-500/20 py-1.5 font-semibold text-sky-200 ring-1 ring-sky-500/40 hover:bg-sky-500/30">
              <Download size={13} /> Esporta backup
            </button>
            <button type="button" onClick={() => backupRef.current?.click()} className="flex items-center justify-center gap-1 rounded-lg bg-sky-500/20 py-1.5 font-semibold text-sky-200 ring-1 ring-sky-500/40 hover:bg-sky-500/30">
              <Upload size={13} /> Ripristina
            </button>
            <input
              ref={backupRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                toast(importBackup(await f.text()) ? 'Backup ripristinato' : 'File di backup non valido', 'info')
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => confirm('Cancellare tutti gli acquisti registrati (miei e dei rivali)?') && (resetAuction(), toast('Asta azzerata', 'warn'))}
              className="flex items-center justify-center gap-1 rounded-lg bg-rose-500/15 py-1.5 font-semibold text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/25"
            >
              <RotateCcw size={13} /> Azzera asta
            </button>
            <button
              type="button"
              onClick={() => confirm('Ripristinare il database giocatori originale? Le importazioni andranno perse (note e pupilli restano).') && (resetDb(), toast('Database ripristinato', 'warn'))}
              className="flex items-center justify-center gap-1 rounded-lg bg-rose-500/15 py-1.5 font-semibold text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/25"
            >
              <RotateCcw size={13} /> Reset database
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Table() {
  const players = useStore((s) => s.players)
  const custom = useStore((s) => s.custom)
  const settings = useStore((s) => s.settings)
  const setTarget = useStore((s) => s.setTarget)
  const setNote = useStore((s) => s.setNote)
  const openQuick = useStore((s) => s.openQuick)
  const owned = useOwnership()
  const name = useBuyerName()

  const [q, setQ] = useState('')
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [team, setTeam] = useState('')
  const [stato, setStato] = useState<Stato | ''>('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [disp, setDisp] = useState<Disp>('')
  const [onlyRig, setOnlyRig] = useState(false)
  const [onlyStar, setOnlyStar] = useState(false)
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'qt', dir: -1 })
  const [limit, setLimit] = useState(120)

  const rows = useMemo(() => {
    let list = players.filter(
      (p) =>
        (!ruoli.length || ruoli.includes(p.ruolo)) &&
        (!team || p.squadra === team) &&
        (!stato || p.stato === stato) &&
        (!onlyFree || !owned.has(p.id)) &&
        (!onlyRig || p.rigorista > 0 || p.punizioni) &&
        (!onlyStar || custom[p.id]?.starred) &&
        (!disp ||
          (disp === 'disponibili' && !p.infortunio && !p.squalifica) ||
          (disp === 'no-lunghi' && !(p.infortunio && ['lungo', 'stagione'].includes(p.infortunio.durata))) ||
          (disp === 'infortunati' && !!p.infortunio)),
    )
    if (q.trim()) {
      list = list
        .map((p) => ({ p, s: Math.max(fuzzyScore(q, p.nome), fuzzyScore(q, `${p.nome} ${teamName(p.squadra)}`), fuzzyScore(q, p.nomeListone ?? '')) }))
        .filter((x) => x.s > 2)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p)
      return list
    }
    const val = (p: Player): number | string => (sort.k === 'nome' ? p.nome : sort.k === 'mv' ? p.mvStimata ?? 0 : sort.k === 'eta' ? p.eta ?? 0 : sort.k === 'min' ? p.stagione?.min ?? 0 : p[sort.k])
    return [...list].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      return (typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)) * sort.dir
    })
  }, [players, ruoli, team, stato, onlyFree, onlyRig, onlyStar, disp, owned, custom, q, sort])

  const th = (k: SortKey, label: string, cls = '') => (
    <th className={cn('cursor-pointer select-none px-2 py-2 font-semibold hover:text-slate-200', cls)} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'nome' ? 1 : -1 }))}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.k === k && <ArrowDownUp size={10} />}
      </span>
    </th>
  )

  return (
    <Card title={`Listone completo (${rows.length})`} icon={<Search size={16} className="text-emerald-400" />}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2">
          <Search size={14} className="text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome o squadra (fuzzy)…" className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </div>
        <div className="flex gap-1">
          {RUOLI.map((r) => (
            <button key={r} type="button" onClick={() => setRuoli((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))} className={cn('rounded-md p-0.5 ring-1', ruoli.includes(r) ? 'ring-white' : 'opacity-50 ring-transparent')}>
              <RoleBadge r={r} />
            </button>
          ))}
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs">
          <option value="">Tutte le squadre</option>
          {TEAMS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.nome}
            </option>
          ))}
        </select>
        <select value={stato} onChange={(e) => setStato(e.target.value as Stato | '')} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs">
          <option value="">Tutti gli stati</option>
          <option value="titolare">Titolari</option>
          <option value="ballottaggio">Ballottaggi</option>
          <option value="riserva">Riserve</option>
        </select>
        <select value={disp} onChange={(e) => setDisp(e.target.value as Disp)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs">
          <option value="">Infortunati: tutti</option>
          <option value="disponibili">Solo arruolabili</option>
          <option value="no-lunghi">Escludi stop lunghi</option>
          <option value="infortunati">Solo infortunati</option>
        </select>
        {[
          [onlyFree, setOnlyFree, 'Liberi'],
          [onlyRig, setOnlyRig, 'Rigori/punizioni'],
          [onlyStar, setOnlyStar, 'Pupilli'],
        ].map(([v, set, l]) => (
          <label key={l as string} className="flex items-center gap-1 text-xs text-slate-400">
            <input type="checkbox" checked={v as boolean} onChange={(e) => (set as (b: boolean) => void)(e.target.checked)} /> {l as string}
          </label>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px] text-sm">
          <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500">
            <tr className="text-left">
              <th className="w-8" />
              {th('nome', 'Giocatore')}
              <th className="px-2 font-semibold">Squadra</th>
              <th className="px-2 font-semibold">Stato</th>
              <th className="px-2 font-semibold">Gerarchie</th>
              {th('min', `G1–${DATA_META.giornateAnalizzate}`)}
              {th('qt', 'Qt', 'text-right')}
              {th('fvm', 'FVM', 'text-right')}
              {th('mv', 'MV st.', 'text-right')}
              {th('eta', 'Età', 'text-right')}
              <th className="px-2 text-right font-semibold">Obiettivo</th>
              <th className="px-2 font-semibold">Etichette</th>
              <th className="px-2 font-semibold">Note</th>
              <th className="px-2 text-right font-semibold">Asta</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((p) => {
              const o = owned.get(p.id)
              const c = custom[p.id]
              return (
                <tr key={p.id} className={cn('border-t border-slate-800/70 hover:bg-white/[0.03]', o && 'opacity-45')}>
                  <td className="pl-1">
                    <StarButton id={p.id} />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-2">
                      <RoleBadge r={p.ruolo} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('truncate font-semibold text-slate-100', o && 'line-through')}>{p.nome}</span>
                          <Disponibilita p={p} />
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.dettaglio}
                          {p.rm && ` · ${p.rm}`}
                          {p.nomeListone && p.nomeListone !== p.nome && ` · listone: ${p.nomeListone}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                      <Crest slug={p.squadra} size={18} /> {teamName(p.squadra)}
                    </span>
                  </td>
                  <td className="px-2" title={p.statoFonte === 'curatela' ? 'Infortunato durante le giornate giocate: stato dalla gerarchia pre-stagione' : `Da formazioni e cambi delle prime ${DATA_META.giornateAnalizzate} giornate`}>
                    <StatoBadge s={p.stato} />
                    {p.statoFonte === 'curatela' && <span className="ml-0.5 text-[10px] text-slate-500">*</span>}
                  </td>
                  <td className="px-2">
                    <Gerarchie p={p} />
                  </td>
                  <td className="px-2">
                    <Forma p={p} />
                  </td>
                  <td className="px-2 text-right font-mono font-bold">
                    {p.qt}
                    {p.qtI != null && p.qtI !== p.qt && <span className={cn('ml-1 text-[10px]', p.qt > p.qtI ? 'text-emerald-400' : 'text-rose-400')}>{p.qt > p.qtI ? '▲' : '▼'}</span>}
                  </td>
                  <td className="px-2 text-right font-mono text-slate-400">{p.fvm}</td>
                  <td className="px-2 text-right font-mono text-slate-400">{p.mvStimata?.toFixed(2) ?? '–'}</td>
                  <td className="px-2 text-right font-mono text-slate-400">{p.eta ?? '–'}</td>
                  <td className="px-2 text-right">
                    <input
                      value={c?.target ?? ''}
                      placeholder={String(prezzoConsigliato(p, settings.budget))}
                      onChange={(e) => setTarget(p.id, e.target.value ? parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 : null)}
                      className="w-12 rounded bg-slate-800 px-1 py-0.5 text-right font-mono text-xs placeholder:text-slate-600"
                    />
                  </td>
                  <td className="px-2">
                    <TagChips id={p.id} editable />
                  </td>
                  <td className="px-2">
                    <input value={c?.note ?? ''} onChange={(e) => setNote(p.id, e.target.value)} placeholder="…" className="w-36 rounded bg-transparent px-1 py-0.5 text-xs hover:bg-slate-800 focus:bg-slate-800 focus:outline-none" />
                  </td>
                  <td className="px-2 text-right">
                    {o ? (
                      <span className={cn('whitespace-nowrap text-xs font-semibold', o.buyer === 'me' ? 'text-emerald-300' : 'text-rose-300')}>
                        {name(o.buyer)} · {o.price}
                      </span>
                    ) : (
                      <button type="button" onClick={() => openQuick(p.id)} className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30">
                        <Zap size={11} /> Asta
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 200)} className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700">
          Mostra altri ({rows.length - limit} rimanenti)
        </button>
      )}
    </Card>
  )
}
