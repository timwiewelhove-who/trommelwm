import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { gameId, calcTableUpTo, calcTorschuetzenUpTo } from './logic'
import './styles.css'

function getMatchStatus(match, allMatchesThisST, results) {
  const gid = gameId(match.home, match.away)
  if (results[gid]) return 'done'
  const idx = allMatchesThisST.indexOf(match)
  const sameM = allMatchesThisST.filter((m, i) => m.machine === match.machine && i < idx)
  const allPrevDone = sameM.every(m => results[gameId(m.home, m.away)])
  return allPrevDone ? 'active' : 'pending'
}

function Tabelle({ schedule, results, players, upTo, torLeaderIdx = new Set() }) {
  const rows = calcTableUpTo(schedule, results, upTo)
  const hinrundeEnde = Math.ceil(schedule.length / 2) - 1
  const herbstRows = calcTableUpTo(schedule, results, hinrundeEnde)
  const herbstIdx = herbstRows[0]?.sp > 0 ? herbstRows[0].i : -1
  const hinrundeDone = schedule.slice(0, hinrundeEnde + 1).every(st => st.every(m => results[gameId(m.home, m.away)]))
  return (
    <table className="tabelle-table">
      <thead><tr>
        <th style={{ width: 40, minWidth: 40 }}>#</th>
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
              <td className="t-rank" style={{ width: 40, minWidth: 40, paddingRight: 8 }}>{idx + 1}</td>
              <td className="t-name">
                {idx === 0 && r.sp > 0 && <span style={{ marginRight: 5 }}>🏆</span>}
                {torLeaderIdx.has(r.i) && r.sp > 0 && <span style={{ marginRight: 5, fontSize: 14 }}>👑</span>}
                {hinrundeDone && r.i === herbstIdx && <span style={{ marginRight: 5, fontSize: 13 }}>🍂</span>}
                {players[r.i]}
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

function TorschuetzenMobile({ schedule, results, players, upTo }) {
  const rows = calcTorschuetzenUpTo(schedule, results, players, upTo)
  if (rows.length === 0) return null
  const leaderTore = rows[0].tore
  return (
    <table className="tabelle-table" style={{ marginTop: 8 }}>
      <thead><tr>
        <th style={{ width: 40, minWidth: 40 }}>#</th>
        <th>Trommler</th>
        <th style={{ textAlign: 'right', width: 40 }}>T</th>
        <th style={{ textAlign: 'right', width: 60 }}>Ø</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.i}>
            <td className="t-rank" style={{ width: 40, minWidth: 40, paddingRight: 8 }}>{i + 1}</td>
            <td className="t-name">
              {r.tore === leaderTore && r.tore > 0 && <span style={{ marginRight: 4 }}>👑</span>}
              {r.name}
            </td>
            <td className="t-pts" style={{ textAlign: 'right' }}>{r.tore}</td>
            <td className="t-num" style={{ textAlign: 'right' }}>{r.avg.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MatchRow({ m, players, results, status, torLeaderIdx, tableLeaderIdx, mobile }) {
  const r = results[gameId(m.home, m.away)]
  const homeIcons = <>
    {tableLeaderIdx === m.home && <span style={{ marginRight: 3 }}>🏆</span>}
    {torLeaderIdx?.has(m.home) && <span style={{ marginRight: 3 }}>👑</span>}
  </>
  const awayIcons = <>
    {tableLeaderIdx === m.away && <span style={{ marginRight: 3 }}>🏆</span>}
    {torLeaderIdx?.has(m.away) && <span style={{ marginRight: 3 }}>👑</span>}
  </>

  if (mobile) {
    return (
      <div className={`mobile-match-card ${status}`}>
        <div className="mobile-match-machine">Maschine {m.machine + 1}</div>
        <div className="mobile-match-row">
          <span className="mobile-match-name home">{homeIcons}{players[m.home]}</span>
          <span className="mobile-match-score">{status === 'done' ? `${r.home} : ${r.away}` : '– : –'}</span>
          <span className="mobile-match-name away">{awayIcons}{players[m.away]}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`kicker-match ${status}`}>
      <span className="kicker-m-label">M{m.machine + 1}</span>
      <div className="kicker-home"><span style={{ whiteSpace: 'nowrap' }}>{homeIcons}{players[m.home]}</span></div>
      <div className="kicker-score">
        {status === 'done'
          ? <><span className="kicker-score-num">{r.home}</span><span className="kicker-score-sep">:</span><span className="kicker-score-num">{r.away}</span></>
          : <span className="kicker-score-pending">– : –</span>}
      </div>
      <div className="kicker-away"><span style={{ whiteSpace: 'nowrap' }}>{awayIcons}{players[m.away]}</span></div>
    </div>
  )
}

function SpieltagView({ schedule, results, players, spieltag, setSpieltag, torLeaderIdx = new Set(), tableLeaderIdx = -1, mobile = false }) {
  const doneSet = new Set(schedule.map((st, i) => st.every(m => results[gameId(m.home, m.away)]) ? i : -1).filter(i => i >= 0))
  const st = schedule[spieltag] || []
  const numM = schedule[0] ? Math.max(...schedule[0].map(m => m.machine)) + 1 : 6
  const rounds = []
  for (let i = 0; i < st.length; i += numM) rounds.push(st.slice(i, i + numM))

  return (
    <>
      {mobile ? (
        /* Mobile: Dropdown zentriert, Nav linksbündig/rechtsbündig */
        <div className="mobile-st-wrapper">
          <div className="mobile-st-top">
            <select className="kicker-st-select mobile-st-sel" value={spieltag} onChange={e => setSpieltag(parseInt(e.target.value))}>
              {schedule.map((_, i) => <option key={i} value={i}>Spieltag {i + 1}{doneSet.has(i) ? ' ·' : ''}</option>)}
            </select>
            <span className="kicker-st-info">{st.length} Paarungen · Spieltag {spieltag + 1} / {schedule.length}</span>
          </div>
          <div className="mobile-st-nav">
            <button className="page-btn" disabled={spieltag === 0} onClick={() => setSpieltag(s => s - 1)}>← Vorheriger Spieltag</button>
            <button className="page-btn primary" disabled={spieltag >= schedule.length - 1} onClick={() => setSpieltag(s => s + 1)}>Nächster Spieltag →</button>
          </div>
        </div>
      ) : (
        <div className="kicker-st-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <select className="kicker-st-select" value={spieltag} onChange={e => setSpieltag(parseInt(e.target.value))}>
              {schedule.map((_, i) => <option key={i} value={i}>Spieltag {i + 1}{doneSet.has(i) ? ' ·' : ''}</option>)}
            </select>
            <span className="kicker-st-info">{st.length} Paarungen · Spieltag {spieltag + 1} / {schedule.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="page-btn" disabled={spieltag === 0} onClick={() => setSpieltag(s => s - 1)}>← Vorheriger Spieltag</button>
            <button className="page-btn primary" disabled={spieltag >= schedule.length - 1} onClick={() => setSpieltag(s => s + 1)}>Nächster Spieltag →</button>
          </div>
        </div>
      )}

      <div className={mobile ? 'mobile-matches-list' : 'kicker-matches'}>
        {rounds.flatMap((round, ri) => [
          ...(ri > 0 ? [<div key={`divider-${ri}`} className="round-divider">
            <div className="round-divider-line" />
            <span className="round-divider-label">Nächste Runde</span>
            <div className="round-divider-line" />
          </div>] : []),
          ...round.map((m, idx) => {
            const status = getMatchStatus(m, st, results)
            return <MatchRow key={`${ri}-${idx}`} m={m} players={players} results={results} status={status} torLeaderIdx={torLeaderIdx} tableLeaderIdx={tableLeaderIdx} mobile={mobile} />
          })
        ])}
      </div>
    </>
  )
}

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

  const allTorRows = calcTorschuetzenUpTo(schedule, results, players, latestST)
  const leaderTore = allTorRows[0]?.tore || 0
  const leaderSet = new Set(allTorRows.filter(r => r.tore === leaderTore && leaderTore > 0).map(r => r.i))
  const tableRows0 = calcTableUpTo(schedule, results, latestST)
  const tableLeader = tableRows0[0]?.sp > 0 ? tableRows0[0].i : -1

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
          <SpieltagView schedule={schedule} results={results} players={players} spieltag={spieltag} setSpieltag={setSpieltag} torLeaderIdx={leaderSet} tableLeaderIdx={tableLeader} mobile={true} />
        )}
        {tab === 'tabelle' && (
          <div style={{ padding: '12px 16px' }}>
            <Tabelle schedule={schedule} results={results} players={players} upTo={latestST} torLeaderIdx={leaderSet} />
          </div>
        )}
        {tab === 'torschuetzen' && (
          <div style={{ padding: '12px 16px' }}>
            <TorschuetzenMobile schedule={schedule} results={results} players={players} upTo={latestST} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [tournament, setTournament] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [spieltag, setSpieltag] = useState(0)
  const [manualOverride, setManualOverride] = useState(false)
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
      setTournament({ id: t.id, players: t.players, numMachines: t.num_machines, schedule: t.schedule, started: t.started, liveActive: t.live_active, activeSpieltag: t.active_spieltag ?? 0 })
    }
    const { data: rData } = await supabase.from('results').select('*')
    if (rData) {
      const rMap = {}
      rData.forEach(r => { rMap[r.game_id] = { home: r.home_score, away: r.away_score } })
      setResults(rMap)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!manualOverride && tournament?.activeSpieltag !== undefined) setSpieltag(tournament.activeSpieltag)
  }, [tournament?.activeSpieltag, manualOverride])

  if (loading) return <div className="empty">Laden…</div>

  if (!tournament?.liveActive) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gruen)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img src="/trommel.svg" alt="" style={{ height: 80, opacity: 0.3 }} />
        <div style={{ fontFamily: 'Bayon, sans-serif', fontSize: 26, color: 'var(--weiss60)', textAlign: 'center', padding: '0 32px' }}>Momentan findet kein Live-Trommel-Event statt</div>
        <div style={{ fontSize: 13, color: 'var(--weiss30)' }}>live.trommelschiessen.de</div>
      </div>
    )
  }

  const schedule = tournament?.schedule || []
  const players = tournament?.players || []
  const latestST = (() => { for (let i = schedule.length - 1; i >= 0; i--) if (schedule[i].some(m => results[gameId(m.home, m.away)])) return i; return 0 })()
  const allTorRows = calcTorschuetzenUpTo(schedule, results, players, latestST)
  const leaderTore = allTorRows[0]?.tore || 0
  const leaderSet = new Set(allTorRows.filter(r => r.tore === leaderTore && leaderTore > 0).map(r => r.i))
  const tableRowsD = calcTableUpTo(schedule, results, latestST)
  const tableLeaderD = tableRowsD[0]?.sp > 0 ? tableRowsD[0].i : -1

  return (
    <>
      <div className="mobile-only">
        <div className="mobile-header">
          <div className="mobile-header-left">
            <img src="/trommel.svg" alt="" className="mobile-header-logo" />
            <div className="mobile-header-brand">
              <div className="mobile-header-trmmlr">TRMMLR</div>
              <div className="mobile-header-sub">10. Trommelschießen-WM</div>
              <div className="mobile-header-date">06.06.2026</div>
            </div>
          </div>
          <div className="mobile-header-right">
            {tournament?.started && <span className="live-badge">LIVE</span>}
            <div className="mobile-header-clock">{clock}</div>
          </div>
        </div>
        <MobileView schedule={schedule} results={results} players={players} />
      </div>

      <div className="desktop-only" style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr' }}>
          <div style={{ padding: '24px 48px', borderRight: '0.5px solid var(--gruen40)' }}>
            <SpieltagView schedule={schedule} results={results} players={players} spieltag={spieltag} setSpieltag={s => { setManualOverride(true); setSpieltag(s) }} torLeaderIdx={leaderSet} tableLeaderIdx={tableLeaderD} />
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div className="section-label">Tabelle</div>
            <Tabelle schedule={schedule} results={results} players={players} upTo={latestST} torLeaderIdx={leaderSet} />
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
