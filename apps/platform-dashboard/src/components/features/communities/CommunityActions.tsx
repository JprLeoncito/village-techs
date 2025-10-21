import { Button } from '@/components/ui/Button'
import {
  PauseCircleIcon,
  PlayCircleIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import type { Database } from '@/types/database.types'

type Community = Database['public']['Tables']['communities']['Row']

interface CommunityActionsProps {
  community: Community
  onSuspend: () => void
  onReactivate: () => void
  onDelete: () => void
  isLoading?: boolean
}

export function CommunityActions({
  community,
  onSuspend,
  onReactivate,
  onDelete,
  isLoading = false,
}: CommunityActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isActive = community.status === 'active'
  const isSuspended = community.status === 'suspended'
  const isDeleted = community.status === 'deleted'

  // Can't perform actions on deleted communities
  if (isDeleted) {
    return (
      <span className="text-sm text-gray-500 italic">No actions available</span>
    )
  }

  return (
    <div className="relative inline-block text-left">
      {/* Desktop View - Button Group */}
      <div className="hidden gap-2 md:flex">
        {isActive && (
          <>
            <button
              onClick={onSuspend}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Suspend Community"
            >
              <PauseCircleIcon className="h-4 w-4" />
              Suspend
            </button>
            <button
              onClick={onDelete}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Delete Community"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </>
        )}

        {isSuspended && (
          <>
            <button
              onClick={onReactivate}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Reactivate Community"
            >
              <PlayCircleIcon className="h-4 w-4" />
              Reactivate
            </button>
            <button
              onClick={onDelete}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Delete Community"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Mobile View - Dropdown Menu */}
      <div className="relative md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                {isActive && (
                  <>
                    <button
                      onClick={() => {
                        onSuspend()
                        setIsOpen(false)
                      }}
                      disabled={isLoading}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PauseCircleIcon className="h-4 w-4" />
                      Suspend Community
                    </button>
                    <button
                      onClick={() => {
                        onDelete()
                        setIsOpen(false)
                      }}
                      disabled={isLoading}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete Community
                    </button>
                  </>
                )}

                {isSuspended && (
                  <>
                    <button
                      onClick={() => {
                        onReactivate()
                        setIsOpen(false)
                      }}
                      disabled={isLoading}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlayCircleIcon className="h-4 w-4" />
                      Reactivate Community
                    </button>
                    <button
                      onClick={() => {
                        onDelete()
                        setIsOpen(false)
                      }}
                      disabled={isLoading}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete Community
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
