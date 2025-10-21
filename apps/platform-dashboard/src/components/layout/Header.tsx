import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { supabase } from '@/lib/supabase'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'
import { Bars3Icon, KeyIcon, ArrowRightOnRectangleIcon, UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function Header() {
  const { user, clearUser } = useAuthStore()
  const { toggleSidebar } = useAppStore()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      clearUser()
      navigate('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleSignOutFromDropdown = async () => {
    setIsDropdownOpen(false)
    await handleSignOut()
  }

  const handleNavigateWithClose = (path: string) => {
    setIsDropdownOpen(false)
    navigate(path)
  }

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.user-dropdown')) {
      setIsDropdownOpen(false)
    }
  }

  // Add event listener when dropdown is open
  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isDropdownOpen])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={toggleSidebar}
        className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <DarkModeToggle />

        <div className="relative user-dropdown">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{user?.email}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Superadmin</p>
              </div>

              <button
                onClick={() => handleNavigateWithClose('/profile')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </button>

              <button
                onClick={() => handleNavigateWithClose('/change-password')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <KeyIcon className="h-4 w-4" />
                Change Password
              </button>

              <div className="border-t border-gray-200 dark:border-gray-600" />

              <button
                onClick={handleSignOutFromDropdown}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
