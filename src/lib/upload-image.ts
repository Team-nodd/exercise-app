import { createClient } from "@/lib/supabase/client"

export async function uploadExerciseImage(file: File): Promise<string> {
  const supabase = createClient()
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `exercise-images/${fileName}`
  
  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('exercise-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Upload error details:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        throw new Error('Storage bucket not found. Please run the storage setup script first.')
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error('Permission denied. Check your storage policies.')
      } else if (error.message?.includes('authentication')) {
        throw new Error('Authentication required. Please log in.')
      } else {
        throw new Error(`Upload failed: ${error.message || 'Unknown error'}`)
      }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exercise-images')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to upload image')
  }
}

export async function deleteExerciseImage(imageUrl: string): Promise<void> {
  const supabase = createClient()
  
  // Extract file path from URL
  const urlParts = imageUrl.split('/')
  const fileName = urlParts[urlParts.length - 1]
  const filePath = `exercise-images/${fileName}`
  
  try {
    // Delete file from storage
    const { error } = await supabase.storage
      .from('exercise-images')
      .remove([filePath])
    
    if (error) {
      console.error('Delete error:', error)
      throw new Error(`Failed to delete image: ${error.message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Delete error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to delete image')
  }
} 