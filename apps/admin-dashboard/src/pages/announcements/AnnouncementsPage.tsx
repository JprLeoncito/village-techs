import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAnnouncements, useAnnouncementActions } from '@/hooks/useAnnouncements'
import {
  announcementFormSchema,
  type AnnouncementFormData,
} from '@/lib/validations/announcements'
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
  Megaphone,
  Plus,
  Eye,
  MousePointerClick,
  Send,
  Pencil,
  Trash2,
  Calendar,
  Upload,
  AlertCircle,
  Users,
  Clock,
  CheckCircle,
  CalendarClock
} from 'lucide-react'
import { format } from 'date-fns'
import type { Announcement } from '@/types/announcements.types'

export function AnnouncementsPage() {
  const [activeTab, setActiveTab] = useState('published')
  const { data: announcements, isLoading } = useAnnouncements(activeTab === 'all' ? undefined : activeTab)
  const {
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    deleteAnnouncement,
    uploadAttachment,
    isCreating,
    isUpdating,
    isPublishing,
    isDeleting,
  } = useAnnouncementActions()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  const createForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      announcement_type: 'general',
      target_audience: 'all',
    },
  })

  const editForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementFormSchema),
  })

  const handleCreate = () => {
    setCreateDialogOpen(true)
    createForm.reset({
      announcement_type: 'general',
      target_audience: 'all',
    })
  }

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    editForm.reset({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      announcement_type: announcement.announcement_type,
      publication_date: announcement.publication_date || undefined,
      expiry_date: announcement.expiry_date || undefined,
    })
    setEditDialogOpen(true)
  }

  const handlePublish = (announcement: Announcement) => {
    if (confirm(`Publish "${announcement.title}" now?`)) {
      publishAnnouncement({ announcement_id: announcement.id })
    }
  }

  const handleDelete = (announcement: Announcement) => {
    if (confirm(`Delete "${announcement.title}"? This action cannot be undone.`)) {
      deleteAnnouncement(announcement.id)
    }
  }

  const onCreateSubmit = (data: AnnouncementFormData) => {
    createAnnouncement(data, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        createForm.reset()
      },
    } as any)
  }

  const onEditSubmit = (data: AnnouncementFormData) => {
    if (!selectedAnnouncement) return

    updateAnnouncement(
      { announcement_id: selectedAnnouncement.id, ...data },
      {
        onSuccess: () => {
          setEditDialogOpen(false)
          editForm.reset()
          setSelectedAnnouncement(null)
        },
      } as any
    )
  }

  const getAnnouncementTypeBadge = (type: string) => {
    const variants = {
      general: { variant: 'outline' as const, label: 'General' },
      urgent: { variant: 'destructive' as const, label: 'Urgent' },
      event: { variant: 'default' as const, label: 'Event' },
      maintenance: { variant: 'secondary' as const, label: 'Maintenance' },
      fee_reminder: { variant: 'secondary' as const, label: 'Fee Reminder' },
      election: { variant: 'default' as const, label: 'Election' },
    }

    const config = variants[type as keyof typeof variants] || variants.general

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'outline' as const, icon: Pencil, label: 'Draft' },
      scheduled: { variant: 'secondary' as const, icon: CalendarClock, label: 'Scheduled' },
      published: { variant: 'default' as const, icon: CheckCircle, label: 'Published' },
      expired: { variant: 'destructive' as const, icon: Clock, label: 'Expired' },
    }

    const config = variants[status as keyof typeof variants] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getAudienceBadge = (audience: string) => {
    const labels = {
      all: 'All Users',
      households: 'Households',
      security: 'Security',
      admins: 'Admins',
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit">
        <Users className="h-3 w-3" />
        {labels[audience as keyof typeof labels] || audience}
      </Badge>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Announcements</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create and manage community announcements and communications
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Announcement Management
            </h2>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>

        <Card className="border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-subtle-transparent">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Announcements
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Manage and schedule announcements for different audiences
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-800">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : announcements && announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No announcements found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {activeTab === 'draft'
                      ? 'Create a new announcement to get started'
                      : `No ${activeTab} announcements at the moment`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-subtle-transparent">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700">
                      <TableRow className="border-gray-200 dark:border-subtle-transparent">
                        <TableHead className="text-gray-700 dark:text-gray-300">Title</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Audience</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Schedule</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Analytics</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {announcements?.map((announcement) => (
                        <TableRow key={announcement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="font-medium">{announcement.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {announcement.content.substring(0, 80)}...
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getAudienceBadge(announcement.target_audience)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getAnnouncementTypeBadge(announcement.announcement_type)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">{getStatusBadge(announcement.status)}</TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="text-sm">
                              {announcement.publication_date && (
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(announcement.publication_date), 'MMM d, yyyy')}
                                </div>
                              )}
                              {announcement.expiry_date && (
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(announcement.expiry_date), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 dark:text-gray-100">
                            <div className="flex gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                {announcement.view_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <MousePointerClick className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                {announcement.click_count}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {(announcement.status === 'draft' || announcement.status === 'scheduled') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePublish(announcement)}
                                  disabled={isPublishing}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Publish
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(announcement)}
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(announcement)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
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

      {/* Create Announcement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Announcement</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create a new announcement for your community
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">Title *</Label>
              <Input
                id="title"
                {...createForm.register('title')}
                placeholder="e.g., Community Meeting This Saturday"
                className={`${createForm.formState.errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}
              />
              {createForm.formState.errors.title && (
                <p className="text-sm text-red-500">{createForm.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-gray-700 dark:text-gray-300">Content *</Label>
              <Textarea
                id="content"
                {...createForm.register('content')}
                placeholder="Write your announcement here..."
                rows={8}
                className={`${createForm.formState.errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}
              />
              {createForm.formState.errors.content && (
                <p className="text-sm text-red-500">{createForm.formState.errors.content.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_audience" className="text-gray-700 dark:text-gray-300">Target Audience *</Label>
                <Select
                  value={createForm.watch('target_audience')}
                  onValueChange={(value) => createForm.setValue('target_audience', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="all" className="text-gray-900 dark:text-gray-100">All Users</SelectItem>
                    <SelectItem value="households" className="text-gray-900 dark:text-gray-100">Households Only</SelectItem>
                    <SelectItem value="security" className="text-gray-900 dark:text-gray-100">Security Team</SelectItem>
                    <SelectItem value="admins" className="text-gray-900 dark:text-gray-100">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.target_audience && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.target_audience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcement_type" className="text-gray-700 dark:text-gray-300">Type *</Label>
                <Select
                  value={createForm.watch('announcement_type')}
                  onValueChange={(value) => createForm.setValue('announcement_type', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="general" className="text-gray-900 dark:text-gray-100">General</SelectItem>
                    <SelectItem value="urgent" className="text-gray-900 dark:text-gray-100">Urgent</SelectItem>
                    <SelectItem value="event" className="text-gray-900 dark:text-gray-100">Event</SelectItem>
                    <SelectItem value="maintenance" className="text-gray-900 dark:text-gray-100">Maintenance</SelectItem>
                    <SelectItem value="fee_reminder" className="text-gray-900 dark:text-gray-100">Fee Reminder</SelectItem>
                    <SelectItem value="election" className="text-gray-900 dark:text-gray-100">Election</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.announcement_type && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.announcement_type.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publication_date" className="text-gray-700 dark:text-gray-300">Publish Date (Optional)</Label>
                <Input
                  id="publication_date"
                  type="datetime-local"
                  {...createForm.register('publication_date')}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to save as draft
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date" className="text-gray-700 dark:text-gray-300">Expiry Date (Optional)</Label>
                <Input
                  id="expiry_date"
                  type="datetime-local"
                  {...createForm.register('expiry_date')}
                  className={createForm.formState.errors.expiry_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                />
                {createForm.formState.errors.expiry_date && (
                  <p className="text-sm text-red-500">{createForm.formState.errors.expiry_date.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? 'Creating...' : 'Create Announcement'}
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

      {/* Edit Announcement Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-subtle-transparent">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Edit Announcement</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update the announcement details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-gray-700 dark:text-gray-300">Title *</Label>
              <Input
                id="edit-title"
                {...editForm.register('title')}
                className={editForm.formState.errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
              />
              {editForm.formState.errors.title && (
                <p className="text-sm text-red-500">{editForm.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content" className="text-gray-700 dark:text-gray-300">Content *</Label>
              <Textarea
                id="edit-content"
                {...editForm.register('content')}
                rows={8}
                className={editForm.formState.errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
              />
              {editForm.formState.errors.content && (
                <p className="text-sm text-red-500">{editForm.formState.errors.content.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-target_audience" className="text-gray-700 dark:text-gray-300">Target Audience *</Label>
                <Select
                  value={editForm.watch('target_audience')}
                  onValueChange={(value) => editForm.setValue('target_audience', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="all" className="text-gray-900 dark:text-gray-100">All Users</SelectItem>
                    <SelectItem value="households" className="text-gray-900 dark:text-gray-100">Households Only</SelectItem>
                    <SelectItem value="security" className="text-gray-900 dark:text-gray-100">Security Team</SelectItem>
                    <SelectItem value="admins" className="text-gray-900 dark:text-gray-100">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-announcement_type" className="text-gray-700 dark:text-gray-300">Type *</Label>
                <Select
                  value={editForm.watch('announcement_type')}
                  onValueChange={(value) => editForm.setValue('announcement_type', value as any)}
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <SelectItem value="general" className="text-gray-900 dark:text-gray-100">General</SelectItem>
                    <SelectItem value="urgent" className="text-gray-900 dark:text-gray-100">Urgent</SelectItem>
                    <SelectItem value="event" className="text-gray-900 dark:text-gray-100">Event</SelectItem>
                    <SelectItem value="maintenance" className="text-gray-900 dark:text-gray-100">Maintenance</SelectItem>
                    <SelectItem value="fee_reminder" className="text-gray-900 dark:text-gray-100">Fee Reminder</SelectItem>
                    <SelectItem value="election" className="text-gray-900 dark:text-gray-100">Election</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-publication_date" className="text-gray-700 dark:text-gray-300">Publish Date (Optional)</Label>
                <Input
                  id="edit-publication_date"
                  type="datetime-local"
                  {...editForm.register('publication_date')}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expiry_date" className="text-gray-700 dark:text-gray-300">Expiry Date (Optional)</Label>
                <Input
                  id="edit-expiry_date"
                  type="datetime-local"
                  {...editForm.register('expiry_date')}
                  className={editForm.formState.errors.expiry_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
                />
                {editForm.formState.errors.expiry_date && (
                  <p className="text-sm text-red-500">{editForm.formState.errors.expiry_date.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isUpdating} className="flex-1">
                {isUpdating ? 'Updating...' : 'Update Announcement'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
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
