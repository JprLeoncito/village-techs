import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { approveSchema, type ApproveFormData } from '@/lib/validations/stickers'
import { useStickerActions } from '@/hooks/useStickers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle } from 'lucide-react'
import { addYears, format } from 'date-fns'

interface StickerApprovalFormProps {
  stickerId: string
  onSuccess?: () => void
}

export function StickerApprovalForm({ stickerId, onSuccess }: StickerApprovalFormProps) {
  const { approveSticker, isApproving } = useStickerActions()

  // Default expiry is 1 year from today
  const defaultExpiryDate = format(addYears(new Date(), 1), 'yyyy-MM-dd')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      expiry_date: defaultExpiryDate,
    },
  })

  const onSubmit = (data: ApproveFormData) => {
    approveSticker(
      { sticker_id: stickerId, expiry_date: data.expiry_date },
      { onSuccess }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Expiry Date *</Label>
        <Input
          id="expiry_date"
          type="date"
          {...register('expiry_date')}
          className={errors.expiry_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
        />
        {errors.expiry_date && (
          <p className="text-sm text-red-500">{errors.expiry_date.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Default is 1 year from today. Approved stickers will become active immediately with QR code generated.
        </p>
      </div>

      <Button type="submit" disabled={isApproving} className="w-full">
        {isApproving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Approving...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate Sticker
          </>
        )}
      </Button>
    </form>
  )
}
