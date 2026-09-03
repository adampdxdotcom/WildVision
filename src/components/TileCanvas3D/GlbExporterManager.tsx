import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadProjectGlbModel } from '../../utils/glbUploader';

interface GlbExporterManagerProps {
  dioramaRef: React.RefObject<THREE.Group | null>;
}

export const GlbExporterManager: React.FC<GlbExporterManagerProps> = ({ dioramaRef }) => {
  // Extract active 3D scene from R3F useThree hook strictly at top level
  const { scene } = useThree();
  const setExport3DSceneToGlbFn = useAppStore((state) => state.setExport3DSceneToGlbFn);

  // Stable callback for manually downloading GLB file from UI controls
  useEffect(() => {
    const exportSceneToGlb = (): Promise<Blob | null> => {
      return new Promise((resolve, reject) => {
        const targetObject = dioramaRef.current;

        if (!targetObject) {
          console.warn('[GLB EXPORT] Diorama group is not available. Aborting export to prevent blank canvases.');
          resolve(null);
          return;
        }

        if (targetObject.name !== 'master-diorama') {
          console.warn(`[GLB EXPORT] Target object name is "${targetObject.name}", not "master-diorama". Aborting export to prevent staging/empty canvas export.`);
          resolve(null);
          return;
        }

        if (!targetObject.children || targetObject.children.length === 0) {
          console.warn('[GLB EXPORT] Diorama group is empty (no children). Aborting export.');
          resolve(null);
          return;
        }

        try {
          const exporter = new GLTFExporter();
          exporter.parse(
            targetObject,
            (gltf) => {
              try {
                if (gltf instanceof ArrayBuffer) {
                  const blob = new Blob([gltf], { type: 'application/octet-stream' });
                  resolve(blob);
                } else {
                  console.error('GLTFExporter did not return an ArrayBuffer. Ensure binary: true is specified.');
                  resolve(null);
                }
              } catch (err) {
                console.error('Error post-processing GLTFExporter output:', err);
                reject(err);
              }
            },
            (error) => {
              console.error('Error parsing 3D scene with GLTFExporter:', error);
              reject(error);
            },
            {
              binary: true,
              animations: [],
              includeCustomExtensions: false,
            }
          );
        } catch (err) {
          console.error('Failed to instantiate or parse with GLTFExporter:', err);
          reject(err);
        }
      });
    };

    setExport3DSceneToGlbFn(exportSceneToGlb);

    return () => {
      setExport3DSceneToGlbFn(null);
    };
  }, [dioramaRef, setExport3DSceneToGlbFn]);

  // Listener for the wildvision:exportGlb CustomEvent triggered on project saves
  useEffect(() => {
    const handleExportEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId: string }>;
      const { projectId } = customEvent.detail || {};
      
      if (!projectId) {
        console.warn('[GLB EXPORT] Event received but projectId is missing.');
        return;
      }

      console.log("[GLB EXPORT] Event received! Starting GLTFExporter...");

      try {
        const user = useAuthStore.getState().user;
        if (!user) {
          throw new Error("No authenticated user found for 3D GLB export.");
        }

        const targetObject = dioramaRef.current;
        if (!targetObject) {
          console.warn("[GLB EXPORT] dioramaRef is not available in R3F tree. Aborting export to prevent blank canvases.");
          return;
        }

        if (targetObject.name !== 'master-diorama') {
          console.warn(`[GLB EXPORT] Target object name is "${targetObject.name}", not "master-diorama". Aborting export to prevent staging/empty canvas export.`);
          return;
        }

        if (!targetObject.children || targetObject.children.length === 0) {
          console.warn("[GLB EXPORT] Diorama group has no children. Aborting export to prevent blank canvases.");
          return;
        }

        const exporter = new GLTFExporter();
        
        // Execute the async parsing of active Three.js geometry/materials
        exporter.parse(
          targetObject,
          async (gltf) => {
            try {
              if (!(gltf instanceof ArrayBuffer)) {
                throw new Error("GLTFExporter parsing did not produce a binary ArrayBuffer.");
              }

              console.log("[GLB EXPORT] Parse complete! Uploading to Supabase Storage...");
              const blob = new Blob([gltf], { type: 'application/octet-stream' });

              // Upload binary asset to custom_surfaces bucket on Supabase Storage
              const glbUrl = await uploadProjectGlbModel(user.id, projectId, blob);
              
              if (!glbUrl) {
                throw new Error("Supabase Storage upload succeeded but returned an empty public URL.");
              }

              console.log("[GLB EXPORT] Upload success! URL: " + glbUrl);
            } catch (innerError: any) {
              console.error("[GLB EXPORT] Failed:", innerError);
            }
          },
          (parseError) => {
            console.error("[GLB EXPORT] Failed:", parseError);
          },
          {
            binary: true,
            animations: [],
            includeCustomExtensions: false,
          }
        );
      } catch (err: any) {
        console.error("[GLB EXPORT] Failed:", err);
      }
    };

    window.addEventListener('wildvision:exportGlb', handleExportEvent);

    return () => {
      window.removeEventListener('wildvision:exportGlb', handleExportEvent);
    };
  }, [dioramaRef]);

  return null;
};
