import { supabase } from './supabaseClient';

/**
 * Uploads a compiled 3D GLB model binary Blob to Supabase Storage.
 * Saves the file in the `custom_surfaces` bucket under the non-destructive user path:
 * [user_id]/3d_models/[project_id].glb
 * 
 * @param userId Authenticated user's ID
 * @param projectId Current project's unique ID
 * @param glbBlob Binary GLB model Blob
 * @returns The public URL of the uploaded model, or null if failed
 */
export const uploadProjectGlbModel = async (
  userId: string,
  projectId: string,
  glbBlob: Blob
): Promise<string | null> => {
  try {
    const filePath = `${userId}/3d_models/${projectId}.glb`;

    const { error } = await supabase.storage
      .from('custom_surfaces')
      .upload(filePath, glbBlob, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading GLB to Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('custom_surfaces')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to retrieve public URL for uploaded GLB.');
    }

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload project GLB model:', err);
    throw err;
  }
};
