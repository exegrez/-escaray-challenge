import { createClient } from '@/lib/supabase/server'
import { calcScore, calcPerfectWeeks, calcPenalties, calcStreak, getWeekKey, calcWeeklyScore } from '@/lib/scoring'
import { calcChallengeBonuses } from '@/lib/weekly-challenges'
import { Training, DailyReport } from '@/lib/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const CHALLENGE_START = '2026-06-01'
const CHALLENGE_END = '2026-08-31'

function filterOfficial(items: any[], dateKey: string) {
  return items.filter(i => i[dateKey] >= CHALLENGE_START && i[dateKey] <= CHALLENGE_END)
}

function StatRow({ label, a, b, higherIsBetter = true }: { label: string; a: number; b: number; higherIsBetter?: boolean }) {
  const aWins = higherIsBetter ? a > b : a < b
  const bWins = higherIsBetter ? b > a : b < a
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-black w-12 text-right ${aWins ? 'text-orange-400' : 'text-white'}`}>{a}</span>
      <span className="flex-1 text-xs text-zinc-400 text-center">{label}</span>
      <span className={`text-sm font-black w-12 text-left ${bWins ? 'text-orange-400' : 'text-white'}`}>{b}</span>
    </div>
  )
}

export default async function VsPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname: opponentNickname } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [{ data: meProfile }, { data: opponentProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('nickname', opponentNickname).single(),
  ])

  if (!meProfile || !opponentProfile || meProfile.id === opponentProfile.id) return notFound()

  const [{ data: meTrainings }, { data: meReports }, { data: oppTrainings }, { data: oppReports }] = await Promise.all([
    supabase.from('trainings').select('*').eq('user_id', meProfile.id),
    supabase.from('daily_reports').select('*').eq('user_id', meProfile.id),
    supabase.from('trainings').select('*').eq('user_id', opponentProfile.id),
    supabase.from('daily_reports').select('*').eq('user_id', opponentProfile.id),
  ])

  const meT = filterOfficial(meTrainings ?? [], 'date') as Training[]
  const meR = filterOfficial(meReports ?? [], 'date') as DailyReport[]
  const oppT = filterOfficial(oppTrainings ?? [], 'date') as Training[]
  const oppR = filterOfficial(oppReports ?? [], 'date') as DailyReport[]

  const meScore = calcScore(meT, meR) + calcChallengeBonuses(meT, meR)
  const oppScore = calcScore(oppT, oppR) + calcChallengeBonuses(oppT, oppR)
  const meWins = meScore > oppScore
  const tied = meScore === oppScore

  // Semana a semana
  const allWeeks = Array.from(new Set([
    ...meT.map(t => getWeekKey(t.date)),
    ...meR.map(r => getWeekKey(r.date)),
    ...oppT.map(t => getWeekKey(t.date)),
    ...oppR.map(r => getWeekKey(r.date)),
  ])).sort()

  const weeklyComparison = allWeeks.map((week, i) => {
    const mwt = meT.filter(t => getWeekKey(t.date) === week)
    const mwr = meR.filter(r => getWeekKey(r.date) === week)
    const owt = oppT.filter(t => getWeekKey(t.date) === week)
    const owr = oppR.filter(r => getWeekKey(r.date) === week)
    const mScore = calcWeeklyScore(mwt, mwr)
    const oScore = calcWeeklyScore(owt, owr)
    return { week: `S${i + 1}`, meScore: mScore, oppScore: oScore }
  })

  const meWeekWins = weeklyComparison.filter(w => w.meScore > w.oppScore).length
  const oppWeekWins = weeklyComparison.filter(w => w.oppScore > w.meScore).length

  const topScore = Math.max(meScore, oppScore, 1)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Back */}
      <Link href={`/profile/${opponentNickname}`} className="flex items-center gap-2 text-zinc-400 text-sm mb-6 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Volver al perfil
      </Link>

      {/* Header */}
      <h1 className="text-xl font-black text-white mb-1">⚔️ Duelo directo</h1>
      <p className="text-zinc-500 text-sm mb-6">Challenge oficial Jun–Ago 2026</p>

      {/* Score principal */}
      <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          {/* Yo */}
          <div className="flex-1 text-center">
            <p className={`text-3xl font-black ${meWins ? 'text-orange-400' : 'text-white'}`}>{meScore}</p>
            <p className="text-white font-black text-lg mt-1">{meProfile.nickname}</p>
            {meWins && !tied && <p className="text-orange-400 text-xs font-bold mt-0.5">GANANDO</p>}
          </div>

          {/* VS */}
          <div className="text-center">
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">pts</p>
            <p className="text-2xl font-black text-zinc-500 my-1">VS</p>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">pts</p>
          </div>

          {/* Oponente */}
          <div className="flex-1 text-center">
            <p className={`text-3xl font-black ${!meWins && !tied ? 'text-orange-400' : 'text-white'}`}>{oppScore}</p>
            <p className="text-white font-black text-lg mt-1">{opponentProfile.nickname}</p>
            {!meWins && !tied && <p className="text-orange-400 text-xs font-bold mt-0.5">GANANDO</p>}
          </div>
        </div>

        {/* Barras comparativas */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(meScore / topScore) * 100}%` }} />
            </div>
            <div className="w-6" />
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${(oppScore / topScore) * 100}%` }} />
            </div>
          </div>
        </div>

        {tied && <p className="text-center text-zinc-400 text-sm mt-3 font-bold">Empate técnico 🤝</p>}
      </div>

      {/* Stats comparadas */}
      <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4 mb-5">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Estadísticas</h2>
        <div className="flex flex-col gap-3">
          <StatRow label="Entrenos" a={meT.length} b={oppT.length} />
          <div className="border-t border-zinc-800" />
          <StatRow label="Semanas perfectas" a={calcPerfectWeeks(meT, meR)} b={calcPerfectWeeks(oppT, oppR)} />
          <StatRow label="Días a las 7:30" a={meR.filter(r => r.woke_at_730).length} b={oppR.filter(r => r.woke_at_730).length} />
          <StatRow label="Lunes en Escaray" a={meT.filter(t => t.is_monday_escaray).length} b={oppT.filter(t => t.is_monday_escaray).length} />
          <div className="border-t border-zinc-800" />
          <StatRow label="Penalizaciones" a={calcPenalties(meT, meR)} b={calcPenalties(oppT, oppR)} higherIsBetter={false} />
          <StatRow label="Pajas totales" a={meR.filter(r => r.had_paja).length} b={oppR.filter(r => r.had_paja).length} higherIsBetter={false} />
          <StatRow label="Destilados" a={meR.filter(r => r.had_spirits && !r.used_green_card).length} b={oppR.filter(r => r.had_spirits && !r.used_green_card).length} higherIsBetter={false} />
          <div className="border-t border-zinc-800" />
          <StatRow label="Racha actual" a={calcStreak(meT, meR)} b={calcStreak(oppT, oppR)} />
        </div>
      </div>

      {/* Semana a semana */}
      {weeklyComparison.length > 0 && (
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Semana a semana</h2>
            <div className="flex gap-3 text-xs">
              <span className="text-orange-400 font-bold">{meProfile.nickname} {meWeekWins}W</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-300 font-bold">{opponentProfile.nickname} {oppWeekWins}W</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {weeklyComparison.map((w, i) => {
              const mWin = w.meScore > w.oppScore
              const oWin = w.oppScore > w.meScore
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-12 text-right font-bold ${mWin ? 'text-orange-400' : 'text-zinc-400'}`}>{w.meScore}</span>
                  <span className="flex-1 text-center text-zinc-600 text-xs font-bold">{w.week}</span>
                  <span className={`w-12 text-left font-bold ${oWin ? 'text-orange-400' : 'text-zinc-400'}`}>{w.oppScore}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
