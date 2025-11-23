/**
 * Storage Helper Functions
 *
 * Utilities for working with Supabase Storage
 */

import { supabase } from '../supabaseClient';
import { logger } from '@/lib/logger';

/**
 * Get a downloadable URL for a file in Supabase Storage
 * Uses signed URLs for private buckets
 */
export async function getDownloadUrl(filePath: string, bucketName: string = 'supplier-quotes'): Promise<string | null> {
  try {
    // Extract just the path from the full URL if needed
    const pathOnly = filePath.includes('/storage/v1/object/public/')
      ? filePath.split('/storage/v1/object/public/')[1]?.split('/').slice(1).join('/')
      : filePath;

    if (!pathOnly) {
      logger.error('Invalid file path:', filePath);
      return null;
    }

    // Create a signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(pathOnly, 3600);

    if (error) {
      logger.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Error in getDownloadUrl:', error);
    return null;
  }
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(filePath: string, fileName: string, bucketName: string = 'supplier-quotes'): Promise<void> {
  try {
    const url = await getDownloadUrl(filePath, bucketName);

    if (!url) {
      throw new Error('Failed to get download URL');
    }

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    logger.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  path: string,
  bucketName: string = 'company-assets'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true // Replace existing file
      });

    if (error) {
      logger.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (error) {
    logger.error('Error in uploadFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  bucketName: string = 'company-assets'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      logger.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in deleteFile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
