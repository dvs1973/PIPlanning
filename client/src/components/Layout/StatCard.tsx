interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  warning?: boolean
}

export default function StatCard({ label, value, sub, accent, warning }: StatCardProps) {
  const valueColor = accent ? 'text-accent' : warning ? 'text-cap-red' : 'text-white'
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
