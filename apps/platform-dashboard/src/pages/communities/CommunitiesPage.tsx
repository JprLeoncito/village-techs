import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/features/communities/StatusBadge'
import { CommunityActions } from '@/components/features/communities/CommunityActions'
import {
  useCommunities,
  useSuspendCommunity,
  useReactivateCommunity,
  useSoftDeleteCommunity,
} from '@/hooks/useCommunities'
import { useAuditLog } from '@/hooks/useAuditLog'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database.types'

type Community = Database['public']['Tables']['communities']['Row']
type CommunityStatus = Community['status']
type ConfirmType = 'suspend' | 'reactivate' | 'delete' | null

interface ConfirmState {
  type: ConfirmType
  community: Community
}

export function CommunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const { data: communities, isLoading } = useCommunities()
  const suspendCommunity = useSuspendCommunity()
  const reactivateCommunity = useReactivateCommunity()
  const softDeleteCommunity = useSoftDeleteCommunity()
  const logAudit = useAuditLog()

  const handleSuspend = async () => {
    if (!confirmState) return

    try {
      await suspendCommunity.mutateAsync(confirmState.community.id)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'suspend_community',
        entity_type: 'community',
        entity_id: confirmState.community.id,
        changes: {
          status: {
            from: confirmState.community.status,
            to: 'suspended',
          },
        },
      })

      toast.success(`Community "${confirmState.community.name}" has been suspended`)
      setConfirmState(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend community')
    }
  }

  const handleReactivate = async () => {
    if (!confirmState) return

    try {
      await reactivateCommunity.mutateAsync(confirmState.community.id)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'reactivate_community',
        entity_type: 'community',
        entity_id: confirmState.community.id,
        changes: {
          status: {
            from: confirmState.community.status,
            to: 'active',
          },
        },
      })

      toast.success(`Community "${confirmState.community.name}" has been reactivated`)
      setConfirmState(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate community')
    }
  }

  const handleDelete = async () => {
    if (!confirmState) return

    try {
      await softDeleteCommunity.mutateAsync(confirmState.community.id)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'delete_community',
        entity_type: 'community',
        entity_id: confirmState.community.id,
        changes: {
          status: {
            from: confirmState.community.status,
            to: 'deleted',
          },
        },
      })

      toast.success(
        `Community "${confirmState.community.name}" has been deleted. Data will be retained for 30 days.`
      )
      setConfirmState(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete community')
    }
  }

  // Filter communities
  const filteredCommunities = communities?.filter((community) => {
    if (filterStatus !== 'all' && community.status !== filterStatus) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        community.name.toLowerCase().includes(query) ||
        community.location?.toLowerCase().includes(query) ||
        community.contact_email?.toLowerCase().includes(query)
      )
    }

    return true
  }) || []

  // Count by status
  const statusCounts = communities?.reduce(
    (acc, community) => {
      acc[community.status] = (acc[community.status] || 0) + 1
      return acc
    },
    {} as Record<CommunityStatus, number>
  )

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Communities</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage all residential communities on the platform
            </p>
          </div>
          <Link to="/communities/create">
            <Button size="sm">
              <PlusIcon className="h-4 w-4" />
              Create Community
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Summary */}
      {statusCounts && (
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{communities?.length || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Communities</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.active || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusCounts.suspended || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Suspended</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{statusCounts.deleted || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Deleted</div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
          <option value="deleted">Deleted Only</option>
        </select>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredCommunities.length} communit{filteredCommunities.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>

      {/* Communities Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredCommunities.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Community
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredCommunities.map((community) => (
                <tr key={community.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {community.logo_url && (
                        <img
                          src={community.logo_url}
                          alt={community.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{community.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {community.location || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{community.contact_email}</div>
                    {community.contact_phone && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{community.contact_phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={community.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(community.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <CommunityActions
                      community={community}
                      onSuspend={() =>
                        setConfirmState({ type: 'suspend', community })
                      }
                      onReactivate={() =>
                        setConfirmState({ type: 'reactivate', community })
                      }
                      onDelete={() =>
                        setConfirmState({ type: 'delete', community })
                      }
                      isLoading={
                        suspendCommunity.isPending ||
                        reactivateCommunity.isPending ||
                        softDeleteCommunity.isPending
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-700/50 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? 'No communities found matching your search'
              : 'No communities created yet. Create your first community to get started.'}
          </p>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmState?.type === 'suspend'}
        title="Suspend Community"
        message={`Are you sure you want to suspend "${confirmState?.community.name}"? All community users will immediately lose access to their accounts. You can reactivate the community later.`}
        confirmLabel="Suspend Community"
        variant="warning"
        onConfirm={handleSuspend}
        onCancel={() => setConfirmState(null)}
        isLoading={suspendCommunity.isPending}
      />

      <ConfirmDialog
        isOpen={confirmState?.type === 'reactivate'}
        title="Reactivate Community"
        message={`Are you sure you want to reactivate "${confirmState?.community.name}"? All authorized users will regain immediate access to their accounts.`}
        confirmLabel="Reactivate Community"
        variant="info"
        onConfirm={handleReactivate}
        onCancel={() => setConfirmState(null)}
        isLoading={reactivateCommunity.isPending}
      />

      <ConfirmDialog
        isOpen={confirmState?.type === 'delete'}
        title="Delete Community"
        message={`Are you sure you want to delete "${confirmState?.community.name}"? The community will be marked as deleted and all users will lose access. Data will be retained for 30 days before permanent deletion. This action cannot be undone.`}
        confirmLabel="Delete Community"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmState(null)}
        isLoading={softDeleteCommunity.isPending}
      />
    </Container>
  )
}
