import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Droplets, ShieldCheck, Hash } from 'lucide-react'
import FaceVerifyModal from '../../components/auth/FaceVerifyModal'

type Step = 'pin' | 'face'

export default function SetupFacePage() {
  const navigate = useNavigate()
  const { loginWithPin, enrollFace, pendingUserId, isLoading } = useAuthStore()

  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(pendingUserId)

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 8) {
      setError('PIN 8 ta raqamdan iborat bo\'lishi kerak')
      return
    }
    setError('')
    try {
      const result = await loginWithPin(pin)
      if (result.requireSetup && result.userId) {
        setUserId(result.userId)
        setStep('face')
      } else if (result.requireFaceVerification) {
        // Yuz allaqachon saqlangan — oddiy login sahifasiga
        navigate('/login', { replace: true })
      } else {
        // Kutilmagan holat
        setError('Bu sahifa faqat Super Admin uchun')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'PIN noto\'g\'ri')
    }
  }

  const handleFaceSuccess = async (descriptor: number[]) => {
    if (!userId) return
    await enrollFace(userId, descriptor)
    navigate('/admin', { replace: true })
  }

  return (
    <>
      {step === 'face' && userId && (
        <FaceVerifyModal
          userId={userId}
          mode="enroll"
          onSuccess={handleFaceSuccess}
          onCancel={() => setStep('pin')}
        />
      )}

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', background: '#16a34a',
              borderRadius: '16px', marginBottom: '1rem',
            }}>
              <ShieldCheck size={28} color="white" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Yuzni Ro'yxatga Olish
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Bu amalni faqat bir marta bajarish mumkin
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'white', borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '2rem', border: '1px solid #e2e8f0',
          }}>
            {/* Warning */}
            <div style={{
              padding: '0.875rem', background: '#fefce8',
              border: '1px solid #fde047', borderRadius: '10px',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#854d0e', margin: 0, lineHeight: 1.5 }}>
                <strong>Diqqat:</strong> Bu sahifa faqat bir marta ishlaydi.
                PIN kirgizgach, kamerangiz orqali yuzingiz saqlanadi.
                Shundan keyin login uchun PIN + yuz tekshiruvi talab qilinadi.
              </p>
            </div>

            {error && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', fontSize: '0.875rem', color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* PIN dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.375rem', margin: '0.5rem 0', flexWrap: 'nowrap' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{
                    width: '28px', height: '28px', borderRadius: '7px',
                    background: i < pin.length ? '#16a34a' : '#f1f5f9',
                    border: `2px solid ${i < pin.length ? '#16a34a' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}>
                    {i < pin.length && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: '#94a3b8', display: 'flex', alignItems: 'center',
                }}>
                  <Hash size={16} />
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Super Admin PIN (8 ta raqam)"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  autoFocus
                  required
                  style={{
                    width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                    border: '1.5px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '1.25rem', letterSpacing: '0.5rem',
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.length !== 8}
                style={{
                  width: '100%', padding: '0.875rem',
                  background: pin.length === 8 ? '#16a34a' : '#d1fae5',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontSize: '0.9rem', fontWeight: 600, cursor: pin.length === 8 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                {isLoading ? 'Tekshirilmoqda...' : 'Davom etish → Kamerani yoqish'}
              </button>
            </form>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <a
                href="/login"
                style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none' }}
              >
                ← Oddiy loginга qaytish
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
