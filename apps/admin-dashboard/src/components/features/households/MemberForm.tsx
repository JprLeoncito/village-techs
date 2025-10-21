import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberFormSchema, type MemberFormData } from '@/lib/validations/households'
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoUpload } from './PhotoUpload'
import { Loader2 } from 'lucide-react'

interface MemberFormProps {
  householdId: string
  member?: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function MemberForm({ householdId, member, onSuccess, onCancel }: MemberFormProps) {
  const { createMember, updateMember, uploadPhoto, isCreating, isUploading } = useHouseholdMembers()
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(member?.photo_url || null)
  const isEditMode = !!member

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: member ? {
      first_name: member.first_name,
      last_name: member.last_name,
      relationship_to_head: member.relationship_to_head,
      member_type: member.member_type,
      date_of_birth: member.date_of_birth,
      contact_email: member.contact_email,
      contact_phone: member.contact_phone,
    } : {
      member_type: 'resident',
      relationship_to_head: 'self',
    },
  })

  const onSubmit = (data: MemberFormData) => {
    if (isEditMode && member) {
      // Update existing member
      updateMember(
        {
          id: member.id,
          updates: {
            ...data,
            photo_url: uploadedPhoto,
          },
        },
        {
          onSuccess: () => {
            onSuccess?.()
          },
        }
      )
    } else {
      // Create new member
      createMember(
        {
          ...data,
          household_id: householdId,
          photo_url: uploadedPhoto,
        },
        {
          onSuccess: () => {
            reset()
            setUploadedPhoto(null)
            onSuccess?.()
          },
        }
      )
    }
  }

  const handlePhotoUpload = (file: File) => {
    // For now, just create a local preview
    // In a real implementation, we'd upload to Supabase Storage here
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedPhoto(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            {...register('first_name')}
            className={`${errors.first_name ? 'border-red-500' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
          />
          {errors.first_name && (
            <p className="text-sm text-red-500">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            {...register('last_name')}
            className={`${errors.last_name ? 'border-red-500' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
          />
          {errors.last_name && (
            <p className="text-sm text-red-500">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="relationship_to_head">Relationship to Head *</Label>
          <Select
            value={watch('relationship_to_head')}
            onValueChange={(value) =>
              setValue('relationship_to_head', value as MemberFormData['relationship_to_head'])
            }
          >
            <SelectTrigger id="relationship_to_head">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self (Household Head)</SelectItem>
              <SelectItem value="spouse">Spouse</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="sibling">Sibling</SelectItem>
              <SelectItem value="grandparent">Grandparent</SelectItem>
              <SelectItem value="grandchild">Grandchild</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="member_type">Member Type *</Label>
          <Select
            value={watch('member_type')}
            onValueChange={(value) =>
              setValue('member_type', value as MemberFormData['member_type'])
            }
          >
            <SelectTrigger id="member_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">Resident</SelectItem>
              <SelectItem value="beneficial_user">Beneficial User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">Date of Birth</Label>
        <Input
          id="date_of_birth"
          type="date"
          {...register('date_of_birth')}
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Email</Label>
          <Input
            id="contact_email"
            type="email"
            {...register('contact_email')}
            className={`${errors.contact_email ? 'border-red-500' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
          />
          {errors.contact_email && (
            <p className="text-sm text-red-500">{errors.contact_email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Phone</Label>
          <Input
            id="contact_phone"
            {...register('contact_phone')}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      <PhotoUpload
        onUpload={handlePhotoUpload}
        currentPhotoUrl={uploadedPhoto}
        isUploading={isUploading}
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setUploadedPhoto(member?.photo_url || null)
          }}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? 'Updating Member...' : 'Adding Member...'}
            </>
          ) : (
            isEditMode ? 'Update Member' : 'Add Member'
          )}
        </Button>
      </div>
    </form>
  )
}
