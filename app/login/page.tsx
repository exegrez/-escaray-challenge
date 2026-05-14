'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NICKNAMES = ['Sexe', 'Conrat', 'Wizla', 'Yingo', 'Caeza']

export default function LoginPage() {
  const [selected, setSelected] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError('Elige tu nombre primero'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Buscar email por nickname
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('email')
      .eq('nickname', selected)
      .single()

    if (profileErr || !profile?.email) {
      setError(`Debug: ${profileErr?.message ?? 'sin email'} | code: ${profileErr?.code ?? '-'} | hint: ${profileErr?.hint ?? '-'}`)
      setLoading(false)
      return
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (authErr) {
      setError('Contraseña incorrecta')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0a0a]">
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🥶</div>
        <h1 className="text-3xl font-black tracking-tight text-white">WINTER CHALLENGE</h1>
        <p className="text-zinc-500 mt-1 text-sm">Escaray · Junio–Agosto 2026</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-[#151515] border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">¿Quién eres?</h2>

          {/* Selector de nickname */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {NICKNAMES.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={`py-3 rounded-xl font-black text-sm transition-all ${
                  selected === name
                    ? 'bg-orange-500 text-white scale-105'
                    : 'bg-[#1e1e1e] text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black rounded-xl py-3 transition-colors mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar al challenge'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
