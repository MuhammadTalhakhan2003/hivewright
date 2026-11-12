import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import { AuthProvider } from './lib/auth'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </AuthProvider>
  </StrictMode>,
)
