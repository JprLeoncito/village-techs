import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { householdActivationSchema, type HouseholdActivationData } from '@/lib/validations/households'
import { useHouseholds } from '@/hooks/useHouseholds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Home, User, X } from 'lucide-react'

interface HouseholdActivationFormProps {
  household: any
  onSuccess?: (householdId: string) => void
  onCancel?: () => void
}

interface MemberFormData {
  first_name: string
  last_name: string
  relationship_to_head: string
  date_of_birth?: string
  contact_email?: string
  contact_phone?: string
  member_type: string
}

export function HouseholdActivationForm({ household, onSuccess, onCancel }: HouseholdActivationFormProps) {
  const { activateHousehold, isActivating } = useHouseholds()
  const [members, setMembers] = useState<MemberFormData[]>([])
  const [showMemberForm, setShowMemberForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<HouseholdActivationData>({
    resolver: zodResolver(householdActivationSchema),
  })

  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    formState: { errors: memberErrors },
    reset: resetMemberForm,
  } = useForm<MemberFormData>({
    defaultValues: {
      relationship_to_head: 'self',
      member_type: 'resident',
    },
  })

  const onMemberSubmit = (data: MemberFormData) => {
    setMembers([...members, data])
    resetMemberForm()
    setShowMemberForm(false)
  }

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const onActivateSubmit = (data: HouseholdActivationData) => {
    activateHousehold(
      {
        householdId: household.id,
        activationData: data,
        members,
      },
      {
        onSuccess: () => {
          onSuccess?.(household.id)
        },
      }
    )
  }

  const RELATIONSHIP_OPTIONS = [
    { value: 'self', label: 'Self' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'grandchild', label: 'Grandchild' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-6">
      {/* Residence Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Home className="h-4 w-4 text-blue-600" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Residence Information</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unit: {household.residence?.unit_number || 'N/A'} | Type: {household.residence?.type?.replace('_', ' ') || 'N/A'}
        </p>
      </div>

      {/* Activation Form */}
      <form onSubmit={handleSubmit(onActivateSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="move_in_date">Move-in Date *</Label>
          <Input
            id="move_in_date"
            type="date"
            {...register('move_in_date')}
            className={errors.move_in_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
          />
          {errors.move_in_date && (
            <p className="text-sm text-red-500">{errors.move_in_date.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              placeholder="email@example.com"
              {...register('contact_email')}
              className={errors.contact_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
            />
            {errors.contact_email && (
              <p className="text-sm text-red-500">{errors.contact_email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              placeholder="+1 (555) 123-4567"
              {...register('contact_phone')}
              className={errors.contact_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
            />
            {errors.contact_phone && (
              <p className="text-sm text-red-500">{errors.contact_phone.message}</p>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <Label className="text-base font-medium">Household Members</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMemberForm(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Member
            </Button>
          </div>

          {/* Members List */}
          {members.length > 0 && (
            <div className="space-y-2">
              {members.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.first_name} {member.last_name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {member.relationship_to_head}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Member Form */}
          {showMemberForm && (
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Add Household Member</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member_first_name">First Name *</Label>
                  <Input
                    id="member_first_name"
                    placeholder="John"
                    {...registerMember('first_name', { required: true })}
                    className={memberErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  />
                  {memberErrors.first_name && (
                    <p className="text-sm text-red-500">{memberErrors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member_last_name">Last Name *</Label>
                  <Input
                    id="member_last_name"
                    placeholder="Doe"
                    {...registerMember('last_name', { required: true })}
                    className={memberErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  />
                  {memberErrors.last_name && (
                    <p className="text-sm text-red-500">{memberErrors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship *</Label>
                  <select
                    id="relationship"
                    {...registerMember('relationship_to_head', { required: true })}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {memberErrors.relationship_to_head && (
                    <p className="text-sm text-red-500">Relationship is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member_type">Member Type *</Label>
                  <select
                    id="member_type"
                    {...registerMember('member_type', { required: true })}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  >
                    <option value="resident">Resident</option>
                    <option value="beneficial_user">Beneficial User</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member_email">Email</Label>
                  <Input
                    id="member_email"
                    type="email"
                    placeholder="email@example.com"
                    {...registerMember('contact_email')}
                    className={memberErrors.contact_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  />
                  {memberErrors.contact_email && (
                    <p className="text-sm text-red-500">{memberErrors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member_phone">Contact Phone</Label>
                  <Input
                    id="member_phone"
                    placeholder="+1 (555) 123-4567"
                    {...registerMember('contact_phone')}
                    className={memberErrors.contact_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  />
                  {memberErrors.contact_phone && (
                    <p className="text-sm text-red-500">{memberErrors.contact_phone.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowMemberForm(false)
                    resetMemberForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMemberSubmit(onMemberSubmit)}
                >
                  Add Member
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isActivating}>
            {isActivating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating Residence...
              </>
            ) : (
              'Enable Residence'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}