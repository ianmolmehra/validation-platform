interface Props { score: number; size?: number; label?: string; color?: string }

export default function ScoreRing({ score, size = 120, label = 'Score', color = '#2563eb' }: Props) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  const ringColor = color === 'auto' ? scoreColor : color

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={ringColor} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="score-ring"
        />
      </svg>
      <div className="text-center -mt-2" style={{ marginTop: `-${size/2 + 20}px`, position: 'relative', zIndex: 1 }}>
        <div style={{marginTop: size/2 - 18}}>
          <div className="text-2xl font-bold" style={{ color: ringColor }}>{Math.round(score)}</div>
          <div className="text-xs text-gray-400 font-medium">{label}</div>
        </div>
      </div>
    </div>
  )
}
