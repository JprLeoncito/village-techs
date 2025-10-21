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

// Query keys factory
export const queryKeys = {
  communities: {
    all: ['communities'] as const,
    lists: () => [...queryKeys.communities.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.communities.lists(), { filters }] as const,
    details: () => [...queryKeys.communities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.communities.details(), id] as const,
  },
  residences: {
    all: ['residences'] as const,
    lists: () => [...queryKeys.residences.all, 'list'] as const,
    list: (communityId: string) => [...queryKeys.residences.lists(), communityId] as const,
    detail: (id: string) => [...queryKeys.residences.all, id] as const,
  },
  gates: {
    all: ['gates'] as const,
    lists: () => [...queryKeys.gates.all, 'list'] as const,
    list: (communityId: string) => [...queryKeys.gates.lists(), communityId] as const,
    detail: (id: string) => [...queryKeys.gates.all, id] as const,
  },
  adminUsers: {
    all: ['admin-users'] as const,
    lists: () => [...queryKeys.adminUsers.all, 'list'] as const,
    list: (communityId: string) => [...queryKeys.adminUsers.lists(), communityId] as const,
    detail: (id: string) => [...queryKeys.adminUsers.all, id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    platform: () => [...queryKeys.analytics.all, 'platform'] as const,
    subscriptions: () => [...queryKeys.analytics.all, 'subscriptions'] as const,
  },
  profile: {
    all: ['profile'] as const,
    details: () => [...queryKeys.profile.all, 'detail'] as const,
    detail: () => [...queryKeys.profile.details(), 'current'] as const,
  },
  audit: ['audit-logs'] as const,
}
