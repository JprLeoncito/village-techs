import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers'
import { UserAccountService } from '@/services/userAccountService'
import type { HouseholdMember } from '@/types/households.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  User,
  Mail,
  Key,
  Shield,
  ShieldOff,
  RotateCcw,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm the password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordResetForm = z.infer<typeof passwordResetSchema>

interface UserAccountManagerProps {
  member: HouseholdMember
  onUpdate?: () => void
}

export function UserAccountManager({ member, onUpdate }: UserAccountManagerProps) {
  const {
    resetUserPassword,
    deactivateUserAccount,
    activateUserAccount,
    isResettingPassword,
    isDeactivating,
    isActivating
  } = useHouseholdMembers()

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive' | 'unknown'>('unknown')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
  })

  const hasUserAccount = !!member.user_id
  const isActive = member.status === 'active'

  const handlePasswordReset = async (data: PasswordResetForm) => {
    try {
      if (!member.user_id) return

      const password = await resetUserPassword({
        userId: member.user_id,
        newPassword: data.newPassword
      })

      setNewPassword(password)
      setShowPasswordDialog(false)
      setShowCredentialsDialog(true)
      reset()
    } catch (error) {
      console.error('Password reset failed:', error)
    }
  }

  const handleDeactivateAccount = async () => {
    try {
      if (!member.user_id) return
      await deactivateUserAccount({ userId: member.user_id, memberId: member.id })
      onUpdate?.()
    } catch (error) {
      console.error('Account deactivation failed:', error)
    }
  }

  const handleActivateAccount = async () => {
    try {
      if (!member.user_id) return
      await activateUserAccount({ userId: member.user_id, memberId: member.id })
      onUpdate?.()
    } catch (error) {
      console.error('Account activation failed:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  if (!hasUserAccount) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-400" />
            No User Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            This member does not have a user account for the Residence App.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Use the "Add Member" form to create a new member with a user account.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Account
            </CardTitle>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm text-gray-600">{member.contact_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">User ID:</span>
              <span className="text-sm text-gray-600 font-mono">{member.user_id?.slice(0, 8)}...</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset User Password</DialogTitle>
                  <DialogDescription>
                    Generate a new password for {member.first_name} {member.last_name}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handlePasswordReset)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...register('newPassword')}
                      className={errors.newPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register('confirmPassword')}
                      className={errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordDialog(false)
                        reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isResettingPassword}>
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {isActive ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Deactivate Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to deactivate the user account for {member.first_name} {member.last_name}?
                      They will no longer be able to access the Residence App.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivateAccount}
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={isDeactivating}
                    >
                      {isDeactivating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deactivating...
                        </>
                      ) : (
                        'Deactivate Account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleActivateAccount}
                disabled={isActivating}
                className="text-green-600 hover:text-green-700"
              >
                <Shield className="h-4 w-4 mr-1" />
                {isActivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate Account'
                )}
              </Button>
            )}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              User accounts allow residents to access the Residence App using their email and password.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Password Reset Success Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-green-700">Password Reset Successfully!</DialogTitle>
            <DialogDescription>
              Please share these new login credentials with the household member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={member.contact_email || ''} readOnly className="font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(member.contact_email || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">New Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={newPassword}
                    readOnly
                    type={showPassword ? "text" : "password"}
                    className="font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowCredentialsDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}