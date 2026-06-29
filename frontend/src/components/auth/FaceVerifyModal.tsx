import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'

interface Props {
  userId: string
  mode?: 'enroll' | 'verify'
  onSuccess: (descriptor: number[]) => Promise<void>
  onCancel: () => void
}

type Status = 'loading_models' | 'waiting_camera' | 'scanning' | 'verifying' | 'success' | 'error' | 'face_mismatch'

const MODEL_URL = '/models'

export default function FaceVerifyModal({ mode = 'verify', onSuccess, onCancel }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [status,      setStatus]      = useState<Status>('loading_models')
  const [message,     setMessage]     = useState('Modellar yuklanmoqda...')
  const [modelsLoaded,setModelsLoaded]= useState(false)
  const [retryKey,    setRetryKey]    = useState(0) // kamera restart uchun

  const isEnroll = mode === 'enroll'

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // 1. Modellarni yuklash
  useEffect(() => {
    async function load() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
        setStatus('waiting_camera')
        setMessage('Kamerani yoqish...')
      } catch {
        setStatus('error')
        setMessage('Modellarni yuklashda xato')
      }
    }
    load()
    return () => stopCamera()
  }, [stopCamera])

  // 2. Kamera — retryKey o'zgarganda qayta ishga tushadi
  useEffect(() => {
    if (!modelsLoaded) return
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setStatus('scanning')
            setMessage(isEnroll ? 'Yuzingizni kameraga qarating. Saqlanadi...' : 'Yuzingizni kameraga qarating...')
          }
        }
      } catch {
        setStatus('error')
        setMessage('Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.')
      }
    }
    startCamera()
  }, [modelsLoaded, isEnroll, retryKey])

  // 3. Yuz aniqlash sikli — 5 ta o'rtacha descriptor
  useEffect(() => {
    if (status !== 'scanning') return
    const video = videoRef.current
    if (!video) return

    const SAMPLES = 5
    const collected: Float32Array[] = []

    intervalRef.current = setInterval(async () => {
      if (!video || video.readyState < 2) return
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (!detection) {
          setMessage(`Yuz aniqlanmadi. To'g'ri qarating...`)
          return
        }

        collected.push(detection.descriptor)
        const remaining = SAMPLES - collected.length
        if (remaining > 0) {
          setMessage(`Skanlanmoqda... (${collected.length}/${SAMPLES})`)
          return
        }

        // 5 ta descriptor o'rtacha qiymati
        const avg = new Array(128).fill(0).map((_, i) =>
          collected.reduce((s, d) => s + d[i], 0) / collected.length
        )

        setStatus('verifying')
        setMessage(isEnroll ? 'Yuz aniqlandi! Saqlanmoqda...' : 'Yuz aniqlandi! Tasdiqlanmoqda...')
        stopCamera()

        try {
          await onSuccess(avg)
          setStatus('success')
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
          const text = Array.isArray(msg) ? msg.join(', ') : msg || 'Yuz tasdiqlanmadi'
          setStatus('face_mismatch')
          setMessage(text)
        }
      } catch {
        // retry next tick
      }
    }, 400)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [status, isEnroll, stopCamera, onSuccess])

  const handleRetry = () => {
    setStatus('waiting_camera')
    setMessage('Kamerani yoqish...')
    setRetryKey(k => k + 1)
  }

  const handleCancel = () => {
    stopCamera()
    onCancel()
  }

  const isEnroll_ = isEnroll
  const accent = isEnroll_ ? '#16a34a' : '#2563eb'
  const title   = isEnroll_ ? 'Yuzni Ro\'yxatga Olish' : 'Yuz Tasdiqlash'
  const subtitle = isEnroll_
    ? 'Yuzingiz bir marta saqlanadi'
    : 'Super Admin — xavfsizlik tekshiruvi'

  const statusColors: Partial<Record<Status, string>> = {
    scanning:      accent,
    verifying:     '#f59e0b',
    success:       '#16a34a',
    face_mismatch: '#ef4444',
    error:         '#ef4444',
    loading_models:'#64748b',
    waiting_camera:'#64748b',
  }

  const showRetry   = status === 'face_mismatch'
  const showFrame   = status === 'scanning' || status === 'verifying' || status === 'detected' as Status
  const frameColor  = status === 'verifying' ? '#f59e0b' : status === 'face_mismatch' ? '#ef4444' : accent

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px',
        padding: '2rem', width: '100%', maxWidth: '420px', textAlign: 'center',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px',
            background: isEnroll_ ? '#f0fdf4' : '#eff6ff',
            borderRadius: '50%', marginBottom: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>{isEnroll_ ? '🛡️' : '🔐'}</span>
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>{subtitle}</p>
        </div>

        {/* Camera view */}
        <div style={{
          position: 'relative', borderRadius: '16px', overflow: 'hidden',
          background: '#0f172a', aspectRatio: '4/3', marginBottom: '1rem',
        }}>
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
              opacity: status === 'face_mismatch' || status === 'error' ? 0.3 : 1,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Face frame overlay */}
          {showFrame && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '180px', height: '220px',
                border: `3px solid ${frameColor}`,
                borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                transition: 'border-color 0.3s',
                boxShadow: `0 0 20px ${frameColor}44`,
              }} />
            </div>
          )}

          {/* Loading/waiting overlay */}
          {(status === 'loading_models' || status === 'waiting_camera') && (
            <div style={{
              position: 'absolute', inset: 0, background: '#1e293b',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '2rem' }}>📷</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Kamera tayyorlanmoqda...</span>
            </div>
          )}

          {/* Error overlay */}
          {(status === 'error' || status === 'face_mismatch') && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: '3rem' }}>{status === 'face_mismatch' ? '🚫' : '❌'}</span>
            </div>
          )}

          {/* Success overlay */}
          {status === 'success' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '3.5rem' }}>✅</span>
            </div>
          )}
        </div>

        {/* Status message */}
        <div style={{
          padding: '0.625rem 1rem', borderRadius: '10px',
          background: status === 'face_mismatch' ? '#fef2f2' : status === 'success' ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${status === 'face_mismatch' ? '#fecaca' : status === 'success' ? '#bbf7d0' : '#e2e8f0'}`,
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            {(status === 'scanning' || status === 'loading_models' || status === 'waiting_camera' || status === 'verifying') && (
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: statusColors[status] || '#64748b',
                animation: 'pulse 1.5s infinite',
              }} />
            )}
            {status === 'success'       && <span>✅</span>}
            {status === 'face_mismatch' && <span>⚠️</span>}
            {status === 'error'         && <span>❌</span>}
            <span style={{
              fontSize: '0.82rem',
              color: statusColors[status] || '#64748b',
              fontWeight: 500,
            }}>
              {message}
            </span>
          </div>
        </div>

        {/* Retry button */}
        {showRetry && (
          <button
            onClick={handleRetry}
            style={{
              width: '100%', padding: '0.7rem', marginBottom: '0.5rem',
              background: '#2563eb', color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Qayta urinish
          </button>
        )}

        <button
          onClick={handleCancel}
          style={{
            width: '100%', padding: '0.625rem',
            background: 'none', border: '1px solid #e2e8f0',
            borderRadius: '8px', cursor: 'pointer',
            color: '#64748b', fontSize: '0.875rem',
          }}
        >
          Bekor qilish
        </button>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  )
}
