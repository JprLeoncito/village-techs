import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHouseholdDetail } from '@/hooks/useHouseholds'
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MemberForm } from '@/components/features/households/MemberForm'
import { EnhancedMemberForm } from '@/components/features/households/EnhancedMemberForm'
import {
  ArrowLeft,
  Plus,
  User,
  Mail,
  Phone,
  Calendar,
  Home,
  Crown,
  AlertCircle,
  Edit,
  Trash,
  AlertTriangle,
  Key
} from 'lucide-react'
import { format } from 'date-fns'

export function HouseholdDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: household, isLoading } = useHouseholdDetail(id!)
  const { setHouseholdHead, deleteMember } = useHouseholdMembers()
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false)
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSetAsHeadDialogOpen, setIsSetAsHeadDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [memberToDelete, setMemberToDelete] = useState<any>(null)
  const [memberForAccount, setMemberForAccount] = useState<any>(null)
  const [memberToSetAsHead, setMemberToSetAsHead] = useState<any>(null)

  const handleSetAsHead = (member: any) => {
    setMemberToSetAsHead(member)
    setIsSetAsHeadDialogOpen(true)
  }

  const handleConfirmSetAsHead = () => {
    if (memberToSetAsHead) {
      setHouseholdHead({ householdId: id!, memberId: memberToSetAsHead.id })
      setIsSetAsHeadDialogOpen(false)
      setMemberToSetAsHead(null)
    }
  }

  const handleCancelSetAsHead = () => {
    setIsSetAsHeadDialogOpen(false)
    setMemberToSetAsHead(null)
  }

  const handleMemberAdded = () => {
    setIsAddMemberDialogOpen(false)
  }

  const handleEditMember = (member: any) => {
    setSelectedMember(member)
    setIsEditMemberDialogOpen(true)
  }

  const handleMemberUpdated = () => {
    setIsEditMemberDialogOpen(false)
    setSelectedMember(null)
  }

  const handleCreateAccount = (member: any) => {
    setMemberForAccount(member)
    setIsCreateAccountDialogOpen(true)
  }

  const handleAccountCreated = () => {
    setIsCreateAccountDialogOpen(false)
    setMemberForAccount(null)
  }

  const handleDeleteMember = (member: any) => {
    setMemberToDelete(member)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      deleteMember({
        memberId: memberToDelete.id,
        householdId: id!
      })
      setIsDeleteDialogOpen(false)
      setMemberToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setMemberToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!household) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/households')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Households
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Household not found. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const members = household.members || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/households')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Households
        </Button>
      </div>

      {/* Household Info Card */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Household Information
            </h2>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Registration details and contact information
          </p>
        </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Unit Number</div>
              <div className="mt-1 text-lg font-semibold">
                {household.residence?.unit_number || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge variant={household.status === 'active' ? 'default' : 'secondary'}>
                  {household.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Move-in Date</div>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(household.move_in_date), 'MMMM dd, yyyy')}
              </div>
            </div>
            {household.move_out_date && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Move-out Date</div>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(household.move_out_date), 'MMMM dd, yyyy')}
                </div>
              </div>
            )}
            {household.contact_email && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Contact Email</div>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {household.contact_email}
                </div>
              </div>
            )}
            {household.contact_phone && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Contact Phone</div>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {household.contact_phone}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Residence Type</div>
              <div className="mt-1">
                {household.residence?.type || '-'}
              </div>
            </div>
          </div>
      </div>

      {/* Members Card */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Household Members ({members.length})
                </h2>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage household members and designate household head
              </p>
            </div>
            <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Household Member</DialogTitle>
                  <DialogDescription>
                    Add a new member to this household
                  </DialogDescription>
                </DialogHeader>
                <MemberForm householdId={id!} onSuccess={handleMemberAdded} />
              </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Household Member</DialogTitle>
                  <DialogDescription>
                    Update member information
                  </DialogDescription>
                </DialogHeader>
                {selectedMember && (
                  <MemberForm
                    householdId={id!}
                    member={selectedMember}
                    onSuccess={handleMemberUpdated}
                    onCancel={() => {
                      setIsEditMemberDialogOpen(false)
                      setSelectedMember(null)
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Create Account Dialog */}
            <Dialog open={isCreateAccountDialogOpen} onOpenChange={setIsCreateAccountDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-green-600" />
                    Create Residence App Account
                  </DialogTitle>
                  <DialogDescription>
                    Create a user account for {memberForAccount?.first_name} {memberForAccount?.last_name} to access the Residence App
                  </DialogDescription>
                </DialogHeader>
                {memberForAccount && (
                  <EnhancedMemberForm
                    householdId={id!}
                    member={memberForAccount}
                    onSuccess={handleAccountCreated}
                    onCancel={() => {
                      setIsCreateAccountDialogOpen(false)
                      setMemberForAccount(null)
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Household Member
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {memberToDelete?.first_name} {memberToDelete?.last_name} from this household?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action cannot be undone. The member will be permanently removed from the household.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelDelete}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmDelete}>
                    Delete Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Set as Head Confirmation Dialog */}
            <Dialog open={isSetAsHeadDialogOpen} onOpenChange={setIsSetAsHeadDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Crown className="h-5 w-5" />
                    Set as Household Head
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to set {memberToSetAsHead?.first_name} {memberToSetAsHead?.last_name} as the head of this household?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {memberToSetAsHead && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        {memberToSetAsHead.photo_url ? (
                          <img
                            src={memberToSetAsHead.photo_url}
                            alt={`${memberToSetAsHead.first_name} ${memberToSetAsHead.last_name}`}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {memberToSetAsHead.first_name} {memberToSetAsHead.last_name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Badge variant="outline" className="text-xs">
                              {memberToSetAsHead.relationship_to_head?.replace('_', ' ')}
                            </Badge>
                            <Badge variant={memberToSetAsHead.member_type === 'resident' ? 'default' : 'secondary'} className="text-xs">
                              {memberToSetAsHead.member_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          The household head has primary responsibility for the household and can manage household settings and members.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelSetAsHead}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmSetAsHead} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Crown className="mr-2 h-4 w-4" />
                    Set as Head
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members yet</h3>
              <p className="text-muted-foreground mb-4">
                Add members to this household to get started
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>App Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => {
                    const isHead = household.household_head_id === member.id
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={`${member.first_name} ${member.last_name}`}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span>{member.first_name} {member.last_name}</span>
                            {isHead && (
                              <Crown className="h-4 w-4 text-yellow-500" title="Household Head" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {member.relationship_to_head.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.member_type === 'resident' ? 'default' : 'secondary'}>
                            {member.member_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {member.contact_email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.contact_email}
                              </div>
                            )}
                            {member.contact_phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {member.contact_phone}
                              </div>
                            )}
                            {!member.contact_email && !member.contact_phone && '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.date_of_birth
                            ? format(new Date(member.date_of_birth), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {member.user_id ? (
                            <div className="flex items-center gap-1">
                              <Key className="h-3 w-3 text-green-600" />
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Active
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                              <Badge variant="outline" className="text-xs text-gray-500 dark:text-gray-400">
                                No Access
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!member.user_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateAccount(member)}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                title="Create Residence App account"
                              >
                                <Key className="mr-2 h-4 w-4" />
                                Create Account
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMember(member)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member)}
                              disabled={isHead}
                              className={`${
                                isHead
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                              }`}
                              title={isHead ? 'Cannot delete household head' : 'Delete member'}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                            {!isHead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetAsHead(member)}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Set as Head
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
