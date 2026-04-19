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

export function assignMachines(rounds, N, M) {
  const cnt = Array.from({ length: N }, () => Array(M).fill(0))
  return rounds.map(round => {
    const used = new Set(), assigned = []
    for (let m = 0; m < M && m < round.length; m++) {
      let bestIdx = -1, bestScore = Infinity
      round.forEach(({ home, away }, idx) => {
        if (used.has(idx)) return
        const s = cnt[home][m] + cnt[away][m]
        if (s < bestScore) { bestScore = s; bestIdx = idx }
      })
      if (bestIdx >= 0) {
        const { home, away } = round[bestIdx]
        used.add(bestIdx); assigned.push({ home, away, machine: m })
        cnt[home][m]++; cnt[away][m]++
      }
    }
    round.forEach(({ home, away }, idx) => {
      if (used.has(idx)) return
      const m = assigned.length % M
      assigned.push({ home, away, machine: m })
      cnt[home][m]++; cnt[away][m]++
    })
    return assigned
  })
}

export function buildSchedule(players, numMachines) {
  const N = players.length
  const hin = buildRoundRobin(N)
  const rueck = hin.map(r => r.map(({ home, away }) => ({ home: away, away: home })))
  return assignMachines([...hin, ...rueck], N, numMachines)
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
