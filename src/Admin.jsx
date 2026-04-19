import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { buildSchedule } from './logic'
import './styles.css'

export default function Admin() {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [numMachines, setNumMachines] = useState(3)
  const [numPlayersStr, setNumPlayersStr] = useState('6')
  const [playerNames, setPlayerNames] = useState(Array(6).fill(''))
  const [editNames, setEditNames] = useState([])
  const [editMode, setEditMode] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('tournament').select('*').order('created_at', { ascending: false }).limit(1)
    if (data?.length > 0) {
      const t = data[0]
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started })
      setEditNames([...t.players])
    }
    setLoading(false)
  }

  const numPlayers = parseInt(numPlayersStr) || 0

  async function startTournament() {
    if (numPlayers < 2) { alert('Mindestens 2 Schützen benötigt.'); return }
    if (saving) return
    setSaving(true)
    const names = Array.from({ length: numPlayers }, (_, i) => playerNames[i]?.trim() || `Schütze ${i + 1}`)
    const schedule = buildSchedule(names, numMachines)
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { data } = await supabase.from('tournament').insert({
      players: names, num_machines: numMachines, schedule, started: true
    }).select().single()
    if (data) {
      setTournament({ id: data.id, players: names, numMachines, schedule, started: true })
      setEditNames([...names])
    }
    setSaving(false)
  }

  async function saveNames() {
    if (!tournament) return
    setSaving(true)
    const { error } = await supabase.from('tournament').update({ players: editNames }).eq('id', tournament.id)
    if (!error) {
      setTournament(t => ({ ...t, players: editNames }))
      setSaveMsg('✓ Namen gespeichert!')
      setTimeout(() => setSaveMsg(''), 2500)
      setEditMode(false)
    }
    setSaving(false)
  }

  async function resetTournament() {
    if (!confirm('Turnier wirklich neu einrichten? Alle Ergebnisse gehen verloren.')) return
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setTournament(null); setPlayerNames(Array(6).fill('')); setNumPlayersStr('6'); setNumMachines(3); setEditMode(false)
  }

  const mPerST = Math.floor(numPlayers / 2)
  const totalST = numPlayers >= 2 ? (numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers) * 2 : 0
  const pagesPerST = numMachines > 0 ? Math.ceil(mPerST / numMachines) : 0

  if (loading) return <div className="empty">Laden…</div>

  return (
    <div className="admin-wrap">
      <div className="app-header">
        <div className="header-left">
          <img src="/trommel.svg" alt="Trommel" style={{ height: 36, width: 'auto', marginRight: 10 }} />
          <div>
            <div className="logo">TRMMLR</div>
            <div className="event-name">Admin</div>
          </div>
        </div>
        <Link to="/" className="admin-nav-link">← Live-Dashboard</Link>
      </div>

      <div className="admin-body">
        {!tournament?.started ? (
          <>
            <div className="section-label-admin">Turnier einrichten</div>
            <div className="setting-row">
              <label>Anzahl Maschinen</label>
              <input type="number" value={numMachines} min="1" max="16"
                onChange={e => setNumMachines(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="setting-row">
              <label>Anzahl Schützen</label>
              <input type="number" value={numPlayersStr} min="1" max="30"
                onChange={e => {
                  const raw = e.target.value
                  setNumPlayersStr(raw)
                  const n = Math.min(30, parseInt(raw) || 0)
                  if (n >= 1) setPlayerNames(p => { const a = [...p]; while (a.length < n) a.push(''); return a.slice(0, n) })
                }} />
            </div>

            {numPlayers >= 2 && (
              <>
                <div className="section-label-admin">Namen der Schützen</div>
                <div className="player-inputs">
                  {Array.from({ length: numPlayers }, (_, i) => (
                    <div key={i} className="player-input-row">
                      <div className="player-num">{i + 1}</div>
                      <input type="text" placeholder={`Name Schütze ${i + 1}`}
                        value={playerNames[i] || ''}
                        onChange={e => setPlayerNames(n => { const a = [...n]; a[i] = e.target.value; return a })} />
                    </div>
                  ))}
                </div>
                <div className="info-box">
                  {numPlayers} Schützen · {numPlayers * (numPlayers - 1)} Spiele · {totalST} Spieltage · {mPerST} Paarungen/Spieltag
                  {pagesPerST > 1 ? ` · ${pagesPerST} Seiten/Spieltag` : ' · passt auf einen Screen'}
                </div>
                <button className="btn-start" onClick={startTournament} disabled={saving}>
                  {saving ? 'Wird gespeichert…' : 'Turnier starten'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="tournament-active">
              Turnier läuft · {tournament.players.length} Schützen · {tournament.schedule.length} Spieltage · {tournament.numMachines} Maschinen
            </div>

            <div className="section-label-admin">Namen bearbeiten</div>
            {!editMode ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  {tournament.players.map((name, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid var(--gruen40)', fontSize: 15, color: 'var(--weiss)' }}>
                      <span style={{ width: 28, color: 'var(--weiss30)', fontSize: 13 }}>{i + 1}</span>
                      {name}
                    </div>
                  ))}
                </div>
                <button className="btn-apply" onClick={() => setEditMode(true)}>Namen bearbeiten</button>
              </>
            ) : (
              <>
                <div className="player-inputs">
                  {editNames.map((name, i) => (
                    <div key={i} className="player-input-row">
                      <div className="player-num">{i + 1}</div>
                      <input type="text" value={name}
                        onChange={e => setEditNames(n => { const a = [...n]; a[i] = e.target.value; return a })} />
                    </div>
                  ))}
                </div>
                {saveMsg && <div style={{ color: '#4ade80', fontSize: 14, marginBottom: 10 }}>{saveMsg}</div>}
                <button className="btn-start" onClick={saveNames} disabled={saving} style={{ marginBottom: 8 }}>
                  {saving ? 'Speichern…' : 'Namen speichern'}
                </button>
                <button className="btn-apply" onClick={() => { setEditMode(false); setEditNames([...tournament.players]) }}>
                  Abbrechen
                </button>
              </>
            )}

            <div style={{ height: '0.5px', background: 'var(--gruen40)', margin: '1.5rem 0' }} />
            <button className="btn-reset" onClick={resetTournament}>Turnier neu einrichten</button>
            <div style={{ marginTop: '1rem', fontSize: 14, color: 'var(--weiss60)', lineHeight: 1.6 }}>
              Ergebnisse direkt im Dashboard eintragen –{' '}
              <Link to="/" style={{ color: 'var(--gold)' }}>Dashboard öffnen →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
