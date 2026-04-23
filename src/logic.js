export function buildRoundRobin(N) {
  const n = N % 2 === 0 ? N : N + 1
  const rotating = [...Array(n - 1).keys()].map(i => i + 1)
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const circle = [0, ...rotating], round = []
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i], b = circle[n - 1 - i]
      if (a < N && b < N) round.push({ home: a, away: b })
    }
    rounds.push(round)
    rotating.unshift(rotating.pop())
  }
  return rounds
}

// Weise Matches zu – pro Seite (à M Matches) eindeutige Maschinen, seitenweise aufsteigend sortiert
function assignRounds(rounds, N, M, playerMachineCnt) {
  const machineTotalCnt = Array(M).fill(0)
  for (let m = 0; m < M; m++)
    for (let p = 0; p < N; p++) machineTotalCnt[m] += playerMachineCnt[p][m]
  for (let m = 0; m < M; m++) machineTotalCnt[m] = Math.round(machineTotalCnt[m] / 2)

  return rounds.map(round => {
    const result = []

    // Teile in Seiten à M Matches
    for (let pageStart = 0; pageStart < round.length; pageStart += M) {
      const page = round.slice(pageStart, pageStart + M)
      const usedMatchIndices = new Set()
      const pageAssigned = []

      // Maschinen nach Gesamtnutzung sortieren (wenig genutzt = Vorrang)
      const machineOrder = [...Array(M).keys()]
        .sort((a, b) => machineTotalCnt[a] - machineTotalCnt[b])

      for (const m of machineOrder) {
        if (pageAssigned.length >= page.length) break

        // Bestes freies Match für diese Maschine
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

      // Diese Seite aufsteigend nach Maschine sortieren
      pageAssigned.sort((a, b) => a.machine - b.machine)
      result.push(...pageAssigned)
    }

    return result
  })
}

export function buildSchedule(players, numMachines) {
  const N = players.length
  const hin = buildRoundRobin(N)
  const rueck = hin.map(r => r.map(({ home, away }) => ({ home: away, away: home })))
  const playerMachineCnt = Array.from({ length: N }, () => Array(numMachines).fill(0))
  const hinAssigned = assignRounds(hin, N, numMachines, playerMachineCnt)
  const rueckAssigned = assignRounds(rueck, N, numMachines, playerMachineCnt)
  return [...hinAssigned, ...rueckAssigned]
}

export function gameId(a, b) { return `${a}_${b}` }

export function calcTableUpTo(schedule, results, upTo) {
  const rows = Array.from({ length: schedule[0] ? Math.max(...schedule.flatMap(st => st.flatMap(m => [m.home, m.away]))) + 1 : 0 }, (_, i) => ({
    i, sp: 0, s: 0, u: 0, n: 0, tore: 0, gegen: 0, pkt: 0
  }))
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
  return players.map((name, i) => {
    let tore = 0, sp = 0
    for (let si = 0; si <= upTo && si < schedule.length; si++) {
      schedule[si].forEach(m => {
        const r = results[gameId(m.home, m.away)]
        if (!r) return
        if (m.home === i) { tore += r.home; sp++ }
        if (m.away === i) { tore += r.away; sp++ }
      })
    }
    return { name, i, tore, sp, avg: sp > 0 ? tore / sp : 0 }
  }).sort((a, b) => b.tore !== a.tore ? b.tore - a.tore : b.avg - a.avg)
}
