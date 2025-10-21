import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  sidebarOpen: boolean
  selectedHouseholdId: string | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedHousehold: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        selectedHouseholdId: null,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSelectedHousehold: (id) => set({ selectedHouseholdId: id }),
      }),
      {
        name: 'admin-app-storage',
      }
    ),
    {
      name: 'admin-app-store',
    }
  )
)
