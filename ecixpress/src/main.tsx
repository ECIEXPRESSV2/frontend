import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applySectionTheme, getStoredSection } from './lib/sectionTheme'

// Tema global Comida/Tienda: se aplica antes del primer render para no parpadear en ámbar.
applySectionTheme(getStoredSection())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
