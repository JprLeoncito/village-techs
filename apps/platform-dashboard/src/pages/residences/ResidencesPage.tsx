import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ResidenceForm } from '@/components/features/residences/ResidenceForm'
import { ResidenceCSVImport } from '@/components/features/residences/ResidenceCSVImport'
import { NumberingSchemeForm } from '@/components/features/residences/NumberingSchemeForm'
import { useResidences, useCreateResidence, useUpdateResidence, useDeleteResidence } from '@/hooks/useResidences'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useCommunities } from '@/hooks/useCommunities'
import { PlusIcon, CloudArrowUpIcon, HashtagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { ResidenceFormData } from '@/lib/validations/residence'

type ModalType = 'add' | 'edit' | 'delete' | 'import' | 'numbering' | null

export function ResidencesPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [editingResidence, setEditingResidence] = useState<any>(null)
  const [deletingResidence, setDeletingResidence] = useState<any>(null)

  const { data: communities, isLoading: communitiesLoading } = useCommunities()
  const { data: residences, isLoading: residencesLoading } = useResidences(selectedCommunity)
  const createResidence = useCreateResidence()
  const updateResidence = useUpdateResidence()
  const deleteResidence = useDeleteResidence()
  const logAudit = useAuditLog()

  const handleAddResidence = async (data: ResidenceFormData) => {
    try {
      const residence = await createResidence.mutateAsync(data)

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'create_residence',
        entity_type: 'residence',
        entity_id: residence.id,
        changes: {
          community_id: data.tenant_id,
          unit_number: data.unit_number,
          type: data.type,
        },
      })

      toast.success(`Residence ${data.unit_number} added successfully`)
      setModal(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add residence')
    }
  }

  const handleImportSuccess = () => {
    // Bulk import already logged by CSV component
    toast.success('Import completed successfully')
    setModal(null)
  }

  const handleApplyNumbering = (pattern: string) => {
    toast.success(`Numbering pattern applied: ${pattern}`)
    setModal(null)
  }

  const handleEditResidence = async (data: ResidenceFormData) => {
    if (!editingResidence) return

    try {
      await updateResidence.mutateAsync({
        residenceId: editingResidence.id,
        data,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'update_residence',
        entity_type: 'residence',
        entity_id: editingResidence.id,
        changes: {
          unit_number: data.unit_number,
          type: data.type,
          max_occupancy: data.max_occupancy,
          lot_area: data.lot_area,
          floor_area: data.floor_area,
        },
      })

      toast.success(`Residence ${data.unit_number} updated successfully`)
      setModal(null)
      setEditingResidence(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update residence')
    }
  }

  const handleDeleteResidence = async () => {
    if (!deletingResidence) return

    try {
      await deleteResidence.mutateAsync({
        residenceId: deletingResidence.id,
        tenantId: selectedCommunity,
      })

      // Log audit
      await logAudit.mutateAsync({
        action_type: 'delete_residence',
        entity_type: 'residence',
        entity_id: deletingResidence.id,
        changes: {
          unit_number: deletingResidence.unit_number,
        },
      })

      toast.success(`Residence ${deletingResidence.unit_number} deleted successfully`)
      setModal(null)
      setDeletingResidence(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete residence')
    }
  }

  const filteredResidences = residences?.filter((r) =>
    r.unit_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Residences</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage housing units within communities
        </p>
      </div>

      {/* Community Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Community</label>
        <select
          value={selectedCommunity}
          onChange={(e) => setSelectedCommunity(e.target.value)}
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
          {/* Actions Bar */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by unit number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModal('numbering')}>
                <HashtagIcon className="h-4 w-4" />
                Numbering Scheme
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setModal('import')}>
                <CloudArrowUpIcon className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button size="sm" onClick={() => setModal('add')}>
                <PlusIcon className="h-4 w-4" />
                Add Residence
              </Button>
            </div>
          </div>

          {/* Residences Table */}
          {residencesLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredResidences && filteredResidences.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Unit Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Max Occupancy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Floor Area
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredResidences.map((residence) => (
                    <tr key={residence.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {residence.unit_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <Badge variant="info">
                          {residence.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {residence.max_occupancy} people
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {residence.floor_area} m²
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingResidence(residence)
                              setModal('edit')
                            }}
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeletingResidence(residence)
                              setModal('delete')
                            }}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? 'No residences found matching your search'
                  : 'No residences added yet. Add your first residence or import via CSV.'}
              </p>
            </div>
          )}
        </>
      )}

      {!selectedCommunity && !communitiesLoading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Please select a community to view residences</p>
        </div>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Residence</h2>
            <div className="mt-6">
              <ResidenceForm
                communityId={selectedCommunity}
                onSubmit={handleAddResidence}
                onCancel={() => setModal(null)}
                isSubmitting={createResidence.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {modal === 'import' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bulk Import Residences</h2>
            <div className="mt-6">
              <ResidenceCSVImport
                communityId={selectedCommunity}
                onSuccess={handleImportSuccess}
                onCancel={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {modal === 'edit' && editingResidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Residence</h2>
            <div className="mt-6">
              <ResidenceForm
                communityId={selectedCommunity}
                initialData={editingResidence}
                mode="edit"
                onSubmit={handleEditResidence}
                onCancel={() => {
                  setModal(null)
                  setEditingResidence(null)
                }}
                isSubmitting={updateResidence.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {modal === 'delete' && deletingResidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Residence</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete residence "{deletingResidence.unit_number}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setModal(null)
                  setDeletingResidence(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteResidence}
                loading={deleteResidence.isPending}
              >
                Delete Residence
              </Button>
            </div>
          </div>
        </div>
      )}

      {modal === 'numbering' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Define Numbering Scheme</h2>
            <div className="mt-6">
              <NumberingSchemeForm
                onApply={handleApplyNumbering}
                onCancel={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
