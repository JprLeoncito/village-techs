import { useState, useEffect } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AdminUserForm } from '@/components/features/admin-users/AdminUserForm'
import { AdminUserTable } from '@/components/features/admin-users/AdminUserTable'
import {
  useAdminUsers,
  useCreateAdminOfficer,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useResetAdminPassword,
  useDeactivateAdminUser,
  useReactivateAdminUser,
} from '@/hooks/useAdminUsers'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useCommunities } from '@/hooks/useCommunities'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { showErrorToast, showSuccessToast } from '@/lib/errorHandling'
import type { AdminUserFormData } from '@/lib/validations/community'

type ModalType = 'add' | 'edit' | null
type ConfirmType = 'resetPassword' | 'deactivate' | 'reactivate' | 'delete' | null

interface ConfirmState {
  type: ConfirmType
  userId: string
  email: string
  name: string
  tenantId: string
}

export function AdminUsersPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [modal, setModal] = useState<ModalType>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const { data: communities, isLoading: communitiesLoading } = useCommunities()
  const { data: adminUsers, isLoading: usersLoading } = useAdminUsers(selectedCommunity)
  const createOfficer = useCreateAdminOfficer()
  const updateUser = useUpdateAdminUser()
  const deleteUser = useDeleteAdminUser()
  const resetPassword = useResetAdminPassword()
  const deactivateUser = useDeactivateAdminUser()
  const reactivateUser = useReactivateAdminUser()
  const logAudit = useAuditLog()

  useEffect(() => {
    console.log("Selected Community ID:", selectedCommunity);
    console.log("Admin Users:", adminUsers);
  }, [selectedCommunity, adminUsers]);

  const handleAddOfficer = async (data: AdminUserFormData) => {
    try {
      const result = await createOfficer.mutateAsync({
        ...data,
        tenant_id: selectedCommunity,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'create_admin',
        entity_type: 'admin_user',
        entity_id: result.user.id,
        changes: {
          tenant_id: selectedCommunity,
          email: data.email,
          role: data.role,
        },
      })

      toast.success(
        `Admin officer created successfully! Temporary password: ${result.temporary_password}`,
        { duration: 10000 }
      )
      setModal(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  const handleResetPassword = async () => {
    if (!confirmState) return

    try {
      const result = await resetPassword.mutateAsync({
        userId: confirmState.userId,
        email: confirmState.email,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'reset_admin_password',
        entity_type: 'admin_user',
        entity_id: confirmState.userId,
        changes: {
          email: confirmState.email,
        },
      })

      showSuccessToast(
        'Password reset successfully!',
        `Temporary password: ${result.temporary_password}. Please share this securely with ${confirmState.email}.`,
        toast
      )
      setConfirmState(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  const handleDeactivate = async () => {
    if (!confirmState) return

    try {
      await deactivateUser.mutateAsync({
        userId: confirmState.userId,
        tenantId: confirmState.tenantId,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'deactivate_admin',
        entity_type: 'admin_user',
        entity_id: confirmState.userId,
        changes: {
          status: 'inactive',
        },
      })

      showSuccessToast(`User "${confirmState.name}" has been deactivated`, 'They will immediately lose access to the community dashboard.', toast)
      setConfirmState(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  const handleReactivate = async () => {
    if (!confirmState) return

    try {
      await reactivateUser.mutateAsync({
        userId: confirmState.userId,
        tenantId: confirmState.tenantId,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'reactivate_admin',
        entity_type: 'admin_user',
        entity_id: confirmState.userId,
        changes: {
          status: 'active',
        },
      })

      showSuccessToast(`User "${confirmState.name}" has been reactivated`, 'They will regain access to the community dashboard.', toast)
      setConfirmState(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  const handleEditUser = async (data: AdminUserFormData) => {
    if (!editingUser) return

    try {
      await updateUser.mutateAsync({
        userId: editingUser.id,
        tenantId: selectedCommunity,
        data,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'update_admin',
        entity_type: 'admin_user',
        entity_id: editingUser.id,
        changes: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          role: data.role,
        },
      })

      showSuccessToast('Admin user updated successfully', 'The changes have been saved successfully.', toast)
      setModal(null)
      setEditingUser(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirmState) return

    try {
      await deleteUser.mutateAsync({
        userId: confirmState.userId,
        tenantId: confirmState.tenantId,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'delete_admin',
        entity_type: 'admin_user',
        entity_id: confirmState.userId,
        changes: {
          email: confirmState.email,
          name: confirmState.name,
        },
      })

      showSuccessToast(`User "${confirmState.name}" has been deleted`, 'The user has been permanently removed from the system.', toast)
      setConfirmState(null)
    } catch (error: any) {
      showErrorToast(error, toast)
    }
  }

  // Filter users
  const filteredUsers = adminUsers?.filter((user) => {
    if (filterRole !== 'all' && user.role !== filterRole) return false
    if (filterStatus === 'active' && user.status !== 'active') return false
    if (filterStatus === 'inactive' && user.status === 'active') return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      return fullName.includes(query) || email.includes(query)
    }

    return true
  }) || []

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Users</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage admin users and their access to community dashboards
        </p>
      </div>

      {/* Community Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Community</label>
        <select
          value={selectedCommunity}
          onChange={(e) => {
            setSelectedCommunity(e.target.value)
          }}
          className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="" className="text-gray-900 dark:text-gray-100">Choose a community...</option>
          {communities?.map((community) => (
            <option key={community.id} value={community.id} className="text-gray-900 dark:text-gray-100">
              {community.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCommunity && (
        <>
          {/* Controls Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all" className="text-gray-900 dark:text-gray-100">All Roles</option>
                <option value="admin_head" className="text-gray-900 dark:text-gray-100">Head Admin</option>
                <option value="admin_officer" className="text-gray-900 dark:text-gray-100">Officer</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all" className="text-gray-900 dark:text-gray-100">All Status</option>
                <option value="active" className="text-gray-900 dark:text-gray-100">Active Only</option>
                <option value="inactive" className="text-gray-900 dark:text-gray-100">Inactive Only</option>
              </select>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Actions */}
            <Button size="sm" onClick={() => setModal('add')}>
              <PlusIcon className="h-4 w-4" />
              Add Officer
            </Button>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <AdminUserTable
              users={filteredUsers}
              onEdit={(user) => {
                setEditingUser(user)
                setModal('edit')
              }}
              onDelete={(userId, name, email) =>
                setConfirmState({
                  type: 'delete',
                  userId,
                  email,
                  name,
                  tenantId: selectedCommunity,
                })
              }
              onResetPassword={(userId, email) =>
                setConfirmState({
                  type: 'resetPassword',
                  userId,
                  email,
                  name: email,
                  tenantId: selectedCommunity,
                })
              }
              onDeactivate={(userId, name) =>
                setConfirmState({
                  type: 'deactivate',
                  userId,
                  email: '',
                  name,
                  tenantId: selectedCommunity,
                })
              }
              onReactivate={(userId, name) =>
                setConfirmState({
                  type: 'reactivate',
                  userId,
                  email: '',
                  name,
                  tenantId: selectedCommunity,
                })
              }
              isLoading={updateUser.isPending || deleteUser.isPending || resetPassword.isPending || deactivateUser.isPending || reactivateUser.isPending}
            />
          )}
        </>
      )}

      {!selectedCommunity && !communitiesLoading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Please select a community to view admin users</p>
        </div>
      )}

      {/* Add Officer Modal */}
      {modal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Admin Officer</h2>
            <div className="mt-6">
              <AdminUserForm
                mode="create"
                defaultRole="admin_officer"
                onSubmit={handleAddOfficer}
                isSubmitting={createOfficer.isPending}
                hideButtons={true}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button form="admin-user-form" type="submit" loading={createOfficer.isPending}>
                Create Officer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {modal === 'edit' && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Admin User</h2>
            <div className="mt-6">
              <AdminUserForm
                mode="edit"
                initialData={editingUser}
                onSubmit={handleEditUser}
                isSubmitting={updateUser.isPending}
                hideButtons={true}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setModal(null)
                setEditingUser(null)
              }}>
                Cancel
              </Button>
              <Button form="admin-user-form" type="submit" loading={updateUser.isPending}>
                Update User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmState?.type === 'resetPassword'}
        title="Reset Password"
        message={`Are you sure you want to reset the password for ${confirmState?.email}? A new temporary password will be generated and displayed.`}
        confirmLabel="Reset Password"
        variant="warning"
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmState(null)}
        isLoading={resetPassword.isPending}
      />

      <ConfirmDialog
        isOpen={confirmState?.type === 'deactivate'}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${confirmState?.name}? They will immediately lose access to the community dashboard.`}
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmState(null)}
        isLoading={deactivateUser.isPending}
      />

      <ConfirmDialog
        isOpen={confirmState?.type === 'reactivate'}
        title="Reactivate User"
        message={`Are you sure you want to reactivate ${confirmState?.name}? They will regain access to the community dashboard.`}
        confirmLabel="Reactivate"
        variant="info"
        onConfirm={handleReactivate}
        onCancel={() => setConfirmState(null)}
        isLoading={reactivateUser.isPending}
      />

      <ConfirmDialog
        isOpen={confirmState?.type === 'delete'}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${confirmState?.name}? This action cannot be undone. The user will be removed from the database but their auth account will remain (requires service_role access to delete).`}
        confirmLabel="Delete User"
        variant="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmState(null)}
        isLoading={deleteUser.isPending}
      />
    </Container>
  )
}
