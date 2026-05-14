import { Training, DailyReport } from './types'

export function calcScore(trainings: Training[], reports: DailyReport[]): number {
  let score = 0

  // Agrupar entrenamientos por semana
  const byWeek: Record<string, Training[]> = {}
  trainings.forEach(t => {
    const week = getWeekKey(t.date)
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push(t)
  })

  Object.values(byWeek).forEach(weekTrainings => {
    const count = weekTrainings.length
    score += Math.min(count, 5) * 10
    if (count >= 5) score += 25
    const mondayDone = weekTrainings.some(t => t.is_monday_escaray)
    if (mondayDone) score += 15
  })

  // Agrupar reportes por semana
  const reportsByWeek: Record<string, DailyReport[]> = {}
  reports.forEach(r => {
    const week = getWeekKey(r.date)
    if (!reportsByWeek[week]) reportsByWeek[week] = []
    reportsByWeek[week].push(r)
  })

  Object.values(reportsByWeek).forEach(weekReports => {
    weekReports.forEach(r => {
      if (r.woke_at_730) score += 5
      if (r.had_spirits && !r.used_green_card) score -= 30
      if (r.tobacco_count > 1 && !r.used_green_card) score -= (r.tobacco_count - 1) * 5
    })

    const pajasThisWeek = weekReports.filter(r => r.had_paja && !r.used_green_card).length
    if (pajasThisWeek > 1) score -= (pajasThisWeek - 1) * 20
  })

  return Math.max(0, score)
}

export function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export function getCompliancePct(trainings: Training[], reports: DailyReport[]): number {
  const totalDays = reports.length
  if (totalDays === 0) return 100

  let compliantDays = 0
  reports.forEach(r => {
    const isOk = !r.had_spirits || r.used_green_card
    if (isOk) compliantDays++
  })

  const weeklyTrainingOk = Object.values(
    trainings.reduce((acc, t) => {
      const week = getWeekKey(t.date)
      acc[week] = (acc[week] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).filter(count => count >= 5).length

  const totalWeeks = Object.keys(
    trainings.reduce((acc, t) => {
      acc[getWeekKey(t.date)] = true
      return acc
    }, {} as Record<string, boolean>)
  ).length

  const trainingCompliance = totalWeeks > 0 ? weeklyTrainingOk / totalWeeks : 1
  const dayCompliance = compliantDays / totalDays

  return Math.round(((trainingCompliance + dayCompliance) / 2) * 100)
}
