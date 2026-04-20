import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { buildSchedule, gameId, calcTableUpTo, calcTorschuetzenUpTo } from './logic'
import SpieltagNav from './SpieltagNav.jsx'
import './styles.css'

function splitName(name) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return { vorname: parts[0], nachname: '' }
  const nachname = parts.pop()
  return { vorname: parts.join(' '), nachname }
}

function MonitorGrid({ page, players, results, onConfirm, onCorrect }) {
  const [scores, setScores] = useState({})
  const cols = Math.min(page.filter(m => m !== null).length || 1, 2)

  return (
    <div className="maschinen-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {page.map((m, pi) => {
        // Leere Box (Pause)
        if (m === null) return (
          <div key={`empty-${pi}`} className="maschine" style={{ opacity: 0.25, border: '0.5px dashed var(--gruen40)', background: 'none' }}>
            <div className="maschine-head">
              <span className="maschine-name">Maschine {pi + 1}</span>
            </div>
            <div className="maschine-body" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
              <span style={{ color: 'var(--weiss30)', fontSize: 14 }}>Pause</span>
            </div>
          </div>
        )
        const r = results[gameId(m.home, m.away)], done = !!r
        const key = `${m.home}_${m.away}`
        const home = splitName(players[m.home])
        const away = splitName(players[m.away])
        return (
          <div key={key} className={`maschine ${done ? 'fertig' : 'laeuft'}`}>
            <div className="maschine-head">
              <span className="maschine-name">Maschine {m.machine + 1}</span>
              <div className={`status-icon ${done ? 'fertig' : 'laeuft'}`}>
                {done
                  ? <svg viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="#b0892d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="2.5" fill="rgba(74,222,128,.5)"/></svg>
                }
              </div>
            </div>
            <div className="maschine-body">
              <div className="paarung-block">
                <div className="spieler">
                  <span className="vorname">{home.vorname} </span>
                  <span className="nachname">{home.nachname}</span>
                </div>
                <div className="vs">vs.</div>
                <div className="spieler">
                  <span className="vorname">{away.vorname} </span>
                  <span className="nachname">{away.nachname}</span>
                </div>
              </div>
              <div className="score-block">
                <div className="score-top">
                  {done
                    ? <div className="score-done">
                        <span className="score-zahl">{r.home}</span>
                        <span className="score-colon">:</span>
                        <span className="score-zahl">{r.away}</span>
                      </div>
                    : <div className="score-eingabe">
                        <input className="score-field" type="number" min="0" max="5"
                          value={scores[`h_${key}`] ?? 0}
                          onChange={e => setScores(s => ({ ...s, [`h_${key}`]: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) }))} />
                        <span className="score-trenner">:</span>
                        <input className="score-field" type="number" min="0" max="5"
                          value={scores[`a_${key}`] ?? 0}
                          onChange={e => setScores(s => ({ ...s, [`a_${key}`]: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) }))} />
                      </div>
                  }
                </div>
                {done
                  ? <button className="btn-fix" onClick={() => onCorrect(m.home, m.away)}>Korrigieren</button>
                  : <button className="btn-ok" onClick={() => onConfirm(m.home, m.away, scores[`h_${key}`] ?? 0, scores[`a_${key}`] ?? 0)}>Bestätigen</button>
                }
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Tabelle({ schedule, results, players, upTo }) {
  const rows = calcTableUpTo(schedule, results, upTo)

  // Herbstmeister = Tabellenführer nach der Hinrunde (erste Hälfte der Spieltage)
  const hinrundeEnde = Math.ceil(schedule.length / 2) - 1
  const herbstRows = calcTableUpTo(schedule, results, hinrundeEnde)
  const herbstmeisterIdx = herbstRows[0]?.sp > 0 ? herbstRows[0].i : -1
  // Nur zeigen wenn Hinrunde abgeschlossen und wir in der Rückrunde sind
  const hinrundeDone = schedule.slice(0, hinrundeEnde + 1).every(st =>
    st.every(m => results[gameId(m.home, m.away)])
  )

  return (
    <table className="tabelle-table">
      <thead><tr>
        <th className="t-rank">#</th>
        <th>Trommler</th>
        <th style={{ textAlign: 'right', width: 28 }}>T</th>
        <th style={{ textAlign: 'right', width: 36 }}>TD</th>
        <th style={{ textAlign: 'right', width: 38 }}>Pkt</th>
      </tr></thead>
      <tbody>
        {rows.map((r, idx) => {
          const td = r.tore - r.gegen
          const isHerbst = hinrundeDone && r.i === herbstmeisterIdx
          return (
            <tr key={r.i}>
              <td className="t-rank">{idx + 1}</td>
              <td className="t-name">
                {idx === 0 && r.sp > 0 && <span className="leader-dot" />}
                {players[r.i]}
                {isHerbst && <span className="herbst-badge">🍂</span>}
              </td>
              <td className="t-num">{r.tore}</td>
              <td className={`t-num ${td > 0 ? 'td-pos' : td < 0 ? 'td-neg' : ''}`}>
                {td > 0 ? '+' : ''}{td}
              </td>
              <td className="t-pts">{r.pkt}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Torschuetzen({ schedule, results, players, upTo }) {
  const rows = calcTorschuetzenUpTo(schedule, results, players, upTo)
  const maxTore = rows[0]?.tore || 1
  const medals = ['🥇', '🥈', '🥉']
  const medalClass = ['gold-card', '', '']
  return (
    <>
      <div className="top3">
        {rows.slice(0, 3).map((r, i) => {
          const { vorname, nachname } = splitName(r.name)
          return (
            <div key={r.i} className={`top3-card ${medalClass[i]}`}>
              <div className="top3-medal">{medals[i]}</div>
              <div className="top3-name">{r.name}</div>
              <div className="top3-tore">{r.tore}</div>
              <div className="top3-avg">Ø {r.avg.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
      {rows.slice(3).map((r, i) => (
        <div key={r.i} className="tor-row">
          <span className="tor-rank">{i + 4}</span>
          <span className="tor-name">{r.name}</span>
          <span className="tor-tore">{r.tore}</span>
          <div className="tor-bar">
            <div className="tor-fill" style={{ width: `${maxTore > 0 ? Math.round(r.tore / maxTore * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </>
  )
}

export default function Dashboard() {
  const [tournament, setTournament] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [spieltag, setSpieltag] = useState(0)
  const [page, setPage] = useState(0)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadData()
    const sub = supabase.channel('dashboard-live')
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

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []
  const numM = tournament?.numMachines || 3

  function getPages(stIdx) {
    if (!schedule[stIdx]) return []
    const matches = schedule[stIdx]
    const pages = []
    for (let i = 0; i < matches.length; i += numM)
      pages.push(matches.slice(i, i + numM))
    return pages
  }

  // Pad current page to always show numM boxes
  function getPaddedPage(page) {
    const padded = [...page]
    while (padded.length < numM) padded.push(null)
    return padded
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
  const pages = getPages(spieltag)
  const cp = Math.min(page, pages.length - 1)
  const currentPage = getPaddedPage(pages[cp] || [])
  const pInfo = pages.length > 1 ? ` · Seite ${cp + 1} / ${pages.length}` : ''

  if (loading) return <div className="empty">Laden…</div>

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', minHeight: '100vh' }}>
      <div className="app-header">
        <div className="header-left">
          <img src="/trommel.svg" alt="Trommel" style={{ height: 40, width: 'auto', marginRight: 12, flexShrink: 0 }} />
          <div>
            <div className="logo">TRMMLR</div>
            <div className="event-name">X. Trommelschießen-WM · 06.06.2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {tournament?.started && <span className="live-badge">LIVE</span>}
          <div className="clock">{clock}</div>
          <Link to="/admin" className="admin-nav-link">Admin</Link>
        </div>
      </div>

      {!tournament?.started
        ? <div className="empty" style={{ gridColumn: '1/-1', padding: '4rem' }}>Turnier noch nicht gestartet – <Link to="/admin" style={{ color: 'var(--gold)' }}>zum Admin</Link></div>
        : <>
          <SpieltagNav
            current={spieltag}
            total={schedule.length}
            doneSet={doneSet}
            onChange={i => { setSpieltag(i); setPage(0) }}
            info={`${schedule[spieltag]?.length} Paarungen${pInfo} · Spieltag ${spieltag + 1} / ${schedule.length}`}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr' }}>
            <div style={{ padding: '20px 40px', borderRight: '0.5px solid var(--gruen40)' }}>
              <div className="section-label">Aktuelle Paarungen</div>
              <MonitorGrid
                page={currentPage}
                players={players}
                results={results}
                onConfirm={confirmResult}
                onCorrect={correctResult}
              />
              <div className="page-nav">
                <button className="page-btn" disabled={spieltag === 0 && cp === 0}
                  onClick={() => {
                    if (page > 0) { setPage(p => p - 1) }
                    else { setSpieltag(s => s - 1); setPage(getPages(spieltag - 1).length - 1) }
                  }}>← Zurück</button>
                <span className="page-info">{pages.length > 1 ? `Seite ${cp + 1} / ${pages.length}` : ''}</span>
                <button className="page-btn primary"
                  disabled={cp >= pages.length - 1 && spieltag >= schedule.length - 1}
                  onClick={() => {
                    if (page < pages.length - 1) { setPage(p => p + 1) }
                    else { setSpieltag(s => s + 1); setPage(0) }
                  }}>Weiter →</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--gruen40)' }}>
                <div className="section-label">Tabelle</div>
                <Tabelle schedule={schedule} results={results} players={players} upTo={getLatestSpieltag()} />
              </div>
              <div style={{ padding: '16px 18px', flex: 1 }}>
                <div className="section-label">Torschützen</div>
                <Torschuetzen schedule={schedule} results={results} players={players} upTo={getLatestSpieltag()} />
              </div>
            </div>
          </div>
        </>
      }

      <div className="app-footer">
        <div className="footer-txt">live.trommelschiessen.de</div>
        <div className="footer-txt">Édition Jubilaire · 2006–2026</div>
      </div>
    </div>
  )
}
