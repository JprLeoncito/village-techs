import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize dark mode before rendering
const initTheme = () => {
  const storedTheme = localStorage.getItem('admin-theme-storage')
  if (storedTheme) {
    try {
      const { state: { theme } } = JSON.parse(storedTheme)
      const root = window.document.documentElement
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
    } catch (e) {
      console.error('Failed to parse theme from localStorage:', e)
    }
  }
}

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
