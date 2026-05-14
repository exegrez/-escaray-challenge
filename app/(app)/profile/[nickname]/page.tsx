import { createClient } from '@/lib/supabase/server'
import { calcScore } from '@/lib/scoring'
import { Training, DailyReport } from '@/lib/types'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Calendar, Flame, ShieldCheck, Moon, Clock } from 'lucide-react'

const MAX_GREEN_CARDS = 3

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short'
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

  const t = trainings ?? []
  const r = reports ?? []

  const score = calcScore(t as Training[], r as DailyReport[])
  const greenCardsUsed = r.filter((x: DailyReport) => x.used_green_card).length
  const greenCardsLeft = MAX_GREEN_CARDS - greenCardsUsed
  const pajasTotal = r.filter((x: DailyReport) => x.had_paja).length
  const pajasThisWeek = r.filter((x: DailyReport) => {
    if (!x.had_paja) return false
    const reportDate = new Date(x.date)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return reportDate >= weekAgo
  }).length

  const mondayTrainings = t.filter((x: Training) => x.is_monday_escaray).length
  const earlyDays = r.filter((x: DailyReport) => x.woke_at_730).length

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header del perfil */}
      <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">{profile.nickname}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Winter Challenge 2026</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-orange-400">{score}</p>
            <p className="text-zinc-500 text-xs">puntos</p>
          </div>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-[#1e1e1e] rounded-xl p-3 text-center">
            <p className="text-white font-black text-xl">{t.length}</p>
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
            <p className="text-white font-black text-xl">{pajasTotal}</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
              <Moon size={9} /> Pajas
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
                className={`flex-1 h-8 rounded-lg border flex items-center justify-center text-sm font-bold transition-all ${
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

        {/* Alerta si paja excedida */}
        {pajasThisWeek > 1 && (
          <div className="mt-3 bg-red-950/30 border border-red-900 rounded-xl px-3 py-2">
            <p className="text-red-400 text-xs font-medium">
              ⚠️ {pajasThisWeek} pajas esta semana — límite excedido
            </p>
          </div>
        )}
      </div>

      {/* Registro de pajas */}
      {pajasTotal > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Moon size={12} /> Registro de pajas
          </h2>
          <div className="flex flex-col gap-2">
            {r.filter((x: DailyReport) => x.had_paja).map((rep: DailyReport) => (
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
          {t.map((training: Training) => (
            <div key={training.id} className="bg-[#151515] border border-zinc-800 rounded-2xl overflow-hidden">
              {training.photo_url && (
                <div className="relative aspect-square">
                  <Image
                    src={training.photo_url}
                    alt={`Entreno ${training.date}`}
                    fill
                    className="object-cover"
                  />
                  {training.is_monday_escaray && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      🏠 LUN
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

      {/* Stats adicionales */}
      <div className="mt-5 bg-[#151515] border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Desglose</h3>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5"><Calendar size={12} /> Lunes en Escaray</span>
            <span className="text-white font-bold">{mondayTrainings}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🚬 Días con tabaco</span>
            <span className="text-white font-bold">{r.filter((x: DailyReport) => x.tobacco_count > 0).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🥃 Días con destilado</span>
            <span className={`font-bold ${r.filter((x: DailyReport) => x.had_spirits && !x.used_green_card).length > 0 ? 'text-red-400' : 'text-white'}`}>
              {r.filter((x: DailyReport) => x.had_spirits && !x.used_green_card).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">🃏 Green cards usadas</span>
            <span className="text-white font-bold">{greenCardsUsed}/{MAX_GREEN_CARDS}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
