import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PencilIcon, TrashIcon, KeyIcon, NoSymbolIcon, CheckCircleIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import type { AdminUserWithEmail } from '@/hooks/useAdminUsers'

interface AdminUserActionsProps {
  user: AdminUserWithEmail
  onEdit: () => void
  onDelete: () => void
  onResetPassword: () => void
  onDeactivate: () => void
  onReactivate: () => void
  isLoading?: boolean
}

export function AdminUserActions({
  user,
  onEdit,
  onDelete,
  onResetPassword,
  onDeactivate,
  onReactivate,
  isLoading = false,
}: AdminUserActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isActive = user.status === 'active'

  return (
    <div className="relative inline-block text-left">
      {/* Desktop View - Button Group */}
      <div className="hidden gap-2 md:flex">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Edit User"
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </button>

        <button
          onClick={onResetPassword}
          disabled={isLoading || !isActive}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset Password"
        >
          <KeyIcon className="h-4 w-4" />
          Reset
        </button>

        {isActive ? (
          <button
            onClick={onDeactivate}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Deactivate User"
          >
            <NoSymbolIcon className="h-4 w-4" />
            Deactivate
          </button>
        ) : (
          <button
            onClick={onReactivate}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Reactivate User"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Reactivate
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Delete User"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
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
                <button
                  onClick={() => {
                    onEdit()
                    setIsOpen(false)
                  }}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit User
                </button>

                <button
                  onClick={() => {
                    onResetPassword()
                    setIsOpen(false)
                  }}
                  disabled={isLoading || !isActive}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <KeyIcon className="h-4 w-4" />
                  Reset Password
                </button>

                {isActive ? (
                  <button
                    onClick={() => {
                      onDeactivate()
                      setIsOpen(false)
                    }}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Deactivate User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onReactivate()
                      setIsOpen(false)
                    }}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Reactivate User
                  </button>
                )}

                <button
                  onClick={() => {
                    onDelete()
                    setIsOpen(false)
                  }}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete User
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
