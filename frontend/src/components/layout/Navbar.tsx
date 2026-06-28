import { useEffect, useRef, useState } from 'react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import NotificationBell from '../shared/NotificationBell'

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ROP: "Sotuv Boshlig'i",
  SALES_MANAGER: 'Sotuvchi',
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm text-white lg:hidden">
          MS
        </div>
        <span className="font-semibold text-sm text-slate-800 lg:hidden">
          {user?.store?.name || 'My Santex'}
        </span>
      </div>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Profile dropdown */}
        <div className="relative pl-3 border-l border-slate-200" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-1.5 py-1 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{roleLabels[user?.role || '']}</p>
            </div>
            <ChevronDown
              size={14}
              className={`hidden sm:block text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{roleLabels[user?.role || '']}</p>
              </div>
              {/* Logout */}
              <button
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
