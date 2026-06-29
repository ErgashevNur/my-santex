import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import lottie from 'lottie-web'
import { useAuthStore } from '../../store/auth.store'
import FaceVerifyModal from '../../components/auth/FaceVerifyModal'

function LottieAnim({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null
    fetch(src)
      .then(r => r.json())
      .then(data => {
        if (!containerRef.current) return
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        })
      })
    return () => { anim?.destroy() }
  }, [src])
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

const CSS = `
  * { box-sizing: border-box; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    18% { transform: translateX(-7px); }
    36% { transform: translateX(7px); }
    54% { transform: translateX(-4px); }
    72% { transform: translateX(4px); }
  }
  @keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes fadeSlideUp {
    0% { transform: translateY(16px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  @keyframes blobMove1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(40px,-60px) scale(1.1); }
    66%     { transform: translate(-25px,30px) scale(0.93); }
  }
  @keyframes blobMove2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(-50px,40px) scale(1.12); }
    70%     { transform: translate(30px,-20px) scale(0.9); }
  }
  @keyframes blobMove3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(35px,50px) scale(1.08); }
  }

  /* ── Blob ── */
  .blob {
    position: absolute; border-radius: 50%;
    filter: blur(72px); z-index: 0; pointer-events: none;
  }
  .blob-1 {
    width: 520px; height: 520px;
    background: rgba(37,99,235,0.2);
    top: -140px; left: -100px;
    animation: blobMove1 9s ease-in-out infinite;
  }
  .blob-2 {
    width: 460px; height: 460px;
    background: rgba(16,185,129,0.16);
    bottom: -100px; left: 10%;
    animation: blobMove2 12s ease-in-out infinite;
  }
  .blob-3 {
    width: 380px; height: 380px;
    background: rgba(139,92,246,0.12);
    top: 20%; left: 25%;
    animation: blobMove3 8s ease-in-out infinite;
  }

  /* ── Wrap ── */
  .login-wrap {
    display: flex; height: 100vh; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position: relative;
    background: linear-gradient(160deg, #eef6ff 0%, #f0f9f4 100%);
  }

  /* ── Left panel ── */
  .login-left {
    width: 70%; flex-shrink: 0;
    background: transparent;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: 28px 24px 32px;
    overflow: hidden; position: relative; z-index: 1;
  }

  /* ── Right panel ── */
  .login-right {
    width: 30%; flex-shrink: 0;
    background: #ffffff;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem 1.75rem;
    border-left: 1px solid #f1f5f9;
    box-shadow: -6px 0 32px rgba(0,0,0,0.06);
    position: relative; z-index: 1;
  }

  /* ── Card (PIN pad wrapper) ── */
  .login-card {
    display: flex; flex-direction: column; align-items: center;
    width: 100%;
  }

  /* ── Mobile: overlay layout ── */
  @media (max-width: 780px) {
    .login-wrap { height: 100dvh; }

    /* animatsiya — full-screen background */
    .login-left {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      padding: 0; z-index: 0;
      justify-content: center; align-items: center;
    }
    .login-brand   { display: none !important; }
    .login-caption { display: none !important; }

    /* PIN pad — ustida overlay */
    .login-right {
      position: absolute; inset: 0; z-index: 2;
      width: 100%;
      background: transparent;
      border-left: none; box-shadow: none;
      padding: 1.5rem 1.25rem;
      justify-content: center;
      overflow-y: auto;
    }

    /* karta — shaffof, faqat tugmalar oq */
    .login-card {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-radius: 0;
      padding: 2rem 1.5rem 1.75rem;
      width: 100%; max-width: 360px;
      box-shadow: none;
    }
    /* matn animatsiya ustida o'qilsin */
    .login-card h1 { text-shadow: 0 1px 6px rgba(255,255,255,0.9); }
    .login-card p  { text-shadow: 0 1px 4px rgba(255,255,255,0.8); }
  }

  /* ── Keypad ── */
  .pkey {
    border: none; cursor: pointer;
    user-select: none; -webkit-tap-highlight-color: transparent;
    font-family: inherit;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px; height: 58px;
    transition: background 0.1s, transform 0.1s, box-shadow 0.12s;
  }
  @media (max-width: 780px) {
    .pkey { height: 64px; border-radius: 14px; }
  }
  .pkey:active { transform: scale(0.9) !important; }

  .pkey-num {
    background: #f8fafc; color: #0f172a;
    font-size: 1.25rem; font-weight: 600;
    border: 1px solid #eef2f7;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .pkey-num:hover {
    background: #eef2f8;
    transform: scale(1.04);
    box-shadow: 0 3px 8px rgba(0,0,0,0.08);
  }
  .pkey-del {
    background: #f8fafc; color: #64748b;
    font-size: 1.2rem;
    border: 1px solid #eef2f7;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .pkey-del:hover { background: #fff0f0; color: #ef4444; transform: scale(1.04); }

  .pkey-ok { border: none; box-shadow: 0 2px 10px rgba(37,99,235,0.25); }
  .pkey-ok:not(:disabled):hover {
    filter: brightness(1.08);
    transform: scale(1.04);
    box-shadow: 0 4px 16px rgba(37,99,235,0.35);
  }
  .pkey-ok:disabled { cursor: not-allowed; box-shadow: none; }
`

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']

