import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/providers/AppProviders'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)

declare global {
  interface Window {
    __GG_APP_BOOT__?: {
      mounted?: boolean
    }
  }
}

if (window.__GG_APP_BOOT__) {
  window.__GG_APP_BOOT__.mounted = true
}
