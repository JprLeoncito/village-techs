import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  sidebarOpen: boolean
  selectedCommunityId: string | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedCommunity: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        selectedCommunityId: null,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSelectedCommunity: (id) => set({ selectedCommunityId: id }),
      }),
      {
        name: 'app-storage',
      }
    ),
    {
      name: 'app-store',
    }
  )
)
