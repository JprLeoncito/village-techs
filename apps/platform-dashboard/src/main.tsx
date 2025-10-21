import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { useDarkMode } from './hooks/useDarkMode'
import './index.css'

// Initialize dark mode
function InitializeTheme({ children }: { children: React.ReactNode }) {
  useDarkMode()
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InitializeTheme>
      <App />
    </InitializeTheme>
  </React.StrictMode>,
)
