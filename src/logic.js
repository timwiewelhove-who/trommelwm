export function buildRoundRobin(N, firstPlayerId = 0) {
  // Sieger des letzten Turniers (firstPlayerId) beginnt mit Heimrecht in Partie 1
  const n = N % 2 === 0 ? N : N + 1

  // Erzeuge Spieler-Array mit firstPlayerId an Position 0 (fixiert)
  const others = [...Array(N).keys()].filter(i => i !== firstPlayerId)
  const players = [firstPlayerId, ...others]

  // Auffüllen bei ungerader Zahl (Freilos = Index N, wird später gefiltert)
  while (players.length < n) players.push(N) // N = Freilos-Marker

  const rotating = players.slice(1)
  const rounds = []

  for (let r = 0; r < n - 1; r++) {
    const circle = [players[0], ...rotating], round = []
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i], b = circle[n - 1 - i]
      // Freilos-Spiele überspringen
      if (a < N && b < N) round.push({ home: a, away: b })
    }
    // Erste Runde: firstPlayerId spielt immer als Heim (home)
    if (r === 0) {
      const idx = round.findIndex(m => m.home === firstPlayerId || m.away === firstPlayerId)
      if (idx >= 0 && round[idx].away === firstPlayerId) {
        round[idx] = { home: round[idx].away, away: round[idx].home }
      }
    }
    rounds.push(round)
    rotating.unshift(rotating.pop())
  }
  // Sicherstellen dass firstPlayerId in Runde 1 spielt (kein Freilos)
  const playsInRound0 = rounds[0].some(m => m.home === firstPlayerId || m.away === firstPlayerId)
  if (!playsInRound0) {
    // Erste Runde finden in der firstPlayerId spielt
    const swapIdx = rounds.findIndex((r, i) => i > 0 && r.some(m => m.home === firstPlayerId || m.away === firstPlayerId))
    if (swapIdx > 0) {
      // Runden tauschen
      const tmp = rounds[0]
      rounds[0] = rounds[swapIdx]
      rounds[swapIdx] = tmp
    }
  }
  // Heimrecht in Runde 1 sicherstellen
  const matchIdx = rounds[0].findIndex(m => m.home === firstPlayerId || m.away === firstPlayerId)
  if (matchIdx >= 0 && rounds[0][matchIdx].away === firstPlayerId) {
    rounds[0][matchIdx] = { home: rounds[0][matchIdx].away, away: rounds[0][matchIdx].home }
  }
  // Spiel nach vorne in Runde 1
  if (matchIdx > 0) {
    const match = rounds[0].splice(matchIdx, 1)[0]
    rounds[0].unshift(match)
  }

  return rounds
}

function assignRounds(rounds, N, M, playerMachineCnt) {
  const machineTotalCnt = Array(M).fill(0)
  for (let m = 0; m < M; m++)
    for (let p = 0; p < N; p++) machineTotalCnt[m] += playerMachineCnt[p][m]
  for (let m = 0; m < M; m++) machineTotalCnt[m] = Math.round(machineTotalCnt[m] / 2)

  return rounds.map(round => {
    const result = []
    for (let pageStart = 0; pageStart < round.length; pageStart += M) {
      const page = round.slice(pageStart, pageStart + M)
      const usedMatchIndices = new Set()
      const pageAssigned = []
      const machineOrder = [...Array(M).keys()].sort((a, b) => machineTotalCnt[a] - machineTotalCnt[b])
      for (const m of machineOrder) {
        if (pageAssigned.length >= page.length) break
        let bestIdx = -1, bestScore = Infinity
        page.forEach(({ home, away }, idx) => {
          if (usedMatchIndices.has(idx)) return
          const score = playerMachineCnt[home][m] + playerMachineCnt[away][m]
          if (score < bestScore) { bestScore = score; bestIdx = idx }
        })
        if (bestIdx >= 0) {
          const { home, away } = page[bestIdx]
          usedMatchIndices.add(bestIdx)
          pageAssigned.push({ home, away, machine: m })
          machineTotalCnt[m]++
          playerMachineCnt[home][m]++
          playerMachineCnt[away][m]++
        }
      }
      pageAssigned.sort((a, b) => a.machine - b.machine)
      result.push(...pageAssigned)
    }
    return result
  })
}

