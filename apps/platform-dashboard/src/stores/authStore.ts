import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AppUser } from '@/types/auth.types'

interface AuthState {
  user: AppUser | null
  setUser: (user: AppUser | null) => void
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
        name: 'auth-storage',
      }
    ),
    {
      name: 'auth-store',
    }
  )
)
