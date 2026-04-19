import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { buildSchedule, gameId, calcTableUpTo, calcTorschuetzenUpTo } from './logic'
import './App.css'

function SpieltagNav({ current, total, doneSet, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])
  return (
    <div className="st-nav-row">
      <div className={`st-nav-side prev${current === 0 ? ' disabled' : ''}`} onClick={() => current > 0 && onChange(current - 1)}>
        {current > 0 ? `← Spieltag ${current}` : ''}
      </div>
      <div className="st-nav-center" ref={ref} onClick={() => setOpen(o => !o)}>
        <span className="st-nav-title">Spieltag {current + 1}</span>
        <span className="st-nav-arrow">▾</span>
        {open && (
          <div className="st-dropdown">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className={`st-dropdown-item${i === current ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); onChange(i); setOpen(false) }}>
                Spieltag {i + 1}
                {doneSet.has(i) && <span className="st-dropdown-check">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={`st-nav-side next${current === total - 1 ? ' disabled' : ''}`} onClick={() => current < total - 1 && onChange(current + 1)}>
        {current < total - 1 ? `Spieltag ${current + 2} →` : ''}
      </div>
    </div>
  )
}

function MonitorGrid({ page, players, results, onConfirm, onCorrect }) {
  const [scores, setScores] = useState({})
  const cols = Math.min(page.length, 3)
  return (
    <div className="maschinen-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {page.map((m, pi) => {
        const r = results[gameId(m.home, m.away)], done = !!r
        const key = `${m.home}_${m.away}`
        return (
          <div key={key} className={`maschine-box${done ? ' done' : ''}`}>
            <div className="maschine-head">
              <span className="maschine-title">Maschine {m.machine + 1}</span>
              <span className={`maschine-status${done ? ' fertig' : ''}`}>{done ? '✓ fertig' : 'läuft'}</span>
            </div>
            <div className="maschine-body">
              <div className="paarung">
                <div className="spieler-name">{players[m.home]}</div>
                <div className="vs-zeile">vs.</div>
                <div className="spieler-name">{players[m.away]}</div>
              </div>
              {done ? (
                <>
                  <div className="score-anzeige">
                    <span className="score-zahl">{r.home}</span>
                    <span className="score-trenner">:</span>
                    <span className="score-zahl">{r.away}</span>
                  </div>
                  <button className="btn-korrigieren" onClick={() => onCorrect(m.home, m.away)}>Korrigieren</button>
                </>
              ) : (
                <>
                  <div className="score-eingabe">
                    <input className="score-field" type="number" min="0" max="5"
                      value={scores[`h_${key}`] ?? 0}
                      onChange={e => setScores(s => ({ ...s, [`h_${key}`]: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) }))} />
                    <span className="score-eingabe-trenner">:</span>
                    <input className="score-field" type="number" min="0" max="5"
                      value={scores[`a_${key}`] ?? 0}
                      onChange={e => setScores(s => ({ ...s, [`a_${key}`]: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) }))} />
                  </div>
                  <button className="btn-bestaetigen"
                    onClick={() => onConfirm(m.home, m.away, scores[`h_${key}`] ?? 0, scores[`a_${key}`] ?? 0)}>
                    Bestätigen
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabelleTable({ rows, players }) {
  return (
    <table>
      <thead><tr>
        <th>#</th><th>Schütze</th>
        <th style={{ textAlign: 'right' }}>Sp</th><th style={{ textAlign: 'right' }}>S</th>
        <th style={{ textAlign: 'right' }}>U</th><th style={{ textAlign: 'right' }}>N</th>
        <th style={{ textAlign: 'right' }}>T</th><th style={{ textAlign: 'right' }}>TD</th>
        <th style={{ textAlign: 'right' }}>Pkt</th>
      </tr></thead>
      <tbody>
        {rows.map((r, idx) => {
          const td = r.tore - r.gegen, tdStr = td > 0 ? '+' + td : String(td)
          return (
            <tr key={r.i}>
              <td className="rank">{idx + 1}</td>
              <td style={{ fontWeight: 500 }}>{players[r.i]}{idx === 0 && r.sp > 0 && <span className="winner-badge">★ Führend</span>}</td>
              <td style={{ textAlign: 'right' }}>{r.sp}</td><td style={{ textAlign: 'right' }}>{r.s}</td>
              <td style={{ textAlign: 'right' }}>{r.u}</td><td style={{ textAlign: 'right' }}>{r.n}</td>
              <td style={{ textAlign: 'right' }}>{r.tore}:{r.gegen}</td>
              <td style={{ textAlign: 'right', color: td > 0 ? 'var(--color-text-success)' : td < 0 ? 'var(--color-text-danger)' : '' }}>{tdStr}</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>{r.pkt}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function TorschuetzenView({ rows }) {
  const maxTore = rows[0]?.tore || 1
  const medals = ['🥇', '🥈', '🥉'], medalClass = ['gold', 'silver', 'bronze']
  return (
    <>
      <div className="top3">
        {rows.slice(0, 3).map((r, i) => (
          <div key={r.i} className={`top3-card ${medalClass[i] || ''}`}>
            <div className="top3-medal">{medals[i]}</div>
            <div className="top3-name">{r.name}</div>
            <div className="top3-tore">{r.tore}</div>
            <div className="top3-label">Tore gesamt</div>
            <div className="top3-avg">Ø {r.avg.toFixed(2)} / Spiel</div>
          </div>
        ))}
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Schütze</th>
          <th style={{ textAlign: 'right' }}>Sp</th>
          <th style={{ textAlign: 'right' }}>Tore</th>
          <th style={{ textAlign: 'right' }}>Ø / Spiel</th>
          <th style={{ width: 100 }}></th>
        </tr></thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.i}>
              <td className="rank">{idx + 1}</td>
              <td style={{ fontWeight: 500 }}>{r.name}{idx === 0 && r.tore > 0 && <span className="winner-badge">⚽ König</span>}</td>
              <td style={{ textAlign: 'right' }}>{r.sp}</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>{r.tore}</td>
              <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{r.avg.toFixed(2)}</td>
              <td>
                <div className="tore-bar-wrap">
                  <div className="tore-bar">
                    <div className="tore-bar-fill" style={{ width: `${maxTore > 0 ? Math.round(r.tore / maxTore * 100) : 0}%` }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function AdminSetup({ numMachines, setNumMachines, numPlayers, setNumPlayers, playerNames, setPlayerNames, onStart }) {
  const mPerST = Math.floor(numPlayers / 2)
  const totalST = (numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers) * 2
  const pages = Math.ceil(mPerST / numMachines)
  return (
    <>
      <div className="section-label">Turnier einrichten</div>
      <div className="setting-row"><label>Anzahl Maschinen</label>
        <input type="number" value={numMachines} min="1" max="16"
          onChange={e => setNumMachines(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div className="setting-row"><label>Anzahl Schützen</label>
        <input type="number" value={numPlayers} min="2" max="30"
          onChange={e => setNumPlayers(Math.min(30, Math.max(2, parseInt(e.target.value) || 2)))} />
      </div>
      <div className="section-label">Namen der Schützen</div>
      <div className="player-inputs">
        {Array.from({ length: numPlayers }, (_, i) => (
          <div key={i} className="player-input-row">
            <div className="player-num">{i + 1}</div>
            <input type="text" placeholder={`Name Schütze ${i + 1}`} value={playerNames[i] || ''}
              onChange={e => setPlayerNames(n => { const a = [...n]; a[i] = e.target.value; return a })} />
          </div>
        ))}
      </div>
      <div className="info-box">
        {numPlayers} Schützen · {numPlayers * (numPlayers - 1)} Spiele · {totalST} Spieltage · {mPerST} Paarungen/Spieltag
        {pages > 1 ? ` · ${pages} Seiten/Spieltag` : ' · passt auf einen Screen'}
      </div>
      <button className="btn-start" onClick={onStart}>Turnier starten</button>
    </>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('monitor')
  const [tournament, setTournament] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [monitorST, setMonitorST] = useState(0)
  const [monitorPage, setMonitorPage] = useState(0)
  const [tabelleST, setTabelleST] = useState(0)
  const [torST, setTorST] = useState(0)
  const [clock, setClock] = useState('')
  const [numMachines, setNumMachines] = useState(3)
  const [numPlayers, setNumPlayers] = useState(6)
  const [playerNames, setPlayerNames] = useState(Array(6).fill(''))

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadData()
    const sub = supabase.channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, payload => {
        if (payload.eventType === 'DELETE') {
          setResults(prev => { const n = { ...prev }; delete n[payload.old.game_id]; return n })
        } else {
          const r = payload.new
          setResults(prev => ({ ...prev, [r.game_id]: { home: r.home_score, away: r.away_score } }))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: tData } = await supabase.from('tournament').select('*').order('created_at', { ascending: false }).limit(1)
    if (tData?.length > 0) {
      const t = tData[0]
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started })
      const { data: rData } = await supabase.from('results').select('*')
      if (rData) {
        const rMap = {}
        rData.forEach(r => { rMap[r.game_id] = { home: r.home_score, away: r.away_score } })
        setResults(rMap)
      }
    }
    setLoading(false)
  }

  async function startTournament() {
    const names = Array.from({ length: numPlayers }, (_, i) => playerNames[i]?.trim() || `Schütze ${i + 1}`)
    const schedule = buildSchedule(names, numMachines)
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { data } = await supabase.from('tournament').insert({ players: names, num_machines: numMachines, schedule, started: true }).select().single()
    if (data) {
      setTournament({ id: data.id, players: names, numMachines, schedule, started: true })
      setResults({}); setMonitorST(0); setMonitorPage(0); setTabelleST(0); setTorST(0)
    }
  }

  async function confirmResult(home, away, hScore, aScore) {
    const gid = gameId(home, away)
    const { data: existing } = await supabase.from('results').select('id').eq('game_id', gid).single()
    if (existing) {
      await supabase.from('results').update({ home_score: hScore, away_score: aScore }).eq('game_id', gid)
    } else {
      await supabase.from('results').insert({ game_id: gid, home_score: hScore, away_score: aScore })
    }
    setResults(prev => ({ ...prev, [gid]: { home: hScore, away: aScore } }))
  }

  async function correctResult(home, away) {
    const gid = gameId(home, away)
    await supabase.from('results').delete().eq('game_id', gid)
    setResults(prev => { const n = { ...prev }; delete n[gid]; return n })
  }

  async function resetTournament() {
    if (!confirm('Turnier wirklich neu einrichten? Alle Ergebnisse gehen verloren.')) return
    await supabase.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tournament').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setTournament(null); setResults({}); setPlayerNames(Array(6).fill('')); setNumPlayers(6); setNumMachines(3)
  }

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []
  const numM = tournament?.numMachines || 3

  function getPages(stIdx) {
    if (!schedule[stIdx]) return []
    const pages = []
    for (let i = 0; i < schedule[stIdx].length; i += numM) pages.push(schedule[stIdx].slice(i, i + numM))
    return pages
  }

  function getDoneSet() {
    const s = new Set()
    schedule.forEach((st, i) => { if (st.every(m => results[gameId(m.home, m.away)])) s.add(i) })
    return s
  }

  function getLatestSpieltag() {
    for (let i = schedule.length - 1; i >= 0; i--)
      if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i
    return 0
  }

  const doneSet = getDoneSet()
  const totalGames = schedule.reduce((s, st) => s + st.length, 0)
  const playedGames = Object.keys(results).length

  if (loading) return <div className="loading">Laden…</div>

  return (
    <div className="app">
      <div className="logo-header">TRMMLR · WM 2026</div>
      <nav className="nav">
        {[['monitor', 'Monitor'], ['tabelle', 'Tabelle'], ['torschuetzen', 'Torschützen'], ['spiele', 'Spiele'], ['admin', 'Admin']].map(([id, label]) => (
          <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => {
            setActiveTab(id)
            if (id === 'tabelle') setTabelleST(getLatestSpieltag())
            if (id === 'torschuetzen') setTorST(getLatestSpieltag())
          }}>{label}</button>
        ))}
      </nav>

      {activeTab === 'monitor' && (
        <div className="tab">
          {!tournament?.started ? <div className="empty">Turnier noch nicht gestartet</div> : <>
            <SpieltagNav current={monitorST} total={schedule.length} doneSet={doneSet} onChange={i => { setMonitorST(i); setMonitorPage(0) }} />
            <div className="monitor-sub">
              {schedule[monitorST]?.length} Paarungen
              {getPages(monitorST).length > 1 ? ` · Seite ${monitorPage + 1} / ${getPages(monitorST).length}` : ''}
              {' · '}{clock}
            </div>
            <MonitorGrid page={getPages(monitorST)[monitorPage] || []} players={players} results={results} onConfirm={confirmResult} onCorrect={correctResult} />
            <div className="page-nav">
              <button className="nav-btn" disabled={monitorST === 0 && monitorPage === 0}
                onClick={() => { if (monitorPage > 0) { setMonitorPage(p => p - 1) } else { setMonitorST(s => s - 1); setMonitorPage(getPages(monitorST - 1).length - 1) } }}>← Zurück</button>
              <span className="page-indicator">{getPages(monitorST).length > 1 ? `Seite ${monitorPage + 1} / ${getPages(monitorST).length}` : ''}</span>
              <button className="nav-btn primary" disabled={monitorPage >= getPages(monitorST).length - 1 && monitorST >= schedule.length - 1}
                onClick={() => { const pages = getPages(monitorST); if (monitorPage < pages.length - 1) { setMonitorPage(p => p + 1) } else { setMonitorST(s => s + 1); setMonitorPage(0) } }}>Weiter →</button>
            </div>
          </>}
        </div>
      )}

      {activeTab === 'tabelle' && (
        <div className="tab">
          {!tournament?.started ? <div className="empty">Turnier noch nicht gestartet</div> : <>
            <SpieltagNav current={tabelleST} total={schedule.length} doneSet={doneSet} onChange={setTabelleST} />
            <div className="stand-sub">Stand nach Spieltag {tabelleST + 1}<span className={`stand-badge${tabelleST === getLatestSpieltag() ? ' live' : ''}`}>{tabelleST === getLatestSpieltag() ? 'live' : 'historisch'}</span></div>
            <div className="metric-row">
              {[['Schützen', players.length], ['Spiele ges.', totalGames], ['Gespielt', playedGames], ['Offen', totalGames - playedGames]].map(([l, v]) => (
                <div key={l} className="metric"><div className="label">{l}</div><div className="value">{v}</div></div>
              ))}
            </div>
            <TabelleTable rows={calcTableUpTo(schedule, results, tabelleST)} players={players} />
          </>}
        </div>
      )}

      {activeTab === 'torschuetzen' && (
        <div className="tab">
          {!tournament?.started ? <div className="empty">Turnier noch nicht gestartet</div> : <>
            <SpieltagNav current={torST} total={schedule.length} doneSet={doneSet} onChange={setTorST} />
            <div className="stand-sub">Stand nach Spieltag {torST + 1}<span className={`stand-badge${torST === getLatestSpieltag() ? ' live' : ''}`}>{torST === getLatestSpieltag() ? 'live' : 'historisch'}</span></div>
            <TorschuetzenView rows={calcTorschuetzenUpTo(schedule, results, players, torST)} />
          </>}
        </div>
      )}

      {activeTab === 'spiele' && (
        <div className="tab">
          {!tournament?.started ? <div className="empty">Turnier noch nicht gestartet</div> :
            schedule.map((st, si) => (
              <div key={si} className="round-block">
                <div className="round-label">Spieltag {si + 1}</div>
                {st.map(m => {
                  const r = results[gameId(m.home, m.away)], done = !!r
                  return (
                    <div key={gameId(m.home, m.away)} className="game-row">
                      <div className="gplayer">{players[m.home]}</div>
                      <div className={`gscore${done ? '' : ' pending'}`}>{done ? `${r.home} : ${r.away}` : '– : –'}</div>
                      <div className="gplayer right">{players[m.away]}</div>
                      <div className="gmachine">M{m.machine + 1}</div>
                      <span className={`gbadge ${done ? 'gbadge-done' : 'gbadge-open'}`}>{done ? '✓' : 'offen'}</span>
                    </div>
                  )
                })}
              </div>
            ))
          }
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="tab">
          {!tournament?.started
            ? <AdminSetup numMachines={numMachines} setNumMachines={setNumMachines} numPlayers={numPlayers}
                setNumPlayers={n => { setNumPlayers(n); setPlayerNames(p => { const a = [...p]; while (a.length < n) a.push(''); return a.slice(0, n) }) }}
                playerNames={playerNames} setPlayerNames={setPlayerNames} onStart={startTournament} />
            : <>
                <div className="tournament-active">Turnier läuft · {players.length} Schützen · {schedule.length} Spieltage</div>
                <button className="btn-apply" onClick={resetTournament}>Turnier neu einrichten</button>
              </>
          }
        </div>
      )}
    </div>
  )
}
