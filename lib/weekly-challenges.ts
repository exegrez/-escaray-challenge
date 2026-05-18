import { Training, DailyReport } from './types'

export interface WeeklyChallenge {
  week: number
  icon: string
  title: string
  badgeName: string
  description: string
  reward: number
  evaluate: (trainings: Training[], reports: DailyReport[]) => boolean
}

export const CHALLENGES: WeeklyChallenge[] = [
  {
    week: 1, icon: '🚀', title: 'Despegue', badgeName: 'Despegue',
    description: 'Completa los 5 entrenos esta semana', reward: 30,
    evaluate: (t) => t.length >= 5,
  },
  {
    week: 2, icon: '🚭', title: 'Pulmón Limpio', badgeName: 'Pulmón Limpio',
    description: 'Sin cigarros todos los días (mín. 3 días reportados)', reward: 25,
    evaluate: (_, r) => r.length >= 3 && r.every(rep => rep.tobacco_count === 0),
  },
  {
    week: 3, icon: '⏰', title: 'El Madrugador', badgeName: 'El Madrugador',
    description: 'Levántate a las 7:30 al menos 4 días', reward: 20,
    evaluate: (_, r) => r.filter(rep => rep.woke_at_730).length >= 4,
  },
  {
    week: 4, icon: '🏠', title: 'Guardián', badgeName: 'Guardián de Escaray',
    description: '5 entrenos + Lunes en Escaray', reward: 35,
    evaluate: (t) => t.length >= 5 && t.some(tr => tr.is_monday_escaray),
  },
  {
    week: 5, icon: '💧', title: 'Sobrio', badgeName: 'Sobrio',
    description: 'Sin destilados en toda la semana (mín. 3 días reportados)', reward: 25,
    evaluate: (_, r) => r.length >= 3 && r.every(rep => !rep.had_spirits || rep.used_green_card),
  },
  {
    week: 6, icon: '💪', title: 'Acero', badgeName: 'Semana de Acero',
    description: '6 entrenamientos esta semana', reward: 40,
    evaluate: (t) => t.length >= 6,
  },
  {
    week: 7, icon: '🌙', title: 'El Monje', badgeName: 'El Monje',
    description: 'Sin paja en toda la semana (mín. 3 días reportados)', reward: 30,
    evaluate: (_, r) => r.length >= 3 && r.every(rep => !rep.had_paja || rep.used_green_card),
  },
  {
    week: 8, icon: '🌅', title: 'Alba Eterna', badgeName: 'Alba Eterna',
    description: 'Levántate a las 7:30 TODOS los días que reportes (mín. 4 días)', reward: 30,
    evaluate: (_, r) => r.length >= 4 && r.every(rep => rep.woke_at_730),
  },
  {
    week: 9, icon: '🚫', title: 'Restricción Total', badgeName: 'Restricción Total',
    description: 'Sin tabaco Y sin destilados toda la semana', reward: 40,
    evaluate: (_, r) =>
      r.length >= 3 &&
      r.every(rep => rep.tobacco_count === 0 && (!rep.had_spirits || rep.used_green_card)),
  },
  {
    week: 10, icon: '⚡', title: 'Sprint', badgeName: 'Sprint de Mitad',
    description: '5 entrenos Y 4 días a las 7:30', reward: 35,
    evaluate: (t, r) => t.length >= 5 && r.filter(rep => rep.woke_at_730).length >= 4,
  },
  {
    week: 11, icon: '🏆', title: 'Perfección', badgeName: 'La Perfección',
    description: '5 entrenos + Lunes Escaray + sin penalizaciones + 4 días a las 7:30', reward: 60,
    evaluate: (t, r) =>
      t.length >= 5 &&
      t.some(tr => tr.is_monday_escaray) &&
      r.filter(rep => rep.woke_at_730).length >= 4 &&
      r.every(rep => (!rep.had_spirits || rep.used_green_card) && (rep.tobacco_count <= 1 || rep.used_green_card)),
  },
  {
    week: 12, icon: '🔥', title: 'Sin Rendirse', badgeName: 'Sin Rendirse',
    description: '5 entrenos sin excepción', reward: 30,
    evaluate: (t) => t.length >= 5,
  },
  {
    week: 13, icon: '🎯', title: 'Hasta el Final', badgeName: 'Hasta el Final',
    description: 'Completa los 5 entrenos en la última semana', reward: 50,
    evaluate: (t) => t.length >= 5,
  },
]

export function getCurrentChallengeWeek(): number | null {
  const start = new Date('2026-06-01')
  const end = new Date('2026-09-07')
  const today = new Date()
  if (today < start || today > end) return null
  const week = Math.floor((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.min(week, 13)
}

export function getWeekDateRange(weekNumber: number): { start: string; end: string } {
  const base = new Date('2026-06-01')
  const start = new Date(base)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function evaluateChallenge(
  challenge: WeeklyChallenge,
  allTrainings: Training[],
  allReports: DailyReport[],
): boolean {
  const { start, end } = getWeekDateRange(challenge.week)
  const weekTrainings = allTrainings.filter(t => t.date >= start && t.date <= end)
  const weekReports = allReports.filter(r => r.date >= start && r.date <= end)
  return challenge.evaluate(weekTrainings, weekReports)
}

export function calcChallengeBonuses(trainings: Training[], reports: DailyReport[]): number {
  const currentWeek = getCurrentChallengeWeek()
  if (!currentWeek) return 0
  let bonus = 0
  for (let w = 1; w <= currentWeek; w++) {
    const challenge = CHALLENGES.find(c => c.week === w)
    if (challenge && evaluateChallenge(challenge, trainings, reports)) {
      bonus += challenge.reward
    }
  }
  return bonus
}
