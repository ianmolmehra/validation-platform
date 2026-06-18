import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, BarChart3, History, ScrollText,
  Globe, ChevronRight, Bell, Settings, Shield, Sparkles, Menu, X
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    color: '#60a5fa' },
  { to: '/upload',    icon: Upload,          label: 'Upload',        color: '#34d399' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics',     color: '#a78bfa' },
  { to: '/countries', icon: Globe,           label: 'Country Rules', color: '#38bdf8' },
  { to: '/history',   icon: History,         label: 'History',       color: '#fb923c' },
  { to: '/logs',      icon: ScrollText,      label: 'Logs',          color: '#f472b6' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden app-bg">

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={clsx('sidebar flex flex-col flex-shrink-0', sidebarOpen && 'sidebar-open')}
        style={{ width: 230 }}>

        {/* Logo */}
        <div className="sidebar-logo px-5 py-5 flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                boxShadow: '0 0 20px rgba(37,99,235,0.5), 0 4px 12px rgba(37,99,235,0.3)',
              }}>
              <Shield className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)', animation: 'neon-pulse 2s infinite' }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">Validation</p>
            <p className="text-xs leading-tight" style={{ color: 'rgba(148,163,184,0.7)' }}>Platform v2</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(139,92,246,0.6)' }} />
            {/* Close button — mobile only */}
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X style={{ width: 16, height: 16, color: 'rgba(148,163,184,0.7)' }} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" style={{ position: 'relative', zIndex: 1 }}>
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(100,116,139,0.7)' }}>Navigation</p>
          {NAV.map(({ to, icon: Icon, label, color }) => (
            <NavLink key={to} to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}
            >
              {({ isActive }) => (
                <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${color}30, ${color}18)`
                        : 'rgba(255,255,255,0.04)',
                      boxShadow: isActive ? `0 0 12px ${color}30` : 'none',
                    }}>
                    <Icon className="transition-colors duration-200" style={{
                      width: 15, height: 15,
                      color: isActive ? color : 'rgba(100,116,139,0.8)',
                    }} />
                  </div>
                  <span className="flex-1 text-[13px]">{label}</span>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.5)' }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              }}>EP</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">Enterprise</p>
              <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(100,116,139,0.8)' }}>Admin</p>
            </div>
            <Settings className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(100,116,139,0.6)' }} />
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="topbar px-4 md:px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="sidebar-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu style={{ width: 20, height: 20, color: '#64748b' }} />
            </button>
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-2.5">
            {/* Bell */}
            <button className="relative p-2 rounded-xl transition-all duration-150"
              style={{ background: 'rgba(241,245,249,0.8)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(226,232,240,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(241,245,249,0.8)')}>
              <Bell className="w-4.5 h-4.5 text-gray-500" style={{ width: 18, height: 18 }} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#2563eb',
                  boxShadow: '0 0 6px rgba(37,99,235,0.8)',
                  animation: 'neon-pulse 2s infinite',
                }} />
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
              }}>VP</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 app-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Breadcrumb() {
  const loc = useLocation()
  const parts = loc.pathname.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="font-semibold" style={{ color: '#94a3b8', fontSize: 13 }}>Platform</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className={clsx(
            'capitalize',
            i === parts.length - 1
              ? 'font-semibold text-gray-800'
              : 'text-gray-400'
          )} style={{ fontSize: 13 }}>
            {p.replace(/-/g, ' ')}
          </span>
        </span>
      ))}
    </div>
  )
}
