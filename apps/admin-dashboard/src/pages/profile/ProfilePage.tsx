import { useState, useEffect } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query'
import { supabase } from '@/lib/supabase'
import { showErrorToast, showSuccessToast } from '@/lib/errorHandling'
import { UserIcon, EnvelopeIcon, PhoneIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { Database } from '@/types/database.types'

type AdminUser = Database['public']['Tables']['admin_users']['Row']

interface ProfileFormData {
  firstName: string
  lastName: string
  phone: string
}

export function ProfilePage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [profileData, setProfileData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    phone: '',
  })

  const [originalData, setOriginalData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    phone: '',
  })

  // Update form data when profile data loads
  useEffect(() => {
    if (profile && !profileLoading) {
      const newData = {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
      }
      setProfileData(newData)
      setOriginalData(newData)
    }
  }, [profile, profileLoading])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if any changes were made
    const hasChanges =
      profileData.firstName !== originalData.firstName ||
      profileData.lastName !== originalData.lastName ||
      profileData.phone !== originalData.phone

    if (!hasChanges) {
      showSuccessToast(
        'No Changes',
        'No changes were made to your profile.'
      )
      setIsEditing(false)
      return
    }

    console.log('Starting profile update...')

    try {
      // Update admin_users table ONLY (skip Supabase Auth to avoid state conflicts)
      console.log('Updating admin_users table...')
      const { error: dbError } = await supabase
        .from('admin_users')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)

      if (dbError) throw dbError
      console.log('✅ Database updated successfully')

      // Show success message immediately
      showSuccessToast(
        'Profile Updated',
        'Your profile information has been successfully updated.'
      )

      console.log('🔄 Triggering immediate reload...')

      // Execute reload immediately after database update and success message
      console.log('Executing reload...')
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('updated', Date.now().toString())
      window.location.href = currentUrl.toString()

    } catch (error) {
      console.error('Update failed:', error)
      showErrorToast(error)
    }
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setProfileData(originalData)
    setIsEditing(false)
  }


  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Container>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Container>
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <UserIcon className="h-10 w-10 text-gray-600 dark:text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your personal information and security settings
          </p>
        </div>

        {/* Profile Information Card */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Update your personal details and contact information' : 'Your personal details and contact information'}
                </p>
              </div>
              {!isEditing && (
                <Button
                  onClick={handleEditClick}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="First Name"
                    id="firstName"
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />

                  <FormInput
                    label="Last Name"
                    id="lastName"
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    required
                  />
                </div>

                <FormInput
                  label="Email Address"
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  description="Email address cannot be changed"
                />

                <FormInput
                  label="Phone Number"
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  description="Optional - for contact purposes"
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    onClick={handleCancelClick}
                    variant="secondary"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {profileData.firstName || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {profileData.lastName || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900 dark:text-gray-100">
                      {user?.email || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900 dark:text-gray-100">
                      {profileData.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information Card */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Your account details and permissions
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Type
                </label>
                <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                  {user?.role || 'Admin'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Status
                </label>
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Active
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User ID
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {user?.id}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}