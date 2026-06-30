import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Telegram Mini App — to'liq ekranga yoy
const tg = (window as unknown as { Telegram?: { WebApp?: { expand: () => void; ready: () => void } } }).Telegram?.WebApp
tg?.ready()
tg?.expand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
