'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, CheckCircle2, XCircle } from 'lucide-react'

export default function ReportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayDay = new Date().getDay() // 1 = lunes

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [isMondayEscaray, setIsMondayEscaray] = useState(todayDay === 1)
  const [trainingNotes, setTrainingNotes] = useState('')
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setIsTraining(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isTraining && !photo) {
      setError('Si marcas entrenamiento, necesitas adjuntar una foto.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    let photoUrl: string | null = null

    // Subir foto si hay entrenamiento
    if (isTraining && photo) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${today}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('training-photos')
        .upload(path, photo, { upsert: false })

      if (uploadErr) {
        setError('Error subiendo foto: ' + uploadErr.message)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('training-photos').getPublicUrl(path)
      photoUrl = urlData.publicUrl
    }

    // Guardar entrenamiento
    if (isTraining && photoUrl) {
      const { error: trainErr } = await supabase.from('trainings').insert({
        user_id: user.id,
        date: today,
        photo_url: photoUrl,
        notes: trainingNotes || null,
        is_monday_escaray: isMondayEscaray,
      })
      if (trainErr) {
        setError('Error guardando entrenamiento: ' + trainErr.message)
        setLoading(false)
        return
      }
    }

    // Guardar reporte diario (upsert por si ya existe el día)
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
        <h1 className="text-2xl font-black text-white">Reporte del día</h1>
        <span className="text-zinc-500 text-sm">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Entrenamiento */}
        <Section title="🏋️ Entrenamiento">
          <Toggle label="¿Entrené hoy?" value={isTraining} onChange={setIsTraining} />

          {isTraining && (
            <>
              {/* Foto */}
              <div
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                  photoPreview ? 'border-orange-500' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {photoPreview ? (
                  <div className="relative aspect-video">
                    <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Camera size={32} />
                    <p className="text-sm font-medium">Subir foto del entreno</p>
                    <p className="text-xs text-zinc-600">Obligatoria para validar</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />

              {todayDay === 1 && (
                <Toggle label="🏠 Fue en Escaray (lunes obligatorio)" value={isMondayEscaray} onChange={setIsMondayEscaray} accent />
              )}

              <div>
                <label className="text-xs text-zinc-400 font-medium">Notas del entreno (opcional)</label>
                <input
                  type="text"
                  value={trainingNotes}
                  onChange={e => setTrainingNotes(e.target.value)}
                  placeholder="Ej: Pecho + hombros, 1 hora"
                  className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
            </>
          )}
        </Section>

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
            <div className="flex items-center gap-3 mt-2">
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
              <p className="text-red-400 text-xs mt-1">⚠️ Superaste el límite diario (-{(tobaccoCount - 1) * 5} pts)</p>
            )}
          </div>

          <Toggle
            label="🥃 ¿Tomé destilados?"
            value={hadSpirits}
            onChange={setHadSpirits}
            danger
          />
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
          <Toggle
            label="Usar green card hoy"
            value={usedGreenCard}
            onChange={setUsedGreenCard}
            accent
          />
          {usedGreenCard && (
            <>
              <p className="text-green-400 text-xs -mt-2">✓ Neutraliza penalizaciones del día</p>
              <div>
                <label className="text-xs text-zinc-400 font-medium">¿Por qué la usas?</label>
                <input
                  type="text"
                  value={greenCardReason}
                  onChange={e => setGreenCardReason(e.target.value)}
                  placeholder="Ej: Matrimonio, carrete, cita..."
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
  label,
  value,
  onChange,
  danger,
  accent,
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
      <div className={`w-11 h-6 rounded-full transition-colors relative ${
        value
          ? danger ? 'bg-red-500' : accent ? 'bg-green-500' : 'bg-orange-500'
          : 'bg-zinc-700'
      }`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
          value ? 'left-5' : 'left-0.5'
        }`} />
      </div>
    </button>
  )
}
