import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFees, useFeeActions, useFeeStats } from '@/hooks/useFees'
import { useHouseholds } from '@/hooks/useHouseholds'
import { feeFormSchema, paymentFormSchema, waiverFormSchema, type FeeFormData, type PaymentFormData, type WaiverFormData } from '@/lib/validations/fees'
import { Container } from '@/components/layout/Container'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DollarSign, Plus, Receipt, Ban, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export function FeesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const { data: fees, isLoading } = useFees(activeTab === 'all' ? undefined : activeTab)
  const { data: stats } = useFeeStats()
  const { households } = useHouseholds()
  const { createFee, recordPayment, waiveFee, isCreating, isRecordingPayment, isWaiving } = useFeeActions()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false)
  const [selectedFeeId, setSelectedFeeId] = useState<string>('')

  const createForm = useForm<FeeFormData>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      fee_type: 'monthly',
      amount: 0,
    },
  })

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
    },
  })

  const waiverForm = useForm<WaiverFormData>({
    resolver: zodResolver(waiverFormSchema),
  })

  const onCreateFee = (data: FeeFormData) => {
    createFee(data, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        createForm.reset()
      },
    })
  }

  const onRecordPayment = (data: PaymentFormData) => {
    // Debug: Log current state
    console.log('PAYMENT DEBUG - selectedFeeId:', selectedFeeId)
    console.log('PAYMENT DEBUG - Available fees:', fees?.map(f => ({ id: f.id, amount: f.amount })))

    // Find the selected fee to calculate remaining amount
    const selectedFee = fees?.find(fee => fee.id === selectedFeeId)
    if (!selectedFee) {
      console.error('Selected fee not found for ID:', selectedFeeId)
      return
    }

    // Calculate remaining amount (full amount - already paid)
    const remainingAmount = selectedFee.amount - selectedFee.paid_amount

    recordPayment(
      {
        fee_id: selectedFeeId,
        amount: remainingAmount,
        ...data
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false)
          paymentForm.reset()
        },
      }
    )
  }

  const onWaiveFee = (data: WaiverFormData) => {
    waiveFee(
      { fee_id: selectedFeeId, ...data },
      {
        onSuccess: () => {
          setWaiverDialogOpen(false)
          waiverForm.reset()
        },
      }
    )
  }

  const handleRecordPayment = (feeId: string) => {
    setSelectedFeeId(feeId)
    setPaymentDialogOpen(true)
  }

  const handleWaiveFee = (feeId: string) => {
    setSelectedFeeId(feeId)
    setWaiverDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      unpaid: { variant: 'outline' as const, icon: Clock },
      paid: { variant: 'default' as const, icon: CheckCircle },
      overdue: { variant: 'destructive' as const, icon: AlertTriangle },
      waived: { variant: 'secondary' as const, icon: Ban },
    }

    const config = variants[status as keyof typeof variants] || variants.unpaid
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Association Fees</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage fees, record payments, and track collections
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Fee Management
            </h2>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Fee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-gray-100">Create Association Fee</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Create a new fee record for a household
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreateFee)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household_id" className="text-gray-700 dark:text-gray-300">Household *</Label>
                <Select
                  value={createForm.watch('household_id')}
                  onValueChange={(value) => createForm.setValue('household_id', value)}
                >
                  <SelectTrigger id="household_id" className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select household" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
                    {households.map((household: any) => (
                      <SelectItem key={household.id} value={household.id} className="text-gray-900 dark:text-gray-100">
                        {household.residence?.unit_number || 'Unknown'} - {household.household_head?.first_name || 'No head'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.household_id && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.household_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee_type" className="text-gray-700 dark:text-gray-300">Fee Type *</Label>
                <Select
                  value={createForm.watch('fee_type')}
                  onValueChange={(value) => createForm.setValue('fee_type', value as any)}
                >
                  <SelectTrigger id="fee_type" className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
                    <SelectItem value="monthly" className="text-gray-900 dark:text-gray-100">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="text-gray-900 dark:text-gray-100">Quarterly</SelectItem>
                    <SelectItem value="annual" className="text-gray-900 dark:text-gray-100">Annual</SelectItem>
                    <SelectItem value="special_assessment" className="text-gray-900 dark:text-gray-100">Special Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-700 dark:text-gray-300">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...createForm.register('amount', { valueAsNumber: true })}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.amount ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.amount && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-gray-700 dark:text-gray-300">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...createForm.register('due_date')}
                  className={`border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${createForm.formState.errors.due_date ? 'border-red-500' : ''}`}
                />
                {createForm.formState.errors.due_date && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.due_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">Notes</Label>
                <Textarea
                  id="notes"
                  {...createForm.register('notes')}
                  placeholder="Optional notes..."
                  rows={3}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <Button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                {isCreating ? 'Creating...' : 'Create Fee'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₱{Number(stats.total_billed || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₱{Number(stats.total_collected || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₱{Number(stats.outstanding_balance || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.overdue_count || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-subtle-transparent">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Fee Records
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            View and manage association fee records
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-800">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-700">
              <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">All</TabsTrigger>
              <TabsTrigger value="unpaid" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Unpaid</TabsTrigger>
              <TabsTrigger value="paid" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Paid</TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Overdue</TabsTrigger>
              <TabsTrigger value="waived" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-gray-900 dark:text-gray-100">Waived</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : fees && fees.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No fees found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No {activeTab === 'all' ? '' : activeTab} fees at the moment
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-subtle-transparent">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                      <TableRow>
                        <TableHead className="text-gray-700 dark:text-gray-300">Household</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Fee Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Due Date</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {fees?.map((fee: any) => (
                        <TableRow key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {fee.household?.residence?.unit_number || '-'}
                            {fee.household?.household_head && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {fee.household.household_head.first_name} {fee.household.household_head.last_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                              {fee.fee_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            ₱{fee.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            {format(new Date(fee.due_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getStatusBadge(fee.payment_status)}</TableCell>
                          <TableCell className="text-right text-gray-900 dark:text-gray-100">
                            {fee.payment_status === 'unpaid' || fee.payment_status === 'overdue' ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRecordPayment(fee.id)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Record Payment
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleWaiveFee(fee.id)}
                                  className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Waive
                                </Button>
                              </div>
                            ) : fee.payment_status === 'paid' ? (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Paid on {format(new Date(fee.payment_date!), 'MMM dd, yyyy')}
                                <div>via {fee.payment_method}</div>
                              </div>
                            ) : null}
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

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment details for this fee
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(onRecordPayment)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                {...paymentForm.register('payment_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={paymentForm.watch('payment_method')}
                onValueChange={(value) => paymentForm.setValue('payment_method', value)}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="paymaya">PayMaya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Reference Number</Label>
              <Input
                id="payment_reference"
                {...paymentForm.register('payment_reference')}
                placeholder="Optional reference..."
              />
            </div>

            <Button type="submit" disabled={isRecordingPayment} className="w-full">
              {isRecordingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Waive Fee Dialog */}
      <Dialog open={waiverDialogOpen} onOpenChange={setWaiverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Fee</DialogTitle>
            <DialogDescription>
              Provide a reason for waiving this fee
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={waiverForm.handleSubmit(onWaiveFee)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="waiver_reason">Waiver Reason *</Label>
              <Textarea
                id="waiver_reason"
                {...waiverForm.register('waiver_reason')}
                placeholder="e.g., Financial hardship, community service contribution..."
                rows={4}
              />
              {waiverForm.formState.errors.waiver_reason && (
                <p className="text-sm text-red-500">{waiverForm.formState.errors.waiver_reason.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isWaiving} variant="destructive" className="w-full">
              {isWaiving ? 'Waiving...' : 'Waive Fee'}
            </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  )
}