import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { useStickers, useStickerActions } from '@/hooks/useStickers'
import { useHouseholds } from '@/hooks/useHouseholds'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { StickerApprovalForm } from '@/components/features/stickers/StickerApprovalForm'
import { Car, CheckCircle, XCircle, Ban, Clock, AlertTriangle, Plus } from 'lucide-react'
import { format, addYears } from 'date-fns'

export function StickersPage() {
  const [activeTab, setActiveTab] = useState('all') // Start with 'all' to show all stickers
  const { data: stickers, isLoading } = useStickers(activeTab === 'all' ? undefined : activeTab)
  const { households } = useHouseholds()
  const { createSticker, approveSticker, rejectSticker, revokeSticker, bulkApproveStickers, isCreating } = useStickerActions()

  const [selectedStickers, setSelectedStickers] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false)
  const [selectedStickerId, setSelectedStickerId] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [revocationReason, setRevocationReason] = useState('')
  const [bulkExpiryDate, setBulkExpiryDate] = useState(format(addYears(new Date(), 1), 'yyyy-MM-dd'))

  // Create form state
  const [newSticker, setNewSticker] = useState({
    household_id: '',
    vehicle_plate: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_color: '',
  })

  const handleApprove = (stickerId: string) => {
    setSelectedStickerId(stickerId)
    setApproveDialogOpen(true)
  }

  const handleReject = (stickerId: string) => {
    setSelectedStickerId(stickerId)
    setRejectDialogOpen(true)
  }

  const handleRevoke = (stickerId: string) => {
    setSelectedStickerId(stickerId)
    setRevokeDialogOpen(true)
  }

  const handleBulkApprove = () => {
    if (selectedStickers.length === 0) {
      return
    }
    setBulkApproveDialogOpen(true)
  }

  const confirmReject = () => {
    rejectSticker(
      { sticker_id: selectedStickerId, rejection_reason: rejectionReason },
      {
        onSuccess: () => {
          setRejectDialogOpen(false)
          setRejectionReason('')
        },
      }
    )
  }

  const confirmRevoke = () => {
    revokeSticker(
      { sticker_id: selectedStickerId, revocation_reason: revocationReason },
      {
        onSuccess: () => {
          setRevokeDialogOpen(false)
          setRevocationReason('')
        },
      }
    )
  }

  const confirmBulkApprove = () => {
    bulkApproveStickers(
      { sticker_ids: selectedStickers, expiry_date: bulkExpiryDate },
      {
        onSuccess: () => {
          setBulkApproveDialogOpen(false)
          setSelectedStickers([])
        },
      }
    )
  }

  const handleCreateSticker = () => {
    setNewSticker({
      household_id: '',
      vehicle_plate: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_color: '',
    })
    setCreateDialogOpen(true)
  }

  const confirmCreateSticker = () => {
    if (!newSticker.household_id || !newSticker.vehicle_plate) {
      return
    }

    createSticker(newSticker, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        setNewSticker({
          household_id: '',
          vehicle_plate: '',
          vehicle_make: '',
          vehicle_model: '',
          vehicle_color: '',
        })
      },
    } as any)
  }

  const toggleSelectSticker = (stickerId: string) => {
    setSelectedStickers((prev) =>
      prev.includes(stickerId)
        ? prev.filter((id) => id !== stickerId)
        : [...prev, stickerId]
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      requested: { variant: 'outline' as const, icon: Clock },
      approved: { variant: 'secondary' as const, icon: CheckCircle },
      active: { variant: 'default' as const, icon: CheckCircle },
      expiring: { variant: 'outline' as const, icon: AlertTriangle },
      expired: { variant: 'destructive' as const, icon: XCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle },
      cancelled: { variant: 'secondary' as const, icon: XCircle },
      revoked: { variant: 'destructive' as const, icon: Ban },
    }

    const config = variants[status as keyof typeof variants] || variants.requested
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Vehicle Stickers</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage vehicle sticker requests and approvals
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Sticker Queue
            </h2>
          </div>
          <div className="flex gap-2">
            {selectedStickers.length > 0 && (
              <Button onClick={handleBulkApprove}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve {selectedStickers.length} Selected
              </Button>
            )}
            <Button onClick={handleCreateSticker}>
              <Plus className="mr-2 h-4 w-4" />
              Request Sticker
            </Button>
          </div>
        </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="requested">Requested</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="expiring">Expiring</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="revoked">Revoked</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : stickers && stickers.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No stickers found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No {activeTab} stickers at the moment
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700">
                      <TableRow className="border-gray-200 dark:border-gray-700">
                        {activeTab === 'requested' && (
                          <TableHead className="w-12 text-gray-700 dark:text-gray-300">
                            <Checkbox
                              checked={selectedStickers.length === stickers?.length}
                              onCheckedChange={(checked) => {
                                setSelectedStickers(
                                  checked ? stickers?.map((s: any) => s.id) || [] : []
                                )
                              }}
                            />
                          </TableHead>
                        )}
                        <TableHead className="text-gray-700 dark:text-gray-300">Plate Number</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Vehicle</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Household</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Request Date</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {stickers?.map((sticker: any) => (
                        <TableRow key={sticker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {activeTab === 'requested' && (
                            <TableCell className="text-gray-900 dark:text-gray-100">
                              <Checkbox
                                checked={selectedStickers.includes(sticker.id)}
                                onCheckedChange={() => toggleSelectSticker(sticker.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {sticker.vehicle_plate}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              <div>{sticker.vehicle_make} {sticker.vehicle_model}</div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {sticker.vehicle_color}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            {sticker.household?.residence?.unit_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            {sticker.created_at && format(new Date(sticker.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getStatusBadge(sticker.status)}</TableCell>
                          <TableCell className="text-right">
                            {sticker.status === 'requested' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(sticker.id)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(sticker.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {sticker.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(sticker.id)}
                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Revoke
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
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Approve Sticker</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Set the expiry date for this vehicle sticker
            </DialogDescription>
          </DialogHeader>
          <StickerApprovalForm
            stickerId={selectedStickerId}
            onSuccess={() => setApproveDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Reject Sticker</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Provide a reason for rejecting this sticker request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason" className="text-gray-700 dark:text-gray-300">Rejection Reason *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Invalid OR/CR documents..."
                rows={4}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Button
              onClick={confirmReject}
              disabled={rejectionReason.length < 10}
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Sticker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Revoke Sticker</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Provide a reason for revoking this active sticker
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revocation_reason" className="text-gray-700 dark:text-gray-300">Revocation Reason *</Label>
              <Textarea
                id="revocation_reason"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="e.g., Vehicle sold, policy violation..."
                rows={4}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Button
              onClick={confirmRevoke}
              disabled={revocationReason.length < 10}
              variant="destructive"
              className="w-full"
            >
              <Ban className="mr-2 h-4 w-4" />
              Revoke Sticker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Bulk Approve Stickers</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Approve {selectedStickers.length} selected stickers with the same expiry date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_expiry_date" className="text-gray-700 dark:text-gray-300">Expiry Date *</Label>
              <Input
                id="bulk_expiry_date"
                type="date"
                value={bulkExpiryDate}
                onChange={(e) => setBulkExpiryDate(e.target.value)}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Default is 1 year from today
              </p>
            </div>
            <Button onClick={confirmBulkApprove} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve {selectedStickers.length} Stickers
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sticker Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Request Vehicle Sticker</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create a new vehicle sticker request for a household
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household_id" className="text-gray-700 dark:text-gray-300">Household *</Label>
              <Select
                value={newSticker.household_id}
                onValueChange={(value) => setNewSticker({ ...newSticker, household_id: value })}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select household" />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  {households?.map((household: any) => (
                    <SelectItem key={household.id} value={household.id} className="text-gray-900 dark:text-gray-100">
                      {household.residence?.unit_number || household.id} -{' '}
                      {household.household_head
                        ? `${household.household_head.first_name} ${household.household_head.last_name}`
                        : 'No head assigned'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_plate" className="text-gray-700 dark:text-gray-300">Vehicle Plate Number *</Label>
              <Input
                id="vehicle_plate"
                value={newSticker.vehicle_plate}
                onChange={(e) => setNewSticker({ ...newSticker, vehicle_plate: e.target.value })}
                placeholder="e.g., ABC 123"
                className={`${!newSticker.vehicle_plate && newSticker.household_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_make" className="text-gray-700 dark:text-gray-300">Vehicle Make (Optional)</Label>
                <Input
                  id="vehicle_make"
                  value={newSticker.vehicle_make}
                  onChange={(e) => setNewSticker({ ...newSticker, vehicle_make: e.target.value })}
                  placeholder="e.g., Toyota"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_model" className="text-gray-700 dark:text-gray-300">Vehicle Model (Optional)</Label>
                <Input
                  id="vehicle_model"
                  value={newSticker.vehicle_model}
                  onChange={(e) => setNewSticker({ ...newSticker, vehicle_model: e.target.value })}
                  placeholder="e.g., Camry"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_color" className="text-gray-700 dark:text-gray-300">Vehicle Color (Optional)</Label>
              <Input
                id="vehicle_color"
                value={newSticker.vehicle_color}
                onChange={(e) => setNewSticker({ ...newSticker, vehicle_color: e.target.value })}
                placeholder="e.g., Silver"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={confirmCreateSticker}
                disabled={!newSticker.household_id || !newSticker.vehicle_plate || isCreating}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create Sticker Request'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Container>
  )
}
