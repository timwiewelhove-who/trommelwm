import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { gameId, calcTableUpTo, calcTorschuetzenUpTo } from './logic'
import './styles.css'

// Bestimme Status eines Matches:
// 'done'    – Ergebnis vorhanden
// 'active'  – läuft gerade (Maschine ist frei, d.h. vorheriges Match auf dieser Maschine ist done)
// 'pending' – noch nicht dran (Maschine noch belegt)
function getMatchStatus(match, allMatchesThisST, results) {
  const gid = gameId(match.home, match.away)
  if (results[gid]) return 'done'

  // Gibt es ein früheres Match auf der gleichen Maschine das noch nicht beendet ist?
  const idx = allMatchesThisST.indexOf(match)
  const sameM = allMatchesThisST.filter((m, i) => m.machine === match.machine && i < idx)
  const allPrevDone = sameM.every(m => results[gameId(m.home, m.away)])
  return allPrevDone ? 'active' : 'pending'
}

// ── Tabelle ───────────────────────────────────────────────────────────────────
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
        <th style={{ width: 18 }}>#</th>
        <th>Trommler</th>
        <th style={{ textAlign: 'right', width: 28 }}>Sp</th>
        <th style={{ textAlign: 'right', width: 26 }}>S</th>
        <th style={{ textAlign: 'right', width: 26 }}>U</th>
        <th style={{ textAlign: 'right', width: 26 }}>N</th>
        <th style={{ textAlign: 'right', width: 26 }}>T</th>
        <th style={{ textAlign: 'right', width: 32 }}>TD</th>
        <th style={{ textAlign: 'right', width: 32 }}>Pkt</th>
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
              <td className="t-num">{r.sp}</td>
              <td className="t-num">{r.s}</td>
              <td className="t-num">{r.u}</td>
              <td className="t-num">{r.n}</td>
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

