import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Container } from '@/components/layout/Container'
import { CommunityForm } from '@/components/features/communities/CommunityForm'
import { AdminUserForm } from '@/components/features/admin-users/AdminUserForm'
import { useCreateCommunity } from '@/hooks/useCommunities'
import { useAuditLog } from '@/hooks/useAuditLog'
import { supabase } from '@/lib/supabase'
import { showErrorToast, showSuccessToast, handleApiError } from '@/lib/errorHandling'
import type { CommunityFormData, AdminUserFormData } from '@/lib/validations/community'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

export function CreateCommunityPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'community' | 'admin'>('community')
  const [communityData, setCommunityData] = useState<CommunityFormData | null>(null)
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)

  const createCommunity = useCreateCommunity()
  const logAudit = useAuditLog()

  const handleCommunitySubmit = async (data: CommunityFormData) => {
    setCommunityData(data)
    setStep('admin')
  }

  const handleAdminSubmit = async (adminData: AdminUserFormData) => {
    if (!communityData) {
      showErrorToast('Community data missing', toast)
      return
    }

    setIsCreatingAdmin(true)
    let createdCommunity = null

    try {
      // Step 1: Create community
      createdCommunity = await createCommunity.mutateAsync({
        ...communityData,
        logo: communityData.logo || null,
      })

      showSuccessToast('Community created successfully', 'Now setting up admin user...', toast)

      // Step 2: Create admin user via Edge Function
      const response = await supabase.functions.invoke('create-community-admin', {
        body: {
          community_id: createdCommunity.id,
          email: adminData.email,
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          role: adminData.role,
          phone: adminData.phone,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      const { data: adminResult } = response

      if (!adminResult || !adminResult.success) {
        throw new Error(adminResult?.error || 'Failed to create admin user')
      }

      // Step 3: Log audit
      await logAudit.mutateAsync({
        action_type: 'create_community',
        entity_type: 'community',
        entity_id: createdCommunity.id,
        changes: {
          name: createdCommunity.name,
          location: createdCommunity.location,
          admin_email: adminData.email,
        },
      })

      // Step 4: Show success message with credentials
      showSuccessToast(
        'Community Setup Complete!',
        `Admin user created for ${adminResult.data.email}. Temporary password: ${adminResult.data.temporary_password}`,
        toast
      )

      // Navigate back to communities list
      setTimeout(() => {
        navigate('/communities')
      }, 3000)
    } catch (error: any) {
      console.error('Error creating community:', error)

      const errorInfo = handleApiError(error, 'Community Creation')

      // If community was created but admin failed, show partial success
      if (createdCommunity && errorInfo.code === 'ADMIN_CREATE_FAILED') {
        showSuccessToast(
          'Community created successfully',
          'But admin setup failed. You can create admin users later from the Admin Users page.',
          toast
        )

        // Log partial success
        try {
          await logAudit.mutateAsync({
            action_type: 'create_community_partial',
            entity_type: 'community',
            entity_id: createdCommunity.id,
            changes: {
              name: createdCommunity.name,
              location: createdCommunity.location,
              error: 'Admin creation failed',
            },
          })
        } catch (auditError) {
          console.error('Failed to log audit:', auditError)
        }

        // Navigate to admin users page so they can create admin manually
        setTimeout(() => {
          navigate('/admin-users')
        }, 3000)
      } else {
        showErrorToast(error, toast)
      }
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  const handleBack = () => {
    if (step === 'admin') {
      setStep('community')
    } else {
      navigate('/communities')
    }
  }

  return (
    <Container>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Community</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set up a new residential community with initial administrator
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === 'community'
                  ? 'bg-primary-600 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              {step === 'admin' ? '✓' : '1'}
            </div>
            <span
              className={`text-sm font-medium ${
                step === 'community' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Community Details
            </span>
          </div>

          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />

          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step === 'admin'
                  ? 'bg-primary-600 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}
            >
              2
            </div>
            <span
              className={`text-sm font-medium ${
                step === 'admin' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Admin User
            </span>
          </div>
        </div>

        {/* Forms */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {step === 'community' ? (
            <CommunityForm
              onSubmit={handleCommunitySubmit}
              isSubmitting={createCommunity.isPending}
            />
          ) : (
            <AdminUserForm
              onSubmit={handleAdminSubmit}
              isSubmitting={isCreatingAdmin}
              defaultRole="admin_head"
            />
          )}
        </div>
      </div>
    </Container>
  )
}
