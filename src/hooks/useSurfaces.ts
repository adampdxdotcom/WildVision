import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { processSurfaceSlab } from '../utils/imageUtils';
import { v4 as uuidv4 } from 'uuid';

export function useSurfaces() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCloudSurfaces = useAppStore((state) => state.setCloudSurfaces);
  const addLocalSurface = useAppStore((state) => state.addLocalSurface);
  const removeSurfaceState = useAppStore((state) => state.removeSurface);
  const user = useAuthStore((state) => state.user);

  const fetchSurfaces = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_surfaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const surfaces = data.map((row: any) => ({
          id: row.id,
          name: row.file_name || 'Unnamed Surface',
          url_or_base64: row.image_url,
          is_local_only: false,
        }));
        setCloudSurfaces(surfaces);
      }
    } catch (err: any) {
      console.error('Error fetching surfaces:', err);
      setError(err.message || 'Failed to fetch surfaces');
    } finally {
      setIsLoading(false);
    }
  }, [user, setCloudSurfaces]);

  const uploadSurface = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      // Compress and process
      const { blob, dataUrl } = await processSurfaceSlab(file);

      // If not logged in, just add as local
      if (!user) {
        const localId = uuidv4();
        const surface = {
          id: localId,
          name: file.name,
          url_or_base64: dataUrl,
          is_local_only: true,
        };
        addLocalSurface(surface);
        return surface;
      }

      // 1. Upload to storage: custom_surfaces bucket
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${uniqueName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('custom_surfaces')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('custom_surfaces')
        .getPublicUrl(filePath);

      // 3. Insert into user_surfaces table
      const { data: insertData, error: insertError } = await supabase
        .from('user_surfaces')
        .insert({
          file_name: file.name,
          image_url: publicUrl,
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Fetch updated surfaces
      await fetchSurfaces();
      
      return {
        id: insertData.id,
        name: insertData.file_name,
        url_or_base64: insertData.image_url,
        is_local_only: false,
      };
      
    } catch (err: any) {
      console.error('Error uploading surface:', err);
      setError(err.message || 'Failed to upload surface');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, addLocalSurface, fetchSurfaces]);

  const deleteSurface = useCallback(async (id: string, isLocalOnly: boolean, imageUrl?: string) => {
    if (isLocalOnly) {
      removeSurfaceState(id);
      return;
    }

    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // If we have an imageUrl, extract the file path from it to delete from storage bucket
      // The public URL looks like: .../storage/v1/object/public/custom_surfaces/{user_id}/{filename}
      if (imageUrl) {
        const urlObj = new URL(imageUrl);
        const pathSegments = urlObj.pathname.split('/');
        // Find custom_surfaces index
        const bucketIndex = pathSegments.indexOf('custom_surfaces');
        if (bucketIndex !== -1 && pathSegments.length > bucketIndex + 2) {
          const userIdPath = pathSegments[bucketIndex + 1];
          const fileName = pathSegments[bucketIndex + 2];
          const filePath = `${userIdPath}/${fileName}`;
          
          const { error: deleteStorageError } = await supabase.storage
            .from('custom_surfaces')
            .remove([filePath]);
            
          if (deleteStorageError) {
             console.warn('Warning: Failed to delete from storage bucket:', deleteStorageError);
          }
        }
      }

      // Delete from table
      const { error: dbError } = await supabase
        .from('user_surfaces')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      removeSurfaceState(id);
    } catch (err: any) {
      console.error('Error deleting surface:', err);
      setError(err.message || 'Failed to delete surface');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, removeSurfaceState]);

  return {
    fetchSurfaces,
    uploadSurface,
    deleteSurface,
    isLoading,
    error
  };
}
