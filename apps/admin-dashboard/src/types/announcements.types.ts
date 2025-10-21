export interface Announcement {
  id: string
  tenant_id: string
  title: string
  content: string
  created_by: string
  target_audience: 'all' | 'households' | 'security' | 'admins'
  announcement_type: 'general' | 'urgent' | 'event' | 'maintenance' | 'fee_reminder' | 'election'
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived'
  publication_date: string | null
  published_at: string | null
  expiry_date: string | null
  archived_at: string | null
  view_count: number
  click_count: number
  attachment_urls: string[] | null
  created_at: string
  updated_at: string
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  target_audience: 'all' | 'households' | 'security' | 'admins'
  announcement_type: 'general' | 'urgent' | 'event' | 'maintenance' | 'fee_reminder' | 'election'
  publication_date?: string
  expiry_date?: string
  attachment_urls?: string[]
}

export interface UpdateAnnouncementInput {
  announcement_id: string
  title?: string
  content?: string
  target_audience?: 'all' | 'households' | 'security' | 'admins'
  announcement_type?: 'general' | 'urgent' | 'event' | 'maintenance' | 'fee_reminder' | 'election'
  publication_date?: string
  expiry_date?: string
  attachment_urls?: string[]
}

export interface PublishAnnouncementInput {
  announcement_id: string
  publication_date?: string
}
