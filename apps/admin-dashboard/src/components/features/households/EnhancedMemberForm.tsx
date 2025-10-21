import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers'
import { UserAccountService } from '@/services/userAccountService'
import type { CreateMemberWithUserInput } from '@/types/households.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, User, Mail, Key, AlertCircle, Eye, EyeOff } from 'lucide-react'

// Enhanced validation schema with user account fields
const enhancedMemberFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  relationship_to_head: z.enum(['self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other']).optional(),
  member_type: z.enum(['resident', 'beneficial_user']).optional(),
  date_of_birth: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type EnhancedMemberFormData = z.infer<typeof enhancedMemberFormSchema>

interface EnhancedMemberFormProps {
  householdId: string
  member?: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function EnhancedMemberForm({ householdId, member, onSuccess, onCancel }: EnhancedMemberFormProps) {
  
  const {
    createAccountForExistingMember,
    isCreatingAccountForExisting
  } = useHouseholdMembers()

  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EnhancedMemberFormData>({
    resolver: zodResolver(enhancedMemberFormSchema),
    defaultValues: member ? {
      first_name: member.first_name,
      last_name: member.last_name,
      relationship_to_head: member.relationship_to_head,
      member_type: member.member_type,
      date_of_birth: member.date_of_birth,
      contact_email: member.contact_email,
      contact_phone: member.contact_phone,
      email: member.contact_email || '',
    } : {
      member_type: 'resident',
      relationship_to_head: 'self',
      email: '',
    },
  })

  const email = watch('email')
  const password = watch('password')

  // Check for missing member information that should be added
  const hasMissingMemberInfo = member && (
    !member.date_of_birth ||
    !member.contact_email ||
    !member.contact_phone
  )

  
  
  const onSubmit = async (data: EnhancedMemberFormData) => {
    try {
      // For existing members, create user account using the new method
      if (member && data.email) {
        createAccountForExistingMember(
          {
            memberId: member.id,
            email: data.email,
            password: data.password,
          },
          {
            onSuccess: () => {
              console.log('✅ EnhancedMemberForm: Account creation successful, calling onSuccess callback')
              onSuccess?.()
            },
            onError: (error: Error) => {
              console.error('❌ EnhancedMemberForm: Account creation failed:', error)
            }
          }
        )
      }
    } catch (error) {
      console.error('❌ EnhancedMemberForm: Form submission error:', error)
    }
  }

  const generatePassword = () => {
    const newPassword = UserAccountService.generateSecurePassword()
    setValue('password', newPassword)
  }

  
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* User Account Creation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Key className="h-5 w-5" />
          Residence App Access
        </h3>

        {/* Missing member information warning */}
        {hasMissingMemberInfo && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <div className="space-y-1">
                <p className="font-medium text-red-900 dark:text-red-100">Member information is incomplete:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-red-700 dark:text-red-300">
                  {!member?.date_of_birth && (
                    <li>Date of birth is missing</li>
                  )}
                  {!member?.contact_email && (
                    <li>Contact email is missing</li>
                  )}
                  {!member?.contact_phone && (
                    <li>Contact phone number is missing</li>
                  )}
                </ul>
                <p className="text-xs mt-2 text-red-600 dark:text-red-400">
                  Please close this dialog and click the "Edit" button for the member to add the missing information before creating an account.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Form validation errors */}
        {(errors.email || errors.password) && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <div className="space-y-1">
                <p className="font-medium text-red-900 dark:text-red-100">Please fix the following:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-red-700 dark:text-red-300">
                  {errors.email && (
                    <li>Valid email address is required for account creation</li>
                  )}
                  {errors.password && (
                    <li>Password must be at least 8 characters long</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Existing Member Info - Display Only */}
        {member && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Member Information</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Creating account for: <strong>{member.first_name} {member.last_name}</strong>
            </p>
            {member.relationship_to_head && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {member.relationship_to_head.replace('_', ' ')} • {member.member_type}
              </p>
            )}
          </div>
        )}

        {/* Always create user account */}
        <div className="space-y-4">
          <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email for Login *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  {...register('email')}
                  className={`${errors.email ? 'border-red-500' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generatePassword}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Generate Secure Password
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password or generate one"
                    {...register('password')}
                    className={`${errors.password ? 'border-red-500' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  The member will use these credentials to log in to the Residence App and access their household information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
          }}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isCreatingAccountForExisting || !email || !!errors.email || !!errors.password || hasMissingMemberInfo}
        >
          {isCreatingAccountForExisting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </div>
    </form>
  )
}