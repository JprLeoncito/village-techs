import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIncidents, useIncidentActions, useSecurityOfficers } from '@/hooks/useSecurity'
import { useHouseholds } from '@/hooks/useHouseholds'
import { useAuthStore } from '@/stores/authStore'
import {
  incidentFormSchema,
  updateIncidentSchema,
  type IncidentFormData,
  type UpdateIncidentFormData,
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
import {
  AlertTriangle,
  Plus,
  Shield,
  Volume2,
  Car,
  Wrench,
  HelpCircle,
  CheckCircle,
  Clock,
  Search,
  XCircle,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Incident } from '@/types/security.types'

export function IncidentsPage() {
  const user = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState('reported')
  const { data: incidents, isLoading } = useIncidents(activeTab === 'all' ? undefined : activeTab)
  const { data: officers } = useSecurityOfficers()
  const { data: households } = useHouseholds()
  const {
    createIncident,
    updateIncident,
    deleteIncident,
    isCreating,
    isUpdating,
    isDeleting,
  } = useIncidentActions()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const createForm = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      incident_type: 'other',
      incident_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  })

  const updateForm = useForm<UpdateIncidentFormData>({
    resolver: zodResolver(updateIncidentSchema),
  })

  const handleCreateIncident = () => {
    setCreateDialogOpen(true)
    createForm.reset({
      incident_type: 'other',
      incident_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    })
  }

  const handleUpdateIncident = (incident: Incident) => {
    setSelectedIncident(incident)
    updateForm.reset({
      status: incident.status,
      assigned_to_id: incident.assigned_to_id || undefined,
      resolution_notes: incident.resolution_notes || undefined,
    })
    setUpdateDialogOpen(true)
  }

  const handleDeleteIncident = (incident: Incident) => {
    if (confirm(`Delete incident "${incident.title}"? This action cannot be undone.`)) {
      deleteIncident(incident.id)
    }
  }

  const onCreateSubmit = (data: IncidentFormData) => {
    createIncident(data, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        createForm.reset()
      },
    } as any)
  }

  const onUpdateSubmit = (data: UpdateIncidentFormData) => {
    if (!selectedIncident) return

    const updates = {
      incident_id: selectedIncident.id,
      ...data,
    }

    // If marking as resolved, add resolved_time
    if (data.status === 'resolved' || data.status === 'closed') {
      updates.resolved_time = new Date().toISOString()
    }

    updateIncident(updates, {
      onSuccess: () => {
        setUpdateDialogOpen(false)
        updateForm.reset()
        setSelectedIncident(null)
      },
    } as any)
  }

  const getIncidentTypeIcon = (type: string) => {
    const icons = {
      suspicious_activity: Shield,
      unauthorized_entry: Shield,
      emergency: AlertTriangle,
      property_damage: Wrench,
      disturbance: Volume2,
      security: Shield,
      noise: Volume2,
      parking: Car,
      maintenance: Wrench,
      other: HelpCircle,
    }
    return icons[type as keyof typeof icons] || HelpCircle
  }

  const getIncidentTypeBadge = (type: string) => {
    const variants = {
      suspicious_activity: { variant: 'destructive' as const, label: 'Suspicious Activity' },
      unauthorized_entry: { variant: 'destructive' as const, label: 'Unauthorized Entry' },
      emergency: { variant: 'destructive' as const, label: 'Emergency' },
      property_damage: { variant: 'default' as const, label: 'Property Damage' },
      disturbance: { variant: 'default' as const, label: 'Disturbance' },
      security: { variant: 'destructive' as const, label: 'Security' },
      noise: { variant: 'default' as const, label: 'Noise' },
      parking: { variant: 'secondary' as const, label: 'Parking' },
      maintenance: { variant: 'outline' as const, label: 'Maintenance' },
      other: { variant: 'outline' as const, label: 'Other' },
    }

    const config = variants[type as keyof typeof variants] || variants.other
    const Icon = getIncidentTypeIcon(type)

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: { variant: 'secondary' as const, label: 'Low' },
      medium: { variant: 'default' as const, label: 'Medium' },
      high: { variant: 'default' as const, label: 'High' },
      critical: { variant: 'destructive' as const, label: 'Critical' },
    }

    const config = variants[severity as keyof typeof variants] || variants.medium

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'outline' as const, icon: AlertTriangle, label: 'Open' },
      reported: { variant: 'outline' as const, icon: AlertTriangle, label: 'Reported' },
      investigating: { variant: 'default' as const, icon: Search, label: 'Investigating' },
      resolved: { variant: 'secondary' as const, icon: CheckCircle, label: 'Resolved' },
      closed: { variant: 'secondary' as const, icon: XCircle, label: 'Closed' },
    }

    const config = variants[status as keyof typeof variants] || variants.open
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Incident Reports</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track and manage security incidents and community issues
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Incident Management
            </h2>
          </div>
          <Button onClick={handleCreateIncident}>
            <Plus className="mr-2 h-4 w-4" />
            Report Incident
          </Button>
        </div>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-subtle-transparent">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Incidents
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">Monitor and resolve community incidents</CardDescription>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-800">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="reported">Reported</TabsTrigger>
              <TabsTrigger value="investigating">Investigating</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : incidents && incidents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No incidents found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No {activeTab === 'all' ? '' : activeTab} incidents at the moment
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-subtle-transparent">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700">
                      <TableRow className="border-gray-200 dark:border-subtle-transparent">
                        <TableHead className="text-gray-700 dark:text-gray-300">Incident</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Severity</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Location</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Time</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Assigned To</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {incidents?.map((incident: any) => (
                        <TableRow key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="font-medium">{incident.description?.substring(0, 50) || 'N/A'}...</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {incident.description?.substring(0, 60) || ''}...
                            </div>
                            {incident.household && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Unit: {incident.household.residence?.unit_number || '-'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getIncidentTypeBadge(incident.incident_type)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100"><Badge variant="secondary">N/A</Badge></TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getStatusBadge(incident.resolution_status)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {incident.location || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              {incident.incident_timestamp && format(new Date(incident.incident_timestamp), 'MMM d, h:mm a')}
                              {incident.resolved_at && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {format(new Date(incident.resolved_at), 'MMM d, h:mm a')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateIncident(incident)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Search className="mr-2 h-4 w-4" />
                                Update
                              </Button>
                              {incident.reported_by_id === user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteIncident(incident)}
                                  disabled={isDeleting}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              )}
                            </div>
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

      {/* Create Incident Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Report New Incident</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Document a security or community incident
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incident_type" className="text-gray-700 dark:text-gray-300">Incident Type *</Label>
              <Select
                value={createForm.watch('incident_type')}
                onValueChange={(value) => createForm.setValue('incident_type', value as any)}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <SelectItem value="suspicious_activity" className="text-gray-900 dark:text-gray-100">Suspicious Activity</SelectItem>
                  <SelectItem value="unauthorized_entry" className="text-gray-900 dark:text-gray-100">Unauthorized Entry</SelectItem>
                  <SelectItem value="disturbance" className="text-gray-900 dark:text-gray-100">Disturbance</SelectItem>
                  <SelectItem value="emergency" className="text-gray-900 dark:text-gray-100">Emergency</SelectItem>
                  <SelectItem value="property_damage" className="text-gray-900 dark:text-gray-100">Property Damage</SelectItem>
                  <SelectItem value="other" className="text-gray-900 dark:text-gray-100">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description *</Label>
              <Textarea
                id="description"
                {...createForm.register('description')}
                placeholder="Detailed description of what happened..."
                rows={5}
                className={createForm.formState.errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
              />
              {createForm.formState.errors.description && (
                <p className="text-sm text-red-500">{createForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-700 dark:text-gray-300">Location</Label>
                <Input
                  id="location"
                  {...createForm.register('location')}
                  placeholder="e.g., Unit 123, Parking Lot A"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="household_id" className="text-gray-700 dark:text-gray-300">Related Household (Optional)</Label>
                <Select
                  value={createForm.watch('household_id')}
                  onValueChange={(value) => createForm.setValue('household_id', value)}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident_time" className="text-gray-700 dark:text-gray-300">Incident Time *</Label>
              <Input
                id="incident_time"
                type="datetime-local"
                {...createForm.register('incident_time')}
                className={createForm.formState.errors.incident_time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
              />
              {createForm.formState.errors.incident_time && (
                <p className="text-sm text-red-500">{createForm.formState.errors.incident_time.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? 'Reporting...' : 'Report Incident'}
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

      {/* Update Incident Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Update Incident</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the status and details of {selectedIncident?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 dark:text-gray-300">Status</Label>
              <Select
                value={updateForm.watch('status')}
                onValueChange={(value) => updateForm.setValue('status', value as any)}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <SelectItem value="reported" className="text-gray-900 dark:text-gray-100">Reported</SelectItem>
                  <SelectItem value="investigating" className="text-gray-900 dark:text-gray-100">Investigating</SelectItem>
                  <SelectItem value="resolved" className="text-gray-900 dark:text-gray-100">Resolved</SelectItem>
                  <SelectItem value="closed" className="text-gray-900 dark:text-gray-100">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to_id" className="text-gray-700 dark:text-gray-300">Assign To</Label>
              <Select
                value={updateForm.watch('assigned_to_id')}
                onValueChange={(value) => updateForm.setValue('assigned_to_id', value)}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  {officers?.map((officer: any) => (
                    <SelectItem key={officer.id} value={officer.user_id} className="text-gray-900 dark:text-gray-100">
                      {officer.badge_number} - {officer.user?.first_name} {officer.user?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution_notes" className="text-gray-700 dark:text-gray-300">Resolution Notes</Label>
              <Textarea
                id="resolution_notes"
                {...updateForm.register('resolution_notes')}
                placeholder="How was the incident resolved?"
                rows={4}
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? 'Updating...' : 'Update Incident'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpdateDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Additional content sections can be added here */}
      </div>

    </Container>
  )
}
