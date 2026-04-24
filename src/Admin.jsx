import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { buildSchedule, gameId } from './logic'
import './styles.css'

const ADMIN_PASSWORD = 'trommel2026'

// Score-Eingabe: sauber ohne Autocomplete-5-Bug
function ScoreInput({ value, onChange }) {
  const [display, setDisplay] = useState(String(value))

  useEffect(() => { setDisplay(String(value)) }, [value])

  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') { setDisplay(''); onChange(0); return }
    const n = Math.min(5, parseInt(raw))
    setDisplay(String(n))
    onChange(n)
  }

  function handleFocus(e) { e.target.select() }

  return (
    <input
      inputMode="numeric"
      pattern="[0-5]"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      style={{ width: 48, textAlign: 'center', fontFamily: 'Bayon, sans-serif', fontSize: 26, padding: '6px 2px', background: 'rgba(255,255,255,.08)', border: '0.5px solid var(--gruen40)', borderRadius: 6, color: 'var(--weiss)', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
    />
  )
}

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tournament, setTournament] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [numMachines, setNumMachines] = useState(6)
  const [numPlayersStr, setNumPlayersStr] = useState('10')
  const [playerNames, setPlayerNames] = useState(Array(10).fill(''))
  const [editNames, setEditNames] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [spieltag, setSpieltag] = useState(0)
  const [scoreInputs, setScoreInputs] = useState({})

  useEffect(() => {
    const saved = sessionStorage.getItem('trmmlr_admin')
    if (saved === ADMIN_PASSWORD) setAuth(true)
  }, [])

  useEffect(() => {
    if (!auth) return
    loadData()
    const sub = supabase.channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, payload => {
        if (payload.eventType === 'DELETE') {
          setResults(prev => { const n = { ...prev }; delete n[payload.old.game_id]; return n })
          // Score-Input zurücksetzen
          setScoreInputs(prev => { const n = { ...prev }; delete n[payload.old.game_id]; return n })
        } else {
          const r = payload.new
          setResults(prev => ({ ...prev, [r.game_id]: { home: r.home_score, away: r.away_score } }))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [auth])

  async function loadData() {
    const { data } = await supabase.from('tournament').select('*').order('created_at', { ascending: false }).limit(1)
    if (data?.length > 0) {
      const t = data[0]
      const activeST = t.active_spieltag ?? 0
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started, liveActive: t.live_active, activeSpieltag: activeST })
      setSpieltag(activeST)
      setEditNames([...t.players])
    }
    const { data: rData } = await supabase.from('results').select('*')
    if (rData) {
      const rMap = {}
      rData.forEach(r => { rMap[r.game_id] = { home: r.home_score, away: r.away_score } })
      setResults(rMap)
    }
    setLoading(false)
  }

  function login() {
    if (pwInput === ADMIN_PASSWORD) { sessionStorage.setItem('trmmlr_admin', ADMIN_PASSWORD); setAuth(true) }
    else { setPwError(true); setTimeout(() => setPwError(false), 1500) }
  }

  const numPlayers = parseInt(numPlayersStr) || 0

  async function startTournament() {
    if (numPlayers < 2 || saving) return
    setSaving(true)
    const names = Array.from({ length: numPlayers }, (_, i) => playerNames[i]?.trim() || `Schütze ${i + 1}`)
    const schedule = buildSchedule(names, numMachines)
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { data } = await supabase.from('tournament').insert({ players: names, num_machines: numMachines, schedule, started: true, live_active: true }).select().single()
    if (data) { setTournament({ id: data.id, players: names, numMachines, schedule, started: true, liveActive: true }); setEditNames([...names]); setSpieltag(0) }
    setSaving(false)
  }

  async function changeSpieltag(idx) {
    setSpieltag(idx)
    if (!tournament) return
    await supabase.from('tournament').update({ active_spieltag: idx }).eq('id', tournament.id)
    setTournament(t => ({ ...t, activeSpieltag: idx }))
  }

  async function toggleLive() {
    if (!tournament) return
    const newVal = !tournament.liveActive
    await supabase.from('tournament').update({ live_active: newVal }).eq('id', tournament.id)
    setTournament(t => ({ ...t, liveActive: newVal }))
  }

  async function saveNames() {
    setSaving(true)
    const { error } = await supabase.from('tournament').update({ players: editNames }).eq('id', tournament.id)
    if (!error) { setTournament(t => ({ ...t, players: editNames })); setSaveMsg('✓ Gespeichert'); setTimeout(() => setSaveMsg(''), 2000); setEditMode(false) }
    setSaving(false)
  }

  async function confirmResult(home, away, hScore, aScore) {
    const gid = gameId(home, away)
    if (results[gid]) {
      await supabase.from('results').update({ home_score: hScore, away_score: aScore }).eq('game_id', gid)
    } else {
      await supabase.from('results').insert({ game_id: gid, home_score: hScore, away_score: aScore })
    }
    setResults(prev => ({ ...prev, [gid]: { home: hScore, away: aScore } }))
    setScoreInputs(prev => { const n = { ...prev }; delete n[gid]; return n })
  }

  async function deleteResult(home, away) {
    const gid = gameId(home, away)
    await supabase.from('results').delete().eq('game_id', gid)
    // Sofort lokal updaten
    setResults(prev => { const n = { ...prev }; delete n[gid]; return n })
    setScoreInputs(prev => { const n = { ...prev }; delete n[gid]; return n })
  }

  async function resetTournament() {
    if (!confirm('Turnier wirklich neu einrichten? Alle Ergebnisse gehen verloren.')) return
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setTournament(null); setResults({}); setPlayerNames(Array(10).fill('')); setNumPlayersStr('10'); setEditMode(false)
  }

  if (!auth) return (
    <div style={{ minHeight: '100vh', background: 'var(--gruen)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 280, padding: 32, background: 'rgba(0,0,0,.2)', borderRadius: 12, border: '0.5px solid var(--gruen40)' }}>
        <div className="logo" style={{ marginBottom: 24, textAlign: 'center', fontSize: 24 }}>TRMMLR Admin</div>
        <input type="password" placeholder="Passwort" value={pwInput}
          onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '10px 14px', marginBottom: 12, background: pwError ? 'rgba(248,113,113,.15)' : 'rgba(255,255,255,.06)', border: `0.5px solid ${pwError ? '#f87171' : 'var(--gruen40)'}`, borderRadius: 8, color: 'var(--weiss)', fontSize: 16, fontFamily: 'Nunito Sans, sans-serif', boxSizing: 'border-box' }} />
        <button className="btn-start" onClick={login}>Anmelden</button>
        {pwError && <div style={{ color: '#f87171', fontSize: 13, marginTop: 8, textAlign: 'center' }}>Falsches Passwort</div>}
      </div>
    </div>
  )

  if (loading) return <div className="empty">Laden…</div>

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []
  const currentMatches = schedule[spieltag] || []

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr', background: 'var(--gruen)' }}>
      {/* Header */}
      <div className="app-header">
        <div className="header-left">
          <img src="/trommel.svg" alt="" style={{ height: 44, marginRight: 12 }} />
          <div>
            <div className="logo" style={{ fontSize: 22 }}>TRMMLR</div>
            <div className="event-name">Admin · 10. Trommelschießen-WM</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tournament?.started && (
            <button onClick={toggleLive} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tournament.liveActive ? 'var(--btn-gruen)' : 'rgba(255,255,255,.1)', color: 'var(--weiss)', fontFamily: 'Nunito Sans, sans-serif', fontWeight: 600, fontSize: 13 }}>
              {tournament.liveActive ? '🟢 Live AN' : '⚫ Live AUS'}
            </button>
          )}
          <button onClick={() => { sessionStorage.removeItem('trmmlr_admin'); setAuth(false) }}
            style={{ background: 'none', border: '0.5px solid var(--gruen40)', color: 'var(--weiss60)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'Nunito Sans, sans-serif' }}>
            Abmelden
          </button>
        </div>
      </div>

      {!tournament?.started ? (
        /* ── Turnier einrichten ── */
        <div className="admin-body">
          <div className="section-label-admin">Turnier einrichten</div>
          <div className="setting-row"><label>Maschinen</label>
            <input type="number" value={numMachines} min="1" max="16" onChange={e => setNumMachines(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div className="setting-row"><label>Schützen</label>
            <input type="number" value={numPlayersStr} min="1" max="30" onChange={e => {
              const raw = e.target.value; setNumPlayersStr(raw)
              const n = Math.min(30, parseInt(raw) || 0)
              if (n >= 1) setPlayerNames(p => { const a = [...p]; while (a.length < n) a.push(''); return a.slice(0, n) })
            }} />
          </div>
          {numPlayers >= 2 && <>
            <div className="section-label-admin">Namen</div>
            <div className="player-inputs">
              {Array.from({ length: numPlayers }, (_, i) => (
                <div key={i} className="player-input-row">
                  <div className="player-num">{i + 1}</div>
                  <input type="text" placeholder={`Schütze ${i + 1}`} value={playerNames[i] || ''} onChange={e => setPlayerNames(n => { const a = [...n]; a[i] = e.target.value; return a })} />
                </div>
              ))}
            </div>
            <div className="info-box">{numPlayers} Schützen · {numPlayers * (numPlayers - 1)} Spiele · {(numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers) * 2} Spieltage</div>
            <button className="btn-start" onClick={startTournament} disabled={saving}>{saving ? 'Wird gespeichert…' : 'Turnier starten'}</button>
          </>}
        </div>
      ) : (
        /* ── Turnier läuft: 2-spaltig ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px' }}>
          {/* Links: Ergebnisse */}
          <div style={{ padding: '20px 32px', borderRight: '0.5px solid var(--gruen40)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <select className="kicker-st-select" value={spieltag} onChange={e => changeSpieltag(parseInt(e.target.value))}>
                {schedule.map((st, i) => {
                  const done = st.every(m => results[gameId(m.home, m.away)])
                  return <option key={i} value={i}>Spieltag {i + 1}{done ? ' ·' : ''}</option>
                })}
              </select>
              <span className="kicker-st-info">{currentMatches.length} Paarungen</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentMatches.map((m, idx) => {
                const gid = gameId(m.home, m.away)
                const r = results[gid]
                const hVal = scoreInputs[gid]?.home ?? r?.home ?? 0
                const aVal = scoreInputs[gid]?.away ?? r?.away ?? 0
                return (
                  <div key={idx} className={`kicker-match ${r ? 'done' : 'active'}`} style={{ cursor: 'default' }}>
                    <span className="kicker-m-label">M{m.machine + 1}</span>
                    <div className="kicker-home" style={{ fontSize: 16 }}>{players[m.home]}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <ScoreInput value={hVal} onChange={v => setScoreInputs(prev => ({ ...prev, [gid]: { home: v, away: scoreInputs[gid]?.away ?? r?.away ?? 0 } }))} />
                      <span style={{ color: 'var(--weiss30)', fontFamily: 'Bayon, sans-serif', fontSize: 20 }}>:</span>
                      <ScoreInput value={aVal} onChange={v => setScoreInputs(prev => ({ ...prev, [gid]: { home: scoreInputs[gid]?.home ?? r?.home ?? 0, away: v } }))} />
                      {!r
                        ? <button onClick={() => confirmResult(m.home, m.away, hVal, aVal)}
                            style={{ background: '#3ab76a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontFamily: 'Nunito Sans, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}>✓</button>
                        : <button onClick={() => confirmResult(m.home, m.away, hVal, aVal)}
                            style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 6, padding: '8px 14px', fontFamily: 'Nunito Sans, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}>✓</button>
                      }
                      {r && <button onClick={() => deleteResult(m.home, m.away)}
                        style={{ background: 'rgba(248,113,113,.2)', color: '#f87171', border: '0.5px solid rgba(248,113,113,.3)', borderRadius: 6, padding: '8px 10px', fontFamily: 'Nunito Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✕</button>}
                    </div>
                    <div className="kicker-away" style={{ fontSize: 16 }}>{players[m.away]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rechts: Namen + Settings */}
          <div style={{ padding: '20px 20px', overflowY: 'auto' }}>
            <div className="section-label-admin">Trommler</div>
            {!editMode ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  {players.map((name, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--gruen40)', fontSize: 14 }}>
                      <span style={{ color: 'var(--weiss30)', width: 22, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: 'var(--weiss)' }}>{name}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-apply" onClick={() => setEditMode(true)}>Bearbeiten</button>
              </>
            ) : (
              <>
                <div className="player-inputs">
                  {editNames.map((name, i) => (
                    <div key={i} className="player-input-row">
                      <div className="player-num">{i + 1}</div>
                      <input type="text" value={name} onChange={e => setEditNames(n => { const a = [...n]; a[i] = e.target.value; return a })} />
                    </div>
                  ))}
                </div>
                {saveMsg && <div style={{ color: '#4ade80', fontSize: 13, marginBottom: 8 }}>{saveMsg}</div>}
                <button className="btn-start" onClick={saveNames} disabled={saving} style={{ marginBottom: 8 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
                <button className="btn-apply" onClick={() => { setEditMode(false); setEditNames([...players]) }}>Abbrechen</button>
              </>
            )}

            <div style={{ height: '0.5px', background: 'var(--gruen40)', margin: '20px 0' }} />
            <button className="btn-reset" onClick={resetTournament}>Neu einrichten</button>
          </div>
        </div>
      )}
    </div>
  )
}
