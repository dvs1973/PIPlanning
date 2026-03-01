interface Tab { id: string; label: string }

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export default function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-400 hover:text-white hover:border-border'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
