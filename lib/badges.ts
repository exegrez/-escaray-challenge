import { Training, DailyReport } from './types'
import { getWeekKey, calcPerfectWeeks, calcStreak, calcDoubleKillDays, calcSayayinDays } from './scoring'
import { CHALLENGES, evaluateChallenge } from './weekly-challenges'

export interface Badge {
  id: string
  icon: string
  name: string
  description: string
  earned: boolean
  type: 'permanent' | 'weekly'
  week?: number
}

export function calcBadges(trainings: Training[], reports: DailyReport[]): Badge[] {
  const allWeeks = Array.from(new Set([
    ...trainings.map(t => getWeekKey(t.date)),
    ...reports.map(r => getWeekKey(r.date)),
  ]))

  const weeksWith5Trainings = allWeeks.filter(week =>
    trainings.filter(t => getWeekKey(t.date) === week).length >= 5
  ).length

  const tobaccoFreeWeeks = allWeeks.filter(week => {
    const wr = reports.filter(r => getWeekKey(r.date) === week)
    return wr.length >= 3 && wr.every(r => r.tobacco_count === 0)
  }).length

  const earlyDays = reports.filter(r => r.woke_at_730).length
  const mondayEscarayCount = trainings.filter(t => t.is_monday_escaray).length
  const greenCardsUsed = reports.filter(r => r.used_green_card).length
  const unexcusedPajas = reports.filter(r => r.had_paja && !r.used_green_card).length
  const perfectWeeks = calcPerfectWeeks(trainings, reports)
  const streak = calcStreak(trainings, reports)

  const doubleKillDays = calcDoubleKillDays(trainings)
  const sayayinDays = calcSayayinDays(trainings)

  const permanentBadges: Badge[] = [
    {
      id: 'doble_kill',
      icon: '⚔️',
      name: 'Doble Kill',
      description: 'Dos entrenamientos en un mismo día',
      earned: doubleKillDays >= 1,
      type: 'permanent',
    },
    {
      id: 'sayayin',
      icon: '🐉',
      name: 'Puto Sayayin',
      description: 'Tres entrenamientos en un mismo día',
      earned: sayayinDays >= 1,
      type: 'permanent',
    },
    {
      id: 'ironman',
      icon: '🔥',
      name: 'Ironman',
      description: '3 semanas con 5 entrenos completos',
      earned: weeksWith5Trainings >= 3,
      type: 'permanent',
    },
    {
      id: 'bestia',
      icon: '💪',
      name: 'Bestia',
      description: '30 entrenamientos totales',
      earned: trainings.length >= 30,
      type: 'permanent',
    },
    {
      id: 'madrugador',
      icon: '⏰',
      name: 'Madrugador',
      description: '20 días levantándose a las 7:30',
      earned: earlyDays >= 20,
      type: 'permanent',
    },
    {
      id: 'escaray',
      icon: '🏠',
      name: 'Escaray en la Sangre',
      description: '6 lunes entrenando en Escaray',
      earned: mondayEscarayCount >= 6,
      type: 'permanent',
    },
    {
      id: 'pulmones',
      icon: '🚭',
      name: 'Pulmones de Acero',
      description: '2 semanas completas sin tabaco',
      earned: tobaccoFreeWeeks >= 2,
      type: 'permanent',
    },
    {
      id: 'sin_excusas',
      icon: '🃏',
      name: 'Sin Excusas',
      description: 'Terminar el challenge sin usar green cards',
      earned: greenCardsUsed === 0 && reports.length >= 7,
      type: 'permanent',
    },
    {
      id: 'semana_perfecta',
      icon: '⚡',
      name: 'Semana Perfecta',
      description: '5 entrenos + Lunes Escaray + sin penalizaciones + 4 días a las 7:30',
      earned: perfectWeeks >= 1,
      type: 'permanent',
    },
    {
      id: 'monje',
      icon: '🌙',
      name: 'Monje Shaolin',
      description: 'Máximo 1 paja en todo el challenge',
      earned: unexcusedPajas <= 1 && reports.length >= 7,
      type: 'permanent',
    },
    {
      id: 'frio_acero',
      icon: '🧊',
      name: 'Frío de Acero',
      description: '10 semanas con 5 entrenos completos',
      earned: weeksWith5Trainings >= 10,
      type: 'permanent',
    },
    {
      id: 'en_racha',
      icon: '⚡',
      name: 'En Racha',
      description: '3 semanas perfectas consecutivas',
      earned: streak >= 3,
      type: 'permanent',
    },
  ]

  const weeklyBadges: Badge[] = CHALLENGES.map(challenge => ({
    id: `week_${challenge.week}`,
    icon: challenge.icon,
    name: challenge.badgeName,
    description: `Semana ${challenge.week}: ${challenge.description}`,
    earned: evaluateChallenge(challenge, trainings, reports),
    type: 'weekly' as const,
    week: challenge.week,
  }))

  return [...permanentBadges, ...weeklyBadges]
}
