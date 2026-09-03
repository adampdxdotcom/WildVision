import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../utils/supabaseClient';
import { Pencil, Maximize2, Download, Sparkles, RefreshCw, ArrowLeft, Camera, Compass, Eye, Box, Trash2 } from 'lucide-react';
import { WildVisionLightbox } from './WildVisionLightbox';
import { WildVisionAnnotator } from './WildVisionAnnotator';
import { DeleteRenderModal } from './DeleteRenderModal';
import { base64ToBlob } from '../../utils/blobUtils';
import { downloadImageSecurely } from '../../utils/imageUtils';

interface GalleryCardSpecsProps {
  imageUrl: string;
}

const GalleryCardSpecs: React.FC<GalleryCardSpecsProps> = ({ imageUrl }) => {
  const [aspectRatio, setAspectRatio] = useState<string>('...');
  const [resTag, setResTag] = useState<string>('');

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(w, h);
      const aspectW = w / divisor;
      const aspectH = h / divisor;

      const ratio = w / h;
      let ratioStr = `${aspectW}:${aspectH}`;
      if (Math.abs(ratio - 16 / 9) < 0.05) ratioStr = '16:9';
      else if (Math.abs(ratio - 4 / 3) < 0.05) ratioStr = '4:3';
      else if (Math.abs(ratio - 1) < 0.05) ratioStr = '1:1';
      else if (Math.abs(ratio - 1.5) < 0.05) ratioStr = '3:2';
      else if (Math.abs(ratio - 2 / 3) < 0.05) ratioStr = '2:3';
      else if (Math.abs(ratio - 9 / 16) < 0.05) ratioStr = '9:16';
      else if (Math.abs(ratio - 3 / 4) < 0.05) ratioStr = '3:4';

      setAspectRatio(ratioStr);

      const maxDim = Math.max(w, h);
      if (maxDim >= 3840) {
        setResTag('4K');
      } else if (maxDim >= 2048) {
        setResTag('2K');
      } else {
        setResTag('1K');
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <span className="font-medium flex items-center gap-1.5">
      <span>Aspect Ratio: {aspectRatio}</span>
      {resTag && (
        <>
          <span className="text-slate-700">•</span>
          <span className="bg-indigo-950/80 border border-indigo-900/50 text-indigo-400 font-extrabold px-1 rounded text-[9px] tracking-wide">{resTag}</span>
        </>
      )}
    </span>
  );
};

