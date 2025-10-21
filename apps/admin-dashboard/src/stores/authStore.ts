import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AdminUser } from '@/types/auth.types'

interface AuthState {
  user: AdminUser | null
  setUser: (user: AdminUser | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
      }),
      {
        name: 'admin-auth-storage',
      }
    ),
    {
      name: 'admin-auth-store',
    }
  )
)
