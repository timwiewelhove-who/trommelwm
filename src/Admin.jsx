import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { buildSchedule, gameId } from './logic'
import './styles.css'

export default function Admin() {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [numMachines, setNumMachines] = useState(3)
  const [numPlayers, setNumPlayers] = useState(6)
  const [playerNames, setPlayerNames] = useState(Array(6).fill(''))
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('tournament').select('*').order('created_at', { ascending: false }).limit(1)
    if (data?.length > 0) {
      const t = data[0]
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started })
    }
    setLoading(false)
  }

  async function startTournament() {
    if (saving) return
    setSaving(true)
    const names = Array.from({ length: numPlayers }, (_, i) => playerNames[i]?.trim() || `Schütze ${i + 1}`)
    const schedule = buildSchedule(names, numMachines)
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { data } = await supabase.from('tournament').insert({
      players: names, num_machines: numMachines, schedule, started: true
    }).select().single()
    if (data) setTournament({ id: data.id, players: names, numMachines, schedule, started: true })
    setSaving(false)
  }

  async function resetTournament() {
    if (!confirm('Turnier wirklich neu einrichten? Alle Ergebnisse gehen verloren.')) return
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setTournament(null)
    setPlayerNames(Array(6).fill(''))
    setNumPlayers(6)
    setNumMachines(3)
  }

  const mPerST = Math.floor(numPlayers / 2)
  const totalST = (numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers) * 2
  const pagesPerST = Math.ceil(mPerST / numMachines)

  if (loading) return <div className="empty">Laden…</div>

  return (
    <div className="admin-wrap">
      <div className="app-header">
        <div className="header-left">
          <div className="logo">TRMMLR</div>
          <div className="event-name">Admin</div>
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
              <input type="number" value={numPlayers} min="2" max="30"
                onChange={e => {
                  const n = Math.min(30, Math.max(2, parseInt(e.target.value) || 2))
                  setNumPlayers(n)
                  setPlayerNames(p => { const a = [...p]; while (a.length < n) a.push(''); return a.slice(0, n) })
                }} />
            </div>

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
        ) : (
          <>
            <div className="tournament-active">
              Turnier läuft · {tournament.players.length} Schützen · {tournament.schedule.length} Spieltage
            </div>
            <button className="btn-reset" onClick={resetTournament}>Turnier neu einrichten</button>
            <div style={{ marginTop: '1rem', fontSize: 13, color: 'var(--weiss60)', lineHeight: 1.6 }}>
              Ergebnisse werden direkt im Live-Dashboard eingetragen –
              {' '}<Link to="/" style={{ color: 'var(--gold)' }}>Dashboard öffnen →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