export const WildVisionGallery: React.FC = () => {
  const { user, showToast } = useAuthStore();
  const {
    generatedRenders,
    setGeneratedRenders,
    deleteRender,
    setIsWildVisionOpen,
    captured3DImage,
    setActiveView,
    setViewMode,
    setActiveCameraPosition,
    setActiveCameraTarget,
    setSavedCameraFov,
    setActiveCameraTrigger,
    setWildVisionPrompt,
    currentProjectId,
    renderAspectRatio,
    renderResolution,
    projectName,
  } = useAppStore();
  const [activeLightboxData, setActiveLightboxData] = useState<{id: string; aiImage: string; sourceImage?: string; name?: string; notes?: string} | null>(null);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [deletingRenderItem, setDeletingRenderItem] = useState<any | null>(null);

  const handleOpenDeleteModal = (e: React.MouseEvent, renderItem: any) => {
    e.stopPropagation();
    setDeletingRenderItem(renderItem);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRenderItem) return;
    try {
      const isRoot = !deletingRenderItem.parent_id;
      const childCount = isRoot
        ? generatedRenders.filter((r) => r.parent_id === deletingRenderItem.id).length
        : 0;

      await deleteRender(deletingRenderItem.id);

      if (childCount > 0) {
        showToast(`Concept and ${childCount} variation(s) deleted.`, 'success');
      } else {
        showToast('AI render & 3D snapshot deleted.', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete render.', 'error');
    } finally {
      setDeletingRenderItem(null);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchHistoricalRenders = async () => {
      if (!user || !currentProjectId) return;
      setFetchingHistory(true);
      try {
        const { data, error } = await supabase
          .from('ai_renders')
          .select('*')
          .eq('project_id', currentProjectId)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (active && data) {
          const mapped = data.map((row: any) => {
            let camState = row.camera_state || {};
            if (typeof camState === 'string') {
              try {
                camState = JSON.parse(camState);
              } catch (e) {
                camState = {};
              }
            }
            return {
              id: row.id,
              imageUrl: row.image_url,
              sourceImage: row.snapshot_url,
              prompt: row.prompt_used,
              created_at: row.created_at,
              cameraPosition: camState.position || null,
              cameraTarget: camState.target || null,
              cameraFov: camState.fov || null,
              camera_state: camState,
              parent_id: row.parent_id || null,
              name: row.name,
              notes: row.notes
            };
          });

          // Preserve any in-progress or unsaved local renders (with temporary 'render-' IDs)
          setGeneratedRenders(prev => {
            const tempLocalRenders = prev.filter(
              item => item.id.startsWith('render-') && !data.some((row: any) => row.image_url === item.imageUrl)
            );
            return [...tempLocalRenders, ...mapped];
          });
        }
      } catch (err) {
        console.error('Failed to retrieve historical renders:', err);
      } finally {
        if (active) {
          setFetchingHistory(false);
        }
      }
    };

    fetchHistoricalRenders();
    return () => {
      active = false;
    };
  }, [user, currentProjectId, setGeneratedRenders]);

  const handleDownloadOriginal = async () => {
    const downloadImageSource = captured3DImage || (generatedRenders.length > 0 ? generatedRenders[0].sourceImage : null);
    if (!downloadImageSource) return;
    const projectPrefix = projectName ? projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'wildvision';
    await downloadImageSecurely(downloadImageSource, `${projectPrefix}-3d-source.png`);
  };

  const handleDownloadOriginalSnapshot = async (item: any) => {
    const snapshot = item.sourceImage || item.snapshot_url;
    if (!snapshot) {
      console.warn('No snapshot available to download for item:', item.id);
      return;
    }
    const projectPrefix = projectName ? projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'wildvision';
    await downloadImageSecurely(snapshot, `${projectPrefix}-3d-source-${item.id}.jpg`);
  };

  const handleEdit = (renderItem: any) => {
    console.log(`Edit clicked for render ID: ${renderItem.id}`, renderItem.imageUrl);
    setEditingImage(renderItem);
  };

  const handleViewFullScreen = (id: string, imageUrl: string, sourceImage?: string, name?: string, notes?: string) => {
    console.log(`View Full Screen clicked for render ID: ${id}`, imageUrl);
    setActiveLightboxData({ id, aiImage: imageUrl, sourceImage, name, notes });
  };

  const handleDownload = async (id: string, imageUrl: string) => {
    console.log(`Download clicked for render ID: ${id}`, imageUrl);
    const projectPrefix = projectName ? projectName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'wildvision';
    await downloadImageSecurely(imageUrl, `${projectPrefix}-render-${id}.jpg`);
  };

  const handleTeleport = (item: any) => {
    // 1. Extract the camera_state JSON from this specific historical render
    let camState = item.camera_state || {};
    if (typeof camState === 'string') {
      try {
        camState = JSON.parse(camState);
      } catch (e) {
        camState = {};
      }
    }
    const position = camState.position || item.cameraPosition;
    const target = camState.target || item.cameraTarget;
    const fov = camState.fov || item.cameraFov;

    if (position && target) {
      // 2. Update the global Zustand store's camera variables
      setActiveCameraPosition(position);
      setActiveCameraTarget(target);
      if (fov) {
        setSavedCameraFov(fov);
      }
      if (item.prompt !== undefined) {
        setWildVisionPrompt(item.prompt);
      }
      setActiveCameraTrigger((prev: number) => prev + 1);
      // Guarantee we shift view mode to 3D and back to active viewport canvas
      setViewMode('3d');
      // 3. Automatically close the Gallery and jump the user back to the 3D Viewport
      setActiveView('canvas');
    }
  };

  const handleClear = () => {
    setGeneratedRenders([]);
  };

  const handleInpaintSubmit = async (
    originalPrompt: string,
    editRequest: string,
    originalImageBase64: string,
    maskImageBase64: string
  ) => {
    const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

    // Strip prefix headers if present
    const cleanOriginalBase64 = originalImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanMaskBase64 = maskImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const refinedPrompt = `Original Prompt Context: ${originalPrompt}

I am providing two images. The first is the original architectural layout. The second is a strict black-and-white mask. 

Your task is to modify the original image ONLY within the white boundaries of the mask. Do not alter the perspective, lighting, or details of the black areas. 

Inside the masked boundary, make the following change: ${editRequest}`;

    // Invoke 'generate-ai-render' Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-ai-render', {
      body: {
        api_slug: useAppStore.getState().activeAiModel?.api_slug,
        apiKey: geminiKey,
        gemini_api_key: geminiKey,
        renderAspectRatio,
        renderResolution,
        contents: [
          {
            role: "user",
            parts: [
              { text: refinedPrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanOriginalBase64
                }
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanMaskBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          candidateCount: 1
        }
      },
      headers: (() => {
        const sessionToken = useAuthStore.getState().session?.access_token;
        const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';
        const activeToken = sessionToken || anonKey;

        const reqHeaders: Record<string, string> = {
          'Authorization': `Bearer ${activeToken}`
        };

        if (geminiKey) {
          reqHeaders['x-gemini-api-key'] = geminiKey;
          reqHeaders['gemini-api-key'] = geminiKey;
          reqHeaders['x-api-key'] = geminiKey;
          reqHeaders['Authorization-Gemini'] = `Bearer ${geminiKey}`;
        }

        return reqHeaders;
      })()
    });

    if (error) {
      let errorMsgDetail = error.message || String(error);
      if (error && 'context' in error && (error as any).context && typeof (error as any).context.text === 'function') {
        try {
          const responseText = await (error as any).context.text();
          errorMsgDetail += ` - Details: ${responseText}`;
        } catch (err) {
          console.error('Failed to read error context text', err);
        }
      }
      throw new Error(`Edge Function error: ${errorMsgDetail}`);
    }

    console.log('Inpainting API Response:', data);

    const base64Bytes = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Bytes) {
      throw new Error('AI response did not contain an image in the expected path (candidates[0].content.parts[0].inlineData.data).');
    }

    const promptTokens = data?.usageMetadata?.promptTokenCount || 0;
    const outputCount = data?.candidates?.length || 1;

    // Track active parent_id lineage (flat 1-level deep hierarchy)
    const activeParentId = editingImage ? (editingImage.parent_id || editingImage.id) : null;

    const tempId = `render-${Date.now()}-0`;
    const formattedRenders = [
      {
        id: tempId,
        imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
        sourceImage: editingImage ? (editingImage.sourceImage || editingImage.imageUrl) : undefined,
        cameraPosition: editingImage?.cameraPosition || undefined,
        cameraTarget: editingImage?.cameraTarget || undefined,
        cameraFov: editingImage?.cameraFov || undefined,
        prompt: refinedPrompt,
        camera_state: editingImage?.camera_state || {},
        prompt_tokens: promptTokens,
        output_images: outputCount,
        parent_id: activeParentId
      }
    ];

    // Add to generatedRenders local list immediately
    setGeneratedRenders(prev => [formattedRenders[0], ...prev]);

    // Close the Annotator modal and reset its state upon successful generation
    setEditingImage(null);

    // Upload Pipeline for Cloud projects if user is authenticated
    if (user && currentProjectId) {
      try {
        // Convert the AI image base64 into Blob.
        const aiBlob = base64ToBlob(base64Bytes);

        // Upload to Storage: Upload only the final AI Blob to the `wildvision_renders` Supabase storage bucket.
        const timestamp = Date.now();
        const aiPath = `${user.id}/${timestamp}_ai.jpg`;

        const { error: aiUploadErr } = await supabase.storage
          .from('wildvision_renders')
          .upload(aiPath, aiBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (aiUploadErr) {
          throw new Error(`Failed to upload AI render: ${aiUploadErr.message}`);
        }

        // Get URL: Use createSignedUrl
        const { data: aiUrlData, error: aiSignErr } = await supabase.storage
          .from('wildvision_renders')
          .createSignedUrl(aiPath, 31536000);

        if (aiSignErr || !aiUrlData?.signedUrl) {
          throw new Error(`Failed to sign AI render URL: ${aiSignErr?.message || 'empty response'}`);
        }

        // Use the existing original image's URL as snapshot_url to prevent duplicate storage uploads
        const existingSnapshotUrl = editingImage ? (editingImage.sourceImage || editingImage.imageUrl) : '';

        // Database Insert: Execute an INSERT into the ai_renders table and get the inserted row
        const currentCreditCost = useAppStore.getState().getRenderCreditCost();
        const activeAiModel = useAppStore.getState().activeAiModel;
        const calculatedUsdCost = activeAiModel ? activeAiModel.cost_input_usd + (renderResolution === '4K' ? activeAiModel.cost_4k_out_usd : activeAiModel.cost_1k_out_usd) : 0;
        const { data: dbData, error: dbInsertErr } = await supabase
          .from('ai_renders')
          .insert({
            project_id: currentProjectId,
            user_id: user.id,
            prompt_used: refinedPrompt,
            image_url: aiUrlData.signedUrl,
            snapshot_url: existingSnapshotUrl,
            camera_state: editingImage?.camera_state || {},
            prompt_tokens: promptTokens,
            output_images: outputCount,
            parent_id: activeParentId,
            credit_cost: currentCreditCost,
            usd_cost: calculatedUsdCost
          })
          .select('*')
          .single();

        if (dbInsertErr) {
          throw new Error(`Failed to insert into ai_renders db table: ${dbInsertErr.message}`);
        }

        // Update the temporary render item in the store list with official DB values
        if (dbData) {
          setGeneratedRenders(prev =>
            prev.map(item =>
              item.id === tempId
                ? {
                    id: dbData.id,
                    imageUrl: dbData.image_url,
                    sourceImage: dbData.snapshot_url,
                    prompt: dbData.prompt_used,
                    cameraPosition: item.cameraPosition,
                    cameraTarget: item.cameraTarget,
                    cameraFov: item.cameraFov,
                    camera_state: dbData.camera_state,
                    created_at: dbData.created_at,
                    parent_id: dbData.parent_id,
                    name: dbData.name,
                    notes: dbData.notes,
                  }
                : item
            )
          );
          // Sync user's monthly credit count instantly
          await useAppStore.getState().fetchMonthlyRenderCount(user.id);
        }
      } catch (dbErr) {
        console.error('Error in durable storage upload pipeline:', dbErr);
        // We still have the local version shown in UI, but we log the storage error
      }
    }
  };

  const familyRoot = activeFamilyId ? generatedRenders.find(r => r.id === activeFamilyId) : null;
  const familyVariations = activeFamilyId ? generatedRenders.filter(r => r.parent_id === activeFamilyId) : [];

  const renderGalleryCard = (render: any, index: number, isRootCard: boolean) => {
    // Find variations for this card if it's a root card
    const rootVariations = isRootCard ? generatedRenders.filter((r: any) => r.parent_id === render.id) : [];

    return (
      <div 
        key={render.id}
        className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl hover:border-slate-700 transition-all duration-300 animate-in fade-in-50 zoom-in-95"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Aspect-Ratio Container wrapping the Image/Preset and the absolute Bottom Control Bar overlay */}
        <div className="relative aspect-4/3 w-full overflow-hidden">
          {render.imageUrl ? (
            <div className="w-full h-full relative overflow-hidden bg-slate-900">
              <img 
                src={render.imageUrl} 
                alt={`AI Generated Variation ${index + 1}`} 
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay with instructions & identifier */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-xs border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider z-10 max-w-[85%] truncate" title={render.name || undefined}>
                {render.name?.trim() ? render.name.toUpperCase() : `${render.parent_id ? 'Variation' : 'Concept'} ${index + 1}`}
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950/40 flex flex-col items-center justify-center p-6 text-center select-none">
              <Camera className="w-10 h-10 text-indigo-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-200">Saved View Preset</p>
              <div className="mt-2 text-[11px] text-slate-400 line-clamp-3 italic max-w-[90%] leading-relaxed">
                "{render.prompt || 'No descriptive prompt saved'}"
              </div>
              
              {/* Overlay with instructions & identifier */}
              <div className="absolute top-3 left-3 bg-indigo-950 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-wider z-10 max-w-[85%] truncate" title={render.name || undefined}>
                {render.name?.trim() ? render.name.toUpperCase() : `Preset ${index + 1}`}
              </div>
            </div>
          )}

          {/* Bottom control bar overlay with action buttons */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-black/60 backdrop-blur-md p-2 sm:p-2.5 flex items-center justify-center transition-all duration-300 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 z-20">
            <div className="flex flex-row justify-center items-center gap-1.5 sm:gap-2 w-full max-w-[95%]">
              {render.imageUrl ? (
                <>
                  {/* View Button */}
                  <button
                    type="button"
                    title="View Render Full Screen"
                    onClick={() => handleViewFullScreen(render.id, render.imageUrl, render.sourceImage, render.name, render.notes)}
                    className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 rounded-lg border border-white/10 hover:border-white shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">View</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    title="AI Paint & Edit"
                    onClick={() => handleEdit(render)}
                    className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 rounded-lg border border-white/10 hover:border-white shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:block">Edit</span>
                  </button>

                  {/* 3D View Button */}
                  {(render.cameraPosition || render.camera_state?.position) && (
                    <button
                      type="button"
                      title="Restore 3D View"
                      onClick={() => handleTeleport(render)}
                      className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 rounded-lg border border-white/10 hover:border-white shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span className="hidden sm:block">3D View</span>
                    </button>
                  )}

                  {/* Save AI Button */}
                  <button
                    type="button"
                    title="Download High-Res Render"
                    onClick={() => handleDownload(render.id, render.imageUrl)}
                    className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 rounded-lg border border-white/10 hover:border-white shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">Save AI</span>
                  </button>

                  {/* Save 3D Button */}
                  {render.sourceImage && (
                    <button
                      type="button"
                      title="Download Original 3D Snapshot"
                      onClick={() => handleDownloadOriginalSnapshot(render)}
                      className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 rounded-lg border border-white/10 hover:border-white shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span className="hidden sm:block">Save 3D</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    title="Delete AI Render & 3D Snapshot"
                    onClick={(e) => handleOpenDeleteModal(e, render)}
                    className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-white/10 hover:bg-red-600/90 text-slate-100 hover:text-white border border-white/10 hover:border-red-500/50 rounded-lg shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center group"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
                    <span className="hidden sm:block truncate">Delete</span>
                  </button>

                  {/* View Variants button inside hover state (if it is a root card and has variants) */}
                  {isRootCard && rootVariations.length > 0 && (
                    <button
                      type="button"
                      title={`View ${rootVariations.length} Variants`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFamilyId(render.id);
                      }}
                      className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500/20 hover:border-emerald-400 shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:block">Variants</span>
                    </button>
                  )}
                </>
              ) : (
                /* Preset without imageUrl */
                <>
                  {(render.cameraPosition || render.camera_state?.position) && (
                    <button
                      type="button"
                      title="Restore 3D View"
                      onClick={() => handleTeleport(render)}
                      className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg border border-indigo-500/20 hover:border-indigo-400 shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                    >
                      <Compass className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:block">Restore</span>
                    </button>
                  )}

                  {isRootCard && rootVariations.length > 0 && (
                    <button
                      type="button"
                      title={`View ${rootVariations.length} Variants`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFamilyId(render.id);
                      }}
                      className="aspect-square w-full max-w-[56px] sm:max-w-[70px] p-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500/20 hover:border-emerald-400 shadow-xs transition-all duration-150 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer text-center"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:block">Variants</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail strip section (visible at all times at the bottom of Root card, not just hover) */}
        {isRootCard && rootVariations.length > 0 && (
          <div className="px-3.5 py-2.5 border-t border-slate-800/80 flex items-center gap-1.5 bg-slate-900/30 overflow-x-auto scrollbar-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Variants:</span>
            <div className="flex items-center gap-1.5">
              {rootVariations.slice(0, 4).map((variant, idx) => (
                <img
                  key={variant.id}
                  src={variant.imageUrl}
                  alt={`Variant thumbnail ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFamilyId(render.id);
                  }}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-800 hover:border-indigo-500 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
                />
              ))}
              {rootVariations.length > 4 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFamilyId(render.id);
                  }}
                  className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/20 px-2 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center select-none"
                >
                  +{rootVariations.length - 4}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Fine specs under card body */}
        <div className="p-3.5 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950">
          {render.imageUrl ? (
            <GalleryCardSpecs imageUrl={render.imageUrl} />
          ) : (
            <span className="font-medium">Camera Angle Preset</span>
          )}
          <span className="font-mono text-[10px] text-slate-550">ID: {render.id.split('-').slice(1, 3).join('-')}</span>
        </div>
      </div>
    );
  };

  // Viewport Swap: If editingImage state is set, render the Annotator instead
  if (editingImage) {
    return (
      <WildVisionAnnotator 
        imageUrl={editingImage.imageUrl} 
        originalPrompt={editingImage.prompt || 'No original prompt saved.'}
        onBack={() => setEditingImage(null)} 
        onSubmit={handleInpaintSubmit}
        onCreateNewView={() => setEditingImage(null)}
        editingImage={editingImage}
      />
    );
  }

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col h-full overflow-y-auto animate-fade-in animate-duration-300">
      {/* Top Gallery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/20 p-2 text-rose-400 rounded-lg border border-rose-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Wild Vision Variations <span className="text-xs font-semibold bg-rose-500/20 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full">{generatedRenders.length}</span>
              {fetchingHistory && <RefreshCw className="w-4 h-4 text-indigo-450 animate-spin ml-1" />}
            </h2>
          </div>
        </div>
      </div>

      {/* Grid of Thumbnails */}
      {generatedRenders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/20 max-w-lg mx-auto w-full my-12 animate-fade-in select-none">
          <Sparkles className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">No photorealistic variations yet</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
            Use the <strong className="text-indigo-400">Wild Vision</strong> sidebar in your active project to transform your 3D workspace camera angle into beautifully rendered interior concepts!
          </p>
          <button
            type="button"
            onClick={() => setActiveView('canvas')}
            className="mt-6 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md cursor-pointer select-none"
          >
            Go to 3D Space & Generate
          </button>
        </div>
      ) : activeFamilyId ? (
        <div className="flex flex-col flex-1 gap-6">
          {/* Sub-gallery Header */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveFamilyId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Concepts</span>
              </button>
              <div className="h-4 w-px bg-slate-800" />
              <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                Viewing Concept Stack for <span className="font-mono text-indigo-400 font-bold">#{activeFamilyId.split('-').slice(1, 3).join('-')}</span>
                <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[10px]">
                  {familyVariations.length + 1} total versions
                </span>
              </div>
            </div>
          </div>

          {/* Sub-gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 items-start">
            {/* Render the Root item exactly */}
            {familyRoot && renderGalleryCard(familyRoot, 0, false)}

            {/* Render all its specific variations */}
            {familyVariations.map((render, idx) => (
              renderGalleryCard(render, idx + 1, false)
            ))}
          </div>
        </div>
      ) : (
        /* Main Gallery view displaying ONLY Roots */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 items-start">
          {generatedRenders
            .filter(r => !r.parent_id) // Root-only display filter
            .map((render, index) => (
              renderGalleryCard(render, index, true)
            ))}
        </div>
      )}

      {/* Conditional Lightbox Portal rendering */}
      {activeLightboxData && (
        <WildVisionLightbox 
          id={activeLightboxData.id}
          aiImage={activeLightboxData.aiImage} 
          sourceImage={activeLightboxData.sourceImage}
          name={activeLightboxData.name}
          notes={activeLightboxData.notes}
          onClose={() => setActiveLightboxData(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteRenderModal
        isOpen={!!deletingRenderItem}
        renderItem={deletingRenderItem}
        onClose={() => setDeletingRenderItem(null)}
        onConfirm={handleConfirmDelete}
      />


    </div>
  );
};
