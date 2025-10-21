import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Container } from '@/components/layout/Container'
import { usePermits, usePermitActions } from '@/hooks/usePermits'
import { useHouseholds } from '@/hooks/useHouseholds'
import {
  approvePermitSchema,
  rejectPermitSchema,
  markInProgressSchema,
  markCompletedSchema,
  createPermitSchema,
  type ApprovePermitFormData,
  type RejectPermitFormData,
  type MarkInProgressFormData,
  type MarkCompletedFormData,
  type CreatePermitFormData,
} from '@/lib/validations/permits'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HardHat, CheckCircle, XCircle, Clock, Play, Flag, DollarSign, Plus } from 'lucide-react'
import { format } from 'date-fns'

export function PermitsPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const { data: permits, isLoading } = usePermits(activeTab === 'all' ? undefined : activeTab)
  const { households } = useHouseholds()
  const {
    approvePermit,
    rejectPermit,
    markInProgress,
    markCompleted,
    markRoadFeePaid,
    createPermit,
    isApproving,
    isRejecting,
    isMarkingInProgress,
    isMarkingCompleted,
    isMarkingPaid,
    isCreating,
  } = usePermitActions()

  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [inProgressDialogOpen, setInProgressDialogOpen] = useState(false)
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedPermitId, setSelectedPermitId] = useState<string>('')

  const approveForm = useForm<ApprovePermitFormData>({
    resolver: zodResolver(approvePermitSchema),
    defaultValues: {
      road_fee_amount: 0,
    },
  })

  const rejectForm = useForm<RejectPermitFormData>({
    resolver: zodResolver(rejectPermitSchema),
  })

  const inProgressForm = useForm<MarkInProgressFormData>({
    resolver: zodResolver(markInProgressSchema),
    defaultValues: {
      start_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const completedForm = useForm<MarkCompletedFormData>({
    resolver: zodResolver(markCompletedSchema),
    defaultValues: {
      end_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const createForm = useForm<CreatePermitFormData>({
    resolver: zodResolver(createPermitSchema),
    defaultValues: {
      project_start_date: format(new Date(), 'yyyy-MM-dd'),
      project_end_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd'),
      estimated_worker_count: 1,
      road_fee_amount: 0,
    },
  })

  const handleApprove = (permitId: string) => {
    setSelectedPermitId(permitId)
    setApproveDialogOpen(true)
  }

  const handleReject = (permitId: string) => {
    setSelectedPermitId(permitId)
    setRejectDialogOpen(true)
  }

  const handleMarkInProgress = (permitId: string) => {
    setSelectedPermitId(permitId)
    setInProgressDialogOpen(true)
  }

  const handleMarkCompleted = (permitId: string) => {
    setSelectedPermitId(permitId)
    setCompletedDialogOpen(true)
  }

  const handleMarkPaid = (permitId: string) => {
    if (confirm('Mark road fee as paid?')) {
      markRoadFeePaid({ permit_id: permitId })
    }
  }

  const handleCreatePermit = () => {
    setCreateDialogOpen(true)
  }

  const onApprove = (data: ApprovePermitFormData) => {
    approvePermit(
      { permit_id: selectedPermitId, ...data },
      {
        onSuccess: () => {
          setApproveDialogOpen(false)
          approveForm.reset()
        },
      }
    )
  }

  const onReject = (data: RejectPermitFormData) => {
    rejectPermit(
      { permit_id: selectedPermitId, ...data },
      {
        onSuccess: () => {
          setRejectDialogOpen(false)
          rejectForm.reset()
        },
      }
    )
  }

  const onMarkInProgress = (data: MarkInProgressFormData) => {
    markInProgress(
      { permit_id: selectedPermitId, ...data },
      {
        onSuccess: () => {
          setInProgressDialogOpen(false)
          inProgressForm.reset()
        },
      }
    )
  }

  const onMarkCompleted = (data: MarkCompletedFormData) => {
    markCompleted(
      { permit_id: selectedPermitId, ...data },
      {
        onSuccess: () => {
          setCompletedDialogOpen(false)
          completedForm.reset()
        },
      }
    )
  }

  const onCreate = (data: CreatePermitFormData) => {
    createPermit(data, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        createForm.reset()
      },
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline' as const, icon: Clock },
      approved: { variant: 'secondary' as const, icon: CheckCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle },
      in_progress: { variant: 'default' as const, icon: Play },
      completed: { variant: 'default' as const, icon: Flag },
    }

    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Construction Permits</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Review and manage construction permit applications
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Permit Queue
            </h2>
          </div>
          <Button onClick={handleCreatePermit}>
            <Plus className="mr-2 h-4 w-4" />
            New Permit
          </Button>
        </div>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-700">
                <TabsTrigger value="pending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Approved</TabsTrigger>
                <TabsTrigger value="in_progress" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">In Progress</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Completed</TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Rejected</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : permits && permits.length === 0 ? (
                <div className="text-center py-8">
                  <HardHat className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No permits found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No {activeTab} permits at the moment
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-subtle-transparent">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                      <TableRow>
                        <TableHead className="text-gray-700 dark:text-gray-300">Household</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Project</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Contractor</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Duration</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Road Fee</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {permits?.map((permit: any) => (
                        <TableRow key={permit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {permit.household?.residence?.unit_number || '-'}
                            {permit.household?.household_head && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {permit.household.household_head.first_name} {permit.household.household_head.last_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              <div className="font-medium">{permit.project_description}</div>
                              <Badge variant="outline" className="mt-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                {permit.project_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              {permit.contractor_name || '-'}
                              {permit.contractor_contact && (
                                <div className="text-gray-500 dark:text-gray-400">{permit.contractor_contact}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              {permit.estimated_duration_days} days
                              <div className="text-gray-500 dark:text-gray-400">
                                {permit.number_of_workers} workers
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            {permit.road_fee_amount ? (
                              <div className="text-sm">
                                <div className="font-semibold">₱{permit.road_fee_amount.toLocaleString()}</div>
                                {permit.road_fee_paid ? (
                                  <Badge variant="default" className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>
                                ) : (
                                  <Badge variant="outline" className="mt-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Unpaid</Badge>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getStatusBadge(permit.status)}</TableCell>
                          <TableCell className="text-right text-gray-900 dark:text-gray-100">
                            {permit.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(permit.id)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(permit.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {permit.status === 'approved' && (
                              <div className="flex justify-end gap-2">
                                {!permit.road_fee_paid && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkPaid(permit.id)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Mark Paid
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkInProgress(permit.id)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Start Work
                                </Button>
                              </div>
                            )}
                            {permit.status === 'in_progress' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkCompleted(permit.id)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Flag className="mr-2 h-4 w-4" />
                                Mark Completed
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Approve Construction Permit</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Set the road use fee and approve the permit
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={approveForm.handleSubmit(onApprove)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="road_fee_amount" className="text-gray-700 dark:text-gray-300">Road Use Fee (₱) *</Label>
              <Input
                id="road_fee_amount"
                type="number"
                step="0.01"
                {...approveForm.register('road_fee_amount', { valueAsNumber: true })}
                className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${approveForm.formState.errors.road_fee_amount ? 'border-red-500' : ''}`}
              />
              {approveForm.formState.errors.road_fee_amount && (
                <p className="text-sm text-red-500">{approveForm.formState.errors.road_fee_amount.message}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fee calculated based on duration and workers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-gray-700 dark:text-gray-300">Expected Start Date (Optional)</Label>
              <Input
                id="start_date"
                type="date"
                {...approveForm.register('start_date')}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <Button type="submit" disabled={isApproving} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
              {isApproving ? 'Approving...' : 'Approve Permit'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Reject Permit</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Provide a reason for rejecting this permit request
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={rejectForm.handleSubmit(onReject)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason" className="text-gray-700 dark:text-gray-300">Rejection Reason *</Label>
              <Textarea
                id="rejection_reason"
                {...rejectForm.register('rejection_reason')}
                placeholder="e.g., Incomplete documentation, unsafe work plan..."
                rows={4}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {rejectForm.formState.errors.rejection_reason && (
                <p className="text-sm text-red-500">{rejectForm.formState.errors.rejection_reason.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isRejecting} variant="destructive" className="w-full">
              {isRejecting ? 'Rejecting...' : 'Reject Permit'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark In Progress Dialog */}
      <Dialog open={inProgressDialogOpen} onOpenChange={setInProgressDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Start Construction Work</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Mark the permit as in progress with the actual start date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={inProgressForm.handleSubmit(onMarkInProgress)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-gray-700 dark:text-gray-300">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                {...inProgressForm.register('start_date')}
                className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${inProgressForm.formState.errors.start_date ? 'border-red-500' : ''}`}
              />
              {inProgressForm.formState.errors.start_date && (
                <p className="text-sm text-red-500">{inProgressForm.formState.errors.start_date.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isMarkingInProgress} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
              {isMarkingInProgress ? 'Starting...' : 'Start Work'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark Completed Dialog */}
      <Dialog open={completedDialogOpen} onOpenChange={setCompletedDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Complete Construction Work</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Mark the permit as completed with the actual end date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={completedForm.handleSubmit(onMarkCompleted)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-gray-700 dark:text-gray-300">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                {...completedForm.register('end_date')}
                className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${completedForm.formState.errors.end_date ? 'border-red-500' : ''}`}
              />
              {completedForm.formState.errors.end_date && (
                <p className="text-sm text-red-500">{completedForm.formState.errors.end_date.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isMarkingCompleted} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
              {isMarkingCompleted ? 'Completing...' : 'Mark Completed'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Permit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Construction Permit</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Submit a new construction permit application
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="household_id" className="text-gray-700 dark:text-gray-300">Household *</Label>
                <select
                  id="household_id"
                  {...createForm.register('household_id')}
                  className={`w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md border px-3 py-2 ${createForm.formState.errors.household_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Household</option>
                  {households?.map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.residence?.unit_number || `Household ${household.id.slice(-4)}`}
                      {household.household_head && (
                        ` - ${household.household_head.first_name} ${household.household_head.last_name}`
                      )}
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.household_id && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.household_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractor_name" className="text-gray-700 dark:text-gray-300">Contractor Name *</Label>
                <Input
                  id="contractor_name"
                  {...createForm.register('contractor_name')}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.contractor_name ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.contractor_name && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.contractor_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_description" className="text-gray-700 dark:text-gray-300">Project Description *</Label>
              <Textarea
                id="project_description"
                {...createForm.register('project_description')}
                placeholder="Describe the construction work to be done..."
                rows={3}
                className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.project_description ? 'border-red-500' : ''}`}
              />
              {createForm.formState.errors.project_description && (
                <p className="text-sm text-red-500">{createForm.formState.errors.project_description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_start_date" className="text-gray-700 dark:text-gray-300">Start Date *</Label>
                <Input
                  id="project_start_date"
                  type="date"
                  {...createForm.register('project_start_date')}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.project_start_date ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.project_start_date && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.project_start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_end_date" className="text-gray-700 dark:text-gray-300">End Date *</Label>
                <Input
                  id="project_end_date"
                  type="date"
                  {...createForm.register('project_end_date')}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.project_end_date ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.project_end_date && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.project_end_date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractor_contact" className="text-gray-700 dark:text-gray-300">Contractor Contact</Label>
                <Input
                  id="contractor_contact"
                  {...createForm.register('contractor_contact')}
                  placeholder="Phone or email"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_worker_count" className="text-gray-700 dark:text-gray-300">Estimated Workers *</Label>
                <Input
                  id="estimated_worker_count"
                  type="number"
                  min="1"
                  {...createForm.register('estimated_worker_count', { valueAsNumber: true })}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.estimated_worker_count ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.estimated_worker_count && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.estimated_worker_count.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractor_license" className="text-gray-700 dark:text-gray-300">Contractor License</Label>
                <Input
                  id="contractor_license"
                  {...createForm.register('contractor_license')}
                  placeholder="License number (if applicable)"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="road_fee_amount" className="text-gray-700 dark:text-gray-300">Road Fee (₱)</Label>
                <Input
                  id="road_fee_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...createForm.register('road_fee_amount', { valueAsNumber: true })}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave blank to calculate based on project scope
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
              {isCreating ? 'Creating...' : 'Create Permit'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Container>
  )
}
