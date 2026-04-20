import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { gameId, calcTableUpTo, calcTorschuetzenUpTo } from './logic'
import SpieltagNav from './SpieltagNav.jsx'
import './styles.css'

// ── Mobile: kompakte Match-Liste ──────────────────────────────────────────────
function MobileView({ schedule, results, players }) {
  const [spieltag, setSpieltag] = useState(0)
  const [tab, setTab] = useState('spieltage') // spieltage | tabelle | torschuetzen

  const latestSpieltag = (() => {
    for (let i = schedule.length - 1; i >= 0; i--)
      if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i
    return 0
  })()

  useEffect(() => { setSpieltag(latestSpieltag) }, [latestSpieltag])

  const doneSet = new Set(
    schedule.map((st, i) => st.every(m => results[gameId(m.home, m.away)]) ? i : -1).filter(i => i >= 0)
  )

  const tableRows = calcTableUpTo(schedule, results, latestSpieltag)
  const torRows = calcTorschuetzenUpTo(schedule, results, players, latestSpieltag)
  const hinrundeEnde = Math.ceil(schedule.length / 2) - 1
  const herbstRows = calcTableUpTo(schedule, results, hinrundeEnde)
  const herbstIdx = schedule.slice(0, hinrundeEnde + 1).every(st => st.every(m => results[gameId(m.home, m.away)])) ? herbstRows[0]?.i : -1

  return (
    <div className="mobile-view">
      {/* Tabs */}
      <div className="mobile-tabs">
        {['spieltage', 'tabelle', 'torschuetzen'].map(t => (
          <button key={t} className={`mobile-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'spieltage' ? 'Spieltage' : t === 'tabelle' ? 'Tabelle' : 'Torschützen'}
          </button>
        ))}
      </div>

      {tab === 'spieltage' && (
        <div className="mobile-content">
          {/* Spieltag Dropdown */}
          <div className="mobile-st-bar">
            <select
              className="mobile-st-select"
              value={spieltag}
              onChange={e => setSpieltag(parseInt(e.target.value))}
            >
              {schedule.map((_, i) => (
                <option key={i} value={i}>
                  Spieltag {i + 1}{doneSet.has(i) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Match-Liste */}
          <div className="mobile-matches">
            {schedule[spieltag]?.map((m, idx) => {
              const r = results[gameId(m.home, m.away)]
              return (
                <div key={idx} className={`mobile-match ${r ? 'done' : ''}`}>
                  <span className="mobile-machine">M{m.machine + 1}</span>
                  <span className="mobile-name">{players[m.home]}</span>
                  <span className="mobile-score">
                    {r ? `${r.home} : ${r.away}` : '– : –'}
                  </span>
                  <span className="mobile-name right">{players[m.away]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'tabelle' && (
        <div className="mobile-content">
          <table className="mobile-table">
            <thead><tr>
              <th>#</th><th>Trommler</th><th>T</th><th>TD</th><th>Pkt</th>
            </tr></thead>
            <tbody>
              {tableRows.map((r, idx) => {
                const td = r.tore - r.gegen
                return (
                  <tr key={r.i}>
                    <td>{idx + 1}</td>
                    <td className="mobile-t-name">
                      {idx === 0 && r.sp > 0 && <span className="leader-dot" />}
                      {players[r.i]}
                      {r.i === herbstIdx && <span className="herbst-badge">🍂</span>}
                    </td>
                    <td>{r.tore}</td>
                    <td className={td > 0 ? 'td-pos' : td < 0 ? 'td-neg' : ''}>{td > 0 ? '+' : ''}{td}</td>
                    <td><strong>{r.pkt}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'torschuetzen' && (
        <div className="mobile-content">
          {torRows.map((r, idx) => (
            <div key={r.i} className="mobile-tor-row">
              <span className="mobile-tor-rank">{idx + 1}</span>
              <span className="mobile-tor-name">{r.name}</span>
              <span className="mobile-tor-tore">{r.tore}</span>
              <span className="mobile-tor-avg">Ø {r.avg.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Desktop: Boxen-Ansicht ────────────────────────────────────────────────────
function DesktopBox({ m, players, results }) {
  const r = results[gameId(m.home, m.away)]
  const done = !!r
  return (
    <div className={`maschine ${done ? 'fertig' : 'laeuft'}`}>
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
          <div className="spieler">{players[m.home]}</div>
          <div className="vs">vs.</div>
          <div className="spieler">{players[m.away]}</div>
        </div>
        <div className="score-block">
          <div className="score-top">
            {done
              ? <div className="score-done">
                  <span className="score-zahl">{r.home}</span>
                  <span className="score-colon">:</span>
                  <span className="score-zahl">{r.away}</span>
                </div>
              : <div className="score-done" style={{ opacity: 0.2 }}>
                  <span className="score-zahl">–</span>
                  <span className="score-colon">:</span>
                  <span className="score-zahl">–</span>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function Tabelle({ schedule, results, players, upTo }) {
  const rows = calcTableUpTo(schedule, results, upTo)
  const hinrundeEnde = Math.ceil(schedule.length / 2) - 1
  const herbstRows = calcTableUpTo(schedule, results, hinrundeEnde)
  const herbstIdx = herbstRows[0]?.sp > 0 ? herbstRows[0].i : -1
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
          return (
            <tr key={r.i}>
              <td className="t-rank">{idx + 1}</td>
              <td className="t-name">
                {idx === 0 && r.sp > 0 && <span className="leader-dot" />}
                {players[r.i]}
                {hinrundeDone && r.i === herbstIdx && <span className="herbst-badge">🍂</span>}
              </td>
              <td className="t-num">{r.tore}</td>
              <td className={`t-num ${td > 0 ? 'td-pos' : td < 0 ? 'td-neg' : ''}`}>{td > 0 ? '+' : ''}{td}</td>
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
        {rows.slice(0, 3).map((r, i) => (
          <div key={r.i} className={`top3-card ${medalClass[i]}`}>
            <div className="top3-medal">{medals[i]}</div>
            <div className="top3-tore">{r.tore}</div>
            <div className="top3-avg">Ø {r.avg.toFixed(2)}</div>
            <div className="top3-name">{r.name}</div>
          </div>
        ))}
      </div>
      {rows.slice(3).map((r, i) => (
        <div key={r.i} className="tor-row">
          <span className="tor-rank">{i + 4}</span>
          <span className="tor-name">{r.name}</span>
          <span className="tor-tore">{r.tore}</span>
          <div className="tor-bar"><div className="tor-fill" style={{ width: `${Math.round(r.tore / maxTore * 100)}%` }} /></div>
        </div>
      ))}
    </>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
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
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started, liveActive: t.live_active })
    }
    const { data: rData } = await supabase.from('results').select('*')
    if (rData) {
      const rMap = {}
      rData.forEach(r => { rMap[r.game_id] = { home: r.home_score, away: r.away_score } })
      setResults(rMap)
    }
    setLoading(false)
  }

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []
  const numM = tournament?.numMachines || 6

  function getPages(stIdx) {
    if (!schedule[stIdx]) return []
    const pages = []
    for (let i = 0; i < schedule[stIdx].length; i += numM)
      pages.push(schedule[stIdx].slice(i, i + numM))
    return pages
  }

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

  if (loading) return <div className="empty">Laden…</div>

  // Kein aktives Turnier
  if (!tournament?.liveActive) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gruen)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img src="/trommel.svg" alt="" style={{ height: 80, opacity: 0.4 }} />
        <div style={{ fontFamily: 'Bayon, sans-serif', fontSize: 28, color: 'var(--weiss60)', textAlign: 'center', padding: '0 24px' }}>
          Momentan findet kein Live-Trommel-Event statt
        </div>
        <div style={{ fontSize: 14, color: 'var(--weiss30)' }}>live.trommelschiessen.de</div>
      </div>
    )
  }

  const doneSet = getDoneSet()
  const pages = getPages(spieltag)
  const cp = Math.min(page, Math.max(0, pages.length - 1))
  const currentPage = getPaddedPage(pages[cp] || [])
  const pInfo = pages.length > 1 ? ` · Seite ${cp + 1} / ${pages.length}` : ''
  const latestST = getLatestSpieltag()

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="mobile-only">
        <div className="app-header">
          <div className="header-left">
            <img src="/trommel.svg" alt="Trommel" style={{ height: 32, width: 'auto', marginRight: 10 }} />
            <div>
              <div className="logo" style={{ fontSize: 20 }}>TRMMLR</div>
              <div className="event-name">X. Trommelschießen-WM · 06.06.2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tournament?.started && <span className="live-badge">LIVE</span>}
            <div className="clock" style={{ fontSize: 18 }}>{clock}</div>
          </div>
        </div>
        <MobileView schedule={schedule} results={results} players={players} />
      </div>

      {/* ── DESKTOP ── */}
      <div className="desktop-only" style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', minHeight: '100vh' }}>
        <div className="app-header">
          <div className="header-left">
            <img src="/trommel.svg" alt="Trommel" style={{ height: 40, width: 'auto', marginRight: 12 }} />
            <div>
              <div className="logo">TRMMLR</div>
              <div className="event-name">X. Trommelschießen-WM · 06.06.2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {tournament?.started && <span className="live-badge">LIVE</span>}
            <div className="clock">{clock}</div>
          </div>
        </div>

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
            <div className="maschinen-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {currentPage.map((m, pi) =>
                m === null
                  ? <div key={`empty-${pi}`} className="maschine" style={{ opacity: 0.2, border: '0.5px dashed var(--gruen40)', background: 'none' }}>
                      <div className="maschine-head"><span className="maschine-name">Maschine {pi + 1}</span></div>
                      <div className="maschine-body" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                        <span style={{ color: 'var(--weiss30)', fontSize: 14 }}>Pause</span>
                      </div>
                    </div>
                  : <DesktopBox key={`${m.home}_${m.away}`} m={m} players={players} results={results} />
              )}
            </div>
            <div className="page-nav">
              <button className="page-btn" disabled={spieltag === 0 && cp === 0}
                onClick={() => { if (page > 0) setPage(p => p - 1); else { setSpieltag(s => s - 1); setPage(getPages(spieltag - 1).length - 1) } }}>← Zurück</button>
              <span className="page-info">{pages.length > 1 ? `Seite ${cp + 1} / ${pages.length}` : ''}</span>
              <button className="page-btn primary" disabled={cp >= pages.length - 1 && spieltag >= schedule.length - 1}
                onClick={() => { if (page < pages.length - 1) setPage(p => p + 1); else { setSpieltag(s => s + 1); setPage(0) } }}>Weiter →</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--gruen40)' }}>
              <div className="section-label">Tabelle</div>
              <Tabelle schedule={schedule} results={results} players={players} upTo={latestST} />
            </div>
            <div style={{ padding: '16px 18px', flex: 1 }}>
              <div className="section-label">Torschützen</div>
              <Torschuetzen schedule={schedule} results={results} players={players} upTo={latestST} />
            </div>
          </div>
        </div>

        <div className="app-footer">
          <div className="footer-txt">live.trommelschiessen.de</div>
          <div className="footer-txt">Édition Jubilaire · 2006–2026</div>
        </div>
      </div>
    </>
  )
}
