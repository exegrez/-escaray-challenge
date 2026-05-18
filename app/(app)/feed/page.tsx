import { createClient } from '@/lib/supabase/server'
import { calcWeeklyScore, getWeekKey } from '@/lib/scoring'
import { Training, DailyReport } from '@/lib/types'
import FeedShell from '@/components/FeedShell'

const CHALLENGE_START = '2026-06-01'
const CHALLENGE_END = '2026-08-31'
const NICKNAMES = ['Sexe', 'Conrat', 'Wizla', 'Yingo', 'Caeza']

function getQueryRange() {
  const isTrialPeriod = new Date() < new Date(CHALLENGE_START)
  return isTrialPeriod
    ? { start: '2026-05-01', end: '2026-05-31', isTrialPeriod: true }
    : { start: CHALLENGE_START, end: CHALLENGE_END, isTrialPeriod: false }
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { start, end, isTrialPeriod } = getQueryRange()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('nickname', NICKNAMES)

  const { data: allTrainings } = await supabase
    .from('trainings')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: allReports } = await supabase
    .from('daily_reports')
    .select('*')
    .gte('date', start)
    .lte('date', end)

  const profilesList = profiles ?? []
  const trainingsList = (allTrainings ?? []) as Training[]
  const reportsList = (allReports ?? []) as DailyReport[]

  // Construir eventos de actividad
  const trainingsByUserDate: Record<string, Training[]> = {}
  trainingsList.forEach(t => {
    const key = `${t.user_id}-${t.date}`
    if (!trainingsByUserDate[key]) trainingsByUserDate[key] = []
    trainingsByUserDate[key].push(t)
  })

  const activityEvents: {
    id: string; emoji: string; nickname: string; label: string; date: string; notes?: string | null
  }[] = []

  trainingsList.forEach(t => {
    const profile = profilesList.find(p => p.id === t.user_id)
    if (!profile) return
    const dayTrainings = trainingsByUserDate[`${t.user_id}-${t.date}`]
    const idx = dayTrainings.indexOf(t)
    const emoji = idx === 0 ? '🏋️' : idx === 1 ? '⚔️' : '🐉'
    const label = idx === 0 ? 'entrenó' : idx === 1 ? 'DOBLE KILL' : 'PUTO SAYAYIN'
    activityEvents.push({ id: t.id, emoji, nickname: profile.nickname, label, date: t.date, notes: t.notes })
  })

  reportsList.forEach(r => {
    const profile = profilesList.find(p => p.id === r.user_id)
    if (!profile) return
    if (r.had_paja) {
      activityEvents.push({ id: `paja-${r.id}`, emoji: '🌙', nickname: profile.nickname, label: 'se jaló el ganzo', date: r.date })
    }
    if (r.had_spirits && !r.used_green_card) {
      activityEvents.push({ id: `spirits-${r.id}`, emoji: '🥃', nickname: profile.nickname, label: 'tomó destilados 🤦', date: r.date })
    }
    if (r.used_green_card) {
      const reason = r.green_card_reason ? ` (${r.green_card_reason})` : ''
      activityEvents.push({ id: `green-${r.id}`, emoji: '🃏', nickname: profile.nickname, label: `usó una green card${reason}`, date: r.date })
    }
    if (r.woke_at_730) {
      activityEvents.push({ id: `early-${r.id}`, emoji: '⏰', nickname: profile.nickname, label: 'se levantó a las 7:30', date: r.date })
    }
  })

  // Historial de patos (por semana)
  const allWeeks = Array.from(new Set([
    ...trainingsList.map(t => getWeekKey(t.date)),
    ...reportsList.map(r => getWeekKey(r.date)),
  ])).sort()

  let weekCounter = 0
  const patoHistory = allWeeks.map(week => {
    weekCounter++
    const weekScores = profilesList.map(p => {
      const wt = trainingsList.filter(t => t.user_id === p.id && getWeekKey(t.date) === week)
      const wr = reportsList.filter(r => r.user_id === p.id && getWeekKey(r.date) === week)
      return { nickname: p.nickname, score: calcWeeklyScore(wt as Training[], wr as DailyReport[]) }
    }).sort((a, b) => a.score - b.score)

    const label = isTrialPeriod ? `Semana ${weekCounter} (prueba)` : `Semana ${weekCounter}`

    return {
      weekLabel: label,
      patoNickname: weekScores[0]?.nickname ?? '?',
      patoScore: weekScores[0]?.score ?? 0,
      scores: weekScores,
    }
  }).reverse()

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Feed</h1>
          <p className="text-zinc-500 text-sm">
            {isTrialPeriod ? 'Modo prueba — Mayo 2026' : 'Jun–Ago 2026'}
          </p>
        </div>
        <span className="text-4xl">📱</span>
      </div>

      <FeedShell activityEvents={activityEvents} patoHistory={patoHistory} />
    </div>
  )
}
