'use client'

import { useState } from 'react'
import GalleryGrid from './GalleryGrid'
import Link from 'next/link'

interface ActivityEvent {
  id: string
  emoji: string
  nickname: string
  label: string
  date: string
  notes?: string | null
}

interface PatoWeek {
  weekLabel: string
  patoNickname: string
  patoScore: number
  scores: { nickname: string; score: number }[]
}

interface Props {
  activityEvents: ActivityEvent[]
  patoHistory: PatoWeek[]
}

function groupByDate(events: ActivityEvent[]): Record<string, ActivityEvent[]> {
  const groups: Record<string, ActivityEvent[]> = {}
  events.forEach(e => {
    if (!groups[e.date]) groups[e.date] = []
    groups[e.date].push(e)
  })
  return groups
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Hoy'
  if (dateStr === yesterday) return 'Ayer'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'short',
  })
}

export default function FeedShell({ activityEvents, patoHistory }: Props) {
  const [tab, setTab] = useState<'actividad' | 'galeria' | 'patos'>('actividad')
  const grouped = groupByDate(activityEvents)
  const dates = Object.keys(grouped).sort().reverse()

  return (
    <div>
      {/* Tabs */}
      <div className="flex bg-[#151515] border border-zinc-800 rounded-2xl p-1 mb-5">
        {(['actividad', 'galeria', 'patos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === t ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t === 'actividad' ? '⚡ Actividad' : t === 'galeria' ? '📸 Galería' : '🦆 Patos'}
          </button>
        ))}
      </div>

      {/* Actividad */}
      {tab === 'actividad' && (
        <div className="flex flex-col gap-4">
          {dates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">💤</p>
              <p className="text-zinc-500 text-sm">Sin actividad aún</p>
            </div>
          )}
          {dates.map(date => (
            <div key={date}>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                {formatDateLabel(date)}
              </p>
              <div className="flex flex-col gap-2">
                {grouped[date].map(event => (
                  <div key={event.id} className="bg-[#151515] border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-black">{event.nickname}</span>{' '}
                        <span className="text-zinc-400">{event.label}</span>
                      </p>
                      {event.notes && (
                        <p className="text-zinc-600 text-xs mt-0.5 truncate">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Galería */}
      {tab === 'galeria' && <GalleryGrid />}

      {/* Patos */}
      {tab === 'patos' && (
        <div className="flex flex-col gap-3">
          {patoHistory.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🦆</p>
              <p className="text-zinc-500 text-sm">Aún no hay semanas completadas</p>
            </div>
          )}
          {patoHistory.map((week, i) => (
            <div key={i} className="bg-[#151515] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{week.weekLabel}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🦆</span>
                  <span className="text-yellow-300 font-black">{week.patoNickname}</span>
                  <span className="text-yellow-600 text-xs">({week.patoScore} pts)</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {week.scores.map((s, j) => (
                  <Link key={j} href={`/profile/${s.nickname}`}>
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      j === 0
                        ? 'bg-yellow-950/40 border-yellow-700/40 text-yellow-300'
                        : 'bg-[#1e1e1e] border-zinc-700 text-zinc-400'
                    }`}>
                      {s.nickname} <span className="text-zinc-600">{s.score}pts</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