export function buildSchedule(players, numMachines, previousWinnerId = 0) {
  const N = players.length
  const hin = buildRoundRobin(N, previousWinnerId)
  const rueck = hin.map(r => r.map(({ home, away }) => ({ home: away, away: home })))
  const playerMachineCnt = Array.from({ length: N }, () => Array(numMachines).fill(0))
  const hinAssigned = assignRounds(hin, N, numMachines, playerMachineCnt)
  const rueckAssigned = assignRounds(rueck, N, numMachines, playerMachineCnt)
  return [...hinAssigned, ...rueckAssigned]
}

export function gameId(a, b) { return `${a}_${b}` }

export function calcTableUpTo(schedule, results, upTo) {
  const N = schedule[0] ? Math.max(...schedule.flatMap(st => st.flatMap(m => [m.home, m.away]))) + 1 : 0
  const rows = Array.from({ length: N }, (_, i) => ({ i, sp: 0, s: 0, u: 0, n: 0, tore: 0, gegen: 0, pkt: 0 }))
  for (let si = 0; si <= upTo && si < schedule.length; si++) {
    schedule[si].forEach(m => {
      const r = results[gameId(m.home, m.away)]
      if (!r) return
      rows[m.home].sp++; rows[m.home].tore += r.home; rows[m.home].gegen += r.away
      rows[m.away].sp++; rows[m.away].tore += r.away; rows[m.away].gegen += r.home
      if (r.home > r.away) { rows[m.home].s++; rows[m.home].pkt += 3; rows[m.away].n++ }
      else if (r.home < r.away) { rows[m.away].s++; rows[m.away].pkt += 3; rows[m.home].n++ }
      else { rows[m.home].u++; rows[m.home].pkt++; rows[m.away].u++; rows[m.away].pkt++ }
    })
  }
  return rows.sort((a, b) => {
    if (b.pkt !== a.pkt) return b.pkt - a.pkt
    const tdA = a.tore - a.gegen, tdB = b.tore - b.gegen
    if (tdB !== tdA) return tdB - tdA
    return b.tore - a.tore
  })
}

export function calcTorschuetzenUpTo(schedule, results, players, upTo) {
  const data = players.map((name, i) => ({ name, i, tore: 0, sp: 0, avg: 0 }))
  for (let si = 0; si <= upTo && si < schedule.length; si++) {
    schedule[si].forEach(m => {
      const r = results[gameId(m.home, m.away)]
      if (!r) return
      if (m.home < data.length) { data[m.home].tore += r.home; data[m.home].sp++ }
      if (m.away < data.length) { data[m.away].tore += r.away; data[m.away].sp++ }
    })
  }
  data.forEach(d => { d.avg = d.sp > 0 ? d.tore / d.sp : 0 })

  // Sortieren – bei Gleichstand mehrere Torschützenkönige möglich
  data.sort((a, b) => b.tore !== a.tore ? b.tore - a.tore : b.avg - a.avg)
  return data
}

// Gibt true zurück wenn mehrere Spieler denselben Torehöchststand haben
export function getTopTorschuetzen(torschuetzen) {
  if (!torschuetzen.length) return []
  const maxTore = torschuetzen[0].tore
  if (maxTore === 0) return []
  return torschuetzen.filter(t => t.tore === maxTore)
}

// Weltranglisten-Punkte basierend auf aktuellem Tabellenstand
export function calcWeltranglistePunkte(tabelle) {
  const schema = { 1: 100, 2: 80, 3: 70, 4: 60, 5: 50, 6: 40, 7: 35, 8: 30, 9: 25, 10: 20 }
  return tabelle.map((r, i) => ({
    playerIdx: r.i,
    punkte: schema[i + 1] ?? Math.max(1, 15 - i)
  }))
}
