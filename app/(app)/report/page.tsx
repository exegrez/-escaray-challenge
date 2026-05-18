'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function ReportPage() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [tobaccoCount, setTobaccoCount] = useState(0)
  const [hadSpirits, setHadSpirits] = useState(false)
  const [woke730, setWoke730] = useState(false)
  const [wakeTime, setWakeTime] = useState('')
  const [hadPaja, setHadPaja] = useState(false)
  const [pajaTime, setPajaTime] = useState('')
  const [usedGreenCard, setUsedGreenCard] = useState(false)
  const [greenCardReason, setGreenCardReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    const { error: reportErr } = await supabase.from('daily_reports').upsert({
      user_id: user.id,
      date: today,
      tobacco_count: tobaccoCount,
      had_spirits: hadSpirits,
      wake_time: wakeTime || null,
      woke_at_730: woke730,
      had_paja: hadPaja,
      paja_time: hadPaja && pajaTime ? pajaTime : null,
      used_green_card: usedGreenCard,
      green_card_reason: usedGreenCard ? greenCardReason : null,
      notes: notes || null,
    }, { onConflict: 'user_id,date' })

    if (reportErr) {
      setError('Error guardando reporte: ' + reportErr.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white">¡Reportado!</h2>
          <p className="text-zinc-500 mt-1">Redirigiendo al ranking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Reporte del día</h1>
          <p className="text-zinc-500 text-sm">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <span className="text-3xl">📋</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Levantada */}
        <Section title="⏰ Levantada">
          <Toggle label="¿Me levanté a las 7:30 o antes?" value={woke730} onChange={setWoke730} />
          <div>
            <label className="text-xs text-zinc-400 font-medium">Hora exacta (opcional)</label>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
            />
          </div>
        </Section>

        {/* Hábitos */}
        <Section title="🚬 Hábitos">
          <div>
            <label className="text-xs text-zinc-400 font-medium">Cigarros fumados hoy</label>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTobaccoCount(n)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${
                    tobaccoCount === n
                      ? n <= 1 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-[#1e1e1e] text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTobaccoCount(prev => Math.min(prev + 1, 10))}
                className="w-10 h-10 rounded-xl bg-[#1e1e1e] text-zinc-400 border border-zinc-700 text-xs"
              >+</button>
            </div>
            {tobaccoCount > 1 && !usedGreenCard && (
              <p className="text-red-400 text-xs mt-2">⚠️ Superaste el límite diario (-{(tobaccoCount - 1) * 5} pts)</p>
            )}
          </div>

          <Toggle label="🥃 ¿Tomé destilados?" value={hadSpirits} onChange={setHadSpirits} danger />
          {hadSpirits && !usedGreenCard && (
            <p className="text-red-400 text-xs -mt-2">⚠️ Penalización: -30 pts si no usas green card</p>
          )}
        </Section>

        {/* Paja */}
        <Section title="🌙 Paja">
          <Toggle label="¿Me tiré una paja hoy?" value={hadPaja} onChange={setHadPaja} />
          {hadPaja && (
            <div>
              <label className="text-xs text-zinc-400 font-medium">¿A qué hora? (opcional)</label>
              <input
                type="time"
                value={pajaTime}
                onChange={e => setPajaTime(e.target.value)}
                className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>
          )}
        </Section>

        {/* Green card */}
        <Section title="🃏 Green Card">
          <Toggle label="Usar green card hoy" value={usedGreenCard} onChange={setUsedGreenCard} accent />
          {usedGreenCard && (
            <>
              <p className="text-green-400 text-xs -mt-2">✓ Neutraliza todas las penalizaciones del día</p>
              <div>
                <label className="text-xs text-zinc-400 font-medium">¿Por qué la usas?</label>
                <input
                  type="text"
                  value={greenCardReason}
                  onChange={e => setGreenCardReason(e.target.value)}
                  placeholder="Ej: Matrimonio, carrete, viaje..."
                  className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
            </>
          )}
        </Section>

        {/* Notas */}
        <Section title="📝 Notas del día (opcional)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="¿Cómo estuvo el día?"
            rows={3}
            className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-sm resize-none"
          />
        </Section>

        {error && (
          <div className="bg-red-950/30 border border-red-900 rounded-xl px-4 py-3 flex items-start gap-2">
            <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black rounded-2xl py-4 text-lg transition-colors"
        >
          {loading ? 'Guardando...' : 'Enviar reporte'}
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
      <h3 className="font-bold text-white text-sm">{title}</h3>
      {children}
    </div>
  )
}

function Toggle({
  label, value, onChange, danger, accent,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  danger?: boolean
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full rounded-xl px-4 py-3 border transition-colors ${
        value
          ? danger
            ? 'bg-red-950/30 border-red-700 text-red-300'
            : accent
            ? 'bg-green-950/30 border-green-700 text-green-300'
            : 'bg-orange-950/30 border-orange-700 text-orange-300'
          : 'bg-[#1e1e1e] border-zinc-700 text-zinc-400'
      }`}
    >
      <span className="text-sm font-medium text-left">{label}</span>
      <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
        value
          ? danger ? 'bg-red-500' : accent ? 'bg-green-500' : 'bg-orange-500'
          : 'bg-zinc-700'
      }`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
    </button>
  )
}