export default function LoginPage() {
  const navigate  = useNavigate()
  const { loginWithPin, completeFaceLogin, isLoading } = useAuthStore()

  const [pin,        setPin]        = useState('')
  const [error,      setError]      = useState('')
  const [shaking,    setShaking]    = useState(false)
  const [faceUserId, setFaceUserId] = useState<string | null>(null)
  const submitting = useRef(false)
  const pinRef = useRef('')

  useEffect(() => { pinRef.current = pin }, [pin])

  const doLogin = async (value: string) => {
    if (submitting.current || value.length !== 8) return
    submitting.current = true
    setError('')
    try {
      const result = await loginWithPin(value)
      if (result.requireSetup) {
        navigate('/setup', { replace: true })
      } else if (result.requireFaceVerification && result.userId) {
        setFaceUserId(result.userId)
      } else {
        const { user } = useAuthStore.getState()
        navigate(user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || "PIN noto'g'ri")
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 550)
    } finally {
      submitting.current = false
    }
  }

  const handleKey = (key: string) => {
    if (isLoading) return
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (key === '✓') { doLogin(pinRef.current); return }
    setPin(prev => {
      if (prev.length >= 8) return prev
      const next = prev + key
      setError('')
      if (next.length === 8) setTimeout(() => doLogin(next), 130)
      return next
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      else if (e.key === 'Backspace') handleKey('⌫')
      else if (e.key === 'Enter') doLogin(pinRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFaceSuccess = async (descriptor: number[]) => {
    if (!faceUserId) return
    await completeFaceLogin(faceUserId, descriptor)
    navigate('/admin', { replace: true })
  }

  return (
    <>
      <style>{CSS}</style>

      {faceUserId && (
        <FaceVerifyModal
          userId={faceUserId}
          mode="verify"
          onSuccess={handleFaceSuccess}
          onCancel={() => setFaceUserId(null)}
        />
      )}

      <div className="login-wrap">

        {/* Blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        {/* ══════════ LEFT — LOTTIE ══════════ */}
        <div className="login-left">

          {/* brand — desktop only */}
          <div className="login-brand" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            alignSelf: 'flex-start', zIndex: 1,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C9 3 6.5 5.5 6.5 8.5C6.5 11 8 13 9.5 14H14.5C16 13 17.5 11 17.5 8.5C17.5 5.5 15 3 12 3Z" fill="white"/>
                <path d="M9 16H15V19C15 20 14.1 21 13 21H11C9.9 21 9 20 9 19V16Z" fill="rgba(255,255,255,0.75)"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#1e293b', letterSpacing: '-0.02em' }}>
                My Santex
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Sotuv tizimi</p>
            </div>
          </div>

          {/* Lottie */}
          <div style={{
            flex: 1, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 0, maxHeight: '75vh',
          }}>
            <LottieAnim src="/shopping-cach.json" />
          </div>

          {/* caption — desktop only */}
          <div className="login-caption" style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1rem', color: '#1e293b', letterSpacing: '-0.01em' }}>
              Tez. Oson. Ishonchli.
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Savdo jarayonini raqamlashtiring
            </p>
          </div>
        </div>

        {/* ══════════ RIGHT — PIN PAD ══════════ */}
        <div className="login-right">
        <div className="login-card">

          {/* logo + heading */}
          <div style={{ marginBottom: '2.25rem', textAlign: 'center', animation: 'fadeSlideUp 0.5s ease' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 17,
              background: '#eff6ff', border: '1.5px solid #dbeafe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 3px 10px rgba(37,99,235,0.1)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C9 3 6.5 5.5 6.5 8.5C6.5 11 8 13 9.5 14H14.5C16 13 17.5 11 17.5 8.5C17.5 5.5 15 3 12 3Z" fill="#2563eb"/>
                <path d="M9 16H15V19C15 20 14.1 21 13 21H11C9.9 21 9 20 9 19V16Z" fill="#3b82f6"/>
              </svg>
            </div>
            <h1 style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.35rem', margin: '0 0 5px', letterSpacing: '-0.025em' }}>
              Tizimga kirish
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>
              PIN kodingizni kiriting
            </p>
          </div>

          {/* PIN dots */}
          <div style={{
            display: 'flex', gap: 10,
            marginBottom: error ? '1rem' : '1.75rem',
            animation: shaking ? 'shake 0.5s ease' : 'none',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < pin.length ? '#2563eb' : error ? '#fca5a5' : '#e2e8f0',
                transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                boxShadow: i < pin.length ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                transition: 'all 0.13s',
                animation: i === pin.length - 1 && pin.length > 0 ? 'popIn 0.18s ease' : 'none',
              }} />
            ))}
          </div>

          {/* error */}
          {error && (
            <div style={{
              width: '100%', marginBottom: '1.25rem',
              padding: '0.625rem 0.9rem',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 9, fontSize: '0.8rem', color: '#dc2626',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* keypad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            width: '100%',
            maxWidth: 320,
          }}>
            {KEYS.map(key => {
              const isDel = key === '⌫'
              const isOk  = key === '✓'
              const ok    = pin.length === 8

              if (isOk) return (
                <button key={key}
                  onClick={() => handleKey(key)}
                  disabled={isLoading || !ok}
                  className="pkey pkey-ok"
                  style={{
                    background: ok ? '#2563eb' : '#f1f5f9',
                    color:      ok ? 'white'   : '#94a3b8',
                    fontSize: '1.3rem',
                    opacity: isLoading ? 0.75 : 1,
                  }}
                >
                  {isLoading
                    ? <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2.5px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        animation: 'spin 0.75s linear infinite',
                      }} />
                    : '→'
                  }
                </button>
              )

              return (
                <button key={key}
                  onClick={() => handleKey(key)}
                  disabled={isLoading}
                  className={`pkey ${isDel ? 'pkey-del' : 'pkey-num'}`}
                >
                  {key}
                </button>
              )
            })}
          </div>

        </div>{/* login-card */}
        </div>{/* login-right */}
      </div>{/* login-wrap */}
    </>
  )
}
