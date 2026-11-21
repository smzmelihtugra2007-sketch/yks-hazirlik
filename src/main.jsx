import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// En başta: beforeinstallprompt yalnızca bir kez ve erken gelir
import './utils/installPrompt.js'
import '@fontsource-variable/inter/wght.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
