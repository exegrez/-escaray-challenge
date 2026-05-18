import { createClient } from '@/lib/supabase/server'
import { calcScore, calcStreak, calcPerfectWeeks, getWeekKey, calcWeeklyScore, calcDoubleKillDays, calcSayayinDays } from '@/lib/scoring'
import { calcChallengeBonuses } from '@/lib/weekly-challenges'
import { calcBadges } from '@/lib/badges'
import { Training, DailyReport } from '@/lib/types'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Calendar, Flame, ShieldCheck, Moon, Clock, Zap } from 'lucide-react'

const MAX_GREEN_CARDS = 3
const CHALLENGE_START = '2026-06-01'
const CHALLENGE_END = '2026-08-31'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return '–'
  return timeStr.slice(0, 5)
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>
}) {
  const { nickname } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .single()

  if (!profile) notFound()

  const [{ data: trainings }, { data: reports }] = await Promise.all([
    supabase.from('trainings').select('*').eq('user_id', profile.id).order('date', { ascending: false }),
    supabase.from('daily_reports').select('*').eq('user_id', profile.id).order('date', { ascending: false }),
  ])

  const t = (trainings ?? []) as Training[]
  const r = (reports ?? []) as DailyReport[]

  const officialTrainings = t.filter(tr => tr.date >= CHALLENGE_START && tr.date <= CHALLENGE_END)
  const officialReports = r.filter(rep => rep.date >= CHALLENGE_START && rep.date <= CHALLENGE_END)

  const baseScore = calcScore(officialTrainings, officialReports)
  const challengeBonus = calcChallengeBonuses(officialTrainings, officialReports)
  const score = baseScore + challengeBonus
  const streak = calcStreak(officialTrainings, officialReports)
  const perfectWeeks = calcPerfectWeeks(officialTrainings, officialReports)

  const greenCardsUsed = officialReports.filter(x => x.used_green_card).length
  const greenCardsLeft = MAX_GREEN_CARDS - greenCardsUsed
  const pajasTotal = officialReports.filter(x => x.had_paja).length
  const pajasThisWeek = officialReports.filter(x => {
    if (!x.had_paja) return false
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(x.date) >= weekAgo
  }).length
  const mondayTrainings = officialTrainings.filter(x => x.is_monday_escaray).length
  const earlyDays = officialReports.filter(x => x.woke_at_730).length

  const doubleKillDays = calcDoubleKillDays(officialTrainings)
  const sayayinDays = calcSayayinDays(officialTrainings)

  // Calcular cuántas veces fue el "pato" (semana con score más bajo)
  const NICKNAMES = ['Sexe', 'Conrat', 'Wizla', 'Yingo', 'Caeza']
  const { data: allProfiles } = await supabase.from('profiles').select('id, nickname').in('nickname', NICKNAMES)
  const { data: allOfficialTrainings } = await supabase
    .from('trainings').select('*').gte('date', CHALLENGE_START).lte('date', CHALLENGE_END)
  const { data: allOfficialReports } = await supabase
    .from('daily_reports').select('*').gte('date', CHALLENGE_START).lte('date', CHALLENGE_END)

  const allWeeks = Array.from(new Set([
    ...(allOfficialTrainings ?? []).map((t: Training) => getWeekKey(t.date)),
    ...(allOfficialReports ?? []).map((r: DailyReport) => getWeekKey(r.date)),
  ]))

  let patoWeeks = 0
  allWeeks.forEach(week => {
    const weekScores = (allProfiles ?? []).map(p => {
      const pt = (allOfficialTrainings ?? []).filter((t: Training) => t.user_id === p.id && getWeekKey(t.date) === week)
      const pr = (allOfficialReports ?? []).filter((r: DailyReport) => r.user_id === p.id && getWeekKey(r.date) === week)
      return { id: p.id, score: calcWeeklyScore(pt as Training[], pr as DailyReport[]) }
    }).sort((a, b) => a.score - b.score)
    if (weekScores[0]?.id === profile.id) patoWeeks++
  })

  const badges = calcBadges(officialTrainings, officialReports)
  const earnedBadges = badges.filter(b => b.earned)
  const permanentBadges = badges.filter(b => b.type === 'permanent')
  const weeklyBadges = badges.filter(b => b.type === 'weekly')

  const isTrialPeriod = new Date() < new Date(CHALLENGE_START)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header del perfil */}
      <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">{profile.nickname}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Winter Challenge 2026</p>
            {earnedBadges.length > 0 && (
              <p className="text-orange-400 text-xs mt-1 font-medium">{earnedBadges.length} logros desbloqueados</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-orange-400">{score}</p>
            <p className="text-zinc-500 text-xs">puntos</p>
            {challengeBonus > 0 && (
              <p className="text-green-400 text-xs mt-0.5">+{challengeBonus} retos</p>
            )}
          </div>
        </div>

        {isTrialPeriod && (
          <div className="mt-3 bg-blue-950/30 border border-blue-900 rounded-xl px-3 py-2">
            <p className="text-blue-400 text-xs">🧪 Mayo es período de prueba — el score empieza el 1 Jun</p>
          </div>
        )}

        {streak > 0 && (
          <div className="mt-3 bg-orange-950/20 border border-orange-800/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <p className="text-orange-300 font-black text-sm">
                {streak} semana{streak > 1 ? 's' : ''} perfecta{streak > 1 ? 's' : ''} seguidas
              </p>
              <p className="text-orange-400/60 text-xs">Racha actual</p>
            </div>
          </div>
        )}

        {/* Stats principales */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-[#1e1e1e] rounded-xl p-3 text-center">
            <p className="text-white font-black text-xl">{officialTrainings.length}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
              <Flame size={9} className="text-orange-400" /> Entrenos
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-3 text-center">
            <p className={`font-black text-xl ${greenCardsLeft <= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {greenCardsLeft}
            </p>
            <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
              <ShieldCheck size={9} className="text-green-400" /> Greens
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-3 text-center">
            <p className="text-white font-black text-xl">{perfectWeeks}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
              <Zap size={9} className="text-orange-400" /> Perfectas
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-3 text-center">
            <p className="text-white font-black text-xl">{earlyDays}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
              <Clock size={9} className="text-blue-400" /> 7:30
            </p>
          </div>
        </div>

        {/* Green cards visuales */}
        <div className="mt-4">
          <p className="text-xs text-zinc-500 mb-2 font-medium">Green Cards</p>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`flex-1 h-8 rounded-lg border flex items-center justify-center text-sm font-bold ${
                  i < greenCardsLeft
                    ? 'bg-green-900/30 border-green-700 text-green-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-600 line-through'
                }`}
              >
                {i < greenCardsLeft ? '🃏' : '✗'}
              </div>
            ))}
          </div>
        </div>

        {pajasThisWeek > 1 && (
          <div className="mt-3 bg-red-950/30 border border-red-900 rounded-xl px-3 py-2">
            <p className="text-red-400 text-xs font-medium">
              ⚠️ {pajasThisWeek} pajas esta semana — límite excedido
            </p>
          </div>
        )}
      </div>

      {/* Logros permanentes */}
      <div className="mb-5">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">🏅 Logros</h2>
        <div className="grid grid-cols-5 gap-2">
          {permanentBadges.map(badge => (
            <div
              key={badge.id}
              title={badge.description}
              className={`rounded-2xl p-2.5 flex flex-col items-center gap-1 border transition-all ${
                badge.earned
                  ? 'bg-[#151515] border-orange-500/40'
                  : 'bg-[#0d0d0d] border-zinc-800/50 opacity-30'
              }`}
            >
              <span className="text-xl">{badge.icon}</span>
              <p className={`text-[8px] font-bold text-center leading-tight ${badge.earned ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {badge.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Badges semanales */}
      <div className="mb-5">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">📅 Retos semanales</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {weeklyBadges.map(badge => (
            <div
              key={badge.id}
              title={badge.description}
              className={`rounded-xl p-2 flex flex-col items-center gap-0.5 border transition-all ${
                badge.earned
                  ? 'bg-[#151515] border-green-600/40'
                  : 'bg-[#0d0d0d] border-zinc-800/50 opacity-30'
              }`}
            >
              <span className="text-base">{badge.icon}</span>
              <p className={`text-[7px] font-bold ${badge.earned ? 'text-zinc-400' : 'text-zinc-700'}`}>
                S{badge.week}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Registro de pajas */}
      {pajasTotal > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Moon size={12} /> Registro de pajas
          </h2>
          <div className="flex flex-col gap-2">
            {officialReports.filter(x => x.had_paja).map(rep => (
              <div key={rep.id} className="bg-[#151515] border border-zinc-800 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-zinc-300 text-sm">{formatDate(rep.date)}</span>
                <div className="flex items-center gap-2">
                  {rep.paja_time && (
                    <span className="text-zinc-500 text-xs flex items-center gap-1">
                      <Clock size={10} /> {formatTime(rep.paja_time)}
                    </span>
                  )}
                  {rep.used_green_card && (
                    <span className="text-green-400 text-xs bg-green-950/30 border border-green-900 px-2 py-0.5 rounded-full">
                      🃏 green
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de entrenamientos */}
      <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Flame size={12} className="text-orange-400" /> Historial de entrenos ({t.length})
      </h2>

      {t.length === 0 ? (
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2">💤</p>
          <p className="text-zinc-500 text-sm">Sin entrenamientos aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {t.map(training => (
            <div key={training.id} className="bg-[#151515] border border-zinc-800 rounded-2xl overflow-hidden">
              {training.photo_url && (
                <div className="relative aspect-square">
                  <Image src={training.photo_url} alt={`Entreno ${training.date}`} fill className="object-cover" />
                  {training.is_monday_escaray && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      🏠 LUN
                    </div>
                  )}
                  {training.date < CHALLENGE_START && (
                    <div className="absolute top-2 right-2 bg-blue-700/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      PRUEBA
                    </div>
                  )}
                </div>
              )}
              <div className="px-3 py-2">
                <p className="text-white text-xs font-medium">{formatDate(training.date)}</p>
                {training.notes && (
                  <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{training.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desglose */}
      <div className="mt-5 bg-[#151515] border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Desglose oficial</h3>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5"><Calendar size={12} /> Lunes en Escaray</span>
            <span className="text-white font-bold">{mondayTrainings}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">⚡ Semanas perfectas</span>
            <span className="text-orange-400 font-bold">{perfectWeeks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🎯 Bonus retos</span>
            <span className="text-green-400 font-bold">+{challengeBonus} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🚬 Días con tabaco</span>
            <span className="text-white font-bold">{officialReports.filter(x => x.tobacco_count > 0).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🥃 Días con destilado</span>
            <span className={`font-bold ${officialReports.filter(x => x.had_spirits && !x.used_green_card).length > 0 ? 'text-red-400' : 'text-white'}`}>
              {officialReports.filter(x => x.had_spirits && !x.used_green_card).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🃏 Green cards usadas</span>
            <span className="text-white font-bold">{greenCardsUsed}/{MAX_GREEN_CARDS}</span>
          </div>
          {doubleKillDays > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">⚔️ Días Doble Kill</span>
              <span className="text-orange-400 font-bold">{doubleKillDays}</span>
            </div>
          )}
          {sayayinDays > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">🐉 Días Puto Sayayin</span>
              <span className="text-yellow-400 font-bold">{sayayinDays}</span>
            </div>
          )}
          {patoWeeks > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">🦆 Semanas de pato</span>
              <span className="text-yellow-500 font-bold">{patoWeeks}</span>
            </div>
          )}
        </div>
      </div>

      {patoWeeks > 0 && (
        <div className="mt-4 bg-yellow-950/20 border border-yellow-700/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-3xl">🦆</span>
          <div>
            <p className="text-yellow-300 font-black">{patoWeeks}x Pato del Challenge</p>
            <p className="text-yellow-600 text-xs mt-0.5">
              {patoWeeks === 1 ? 'Una semana siendo el más pato.' : `${patoWeeks} semanas siendo el más pato del grupo.`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
