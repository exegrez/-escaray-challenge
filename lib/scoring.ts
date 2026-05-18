import { Training, DailyReport } from './types'

export function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export function getTrainingSessionsByDay(trainings: Training[]): Record<string, Training[]> {
  const byDay: Record<string, Training[]> = {}
  trainings.forEach(t => {
    if (!byDay[t.date]) byDay[t.date] = []
    byDay[t.date].push(t)
  })
  return byDay
}

export function calcPerfectWeeks(trainings: Training[], reports: DailyReport[]): number {
  const weeks = new Set([
    ...trainings.map(t => getWeekKey(t.date)),
    ...reports.map(r => getWeekKey(r.date)),
  ])
  let count = 0
  weeks.forEach(week => {
    const wt = trainings.filter(t => getWeekKey(t.date) === week)
    const wr = reports.filter(r => getWeekKey(r.date) === week)
    const uniqueDays = new Set(wt.map(t => t.date)).size
    if (
      uniqueDays >= 5 &&
      wt.some(t => t.is_monday_escaray) &&
      wr.filter(r => r.woke_at_730).length >= 4 &&
      wr.every(r => (!r.had_spirits || r.used_green_card) && (r.tobacco_count <= 1 || r.used_green_card))
    ) count++
  })
  return count
}

export function calcStreak(trainings: Training[], reports: DailyReport[]): number {
  const allWeeks = Array.from(new Set([
    ...trainings.map(t => getWeekKey(t.date)),
    ...reports.map(r => getWeekKey(r.date)),
  ])).sort().reverse()

  let streak = 0
  for (const week of allWeeks) {
    const wt = trainings.filter(t => getWeekKey(t.date) === week)
    const wr = reports.filter(r => getWeekKey(r.date) === week)
    const uniqueDays = new Set(wt.map(t => t.date)).size
    if (
      uniqueDays >= 5 &&
      wt.some(t => t.is_monday_escaray) &&
      wr.filter(r => r.woke_at_730).length >= 4 &&
      wr.every(r => (!r.had_spirits || r.used_green_card) && (r.tobacco_count <= 1 || r.used_green_card))
    ) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function calcPenalties(trainings: Training[], reports: DailyReport[]): number {
  let penalties = 0
  const byWeek: Record<string, DailyReport[]> = {}
  reports.forEach(r => {
    const week = getWeekKey(r.date)
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push(r)
  })
  Object.values(byWeek).forEach(weekReports => {
    weekReports.forEach(r => {
      if (r.had_spirits && !r.used_green_card) penalties += 30
      if (r.tobacco_count > 1 && !r.used_green_card) penalties += (r.tobacco_count - 1) * 5
    })
    const pajasThisWeek = weekReports.filter(r => r.had_paja && !r.used_green_card).length
    if (pajasThisWeek > 1) penalties += (pajasThisWeek - 1) * 20
  })
  return penalties
}

export function calcWeeklyScore(
  weekTrainings: Training[],
  weekReports: DailyReport[],
): number {
  let score = 0
  const byDay = getTrainingSessionsByDay(weekTrainings)

  Object.values(byDay).forEach(daySessions => {
    const [first, second, third, ...rest] = daySessions
    if (first) score += 10
    if (second) score += 15
    if (third) score += 30
    // sesiones adicionales (4ta en adelante) también suman 30
    rest.forEach(() => { score += 30 })
  })

  if (weekTrainings.some(t => t.is_monday_escaray)) score += 15

  weekReports.forEach(r => {
    if (r.woke_at_730) score += 5
    if (r.had_spirits && !r.used_green_card) score -= 30
    if (r.tobacco_count > 1 && !r.used_green_card) score -= (r.tobacco_count - 1) * 5
  })

  const pajasThisWeek = weekReports.filter(r => r.had_paja && !r.used_green_card).length
  if (pajasThisWeek > 1) score -= (pajasThisWeek - 1) * 20

  return score
}

export function calcScore(trainings: Training[], reports: DailyReport[]): number {
  const allWeeks = new Set([
    ...trainings.map(t => getWeekKey(t.date)),
    ...reports.map(r => getWeekKey(r.date)),
  ])

  let score = 0
  allWeeks.forEach(week => {
    const wt = trainings.filter(t => getWeekKey(t.date) === week)
    const wr = reports.filter(r => getWeekKey(r.date) === week)
    score += calcWeeklyScore(wt, wr)
  })

  score += calcPerfectWeeks(trainings, reports) * 25

  return Math.max(0, score)
}

export function calcDoubleKillDays(trainings: Training[]): number {
  const byDay = getTrainingSessionsByDay(trainings)
  return Object.values(byDay).filter(sessions => sessions.length === 2).length
}

export function calcSayayinDays(trainings: Training[]): number {
  const byDay = getTrainingSessionsByDay(trainings)
  return Object.values(byDay).filter(sessions => sessions.length >= 3).length
}

export function calcWeekScoreForPato(
  trainings: Training[],
  reports: DailyReport[],
  weekKey: string,
): number {
  const wt = trainings.filter(t => getWeekKey(t.date) === weekKey)
  const wr = reports.filter(r => getWeekKey(r.date) === weekKey)
  return calcWeeklyScore(wt, wr)
}

export function getCompliancePct(trainings: Training[], reports: DailyReport[]): number {
  const totalDays = reports.length
  if (totalDays === 0) return 100

  let compliantDays = 0
  reports.forEach(r => {
    if (!r.had_spirits || r.used_green_card) compliantDays++
  })

  const byDay = getTrainingSessionsByDay(trainings)
  const uniqueTrainingDays = Object.keys(byDay)

  const weeklyTrainingOk = Object.values(
    uniqueTrainingDays.reduce((acc, date) => {
      const week = getWeekKey(date)
      acc[week] = (acc[week] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).filter(count => count >= 5).length

  const totalWeeks = Object.keys(
    uniqueTrainingDays.reduce((acc, date) => {
      acc[getWeekKey(date)] = true
      return acc
    }, {} as Record<string, boolean>)
  ).length

  const trainingCompliance = totalWeeks > 0 ? weeklyTrainingOk / totalWeeks : 1
  const dayCompliance = compliantDays / totalDays

  return Math.round(((trainingCompliance + dayCompliance) / 2) * 100)
}
