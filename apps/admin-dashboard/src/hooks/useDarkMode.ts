import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface DarkModeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

export const useDarkModeStore = create<DarkModeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        set({ theme })
        // Immediately apply the theme when it changes
        const root = window.document.documentElement
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

        root.classList.remove('light', 'dark')
        root.classList.add(isDark ? 'dark' : 'light')

        // Update resolved theme
        set({ resolvedTheme: isDark ? 'dark' : 'light' })
      },
    }),
    {
      name: 'admin-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply the stored theme on rehydration
          const root = window.document.documentElement
          const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

          root.classList.remove('light', 'dark')
          root.classList.add(isDark ? 'dark' : 'light')

          state.resolvedTheme = isDark ? 'dark' : 'light'
        }
      },
    }
  )
)

function updateTheme(theme: Theme) {
  const root = window.document.documentElement
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.classList.remove('light', 'dark')
  root.classList.add(isDark ? 'dark' : 'light')

  // Get current state and update it
  const currentState = useDarkModeStore.getState()
  if (currentState.resolvedTheme !== (isDark ? 'dark' : 'light')) {
    useDarkModeStore.setState({ resolvedTheme: isDark ? 'dark' : 'light' })
  }
}

export function useDarkMode() {
  const { theme, setTheme, resolvedTheme } = useDarkModeStore()
  const [mounted, setMounted] = useState(false)

  // Apply theme on mount and when theme changes
  useEffect(() => {
    if (mounted) {
      updateTheme(theme)
    }
  }, [theme, mounted])

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
    updateTheme(theme)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (theme === 'system') {
        updateTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    mounted,
  }
}