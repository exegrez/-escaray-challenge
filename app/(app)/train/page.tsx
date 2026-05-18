'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, CheckCircle2, XCircle, Flame } from 'lucide-react'

export default function TrainPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().split('T')[0]
  const todayDay = new Date().getDay()

  const [trainingsToday, setTrainingsToday] = useState(0)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isMondayEscaray, setIsMondayEscaray] = useState(todayDay === 1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkToday() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('trainings')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
      setTrainingsToday(data?.length ?? 0)
    }
    checkToday()
  }, [today])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photo) {
      setError('La foto es obligatoria para validar el entreno.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

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

    const { error: trainErr } = await supabase.from('trainings').insert({
      user_id: user.id,
      date: today,
      photo_url: urlData.publicUrl,
      notes: notes || null,
      is_monday_escaray: isMondayEscaray,
    })

    if (trainErr) {
      setError('Error guardando entreno: ' + trainErr.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const sessionNumber = trainingsToday + 1
  const sessionLabel =
    sessionNumber === 1 ? 'Entrenamiento #1' :
    sessionNumber === 2 ? '⚔️ Doble Kill — Entrenamiento #2' :
    '🐉 PUTO SAYAYIN — Entrenamiento #3'
  const sessionColor =
    sessionNumber === 1 ? 'text-orange-400' :
    sessionNumber === 2 ? 'text-yellow-400' :
    'text-purple-400'

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white">
            {sessionNumber === 1 ? '¡Entreno registrado!' :
             sessionNumber === 2 ? '⚔️ ¡Doble Kill!' :
             '🐉 ¡PUTO SAYAYIN!'}
          </h2>
          <p className="text-zinc-500 mt-1">Volviendo al ranking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Registrar entreno</h1>
          <p className={`text-sm font-bold mt-0.5 ${sessionColor}`}>{sessionLabel}</p>
        </div>
        <Flame size={28} className="text-orange-500" />
      </div>

      {/* Banner doble kill / sayayin */}
      {sessionNumber === 2 && (
        <div className="bg-yellow-950/30 border border-yellow-700/40 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <p className="text-yellow-300 font-black text-sm">¡Doble Kill!</p>
            <p className="text-yellow-600 text-xs mt-0.5">Segundo entreno del día — vale +15 pts extra</p>
          </div>
        </div>
      )}
      {sessionNumber >= 3 && (
        <div className="bg-purple-950/30 border border-purple-700/40 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">🐉</span>
          <div>
            <p className="text-purple-300 font-black text-sm">¡PUTO SAYAYIN!</p>
            <p className="text-purple-600 text-xs mt-0.5">Tercer entreno del día — vale +30 pts extra</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Foto obligatoria */}
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4">
          <h3 className="font-bold text-white text-sm mb-3">📸 Foto del entreno</h3>
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
                <Camera size={36} />
                <p className="text-sm font-medium">Toca para subir la foto</p>
                <p className="text-xs text-zinc-600">Obligatoria para validar</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Lunes en Escaray */}
        {todayDay === 1 && (
          <button
            type="button"
            onClick={() => setIsMondayEscaray(!isMondayEscaray)}
            className={`flex items-center justify-between w-full rounded-2xl px-4 py-4 border transition-colors ${
              isMondayEscaray
                ? 'bg-orange-950/30 border-orange-700 text-orange-300'
                : 'bg-[#151515] border-zinc-700 text-zinc-400'
            }`}
          >
            <span className="font-bold text-sm">🏠 Fue en Escaray (lunes obligatorio)</span>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${isMondayEscaray ? 'bg-orange-500' : 'bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isMondayEscaray ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        )}

        {/* Notas */}
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-4">
          <h3 className="font-bold text-white text-sm mb-3">📝 Notas (opcional)</h3>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Pecho + tríceps, 1 hora"
            className="w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900 rounded-xl px-4 py-3 flex items-start gap-2">
            <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !photo}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-black rounded-2xl py-4 text-lg transition-colors"
        >
          {loading ? 'Guardando...' : '✓ Registrar entreno'}
        </button>
      </form>
    </div>
  )
}
