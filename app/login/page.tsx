'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0a0a]">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🥶</div>
        <h1 className="text-3xl font-black tracking-tight text-white">WINTER CHALLENGE</h1>
        <p className="text-zinc-500 mt-1 text-sm">Escaray · Junio–Agosto 2026</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm">
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">Entrar</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 w-full bg-[#1e1e1e] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition-colors mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar al challenge'}
            </button>
          </form>
        </div>

        {/* Participantes */}
        <div className="mt-6 text-center">
          <p className="text-zinc-600 text-xs mb-2">Participantes</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {['Sexe', 'Conrat', 'Wizla', 'Yingo', 'Caeza'].map(name => (
              <span key={name} className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
