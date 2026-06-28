import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../api/notifications'
import { useAuthStore } from '../../store/auth.store'
import { formatDate } from '../../lib/utils'

// Web Audio API orqali notification chime
function playChime() {
  try {
    const ctx = new AudioContext()
    const notes = [880, 1100]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.start(t)
      osc.stop(t + 0.22)
    })
  } catch {}
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN'

  // Tashqarini bosishda yopish
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── SSE — real-time bildirishnomalar ──────────────────────────────────────
  const handleNewNotification = useCallback(() => {
    playChime()
    qc.invalidateQueries({ queryKey: ['notif-count'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }, [qc])

  useEffect(() => {
    if (isAdmin) return
    const token = localStorage.getItem('token')
    if (!token) return

    const es = new EventSource(`/api/notifications/stream?token=${token}`)

    es.onmessage = () => {
      handleNewNotification()
    }

    es.onerror = () => {
      // EventSource avtomatik reconnect qiladi
    }

    return () => es.close()
  }, [isAdmin, handleNewNotification])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: !isAdmin,
  })

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    enabled: open && !isAdmin,
  })

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const unread = (countData?.count ?? 0) as number
  const items = notifications as any[]
  const hasUnread = items.some((n: any) => !n.isRead)

  if (isAdmin) {
    return (
      <button className="p-2 rounded-lg text-slate-300 cursor-default opacity-40" title="Admin faqat yuboradi">
        <Bell size={18} />
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative transition-colors"
        title="Bildirishnomalar"
      >
        <Bell size={18} className={unread > 0 ? 'text-blue-600' : ''} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-500" />
              <span className="font-semibold text-slate-800 text-sm">Bildirishnomalar</span>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unread} yangi
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck size={12} /> Barchasini o'qi
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {isLoading && (
              <div className="py-10 text-center text-sm text-slate-400">Yuklanmoqda...</div>
            )}
            {!isLoading && items.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Hozircha bildirishnoma yo'q</p>
              </div>
            )}
            {items.map((n: any) => (
              <div
                key={n.id}
                className={`px-4 py-3 transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
              >
                <div className="flex gap-2.5">
                  <div className="mt-1.5 shrink-0">
                    {n.isRead
                      ? <div className="w-2 h-2" />
                      : <div className="w-2 h-2 rounded-full bg-blue-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-slate-400">{formatDate(n.createdAt)}</span>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="text-[11px] text-blue-500 hover:text-blue-700 font-medium"
                        >
                          O'qildi ✓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
