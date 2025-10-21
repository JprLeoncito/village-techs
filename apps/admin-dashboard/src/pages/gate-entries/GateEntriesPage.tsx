import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGateEntries, useGateStats, useGateEntryActions, useSecurityOfficers } from '@/hooks/useSecurity'
import { useHouseholds } from '@/hooks/useHouseholds'
import {
  gateEntryFormSchema,
  exitGateEntrySchema,
  type GateEntryFormData,
  type ExitGateEntryFormData,
} from '@/lib/validations/security'
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
import {
  Shield,
  Plus,
  Users,
  UserCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Car,
  Package,
  Wrench,
  LogOut,
  Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import type { GateEntry } from '@/types/security.types'

export function GateEntriesPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const { data: entries, isLoading } = useGateEntries(selectedDate)
  const { data: stats } = useGateStats()
  const { data: officers } = useSecurityOfficers(true)
  const { data: households } = useHouseholds()
  const { createGateEntry, updateGateEntry, isCreating, isUpdating } = useGateEntryActions()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<GateEntry | null>(null)

  const createForm = useForm<GateEntryFormData>({
    resolver: zodResolver(gateEntryFormSchema),
    defaultValues: {
      entry_type: 'visitor',
      direction: 'in',
    },
  })

  const exitForm = useForm<ExitGateEntryFormData>({
    resolver: zodResolver(exitGateEntrySchema),
    defaultValues: {
      exit_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  })

  const handleRecordEntry = () => {
    setCreateDialogOpen(true)
    createForm.reset({
      entry_type: 'visitor',
      direction: 'in',
    })
  }

  const handleRecordExit = (entry: GateEntry) => {
    setSelectedEntry(entry)
    exitForm.reset({
      exit_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    })
    setExitDialogOpen(true)
  }

  const onCreateSubmit = (data: GateEntryFormData) => {
    createGateEntry(data, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        createForm.reset()
      },
    } as any)
  }

  const onExitSubmit = (data: ExitGateEntryFormData) => {
    if (!selectedEntry) return

    updateGateEntry(
      { entry_id: selectedEntry.id, ...data },
      {
        onSuccess: () => {
          setExitDialogOpen(false)
          exitForm.reset()
          setSelectedEntry(null)
        },
      } as any
    )
  }

  const getEntryTypeIcon = (type: string) => {
    const icons = {
      visitor: Users,
      resident: UserCheck,
      service: Wrench,
      delivery: Package,
    }
    return icons[type as keyof typeof icons] || Users
  }

  const getEntryTypeBadge = (type: string) => {
    const variants = {
      visitor: { variant: 'default' as const, label: 'Visitor' },
      resident: { variant: 'secondary' as const, label: 'Resident' },
      service: { variant: 'outline' as const, label: 'Service' },
      delivery: { variant: 'outline' as const, label: 'Delivery' },
    }

    const config = variants[type as keyof typeof variants] || variants.visitor
    const Icon = getEntryTypeIcon(type)

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getDirectionBadge = (direction: string) => {
    const Icon = direction === 'in' ? ArrowRight : ArrowLeft
    const variant = direction === 'in' ? 'default' : 'secondary'

    return (
      <Badge variant={variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {direction.toUpperCase()}
      </Badge>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Gate Monitoring</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Real-time gate entry tracking and security monitoring
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Gate Entry Management
            </h2>
          </div>
          <Button onClick={handleRecordEntry}>
            <Plus className="mr-2 h-4 w-4" />
            Record Entry
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Entries Today</CardTitle>
            <Activity className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.total_entries_today || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Visitors Today</CardTitle>
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.total_visitors_today || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Officers</CardTitle>
            <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.active_officers || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-subtle-transparent">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Open Incidents</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent className="bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.open_incidents || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Officers Card */}
      {officers && officers.length > 0 && (
        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-subtle-transparent">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Officers on Duty
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Currently active security officers</CardDescription>
          </CardHeader>
          <CardContent className="bg-white dark:bg-gray-800">
            <div className="flex flex-wrap gap-2">
              {officers.map((officer: any) => (
                <Badge key={officer.id} variant="outline" className="px-3 py-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  <Shield className="mr-1 h-3 w-3" />
                  {officer.badge_number} - {officer.user?.first_name} {officer.user?.last_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate Entries Table */}
      <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-subtle-transparent">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-100">Gate Entries</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Live feed of gate entries and exits</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="date-filter" className="text-sm text-gray-700 dark:text-gray-300">Date:</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : entries && entries.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No entries found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No gate entries recorded for {format(new Date(selectedDate), 'MMM d, yyyy')}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 dark:border-subtle-transparent">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-700">
                  <TableRow className="border-gray-200 dark:border-subtle-transparent">
                    <TableHead className="text-gray-700 dark:text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Direction</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Visiting</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Vehicle</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Purpose</TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {entries?.map((entry: any) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(entry.entry_time), 'h:mm a')}
                          </div>
                          {entry.exit_time && (
                            <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <LogOut className="h-3 w-3" />
                              {format(new Date(entry.exit_time), 'h:mm a')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{getEntryTypeBadge(entry.entry_type)}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{getDirectionBadge(entry.direction)}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        <div className="text-sm">
                          <div className="font-medium">{entry.visitor_name || '-'}</div>
                          {entry.visitor_contact && (
                            <div className="text-gray-500 dark:text-gray-400">{entry.visitor_contact}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {entry.household ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {entry.household.residence?.unit_number || '-'}
                            </div>
                            {entry.household.household_head && (
                              <div className="text-gray-500 dark:text-gray-400">
                                {entry.household.household_head.first_name}{' '}
                                {entry.household.household_head.last_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {entry.vehicle_plate ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                            <Car className="h-3 w-3" />
                            {entry.vehicle_plate}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {entry.purpose || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.direction === 'in' && !entry.exit_time && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRecordExit(entry)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Record Exit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Entry Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Record Gate Entry</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Record a new visitor, resident, or service entry
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_type" className="text-gray-700 dark:text-gray-300">Entry Type *</Label>
                <Select
                  value={createForm.watch('entry_type')}
                  onValueChange={(value) => createForm.setValue('entry_type', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="visitor" className="text-gray-900 dark:text-gray-100">Visitor</SelectItem>
                    <SelectItem value="resident" className="text-gray-900 dark:text-gray-100">Resident</SelectItem>
                    <SelectItem value="service" className="text-gray-900 dark:text-gray-100">Service Provider</SelectItem>
                    <SelectItem value="delivery" className="text-gray-900 dark:text-gray-100">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction" className="text-gray-700 dark:text-gray-300">Direction *</Label>
                <Select
                  value={createForm.watch('direction')}
                  onValueChange={(value) => createForm.setValue('direction', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="in" className="text-gray-900 dark:text-gray-100">Entering</SelectItem>
                    <SelectItem value="out" className="text-gray-900 dark:text-gray-100">Exiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitor_name" className="text-gray-700 dark:text-gray-300">Name</Label>
                <Input
                  id="visitor_name"
                  {...createForm.register('visitor_name')}
                  placeholder="Full name"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitor_contact" className="text-gray-700 dark:text-gray-300">Contact Number</Label>
                <Input
                  id="visitor_contact"
                  {...createForm.register('visitor_contact')}
                  placeholder="Phone number"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visiting_household_id" className="text-gray-700 dark:text-gray-300">Visiting Household</Label>
                <Select
                  value={createForm.watch('visiting_household_id')}
                  onValueChange={(value) => createForm.setValue('visiting_household_id', value)}
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
                <Label htmlFor="vehicle_plate" className="text-gray-700 dark:text-gray-300">Vehicle Plate</Label>
                <Input
                  id="vehicle_plate"
                  {...createForm.register('vehicle_plate')}
                  placeholder="e.g., ABC 1234"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-gray-700 dark:text-gray-300">Purpose of Visit</Label>
              <Input
                id="purpose"
                {...createForm.register('purpose')}
                placeholder="e.g., Family visit, delivery, maintenance"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...createForm.register('notes')}
                placeholder="Additional notes..."
                rows={3}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? 'Recording...' : 'Record Entry'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Exit Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Record Exit</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Record the exit time for {selectedEntry?.visitor_name || 'this entry'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={exitForm.handleSubmit(onExitSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exit_time" className="text-gray-700 dark:text-gray-300">Exit Time *</Label>
              <Input
                id="exit_time"
                type="datetime-local"
                {...exitForm.register('exit_time')}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_notes" className="text-gray-700 dark:text-gray-300">Exit Notes (Optional)</Label>
              <Textarea
                id="exit_notes"
                {...exitForm.register('notes')}
                placeholder="Any additional notes about the exit..."
                rows={3}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? 'Recording...' : 'Record Exit'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExitDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>

      {/* Additional content sections can be added here */}

    </Container>
  )
}
