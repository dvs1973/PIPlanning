interface ProgressBarProps { value: number; max?: number }

export default function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct < 80 ? 'bg-cap-green' : pct < 95 ? 'bg-cap-orange' : 'bg-cap-red'

  return (
    <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  )
}
