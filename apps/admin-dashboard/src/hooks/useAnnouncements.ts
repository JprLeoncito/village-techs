import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from '@/types/announcements.types'
import toast from 'react-hot-toast'

export function useAnnouncements(status?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['announcements', tenant_id, status],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('tenant_id', tenant_id!)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Announcement[]
    },
    enabled: !!tenant_id,
  })
}

export function useAnnouncement(id: string | undefined) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['announcements', tenant_id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', tenant_id!)
        .single()

      if (error) throw error
      return data as Announcement
    },
    enabled: !!tenant_id && !!id,
  })
}

export function useAnnouncementActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      // Filter out empty date strings
      const payload: any = {
        tenant_id: tenant_id!,
        created_by: user!.id,
        title: input.title,
        content: input.content,
        target_audience: input.target_audience,
        announcement_type: input.announcement_type,
        status: input.publication_date ? 'scheduled' : 'draft',
      }

      // Only include dates if they have values
      if (input.publication_date) {
        payload.publication_date = input.publication_date
      }
      if (input.expiry_date) {
        payload.expiry_date = input.expiry_date
      }
      if (input.attachment_urls && input.attachment_urls.length > 0) {
        payload.attachment_urls = input.attachment_urls
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenant_id] })
      toast.success('Announcement created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create announcement')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ announcement_id, ...updates }: UpdateAnnouncementInput) => {
      // Filter out empty date strings
      const payload: any = {}

      if (updates.title !== undefined) payload.title = updates.title
      if (updates.content !== undefined) payload.content = updates.content
      if (updates.target_audience !== undefined) payload.target_audience = updates.target_audience
      if (updates.announcement_type !== undefined) payload.announcement_type = updates.announcement_type

      // Only include dates if they have non-empty values
      if (updates.publication_date && updates.publication_date !== '') {
        payload.publication_date = updates.publication_date
      }
      if (updates.expiry_date && updates.expiry_date !== '') {
        payload.expiry_date = updates.expiry_date
      }
      if (updates.attachment_urls && updates.attachment_urls.length > 0) {
        payload.attachment_urls = updates.attachment_urls
      }

      const { data, error } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', announcement_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenant_id] })
      toast.success('Announcement updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update announcement')
    },
  })

  const publishMutation = useMutation({
    mutationFn: async ({ announcement_id, publication_date }: { announcement_id: string; publication_date?: string }) => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('announcements')
        .update({
          status: publication_date ? 'scheduled' : 'published',
          publication_date: publication_date || now,
          published_at: publication_date ? null : now,
        })
        .eq('id', announcement_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenant_id] })
      toast.success('Announcement published successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish announcement')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (announcement_id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement_id)
        .eq('tenant_id', tenant_id!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenant_id] })
      toast.success('Announcement deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete announcement')
    },
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ file, announcement_id }: { file: File; announcement_id: string }) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${announcement_id}/${Date.now()}.${fileExt}`
      const filePath = `${tenant_id}/announcements/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('attachments').getPublicUrl(filePath)

      return data.publicUrl
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload attachment')
    },
  })

  return {
    createAnnouncement: createMutation.mutate,
    updateAnnouncement: updateMutation.mutate,
    publishAnnouncement: publishMutation.mutate,
    deleteAnnouncement: deleteMutation.mutate,
    uploadAttachment: uploadAttachmentMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploading: uploadAttachmentMutation.isPending,
  }
}
