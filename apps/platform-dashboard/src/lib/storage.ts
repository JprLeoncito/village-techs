import { supabase } from './supabase'

const LOGO_BUCKET = 'community-logos'

export async function uploadCommunityLogo(file: File, communityId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${communityId}.${fileExt}`
  const filePath = `logos/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Replace if exists
    })

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

export async function deleteCommunityLogo(communityId: string): Promise<void> {
  // Try to delete all possible extensions
  const extensions = ['png', 'jpg', 'jpeg']

  for (const ext of extensions) {
    const filePath = `logos/${communityId}.${ext}`

    await supabase.storage.from(LOGO_BUCKET).remove([filePath])
    // Ignore errors - file might not exist
  }
}

// Initialize storage bucket (call this once during setup)
export async function initializeStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()

  const bucketExists = buckets?.some((bucket) => bucket.name === LOGO_BUCKET)

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    })

    if (error) {
      console.error('Failed to create storage bucket:', error)
    }
  }
}
