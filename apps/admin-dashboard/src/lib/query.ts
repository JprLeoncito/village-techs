import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Query keys factory for HOA Admin
export const queryKeys = {
  households: {
    all: ['households'] as const,
    lists: () => [...queryKeys.households.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.households.lists(), { filters }] as const,
    details: () => [...queryKeys.households.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.households.details(), id] as const,
  },
  householdMembers: {
    all: ['household-members'] as const,
    lists: () => [...queryKeys.householdMembers.all, 'list'] as const,
    list: (householdId: string) =>
      [...queryKeys.householdMembers.lists(), householdId] as const,
    detail: (id: string) => [...queryKeys.householdMembers.all, id] as const,
  },
  stickers: {
    all: ['vehicle-stickers'] as const,
    lists: () => [...queryKeys.stickers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.stickers.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.stickers.all, id] as const,
  },
  permits: {
    all: ['construction-permits'] as const,
    lists: () => [...queryKeys.permits.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.permits.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.permits.all, id] as const,
  },
  fees: {
    all: ['association-fees'] as const,
    lists: () => [...queryKeys.fees.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.fees.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.fees.all, id] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    lists: () => [...queryKeys.announcements.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.announcements.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.announcements.all, id] as const,
  },
  gateEntries: {
    all: ['gate-entries'] as const,
    lists: () => [...queryKeys.gateEntries.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.gateEntries.lists(), { filters }] as const,
  },
  incidents: {
    all: ['incident-reports'] as const,
    lists: () => [...queryKeys.incidents.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.incidents.lists(), { filters }] as const,
    detail: (id: string) => [...queryKeys.incidents.all, id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    household: () => [...queryKeys.analytics.all, 'household'] as const,
    sticker: () => [...queryKeys.analytics.all, 'sticker'] as const,
    fee: () => [...queryKeys.analytics.all, 'fee'] as const,
  },
  profile: {
    all: ['profile'] as const,
    details: () => [...queryKeys.profile.all, 'detail'] as const,
    detail: () => [...queryKeys.profile.details()] as const,
  },
}
