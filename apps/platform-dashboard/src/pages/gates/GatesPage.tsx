import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GateForm } from '@/components/features/gates/GateForm'
import { useGates, useCreateGate, useUpdateGate, useDeleteGate, useToggleGateStatus } from '@/hooks/useGates'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useCommunities } from '@/hooks/useCommunities'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { GateFormData } from '@/lib/validations/gate'
import type { Database } from '@/types/database.types'

type Gate = Database['public']['Tables']['gates']['Row']
type ModalType = 'add' | 'edit' | 'delete' | null

export function GatesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: communities, isLoading: communitiesLoading } = useCommunities()
  const { data: gates, isLoading: gatesLoading } = useGates(selectedCommunity)
  const createGate = useCreateGate()
  const updateGate = useUpdateGate()
  const deleteGate = useDeleteGate()
  const toggleStatus = useToggleGateStatus()
  const logAudit = useAuditLog()

  const handleAddGate = async (data: GateFormData) => {
    try {
      const gate = await createGate.mutateAsync(data)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'create_gate',
        entity_type: 'gate',
        entity_id: gate.id,
        changes: {
          community_id: data.tenant_id,
          name: data.name,
          type: data.type,
          coordinates: { latitude: data.latitude, longitude: data.longitude },
        },
      })

      toast.success(`Gate "${data.name}" created successfully`)
      setModal(null)
      setSelectedGate(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create gate')
    }
  }

  const handleEditGate = async (data: GateFormData) => {
    if (!selectedGate) return

    try {
      const updated = await updateGate.mutateAsync({
        gateId: selectedGate.id,
        data,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'update_gate',
        entity_type: 'gate',
        entity_id: selectedGate.id,
        changes: {
          name: data.name,
          type: data.type,
          coordinates: { latitude: data.latitude, longitude: data.longitude },
        },
      })

      toast.success(`Gate "${data.name}" updated successfully`)
      setModal(null)
      setSelectedGate(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update gate')
    }
  }

  const handleDeleteGate = async () => {
    if (!selectedGate) return

    try {
      await deleteGate.mutateAsync(selectedGate.id)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'delete_gate',
        entity_type: 'gate',
        entity_id: selectedGate.id,
        changes: {
          name: selectedGate.name,
        },
      })

      toast.success(`Gate "${selectedGate.name}" deleted successfully`)
      setModal(null)
      setSelectedGate(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete gate')
    }
  }

  const handleToggleStatus = async (gate: Gate) => {
    try {
      const newStatus = !gate.is_active
      await toggleStatus.mutateAsync({
        gateId: gate.id,
        isActive: newStatus,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'update_gate',
        entity_type: 'gate',
        entity_id: gate.id,
        changes: {
          is_active: newStatus,
        },
      })

      toast.success(`Gate "${gate.name}" ${newStatus ? 'activated' : 'deactivated'}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update gate status')
    }
  }

  
  // Filter gates
  const filteredGates = gates?.filter((gate) => {
    if (filterType !== 'all' && gate.type !== filterType) return false
    if (filterStatus === 'active' && !gate.is_active) return false
    if (filterStatus === 'inactive' && gate.is_active) return false
    return true
  }) || []

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gates</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage community entry and exit points
        </p>
      </div>

      {/* Community Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Community</label>
        <select
          value={selectedCommunity}
          onChange={(e) => {
            setSelectedCommunity(e.target.value)
            setSelectedGate(null)
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
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all" className="text-gray-900 dark:text-gray-100">All Types</option>
                <option value="vehicle" className="text-gray-900 dark:text-gray-100">Vehicle</option>
                <option value="pedestrian" className="text-gray-900 dark:text-gray-100">Pedestrian</option>
                <option value="service" className="text-gray-900 dark:text-gray-100">Service</option>
                <option value="delivery" className="text-gray-900 dark:text-gray-100">Delivery</option>
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
                {filteredGates.length} gate{filteredGates.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setModal('add')}>
                <PlusIcon className="h-4 w-4" />
                Add Gate
              </Button>
            </div>
          </div>

          {/* Content */}
          {gatesLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm">
              {filteredGates.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Coordinates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {filteredGates.map((gate) => (
                      <tr key={gate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{gate.name}</div>
                          {gate.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{gate.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge variant="info">
                            {gate.type.charAt(0).toUpperCase() + gate.type.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {gate.latitude.toFixed(4)}, {gate.longitude.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge variant={gate.is_active ? 'success' : 'secondary'}>
                            {gate.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedGate(gate)
                                setModal('edit')
                              }}
                              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(gate)}
                              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                            >
                              {gate.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGate(gate)
                                setModal('delete')
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No gates found. Add your first gate to get started.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedCommunity && !communitiesLoading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Please select a community to view gates</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {modal === 'add' ? 'Add Gate' : 'Edit Gate'}
            </h2>
            <div className="mt-6">
              <GateForm
                communityId={selectedCommunity}
                initialData={modal === 'edit' ? selectedGate || undefined : undefined}
                onSubmit={modal === 'add' ? handleAddGate : handleEditGate}
                onCancel={() => {
                  setModal(null)
                  if (modal === 'edit') setSelectedGate(null)
                }}
                isSubmitting={createGate.isPending || updateGate.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal === 'delete' && selectedGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Gate</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the gate "{selectedGate.name}"? This action cannot
              be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setModal(null)
                  setSelectedGate(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteGate}
                loading={deleteGate.isPending}
              >
                Delete Gate
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
