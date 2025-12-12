import { getSupabase } from './supabase';
import { getCurrentUserId } from './userStorage';

/**
 * Upload image file to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'images')
 * @param folder - Optional folder path within bucket
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(
  file: File,
  bucket: string = 'images',
  folder?: string
): Promise<string> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated to upload images');
  }

  // Generate unique filename: timestamp-userId-originalname
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${userId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete image from Supabase Storage
 * @param url - The public URL of the image to delete
 * @param bucket - The storage bucket name (default: 'images')
 */
export async function deleteImageFromStorage(
  url: string,
  bucket: string = 'images'
): Promise<void> {
  const supabase = getSupabase();

  try {
    // Extract file path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === bucket);
    
    if (bucketIndex === -1) {
      console.warn('Could not extract file path from URL:', url);
      return;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    // Delete file from storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      // Don't throw - deletion is best effort
    }
  } catch (error) {
    console.error('Error parsing image URL for deletion:', error);
    // Don't throw - deletion is best effort
  }
}

