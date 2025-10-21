import { useState } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

export function DarkModeToggle() {
  const { theme, setTheme, mounted } = useDarkMode()
  const [isOpen, setIsOpen] = useState(false)

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg border border-gray-300 bg-white animate-pulse" />
    )
  }

  const themes = [
    { value: 'light', icon: SunIcon, label: 'Light' },
    { value: 'dark', icon: MoonIcon, label: 'Dark' },
    { value: 'system', icon: ComputerDesktopIcon, label: 'System' },
  ] as const

  const currentTheme = themes.find((t) => t.value === theme) || themes[2]

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white p-0 text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="Toggle theme"
      >
        <currentTheme.icon className="h-4 w-4" />
      </button>

      {/* Theme Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {themes.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value)
                  setIsOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  theme === value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {theme === value && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}