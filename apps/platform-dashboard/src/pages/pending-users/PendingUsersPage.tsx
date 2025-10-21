import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePendingUsers, useApprovePendingUser, useRejectPendingUser, useUpdatePendingUserNotes } from '@/hooks/usePendingUsers'
import { useCommunities } from '@/hooks/useCommunities'
import { useAuthStore } from '@/stores/authStore'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import type { Database } from '@/types/database.types'

type PendingUser = Database['public']['Tables']['pending_users']['Row']

type ModalType = 'approve' | 'reject' | 'notes' | null
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

interface ApprovalData {
  role: 'superadmin' | 'admin_head' | 'admin_officer'
  tenantId: string | null
  adminNotes: string
}

export function PendingUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: pendingUsers = [], isLoading, refetch } = usePendingUsers()
  const { data: communities = [] } = useCommunities()
  const approveUser = useApprovePendingUser()
  const rejectUser = useRejectPendingUser()
  const updateNotes = useUpdatePendingUserNotes()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [modal, setModal] = useState<ModalType>(null)
  const [approvalData, setApprovalData] = useState<ApprovalData>({
    role: 'admin_officer',
    tenantId: null,
    adminNotes: ''
  })
  const [notesText, setNotesText] = useState('')

  // Filter users based on search and status
  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus === 'all' || user.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleApprove = () => {
    if (!selectedUser) return

    approveUser.mutate({
      userId: selectedUser.id,
      role: approvalData.role,
      tenantId: approvalData.tenantId || undefined,
      adminNotes: approvalData.adminNotes
    }, {
      onSuccess: () => {
        setModal(null)
        setSelectedUser(null)
        setApprovalData({
          role: 'admin_officer',
          tenantId: null,
          adminNotes: ''
        })
      }
    })
  }

  const handleReject = () => {
    if (!selectedUser) return

    rejectUser.mutate({
      userId: selectedUser.id,
      adminNotes: approvalData.adminNotes
    }, {
      onSuccess: () => {
        setModal(null)
        setSelectedUser(null)
        setApprovalData({
          role: 'admin_officer',
          tenantId: null,
          adminNotes: ''
        })
      }
    })
  }

  const handleUpdateNotes = () => {
    if (!selectedUser) return

    updateNotes.mutate({
      userId: selectedUser.id,
      adminNotes: notesText
    })
    setModal(null)
    setSelectedUser(null)
    setNotesText('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending'
      case 'approved':
        return 'status-approved'
      case 'rejected':
        return 'status-rejected'
      default:
        return 'status-inactive'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          </div>
          <p className="mt-2 text-muted">
            Review and manage user registration requests. Assign roles and communities to grant access.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(u => u.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(u => u.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(u => u.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-default rounded-lg focus-ring"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>

          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Reviewed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-muted">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted">
                          {user.phone || 'No phone provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {user.reviewed_at ? formatDate(user.reviewed_at) : 'Not reviewed'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {user.admin_notes && (
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setNotesText(user.admin_notes || '')
                                setModal('notes')
                              }}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="View notes"
                            >
                              <DocumentTextIcon className="h-4 w-4" />
                            </button>
                          )}

                          {user.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setApprovalData({
                                    role: 'admin_officer',
                                    tenantId: null,
                                    adminNotes: ''
                                  })
                                  setModal('approve')
                                }}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setApprovalData({
                                    role: 'admin_officer',
                                    tenantId: null,
                                    adminNotes: ''
                                  })
                                  setModal('reject')
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No users found</h3>
                  <p className="mt-1 text-sm text-muted">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {modal === 'approve' && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg modal-content p-6">
              <h2 className="text-xl font-bold mb-6">Approve User Registration</h2>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Name:</span>
                      <p className="text-gray-900 dark:text-gray-100">{selectedUser.first_name} {selectedUser.last_name}</p>
                    </div>
                    <div>
                      <span className="text-muted">Email:</span>
                      <p className="text-gray-900 dark:text-gray-100">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="text-muted">Phone:</span>
                      <p className="text-gray-900 dark:text-gray-100">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-muted">Registered:</span>
                      <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Assign Role
                  </label>
                  <select
                    value={approvalData.role}
                    onChange={(e) => setApprovalData(prev => ({
                      ...prev,
                      role: e.target.value as 'superadmin' | 'admin_head' | 'admin_officer'
                    }))}
                    className="w-full px-3 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100"
                  >
                    <option value="admin_officer">Admin Officer</option>
                    <option value="admin_head">Admin Head</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Assign to Community {approvalData.role !== 'superadmin' ? '(Optional)' : ''}
                  </label>
                  <select
                    value={approvalData.tenantId || ''}
                    onChange={(e) => setApprovalData(prev => ({
                      ...prev,
                      tenantId: e.target.value || null
                    }))}
                    disabled={approvalData.role === 'superadmin'}
                    className="w-full px-3 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    <option value="">No community (superadmin only)</option>
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={approvalData.adminNotes}
                    onChange={(e) => setApprovalData(prev => ({
                      ...prev,
                      adminNotes: e.target.value
                    }))}
                    rows={3}
                    placeholder="Add any notes about this approval..."
                    className="w-full px-3 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  loading={approveUser.isPending}
                  className="btn-primary"
                >
                  Approve User
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {modal === 'reject' && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg modal-content p-6">
              <h2 className="text-xl font-bold mb-6">Reject User Registration</h2>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Information</h3>
                  <div className="text-sm">
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.first_name} {selectedUser.last_name}</p>
                    <p className="text-muted">{selectedUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={approvalData.adminNotes}
                    onChange={(e) => setApprovalData(prev => ({
                      ...prev,
                      adminNotes: e.target.value
                    }))}
                    rows={4}
                    placeholder="Please provide a reason for rejecting this registration..."
                    className="w-full px-3 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  loading={rejectUser.isPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Reject User
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {modal === 'notes' && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg modal-content p-6">
              <h2 className="text-xl font-bold mb-6">Admin Notes</h2>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Information</h3>
                  <div className="text-sm">
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.first_name} {selectedUser.last_name}</p>
                    <p className="text-muted">{selectedUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={4}
                    placeholder="Add or edit admin notes..."
                    className="w-full px-3 py-2 border border-default rounded-lg focus-ring bg-default text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateNotes}
                  loading={updateNotes.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}