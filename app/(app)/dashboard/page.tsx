import { createClient } from '@/lib/supabase/server'
import { calcScore, calcPenalties, getCompliancePct, getWeekKey, calcWeeklyScore } from '@/lib/scoring'
import { calcChallengeBonuses, getCurrentChallengeWeek, CHALLENGES, evaluateChallenge } from '@/lib/weekly-challenges'
import { Training, DailyReport } from '@/lib/types'
import Link from 'next/link'
import { Trophy, Flame, ShieldCheck, Zap, Skull } from 'lucide-react'

const CHALLENGE_START = '2026-06-01'
const CHALLENGE_END = '2026-08-31'
const MAX_GREEN_CARDS = 3
const NICKNAMES = ['Sexe', 'Conrat', 'Wizla', 'Yingo', 'Caeza']
const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const shameEmojis = ['💀', '☠️', '🤮', '😬', '😐']

function getDaysInChallenge() {
  const today = new Date()
  const start = new Date(CHALLENGE_START)
  if (today < start) return { elapsed: 0, total: 92, started: false }
  const elapsed = Math.min(Math.floor((today.getTime() - start.getTime()) / 86400000) + 1, 92)
  return { elapsed, total: 92, started: true }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const isTrialPeriod = new Date() < new Date(CHALLENGE_START)
  const currentWeek = getCurrentChallengeWeek()
  const currentChallenge = currentWeek ? (CHALLENGES.find(c => c.week === currentWeek) ?? null) : null

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('nickname', NICKNAMES)

  const { data: allTrainings } = await supabase
    .from('trainings')
    .select('*')
    .gte('date', CHALLENGE_START)
    .lte('date', CHALLENGE_END)
    .order('date', { ascending: false })

  const { data: allReports } = await supabase
    .from('daily_reports')
    .select('*')
    .gte('date', CHALLENGE_START)
    .lte('date', CHALLENGE_END)

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const recentPajas = (allReports ?? [])
    .filter((r: DailyReport) => r.had_paja && new Date(r.date) >= twoDaysAgo)
    .map((r: DailyReport) => ({
      nickname: (profiles ?? []).find(p => p.id === r.user_id)?.nickname ?? '?',
      date: r.date,
    }))

  const { elapsed, total, started } = getDaysInChallenge()

  const stats = (profiles ?? []).map(profile => {
    const trainings = (allTrainings ?? []).filter((t: Training) => t.user_id === profile.id)
    const reports = (allReports ?? []).filter((r: DailyReport) => r.user_id === profile.id)
    const greenCardsUsed = reports.filter((r: DailyReport) => r.used_green_card).length
    const baseScore = calcScore(trainings, reports)
    const challengeBonus = calcChallengeBonuses(trainings, reports)
    const score = baseScore + challengeBonus
    const compliance = getCompliancePct(trainings, reports)
    const penalties = calcPenalties(trainings, reports)
    const challengeCompleted = currentChallenge
      ? evaluateChallenge(currentChallenge, trainings, reports)
      : false

    return {
      ...profile,
      score,
      compliance,
      trainingsTotal: trainings.length,
      greenCardsLeft: MAX_GREEN_CARDS - greenCardsUsed,
      penalties,
      challengeCompleted,
    }
  }).sort((a, b) => b.score - a.score)

  const topScore = stats[0]?.score ?? 1
  const shameStats = [...stats].filter(s => s.penalties > 0).sort((a, b) => b.penalties - a.penalties)

  // Pato de la semana: quien sumó menos puntos esta semana
  const thisWeekKey = getWeekKey(new Date().toISOString().split('T')[0])
  const weekScores = started ? (profiles ?? []).map(profile => {
    const trainings = (allTrainings ?? []).filter((t: Training) => t.user_id === profile.id)
    const reports = (allReports ?? []).filter((r: DailyReport) => r.user_id === profile.id)
    const weekScore = calcWeeklyScore(
      trainings.filter((t: Training) => getWeekKey(t.date) === thisWeekKey),
      reports.filter((r: DailyReport) => getWeekKey(r.date) === thisWeekKey),
    )
    return { ...profile, weekScore }
  }).sort((a, b) => a.weekScore - b.weekScore) : []
  const patoDeLaSemana = weekScores.length > 0 ? weekScores[0] : null

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">WINTER CHALLENGE</h1>
          <p className="text-zinc-500 text-sm">Escaray · Jun–Ago 2026</p>
        </div>
        <div className="text-4xl">🥶</div>
      </div>

      {/* Banner período de prueba */}
      {isTrialPeriod && (
        <div className="bg-blue-950/40 border border-blue-800 rounded-2xl px-4 py-3 mb-5 flex items-start gap-3">
          <span className="text-2xl">🧪</span>
          <div>
            <p className="text-blue-300 font-black text-sm uppercase tracking-wide">Período de Prueba — Mayo 2026</p>
            <p className="text-blue-200 text-sm mt-0.5">
              Los datos de mayo no cuentan. El challenge oficial empieza el <span className="font-bold">1 de junio</span>.
            </p>
          </div>
        </div>
      )}

      {/* Alertas de paja (solo durante el challenge) */}
      {!isTrialPeriod && recentPajas.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {recentPajas.map((p, i) => (
            <div key={i} className="bg-red-950/40 border border-red-800 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="text-red-300 font-black text-sm uppercase tracking-wide">Atención</p>
                <p className="text-red-200 text-sm mt-0.5">
                  <span className="font-bold">{p.nickname}</span> se ha jalado el ganzo.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progreso del challenge */}
      <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400 text-sm font-medium">Progreso del challenge</span>
          <span className="text-orange-400 font-bold text-sm">
            {started ? `Día ${elapsed}/${total}` : 'Empieza el 1 Jun'}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all"
            style={{ width: `${(elapsed / total) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-center">
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{elapsed}</p>
            <p className="text-zinc-500 text-xs">días pasados</p>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{total - elapsed}</p>
            <p className="text-zinc-500 text-xs">días restantes</p>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{Math.round((elapsed / total) * 100)}%</p>
            <p className="text-zinc-500 text-xs">completado</p>
          </div>
        </div>
      </div>

      {/* Reto semanal */}
      {currentChallenge && currentWeek && (
        <div className="bg-[#151515] border border-orange-500/20 rounded-2xl p-4 mb-5">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">
            Semana {currentWeek} · Reto especial
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{currentChallenge.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base">{currentChallenge.title}</p>
              <p className="text-zinc-400 text-xs mt-0.5">{currentChallenge.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-orange-400 font-black text-lg">+{currentChallenge.reward}</p>
              <p className="text-zinc-600 text-xs">pts extra</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {stats.map(s => (
              <div key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                s.challengeCompleted
                  ? 'bg-green-950/40 border-green-700 text-green-300'
                  : 'bg-[#1e1e1e] border-zinc-700 text-zinc-500'
              }`}>
                {s.challengeCompleted ? '✓' : '○'} {s.nickname}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking */}
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Trophy size={14} /> Ranking
      </h2>

      <div className="flex flex-col gap-3">
        {stats.map((s, i) => (
          <Link key={s.id} href={`/profile/${s.nickname}`}>
            <div className={`bg-[#151515] border rounded-2xl p-4 transition-all active:scale-[0.98] ${
              i === 0 ? 'border-orange-500/40 bg-orange-950/10' : 'border-zinc-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl w-8 text-center">{medals[i]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-lg">{s.nickname}</span>
                    {i === 0 && started && <span className="text-orange-400 text-xs font-bold">LÍDER</span>}
                  </div>
                  <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-zinc-500'}`}
                      style={{ width: topScore > 0 ? `${(s.score / topScore) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-zinc-400 text-xs flex items-center gap-1">
                      <Flame size={10} className="text-orange-400" />
                      {s.trainingsTotal} entrenos
                    </span>
                    <span className="text-zinc-400 text-xs flex items-center gap-1">
                      <ShieldCheck size={10} className="text-green-400" />
                      {s.greenCardsLeft}/3 green
                    </span>
                    <span className="text-zinc-400 text-xs flex items-center gap-1">
                      <Zap size={10} className="text-zinc-400" />
                      {s.compliance}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-2xl ${i === 0 ? 'text-orange-400' : 'text-white'}`}>
                    {s.score}
                  </p>
                  <p className="text-zinc-600 text-xs">pts</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pato de la semana */}
      {started && patoDeLaSemana && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            🦆 Pato de la semana
          </h2>
          <div className="bg-yellow-950/20 border border-yellow-700/30 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-5xl">🦆</span>
            <div className="flex-1">
              <p className="text-yellow-300 font-black text-xl">{patoDeLaSemana.nickname}</p>
              <p className="text-yellow-600 text-sm mt-0.5">
                Solo {patoDeLaSemana.weekScore} pts esta semana
              </p>
              <p className="text-zinc-600 text-xs mt-1">El que menos suma esta semana se lleva el pato 🏆</p>
            </div>
          </div>
        </div>
      )}

      {/* Muro de la Infamia */}
      {!isTrialPeriod && shameStats.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Skull size={14} /> Muro de la Infamia
          </h2>
          <div className="bg-[#151515] border border-zinc-800 rounded-2xl overflow-hidden">
            {shameStats.map((s, i) => (
              <Link key={s.id} href={`/profile/${s.nickname}`}>
                <div className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-900 ${i > 0 ? 'border-t border-zinc-800' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{shameEmojis[i] ?? '😐'}</span>
                    <span className="text-zinc-300 font-medium">{s.nickname}</span>
                  </div>
                  <span className="text-red-400 font-black">-{s.penalties} pts</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reglas */}
      <div className="mt-6 bg-[#151515] border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Reglas</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div>🏋️ 5 entrenos/semana</div>
          <div>🏠 Lunes en Escaray</div>
          <div>🚬 Máx 1 cigarro/día</div>
          <div>🍺 Chelas ok, sin destilados</div>
          <div>⏰ 7:30 am × 4 días/sem</div>
          <div>🃏 3 green cards totales</div>
        </div>
      </div>
    </div>
  )
}
