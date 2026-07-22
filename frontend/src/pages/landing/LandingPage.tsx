import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import lottie from 'lottie-web'

function LottieAnim({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null
    fetch(src)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data || !containerRef.current) return
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        })
      })
      .catch(() => {})
    return () => { anim?.destroy() }
  }, [src])
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

const CSS = `
  * { box-sizing: border-box; }

  @keyframes landBlob1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%     { transform: translate(40px,-60px) scale(1.1); }
    66%     { transform: translate(-25px,30px) scale(0.93); }
  }
  @keyframes landBlob2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(-50px,40px) scale(1.12); }
    70%     { transform: translate(30px,-20px) scale(0.9); }
  }
  @keyframes landFadeUp {
    0%   { opacity: 0; transform: translateY(18px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes landFadeIn {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes landFloat {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-14px); }
  }
  @keyframes landCtaPulse {
    0%,100% { box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
    50%     { box-shadow: 0 10px 32px rgba(37,99,235,0.5); }
  }

  .land-wrap {
    min-height: 100vh; min-height: 100dvh;
    position: relative; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: linear-gradient(160deg, #eef6ff 0%, #f0f9f4 100%);
    display: flex; flex-direction: column;
  }

  .land-blob {
    position: absolute; border-radius: 50%;
    filter: blur(80px); z-index: 0; pointer-events: none;
  }
  .land-blob-1 {
    width: 520px; height: 520px;
    background: rgba(37,99,235,0.18);
    top: -160px; left: -120px;
    animation: landBlob1 10s ease-in-out infinite;
  }
  .land-blob-2 {
    width: 460px; height: 460px;
    background: rgba(16,185,129,0.14);
    bottom: -140px; right: -100px;
    animation: landBlob2 12s ease-in-out infinite;
  }

  .land-nav {
    position: relative; z-index: 2;
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px;
    max-width: 1180px; margin: 0 auto; width: 100%;
    animation: landFadeIn 0.5s ease;
  }

  .land-cta-btn {
    border: none; cursor: pointer; font-family: inherit;
    background: #2563eb; color: #fff;
    font-weight: 600; letter-spacing: -0.01em;
    border-radius: 12px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .land-cta-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .land-cta-btn:active { transform: scale(0.97); }

  .land-cta-btn-ghost {
    background: transparent; color: #1e293b;
    border: 1.5px solid #dbeafe;
  }
  .land-cta-btn-ghost:hover { background: #eff6ff; }

  .land-hero {
    position: relative; z-index: 1;
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    max-width: 1180px; margin: 0 auto; width: 100%;
    padding: 24px 24px 48px;
    gap: 48px;
  }

  .land-copy { flex: 1; max-width: 520px; animation: landFadeUp 0.6s ease 0.1s both; }
  .land-anim {
    flex: 1; max-width: 460px;
    display: flex; align-items: center; justify-content: center;
    animation: landFadeUp 0.7s ease 0.2s both, landFloat 5s ease-in-out 0.9s infinite;
  }

  .land-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: #eff6ff; border: 1px solid #dbeafe;
    color: #2563eb; font-size: 0.78rem; font-weight: 600;
    padding: 6px 13px; border-radius: 999px; margin-bottom: 1.25rem;
  }
  .land-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
  }

  .land-title {
    font-size: clamp(2rem, 4.2vw, 3rem);
    font-weight: 800; letter-spacing: -0.03em; line-height: 1.08;
    color: #0f172a; margin: 0 0 1rem;
  }
  .land-title span {
    background: linear-gradient(90deg, #2563eb, #0ea5e9);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .land-sub {
    font-size: 1.05rem; line-height: 1.6; color: #64748b;
    margin: 0 0 2rem; max-width: 460px;
  }

  .land-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .land-primary { padding: 14px 28px; font-size: 1rem; animation: landCtaPulse 2.6s ease-in-out infinite; }
  .land-secondary { padding: 14px 24px; font-size: 1rem; }
  .land-telegram-btn {
    background: #229ed9;
    box-shadow: 0 8px 24px rgba(34,158,217,0.3);
  }
  .land-telegram-btn:hover { filter: brightness(1.08); }
  .land-hint {
    font-size: 0.85rem; color: #94a3b8; margin: 10px 0 0;
  }

  @media (max-width: 880px) {
    .land-hero { flex-direction: column-reverse; text-align: center; padding-top: 8px; gap: 12px; }
    .land-copy { max-width: 100%; }
    .land-sub { margin-left: auto; margin-right: auto; }
    .land-actions { justify-content: center; }
    .land-anim { max-width: 320px; }
  }
`

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{CSS}</style>
      <div className="land-wrap">
        <div className="land-blob land-blob-1" />
        <div className="land-blob land-blob-2" />

        <nav className="land-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b', letterSpacing: '-0.02em' }}>
              My Santex
            </span>
          </div>

          <button
            className="land-cta-btn land-cta-btn-ghost"
            style={{ padding: '9px 20px', fontSize: '0.875rem' }}
            onClick={() => navigate('/login')}
          >
            Kirish
          </button>
        </nav>

        <div className="land-hero">
          <div className="land-copy">
            <span className="land-badge">
              <span className="land-badge-dot" />
              Sotuv va ombor tizimi
            </span>
            <h1 className="land-title">
              Do'koningizni <span>raqamlashtiring</span>,<br />
              savdoni nazorat qiling
            </h1>
            <p className="land-sub">
              Santexnika va xo'jalik mollari do'konlari uchun to'liq sotuv, ombor
              va qarzdorlar boshqaruv tizimi. Tez, oson va ishonchli.
            </p>
            <div className="land-actions">
              <button
                className="land-cta-btn land-primary"
                onClick={() => navigate('/login')}
              >
                Tizimga kirish →
              </button>
              <a
                className="land-cta-btn land-secondary land-telegram-btn"
                href="https://t.me/CodeNur"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.5 3.5L2.75 10.9c-1.05.42-1.04 1-.18 1.27l4.78 1.49 1.85 5.6c.22.56.44.79.86.79.42 0 .6-.19.83-.42l1.99-1.92 4.14 3.06c.76.42 1.31.2 1.5-.7l2.72-12.8c.28-1.15-.28-1.63-1.24-1.27z" fill="white"/>
                </svg>
                Ro'yxatdan o'tish
              </a>
            </div>
            <p className="land-hint">Ro'yxatdan o'tish uchun admin bilan Telegram orqali bog'laning</p>
          </div>

          <div className="land-anim">
            <LottieAnim src="/landing-hero.json" />
          </div>
        </div>
      </div>
    </>
  )
}
