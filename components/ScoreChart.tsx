'use client'

interface WeekScore {
  label: string
  score: number
}

export default function ScoreChart({ data }: { data: WeekScore[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
        Sin datos aún
      </div>
    )
  }

  const maxScore = Math.max(...data.map(d => d.score), 1)

  return (
    <div className="flex items-end gap-1 w-full" style={{ height: 96 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <p className="text-[8px] text-orange-400 font-bold mb-0.5">
            {d.score > 0 ? d.score : ''}
          </p>
          <div
            className={`w-full rounded-t-md transition-all ${d.score > 0 ? 'bg-orange-500' : 'bg-zinc-800'}`}
            style={{ height: `${Math.max((d.score / maxScore) * 64, d.score > 0 ? 4 : 2)}px` }}
          />
          <p className="text-[8px] text-zinc-600 mt-1">{d.label}</p>
        </div>
      ))}
    </div>
  )
}
