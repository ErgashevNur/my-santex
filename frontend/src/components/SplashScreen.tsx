import { useEffect, useState } from 'react'

const CSS = `
  .splash-wrap {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(145deg, #0f172a 0%, #1e3a5f 60%, #0f2d4a 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition: opacity 0.6s ease;
  }
  .splash-wrap.hiding { opacity: 0; pointer-events: none; }

  /* blob orqa fon */
  .s-blob {
    position: absolute; border-radius: 50%; pointer-events: none;
    filter: blur(80px); opacity: 0.35;
  }
  .s-blob-1 {
    width: 400px; height: 400px;
    background: #2563eb;
    top: -100px; left: -80px;
    animation: sBlobMove1 6s ease-in-out infinite;
  }
  .s-blob-2 {
    width: 350px; height: 350px;
    background: #0ea5e9;
    bottom: -80px; right: -60px;
    animation: sBlobMove2 8s ease-in-out infinite;
  }
  .s-blob-3 {
    width: 260px; height: 260px;
    background: #6366f1;
    top: 40%; left: 50%; transform: translate(-50%, -50%);
    animation: sBlobMove3 7s ease-in-out infinite;
  }
  @keyframes sBlobMove1 {
    0%,100% { transform: translate(0,0); }
    50%     { transform: translate(40px, 30px); }
  }
  @keyframes sBlobMove2 {
    0%,100% { transform: translate(0,0); }
    50%     { transform: translate(-30px, -40px); }
  }
  @keyframes sBlobMove3 {
    0%,100% { transform: translate(-50%,-50%) scale(1); }
    50%     { transform: translate(-50%,-50%) scale(1.15); }
  }

  /* logo ikonka */
  .s-logo-icon {
    width: 80px; height: 80px; border-radius: 24px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 0 rgba(37,99,235,0.5),
                0 20px 50px rgba(37,99,235,0.4);
    animation: sLogoPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards,
               sPulse 2.5s ease-in-out 1s infinite;
    opacity: 0;
  }
  @keyframes sLogoPop {
    0%   { opacity: 0; transform: scale(0.4) rotate(-10deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes sPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4), 0 20px 50px rgba(37,99,235,0.4); }
    50%     { box-shadow: 0 0 0 16px rgba(37,99,235,0), 0 20px 50px rgba(37,99,235,0.4); }
  }

  /* matnlar */
  .s-title {
    margin: 1.25rem 0 0.375rem; font-size: 1.75rem;
    font-weight: 800; color: #ffffff;
    letter-spacing: -0.03em;
    opacity: 0;
    animation: sSlideUp 0.5s ease 0.45s forwards;
  }
  .s-sub {
    font-size: 0.9rem; color: #93c5fd;
    font-weight: 400; letter-spacing: 0.04em;
    opacity: 0;
    animation: sSlideUp 0.5s ease 0.65s forwards;
  }
  @keyframes sSlideUp {
    0%   { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* yuklanish nuqtalari */
  .s-dots {
    display: flex; gap: 7px; margin-top: 2.5rem;
    opacity: 0; animation: sFadeIn 0.4s ease 0.9s forwards;
  }
  .s-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #3b82f6;
    animation: sDotBounce 1.2s ease-in-out infinite;
  }
  .s-dot:nth-child(2) { animation-delay: 0.15s; }
  .s-dot:nth-child(3) { animation-delay: 0.30s; }
  @keyframes sDotBounce {
    0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
    40%         { transform: scale(1.2); opacity: 1; }
  }
  @keyframes sFadeIn {
    to { opacity: 1; }
  }
`

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => setHiding(true), 2200)
    const doneTimer = setTimeout(() => onDone(), 2800)
    return () => { clearTimeout(hideTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <>
      <style>{CSS}</style>
      <div className={`splash-wrap${hiding ? ' hiding' : ''}`}>
        <div className="s-blob s-blob-1" />
        <div className="s-blob s-blob-2" />
        <div className="s-blob s-blob-3" />

        <div className="s-logo-icon">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C9 3 6.5 5.5 6.5 8.5C6.5 11 8 13 9.5 14H14.5C16 13 17.5 11 17.5 8.5C17.5 5.5 15 3 12 3Z" fill="white"/>
            <path d="M9 16H15V19C15 20 14.1 21 13 21H11C9.9 21 9 20 9 19V16Z" fill="rgba(255,255,255,0.75)"/>
          </svg>
        </div>

        <p className="s-title">My Santex</p>
        <p className="s-sub">SOTUV TIZIMI</p>

        <div className="s-dots">
          <div className="s-dot" />
          <div className="s-dot" />
          <div className="s-dot" />
        </div>
      </div>
    </>
  )
}
