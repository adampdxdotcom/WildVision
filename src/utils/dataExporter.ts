import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Extracts the storage file path from a Supabase storage URL.
 */
function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = '/wildvision_renders/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  
  let path = url.substring(index + marker.length);
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }
  return decodeURIComponent(path);
}

/**
 * Generates and downloads a ZIP archive containing the user's custom 2D JSON layouts and photorealistic images/renders.
 * 
 * @param supabase Initialized Supabase client instance
 * @param userId Active user ID
 * @param onProgress Optional callback to report current generation progress to the UI
 */
export async function generateUserDataArchive(
  supabase: any, 
  userId: string,
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    if (!userId) {
      throw new Error("User ID is required to generate the data archive.");
    }

    if (onProgress) {
      onProgress("Initializing archive...");
    }

    // Instantiate a new JSZip object
    const zip = new JSZip();

    // Create distinct internal folders within the zip structure
    const layoutsFolder = zip.folder("Layouts");
    const rendersFolder = zip.folder("Images");

    // Add a README to the archive root explaining the contents
    zip.file(
      "README.txt",
      `WildVision Data Export\nGenerated on: ${new Date().toLocaleDateString()}\n\nThis archive contains your layouts and rendered images.\n- The "Layouts" folder contains your custom 2D JSON structural layouts.\n- The "Images" folder contains your photorealistic image renders.`
    );

    // ==========================================
    // DATABASE QUERIES & FILE WRITING
    // ==========================================
    
    // 1. Fetch layouts/projects:
    if (onProgress) {
      onProgress("Fetching project layouts...");
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_at, updated_at, state_payload')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (projectsError) {
      console.error("Failed to query projects for data export:", projectsError);
      throw new Error(`Database query failed: ${projectsError.message}`);
    }

    if (projects && projects.length > 0 && layoutsFolder) {
      // Set to keep track of used filenames to prevent overwriting/collisions
      const usedFilenames = new Set<string>();

      projects.forEach((project: any, index: number) => {
        // Sanitize the project name
        let baseName = project.name?.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || `project_${index}`;
        if (!baseName) {
          baseName = `project_${index}`;
        }

        // Handle collision avoidance by appending ID or counter
        let finalName = `${baseName}.json`;
        let counter = 1;
        while (usedFilenames.has(finalName)) {
          finalName = `${baseName}_${counter}.json`;
          counter++;
        }
        usedFilenames.add(finalName);

        // Serialize the layout payload (state_payload) nicely
        const payloadToSerialize = project.state_payload || {};
        const jsonString = JSON.stringify(payloadToSerialize, null, 2);

        // Add the formatted JSON file to the Layouts folder
        layoutsFolder.file(finalName, jsonString);
      });
    }

    // 2. Fetch image renders and download their binary blobs sequentially:
    if (onProgress) {
      onProgress("Fetching rendered images metadata...");
    }

    const { data: renders, error: rendersError } = await supabase
      .from('ai_renders')
      .select('id, prompt_used, image_url, snapshot_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (rendersError) {
      console.error("Failed to query historical renders for data export:", rendersError);
      throw new Error(`Renders query failed: ${rendersError.message}`);
    }

    if (renders && renders.length > 0 && rendersFolder) {
      const totalRenders = renders.length;

      for (let i = 0; i < totalRenders; i++) {
        const render = renders[i];
        
        // Notify progress with details
        if (onProgress) {
          onProgress(`Downloading image ${i + 1} of ${totalRenders}...`);
        }

        // Sanitize prompt for filename
        let baseName = render.prompt_used?.trim().substring(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || `render_${render.id}`;
        if (!baseName) {
          baseName = `render_${render.id}`;
        }

        // A. Process AI Render Image
        if (render.image_url) {
          try {
            let blob: Blob | null = null;
            const filePath = extractStoragePath(render.image_url);
            
            if (filePath) {
              const { data: storageBlob, error: downloadErr } = await supabase.storage
                .from('wildvision_renders')
                .download(filePath);
                
              if (!downloadErr && storageBlob) {
                blob = storageBlob;
              }
            }

            // Fallback to fetch if storage download failed or path couldn't be parsed
            if (!blob) {
              const response = await fetch(render.image_url);
              if (response.ok) {
                blob = await response.blob();
              }
            }

            if (blob) {
              const extension = blob.type === 'image/png' ? 'png' : 'jpg';
              rendersFolder.file(`${baseName}_ai_${render.id}.${extension}`, blob);
            }
          } catch (err) {
            console.error(`Failed to download AI render image ${render.image_url}:`, err);
          }
        }

        // B. Process Snapshot Blueprint Image
        if (render.snapshot_url) {
          try {
            let blob: Blob | null = null;
            const filePath = extractStoragePath(render.snapshot_url);
            
            if (filePath) {
              const { data: storageBlob, error: downloadErr } = await supabase.storage
                .from('wildvision_renders')
                .download(filePath);
                
              if (!downloadErr && storageBlob) {
                blob = storageBlob;
              }
            }

            // Fallback to fetch if storage download failed or path couldn't be parsed
            if (!blob) {
              const response = await fetch(render.snapshot_url);
              if (response.ok) {
                blob = await response.blob();
              }
            }

            if (blob) {
              const extension = blob.type === 'image/png' ? 'png' : 'jpg';
              rendersFolder.file(`${baseName}_blueprint_${render.id}.${extension}`, blob);
            }
          } catch (err) {
            console.error(`Failed to download snapshot blueprint image ${render.snapshot_url}:`, err);
          }
        }
      }
    }
    // ==========================================

    // Generate the ZIP file as a blob
    if (onProgress) {
      onProgress("Compiling and zipping files...");
    }

    const content = await zip.generateAsync({ type: "blob" });

    // Format YYYY-MM-DD date for filename
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Download the ZIP archive
    saveAs(content, `WildVision_Export_${formattedDate}.zip`);

    if (onProgress) {
      onProgress("Download complete!");
    }

  } catch (error) {
    console.error("Error generating user data archive:", error);
    throw error;
  }
}
