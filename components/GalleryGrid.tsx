'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Send } from 'lucide-react'

const REACTION_EMOJIS = ['💪', '🔥', '😂', '👏']

interface GalleryTraining {
  id: string
  photo_url: string
  date: string
  notes: string | null
  is_monday_escaray: boolean
  nickname: string
}

interface Reaction {
  training_id: string
  user_id: string
  emoji: string
}

interface Comment {
  id: string
  training_id: string
  content: string
  created_at: string
  nickname: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export default function GalleryGrid() {
  const [trainings, setTrainings] = useState<GalleryTraining[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasInteractions, setHasInteractions] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data: trainingData } = await supabase
        .from('trainings')
        .select('id, photo_url, date, notes, is_monday_escaray, profiles(nickname)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      const mapped: GalleryTraining[] = (trainingData ?? []).map((t: any) => ({
        id: t.id,
        photo_url: t.photo_url,
        date: t.date,
        notes: t.notes,
        is_monday_escaray: t.is_monday_escaray,
        nickname: t.profiles?.nickname ?? '?',
      }))
      setTrainings(mapped)

      const [reactionsRes, commentsRes] = await Promise.all([
        supabase.from('reactions').select('training_id, user_id, emoji'),
        supabase.from('comments').select('id, training_id, content, created_at, profiles(nickname)'),
      ])

      if (reactionsRes.error?.code === '42P01' || commentsRes.error?.code === '42P01') {
        setHasInteractions(false)
      } else {
        setReactions(reactionsRes.data ?? [])
        setComments((commentsRes.data ?? []).map((c: any) => ({
          id: c.id,
          training_id: c.training_id,
          content: c.content,
          created_at: c.created_at,
          nickname: c.profiles?.nickname ?? '?',
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function toggleReaction(trainingId: string, emoji: string) {
    if (!currentUserId || !hasInteractions) return
    const supabase = createClient()
    const existing = reactions.find(
      r => r.training_id === trainingId && r.user_id === currentUserId && r.emoji === emoji
    )
    if (existing) {
      await supabase.from('reactions').delete()
        .eq('training_id', trainingId).eq('user_id', currentUserId).eq('emoji', emoji)
      setReactions(prev => prev.filter(r => !(r.training_id === trainingId && r.user_id === currentUserId && r.emoji === emoji)))
    } else {
      await supabase.from('reactions').insert({ training_id: trainingId, user_id: currentUserId, emoji })
      setReactions(prev => [...prev, { training_id: trainingId, user_id: currentUserId!, emoji }])
    }
  }

  async function submitComment(trainingId: string) {
    const content = newComment[trainingId]?.trim()
    if (!content || !currentUserId || !hasInteractions) return
    const supabase = createClient()
    const { data } = await supabase.from('comments')
      .insert({ training_id: trainingId, user_id: currentUserId, content })
      .select('id, training_id, content, created_at, profiles(nickname)')
      .single()
    if (data) {
      setComments(prev => [...prev, {
        id: data.id,
        training_id: data.training_id,
        content: data.content,
        created_at: data.created_at,
        nickname: (data as any).profiles?.nickname ?? '?',
      }])
      setNewComment(prev => ({ ...prev, [trainingId]: '' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
        Cargando galería...
      </div>
    )
  }

  if (trainings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-4xl">📷</p>
        <p className="text-zinc-500 text-sm">Sin fotos aún</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!hasInteractions && (
        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-3 py-2">
          <p className="text-yellow-400 text-xs">⚠️ Para activar comentarios y reacciones, ejecuta <span className="font-mono font-bold">supabase-interactions.sql</span> en Supabase.</p>
        </div>
      )}
      {trainings.map(t => {
        const trainingReactions = reactions.filter(r => r.training_id === t.id)
        const trainingComments = comments.filter(c => c.training_id === t.id)

        return (
          <div key={t.id} className="bg-[#151515] border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Foto */}
            <div className="relative aspect-video w-full">
              <Image src={t.photo_url} alt={`Entreno ${t.date}`} fill className="object-cover" />
              {t.is_monday_escaray && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  🏠 Lunes Escaray
                </div>
              )}
            </div>

            <div className="p-3">
              {/* Info */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-black text-sm">{t.nickname}</span>
                <span className="text-zinc-500 text-xs">{formatDate(t.date)}</span>
              </div>
              {t.notes && <p className="text-zinc-400 text-xs mb-3">{t.notes}</p>}

              {/* Reacciones */}
              {hasInteractions && (
                <div className="flex gap-2 mb-3">
                  {REACTION_EMOJIS.map(emoji => {
                    const count = trainingReactions.filter(r => r.emoji === emoji).length
                    const userReacted = trainingReactions.some(r => r.emoji === emoji && r.user_id === currentUserId)
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(t.id, emoji)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm border transition-colors ${
                          userReacted
                            ? 'bg-orange-950/40 border-orange-700 text-orange-300'
                            : 'bg-[#1e1e1e] border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {emoji}
                        {count > 0 && <span className="text-[11px] font-bold">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Comentarios */}
              {hasInteractions && (
                <div>
                  {trainingComments.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                      {trainingComments.map(c => (
                        <div key={c.id} className="flex gap-1.5 text-xs">
                          <span className="text-zinc-300 font-bold shrink-0">{c.nickname}</span>
                          <span className="text-zinc-400">{c.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Comentar..."
                      value={newComment[t.id] ?? ''}
                      onChange={e => setNewComment(prev => ({ ...prev, [t.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && submitComment(t.id)}
                      className="flex-1 bg-[#1e1e1e] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => submitComment(t.id)}
                      className="p-2 text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
