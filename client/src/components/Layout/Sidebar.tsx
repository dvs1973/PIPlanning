import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

const NAV = [
  { to: '/',                label: 'Roadmap',           icon: '◈' },
  { to: '/sprint-planning', label: 'Sprint Planning',   icon: '⊞' },
  { to: '/capacity',        label: 'Capaciteit',        icon: '◉' },
  { to: '/projects',        label: 'Projecten',         icon: '◧' },
  { to: '/teams',           label: 'Teams',             icon: '◑' },
  { to: '/scenarios',       label: "What-if Scenario's", icon: '◈' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-surface border border-border rounded-lg p-2 text-gray-400"
      >
        ☰
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-56 bg-surface border-r border-border z-40 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="w-6 h-6" />
            <span className="font-bold text-white text-sm">PI Planning</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Vlaamse overheid</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-accent/15 text-accent font-medium' : 'text-gray-400 hover:text-white hover:bg-surface-2'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-white font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <button onClick={logout} className="mt-2 text-xs text-gray-500 hover:text-cap-red transition-colors">
            Uitloggen
          </button>
        </div>
      </aside>
    </>
  )
}