// ── Torschützen ───────────────────────────────────────────────────────────────
function Torschuetzen({ schedule, results, players, upTo }) {
  const rows = calcTorschuetzenUpTo(schedule, results, players, upTo)
  if (rows.length === 0) return null
  const leader = rows[0]
  return (
    <>
      {/* Führender – groß hervorgehoben */}
      {leader && (
        <div className="tor-leader">
          <div className="tor-leader-icons">
            <span title="Waschmaschine">🫧</span>
            <span title="Ball">🎯</span>
            <span title="Kanone">💥</span>
          </div>
          <div className="tor-leader-tore">{leader.tore}</div>
          <div className="tor-leader-avg">Ø {leader.avg.toFixed(2)}</div>
          <div className="tor-leader-name">{leader.name}</div>
        </div>
      )}
      {/* Rest als Liste */}
      <div style={{ marginTop: 10 }}>
        {rows.slice(1).map((r, i) => (
          <div key={r.i} className="tor-row">
            <span className="tor-rank">{i + 2}</span>
            <span className="tor-name">{r.name}</span>
            <span className="tor-tore">{r.tore}</span>
            <div className="tor-bar"><div className="tor-fill" style={{ width: `${Math.round(r.tore / (leader.tore || 1) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Spieltag-Ansicht (Desktop + Mobile) ───────────────────────────────────────
function SpieltagView({ schedule, results, players, spieltag, setSpieltag }) {
  const doneSet = new Set(
    schedule.map((st, i) => st.every(m => results[gameId(m.home, m.away)]) ? i : -1).filter(i => i >= 0)
  )
  const st = schedule[spieltag] || []

  // Gruppiere in Runden à numMachines
  // Finde numMachines: max(machine)+1 im ersten Spieltag
  const numM = schedule[0] ? Math.max(...schedule[0].map(m => m.machine)) + 1 : 6
  const rounds = []
  for (let i = 0; i < st.length; i += numM) rounds.push(st.slice(i, i + numM))

  return (
    <>
      {/* Spieltag Selector */}
      <div className="kicker-st-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <select
            className="kicker-st-select"
            value={spieltag}
            onChange={e => setSpieltag(parseInt(e.target.value))}
          >
            {schedule.map((_, i) => (
              <option key={i} value={i}>
                Spieltag {i + 1}{doneSet.has(i) ? ' ·' : ''}
              </option>
            ))}
          </select>
          <span className="kicker-st-info">{st.length} Paarungen · Spieltag {spieltag + 1} / {schedule.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="page-btn" disabled={spieltag === 0} onClick={() => setSpieltag(s => s - 1)}>← zurück</button>
          <button className="page-btn primary" disabled={spieltag >= schedule.length - 1} onClick={() => setSpieltag(s => s + 1)}>weiter →</button>
        </div>
      </div>

      {/* Match-Liste mit Runden-Trenner */}
      <div className="kicker-matches">
        {rounds.map((round, ri) => (
          <div key={ri}>
            {ri > 0 && (
              <div className="round-divider">
                <div className="round-divider-line" />
                <span className="round-divider-label">Nächste Runde</span>
                <div className="round-divider-line" />
              </div>
            )}
            {round.map((m, idx) => {
              const status = getMatchStatus(m, st, results)
              const r = results[gameId(m.home, m.away)]
              return (
                <div key={idx} className={`kicker-match ${status}`}>
                  <span className="kicker-m-label">M{m.machine + 1}</span>
                  <div className="kicker-home">{players[m.home]}</div>
                  <div className="kicker-score">
                    {status === 'done'
                      ? <><span className="kicker-score-num">{r.home}</span><span className="kicker-score-sep">:</span><span className="kicker-score-num">{r.away}</span></>
                      : <span className="kicker-score-pending">– : –</span>
                    }
                  </div>
                  <div className="kicker-away">{players[m.away]}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Mobile View ───────────────────────────────────────────────────────────────
function MobileView({ schedule, results, players }) {
  const [spieltag, setSpieltag] = useState(() => {
    for (let i = schedule.length - 1; i >= 0; i--)
      if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i
    return 0
  })
  const [tab, setTab] = useState('spieltage')
  const latestST = (() => {
    for (let i = schedule.length - 1; i >= 0; i--)
      if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i
    return 0
  })()
  const hinrundeEnde = Math.ceil(schedule.length / 2) - 1
  const herbstRows = calcTableUpTo(schedule, results, hinrundeEnde)
  const herbstIdx = schedule.slice(0, hinrundeEnde + 1).every(st => st.every(m => results[gameId(m.home, m.away)])) ? herbstRows[0]?.i : -1

  return (
    <div className="mobile-view">
      <div className="mobile-tabs">
        {['spieltage', 'tabelle', 'torschuetzen'].map(t => (
          <button key={t} className={`mobile-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'spieltage' ? 'Spieltage' : t === 'tabelle' ? 'Tabelle' : 'Torschützen'}
          </button>
        ))}
      </div>

      <div className="mobile-content">
        {tab === 'spieltage' && (
          <SpieltagView schedule={schedule} results={results} players={players} spieltag={spieltag} setSpieltag={setSpieltag} />
        )}
        {tab === 'tabelle' && (
          <div style={{ padding: '12px 16px' }}>
            <Tabelle schedule={schedule} results={results} players={players} upTo={latestST} />
          </div>
        )}
        {tab === 'torschuetzen' && (
          <div style={{ padding: '12px 16px' }}>
            <Torschuetzen schedule={schedule} results={results} players={players} upTo={latestST} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tournament, setTournament] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [spieltag, setSpieltag] = useState(0)
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

  if (loading) return <div className="empty">Laden…</div>

  if (!tournament?.liveActive) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gruen)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img src="/trommel.svg" alt="" style={{ height: 80, opacity: 0.3 }} />
        <div style={{ fontFamily: 'Bayon, sans-serif', fontSize: 26, color: 'var(--weiss60)', textAlign: 'center', padding: '0 32px' }}>
          Momentan findet kein Live-Trommel-Event statt
        </div>
        <div style={{ fontSize: 13, color: 'var(--weiss30)' }}>live.trommelschiessen.de</div>
      </div>
    )
  }

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []

  const getLatestSpieltag = () => {
    for (let i = schedule.length - 1; i >= 0; i--)
      if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i
    return 0
  }
  const latestST = getLatestSpieltag()

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="mobile-only">
        <div className="app-header">
          <div className="header-left">
            <img src="/trommel.svg" alt="" style={{ height: 44, marginRight: 10 }} />
            <div>
              <div className="logo" style={{ fontSize: 20 }}>TRMMLR</div>
              <div className="event-name">10. Trommelschießen-WM · 06.06.2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="clock" style={{ fontSize: 18 }}>{clock}</div>
            {tournament?.started && <span className="live-badge">LIVE</span>}
          </div>
        </div>
        <MobileView schedule={schedule} results={results} players={players} />
      </div>

      {/* ── DESKTOP ── */}
      <div className="desktop-only" style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        {/* Header */}
        <div className="app-header">
          <div className="header-left">
            <img src="/trommel.svg" alt="" style={{ height: 52, marginRight: 14 }} />
            <div>
              <div className="logo">TRMMLR</div>
              <div className="event-name">10. Trommelschießen-WM · 06.06.2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="clock">{clock}</div>
            {tournament?.started && <span className="live-badge">LIVE</span>}
          </div>
        </div>

        {/* Main */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Paarungen */}
          <div style={{ padding: '20px 36px', borderRight: '0.5px solid var(--gruen40)' }}>
            <SpieltagView schedule={schedule} results={results} players={players} spieltag={spieltag} setSpieltag={setSpieltag} />
          </div>

          {/* Sidebar */}
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

        {/* Footer */}
        <div className="app-footer">
          <div className="footer-txt">live.trommelschiessen.de</div>
          <div className="footer-txt">Édition Jubilaire · 2006–2026</div>
        </div>
      </div>
    </>
  )
}
