import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../utils/supabaseClient';
import { base64ToBlob } from '../../utils/blobUtils';
import { logger } from '../../utils/logger';
import { Sparkles, ArrowLeft, Check, Lock, X } from 'lucide-react';
import prompts from './prompts.json';

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const WildVisionSidebar: React.FC = () => {
  const { user, openAuthModal, role } = useAuthStore();
  const {
    isWildVisionOpen,
    setIsWildVisionOpen,
    backgroundImage,
    generatedRenders,
    setGeneratedRenders,
    capture3DTrigger,
    setCapture3DTrigger,
    captured3DImage,
    setCaptured3DImage,
    wildVisionPrompt,
    setWildVisionPrompt,
    overlayFocalLength,
    savedCameraFov,
    capturedCameraPosition,
    capturedCameraTarget,
    capturedCameraFov,
    currentProjectId,
    setActiveView,
    activeView,
    setViewMode,
    setIsUpgradeModalOpen,
    styleReferenceImage,
    setStyleReferenceImage,
    renderAspectRatio,
    setRenderAspectRatio,
    renderResolution,
    setRenderResolution,
    setActiveObjectId,
    monthlyCreditsUsed,
    fetchMonthlyRenderCount,
    getRenderCreditCost,
  } = useAppStore();

  const creditLimit = React.useMemo(() => {
    if (role === 'admin' || role === 'beta' || role === 'Beta Partner') return 1000;
    if (role === 'paid' || role === 'premium') return 200;
    return 25; // free/guest default
  }, [role]);

  const creditsRemaining = React.useMemo(() => {
    if (!user) return 0;
    if (role === 'admin' || role === 'beta') return Infinity;
    return Math.max(0, creditLimit - monthlyCreditsUsed);
  }, [user, role, creditLimit, monthlyCreditsUsed]);

  const currentCreditCost = getRenderCreditCost();
  const hasInsufficientCredits = user && role !== 'free' && creditsRemaining !== Infinity && creditsRemaining < currentCreditCost;

  const hasFiredRef = React.useRef<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [sendReferencePhoto, setSendReferencePhoto] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMonthlyRenderCount(user.id);
    }
  }, [user?.id, fetchMonthlyRenderCount]);

  useEffect(() => {
    if (isWildVisionOpen) {
      setActiveObjectId(null);
    }
  }, [isWildVisionOpen, setActiveObjectId]);

  if (!isWildVisionOpen) return null;

  const handleBackToEditing = () => {
    setIsWildVisionOpen(false);
    setGeneratedRenders([]);
    setCaptured3DImage(null);
    setStatusText('');
    hasFiredRef.current = false;
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    if (!user) {
      openAuthModal("Log in to unlock Photorealistic AI Rendering.");
      return;
    }
    if (role === 'free') {
      setIsUpgradeModalOpen(true);
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    setStatusText('Capturing scene...');
    setCaptured3DImage(null);
    hasFiredRef.current = false;
    
    // Increment the trigger to signal the 3D canvas renderer to snap a view frame
    setCapture3DTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (isGenerating && captured3DImage && !hasFiredRef.current) {
      hasFiredRef.current = true;
      setStatusText('Generating AI Render...');

      // Crucial base64 split helper: strip data URI prefixes (e.g. "data:image/jpeg;base64,")
      const stripHeader = (base64: string | null) => {
        if (!base64 || typeof base64 !== 'string') return null;
        const index = base64.indexOf(',');
        if (base64.startsWith('data:image') && index !== -1) {
          return base64.substring(index + 1);
        }
        return base64; // Return as-is if it's already stripped or a raw URL
      };

      let active = true;

      const callApi = async () => {
        if (role === 'free') {
          setIsGenerating(false);
          setStatusText('');
          return;
        }
        try {
          logger.info('AI Generation requested');
          const currentSavedCameraFov = useAppStore.getState().savedCameraFov;
          const currentOverlayFocalLength = useAppStore.getState().overlayFocalLength;
          const currentWildVisionPrompt = useAppStore.getState().wildVisionPrompt || '';
          const currentBackgroundImage = useAppStore.getState().backgroundImage;
          const currentCaptured3DImage = useAppStore.getState().captured3DImage;

          const equivalentMm = Math.round(24 / Math.tan((currentSavedCameraFov * Math.PI) / 360));
          const lensConstraint = `Photographic constraint: Render this scene as if photographed with a ${currentOverlayFocalLength || equivalentMm}mm architectural lens, maintaining accurate perspective distortion.`;

          const aspectInstruction = `\n\nCRITICAL OVERRIDE: Generate this image strictly as a ${renderAspectRatio} aspect ratio photograph. Do not deviate from these proportions.`;

          const combinedPrompt = (currentWildVisionPrompt.trim() 
            ? `${lensConstraint} ${currentWildVisionPrompt.trim()}`
            : lensConstraint) + aspectInstruction;

          const includeRefImage = sendReferencePhoto && !!currentBackgroundImage;

          const baseImageStripped = stripHeader(currentCaptured3DImage);
          const referenceImageStripped = includeRefImage ? stripHeader(currentBackgroundImage) : null;

          if (!baseImageStripped) {
            throw new Error('No captured tile layout image available.');
          }

          setStatusText('Generating AI Render...');

          // Preprocess the style reference image if it's an external URL
          let finalStyleRefStripped: string | null = null;
          const currentStyleReferenceImage = useAppStore.getState().styleReferenceImage;
          if (currentStyleReferenceImage) {
            if (currentStyleReferenceImage.startsWith('http://') || currentStyleReferenceImage.startsWith('https://')) {
              setStatusText('Downloading style reference...');
              try {
                const downloadedBase64 = await fetchImageAsBase64(currentStyleReferenceImage);
                finalStyleRefStripped = stripHeader(downloadedBase64);
              } catch (err: any) {
                console.error('Failed to pre-process style reference image URL:', err);
                throw new Error(`Failed to download style reference image: ${err.message || err}`);
              }
            } else if (currentStyleReferenceImage.startsWith('data:image')) {
              finalStyleRefStripped = stripHeader(currentStyleReferenceImage);
            } else {
              finalStyleRefStripped = stripHeader(currentStyleReferenceImage);
            }
          }

          setStatusText('Generating AI Render...');

          const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

          const { data, error } = await supabase.functions.invoke('generate-ai-render', {
            body: {
              api_slug: useAppStore.getState().activeAiModel?.api_slug,
              apiKey: geminiKey,
              gemini_api_key: geminiKey,
              renderAspectRatio,
              renderResolution,
              contents: [
                {
                  parts: (currentStyleReferenceImage && finalStyleRefStripped) ? [
                    { text: "IMAGE 1 (STYLE MOOD BOARD): Observe the lighting, materials, colors, and overall photorealistic interior design style of this image. Do NOT copy its layout or camera angle." },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: finalStyleRefStripped
                      }
                    },
                    { text: "IMAGE 2 (STRICT 3D BLUEPRINT): This image dictates the EXACT structural geometry, camera angle, and perspective. You must lock your spatial geometry perfectly to this layout." },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: baseImageStripped
                      }
                    },
                    { text: `FINAL INSTRUCTION: Render the exact spatial geometry of IMAGE 2, applying the visual style of IMAGE 1. 

CRITICAL FORMATTING: The output MUST be in a strict ${renderAspectRatio} aspect ratio. Do not deviate from these proportions.

USER REQUEST: ${combinedPrompt}` }
                  ] : [
                    { text: combinedPrompt },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: baseImageStripped
                      }
                    }
                  ]
                }
              ],
              generationConfig: {
                responseModalalities: ["IMAGE"],
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

          if (!active) return;
          console.log('Proxy API Response:', data);

          const base64Bytes = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Bytes) {
            throw new Error('AI response did not contain an image in the expected path (candidates[0].content.parts[0].inlineData.data).');
          }

          const promptTokens = data?.usageMetadata?.promptTokenCount || 0;
          const outputTokens = data?.usageMetadata?.candidatesTokenCount || 0;
          const outputCount = data?.candidates?.length || 1;

          const tempId = `render-${Date.now()}-0`;
          const currentCapturedCameraPosition = useAppStore.getState().capturedCameraPosition;
          const currentCapturedCameraTarget = useAppStore.getState().capturedCameraTarget;
          const currentCapturedCameraFov = useAppStore.getState().capturedCameraFov;
          const formattedRenders = [
            {
              id: tempId,
              imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
              sourceImage: currentCaptured3DImage || undefined,
              cameraPosition: currentCapturedCameraPosition ? [...currentCapturedCameraPosition] : undefined,
              cameraTarget: currentCapturedCameraTarget ? [...currentCapturedCameraTarget] : undefined,
              cameraFov: currentCapturedCameraFov || undefined,
              prompt: currentWildVisionPrompt || undefined,
              camera_state: {
                position: currentCapturedCameraPosition ? [...currentCapturedCameraPosition] : null,
                target: currentCapturedCameraTarget ? [...currentCapturedCameraTarget] : null,
                fov: currentCapturedCameraFov || null
              },
              prompt_tokens: promptTokens,
              output_tokens: outputTokens,
              output_images: outputCount,
              model_used: 'gemini-3.1-flash-image',
              parent_id: null
            }
          ];

          setGeneratedRenders(prev => [...formattedRenders, ...prev]);

          const currentUser = useAuthStore.getState().user;
          const currentProjectIdVal = useAppStore.getState().currentProjectId;

          // Upload Pipeline for Cloud projects if user is authenticated
          if (currentUser && currentProjectIdVal) {
            try {
              if (!currentCaptured3DImage) {
                throw new Error('No captured 3D blueprint snapshot base64 image available.');
              }

              // 1. Convert: Convert both the 3D snapshot base64 and the AI image base64 into Blobs.
              const snapshotBlob = base64ToBlob(currentCaptured3DImage);
              const aiBlob = base64ToBlob(base64Bytes);

              // 2. Upload to Storage: Upload both Blobs to the `wildvision_renders` Supabase storage bucket.
              // *CRITICAL RLS REQUIREMENT:* paths start with user's ID: ${user.id}/${Date.now()}_snapshot.jpg
              const timestamp = Date.now();
              const snapshotPath = `${currentUser.id}/${timestamp}_snapshot.jpg`;
              const aiPath = `${currentUser.id}/${timestamp}_ai.jpg`;

              const { error: snapshotUploadErr } = await supabase.storage
                .from('wildvision_renders')
                .upload(snapshotPath, snapshotBlob, {
                  contentType: 'image/jpeg',
                  cacheControl: '3600',
                  upsert: false
                });

              if (snapshotUploadErr) {
                throw new Error(`Failed to upload 3D blueprint snapshot: ${snapshotUploadErr.message}`);
              }

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

              // 3. Get URLs: Use createSignedUrl
              const { data: snapshotUrlData, error: snapshotSignErr } = await supabase.storage
                .from('wildvision_renders')
                .createSignedUrl(snapshotPath, 31536000);

              if (snapshotSignErr || !snapshotUrlData?.signedUrl) {
                throw new Error(`Failed to sign snapshot URL: ${snapshotSignErr?.message || 'empty response'}`);
              }

              const { data: aiUrlData, error: aiSignErr } = await supabase.storage
                .from('wildvision_renders')
                .createSignedUrl(aiPath, 31536000);

              if (aiSignErr || !aiUrlData?.signedUrl) {
                throw new Error(`Failed to sign AI render URL: ${aiSignErr?.message || 'empty response'}`);
              }

              // 4. Fetch the Active Model from Store
              const activeAiModel = useAppStore.getState().activeAiModel;
              const activeModelUsed = activeAiModel?.api_slug || 'gemini-3.1-flash-image';
              const calculatedUsdCost = activeAiModel ? activeAiModel.cost_input_usd + (renderResolution === '4K' ? activeAiModel.cost_4k_out_usd : activeAiModel.cost_1k_out_usd) : 0;

              // 5. Database Insert: Execute an INSERT into the ai_renders table and get the inserted row
              const { data: dbData, error: dbInsertErr } = await supabase
                .from('ai_renders')
                .insert({
                  project_id: currentProjectIdVal,
                  user_id: currentUser.id,
                  prompt_used: currentWildVisionPrompt || 'Default AI Render',
                  image_url: aiUrlData.signedUrl,
                  snapshot_url: snapshotUrlData.signedUrl,
                  camera_state: {
                    position: currentCapturedCameraPosition ? [...currentCapturedCameraPosition] : null,
                    target: currentCapturedCameraTarget ? [...currentCapturedCameraTarget] : null,
                    fov: currentCapturedCameraFov || null
                  },
                  prompt_tokens: promptTokens,
                  output_tokens: outputTokens,
                  output_images: outputCount,
                  model_used: activeModelUsed,
                  parent_id: null,
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
                          prompt_tokens: dbData.prompt_tokens,
                          output_tokens: dbData.output_tokens,
                          output_images: dbData.output_images,
                          model_used: dbData.model_used,
                          parent_id: null,
                          name: dbData.name,
                          notes: dbData.notes
                        }
                      : item
                  )
                );
                // Sync the monthly credits/usage state instantly
                await fetchMonthlyRenderCount(currentUser.id);
              }

              console.log('AI Render uploaded & saved successfully with IDs:', currentProjectIdVal, currentUser.id);
            } catch (storageErr: any) {
              console.error('Unified WildVision upload / database save failed:', storageErr);
            }
          }

          if (active) {
            setIsGenerating(false);
            setStatusText('');
            setActiveView('gallery');
          }
        } catch (error: any) {
          logger.error('AI Generation failed', { error: error.message || String(error) });
          console.error('REST API Wild Vision error:', error);
          if (active) {
            setErrorMsg(`Failed to generate renders: ${error.message || error}`);
          }
        } finally {
          if (active) {
            setIsGenerating(false);
            setStatusText('');
            setStyleReferenceImage(null);
          }
        }
      };

      callApi();

      return () => {
        active = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isGenerating,
    captured3DImage,
    sendReferencePhoto,
    setCaptured3DImage,
    setGeneratedRenders,
    setStyleReferenceImage
  ]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 animate-fade-in text-slate-700 animate-duration-150 flex flex-col h-full overflow-y-auto">
      {/* Header section with back button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-150 border-dashed">
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleBackToEditing}
          className={`flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition text-xs font-bold ${
            isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Editing</span>
        </button>
        <span className="text-[10px] uppercase font-extrabold text-rose-605 bg-rose-50 px-2.5 py-0.5 rounded tracking-wider">
          Wild Vision Mode
        </span>
      </div>

      {/* Title block */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 p-1.5 text-rose-500 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Wild Vision Render
            </h3>
          </div>
          {user ? (
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-150 text-[10px] font-extrabold shadow-2xs">
              <span>Available Credits:</span>
              <span className="font-mono">{creditsRemaining === Infinity ? '∞' : creditsRemaining}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 text-[10px] font-extrabold">
              <span>Sign in for Credits</span>
            </div>
          )}
        </div>
      </div>

      {/* Description banner requiring literal message constraint */}
      <div className="space-y-3 mr-0.5">
        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
          <p className="text-[11px] text-amber-900 font-medium leading-relaxed font-sans">
            Please choose the 3D view you want to show the AI. This will be the same view in your render.
          </p>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
          <button
            type="button"
            onClick={() => setIsTipsOpen(!isTipsOpen)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 font-sans cursor-pointer focus:outline-hidden"
          >
            <span>Tips for Best Results</span>
            <span className="text-sm text-slate-500 font-bold leading-none">{isTipsOpen ? '−' : '+'}</span>
          </button>
          {isTipsOpen && (
            <div className="text-[10.5px] text-slate-600 font-medium leading-relaxed font-sans space-y-1.5 mt-2 pt-2 border-t border-slate-200/65 animate-fade-in">
              <p>*Say what the scene is. &quot;This is a kitchen backsplash with upper and lower cabinets&quot;</p>
              <p>*Describe plumbing fixtures and accoutrements. &quot;Add oiled bronze fixtures, and a glass wall with door to the shower&quot;</p>
              <p>*Describe room elements and lighting. &quot;Add a floor to ceiling window with morning light to the right of the fireplace surround.&quot;</p>
              <p>*If your room needs to be bigger, use the Walls controls in the 3D view to push them out from the center of the model.</p>
              <p>*Colors set in the Walls controls will be sent to the AI.</p>
              <p>*If you are not getting your desired results, simplify your prompt.</p>
              <p>*Results might not match expectations.</p>
            </div>
          )}
        </div>
      </div>

      {role === 'free' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-905 rounded-xl flex gap-2.5 items-start">
          <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] font-medium leading-relaxed font-sans">
            <strong className="block text-slate-900 font-bold mb-0.5">Premium Feature</strong>
            Photorealistic AI Rendering is a Premium feature. Upgrade to the Paid plan to synthesize high-fidelity real-world previews of your tile design.
          </div>
        </div>
      )}

      {/* Form elements */}
      <form onSubmit={handleGenerate} className="space-y-4 flex-1">

        {/* Style Reference Block */}
        {styleReferenceImage && (
          <div id="style-reference-indicator" className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-lg flex items-center justify-between gap-3 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0 w-10 h-10 rounded border border-indigo-200 overflow-hidden bg-slate-200">
                <img 
                  src={styleReferenceImage} 
                  alt="Style Reference" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-indigo-900 leading-tight">Style Reference Attached</span>
                <span className="block text-[10px] text-indigo-700/80 leading-tight font-medium mt-0.5">
                  The next render will adapt this design.
                </span>
              </div>
            </div>
            <button
              type="button"
              id="remove-style-reference-btn"
              onClick={() => setStyleReferenceImage(null)}
              className="p-1 hover:bg-indigo-100/80 text-indigo-500 hover:text-indigo-700 rounded transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Remove style reference"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Render Aspect Ratio Selection */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            AI Render Aspect Ratio
          </label>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            {(['1:1', '4:3', '16:9', '9:16'] as const).map((ratio) => {
              const labelMap: Record<string, string> = {
                '1:1': 'Square',
                '4:3': 'Standard',
                '16:9': 'Widescreen',
                '9:16': 'Portrait'
              };
              const isSelected = renderAspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setRenderAspectRatio(ratio)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-white text-rose-600 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                  }`}
                >
                  <span className="font-mono text-xs">{ratio}</span>
                  <span className="text-[9px] opacity-75 mt-0.5 font-normal leading-none">{labelMap[ratio]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Render Resolution Selection */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            AI Target Resolution
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            {(['1K', '2K', '4K'] as const).map((res) => {
              const labelMap: Record<string, string> = {
                '1K': 'Standard Web',
                '2K': 'High Def',
                '4K': 'Ultra HD'
              };
              const isSelected = renderResolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setRenderResolution(res)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-white text-rose-600 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                  }`}
                >
                  <span className="font-mono text-xs">{res}</span>
                  <span className="text-[9px] opacity-75 mt-0.5 font-normal leading-none">{labelMap[res]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Context area */}
        <div>
          <label htmlFor="additional-context" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            id="additional-context"
            rows={3}
            disabled={isGenerating}
            placeholder="e.g. morning sunlight, spa vibes, dark tiles, warm wood shelving"
            value={wildVisionPrompt}
            onChange={(e) => setWildVisionPrompt(e.target.value)}
            className={`w-full text-xs font-medium text-slate-800 p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden transition placeholder:text-slate-400 ${
              isGenerating ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Reference Photo Toggle - Conditionally rendered depending on backgroundImage presence */}
        {backgroundImage && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className="relative shrink-0 w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-250">
                  <img 
                    src={backgroundImage} 
                    alt="Current background reference photo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/5" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-850">Reference Photo</span>
                  <span className="text-[10px] text-slate-500 font-medium">Include with AI submission</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isGenerating}
                  checked={sendReferencePhoto}
                  onChange={(e) => setSendReferencePhoto(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
          </div>
        )}

        {/* Error message UI */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-medium animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* Submit triggers */}
        <div className="pt-4 border-t border-slate-150">
          <button
            type={activeView === 'gallery' ? 'button' : 'submit'}
            disabled={(activeView !== 'gallery' && isGenerating) || (activeView !== 'gallery' && hasInsufficientCredits)}
            onClick={activeView === 'gallery' ? () => {
              setViewMode('3d');
              setActiveView('canvas');
            } : undefined}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${
              activeView === 'gallery'
                ? 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
                : isGenerating
                  ? 'opacity-80 cursor-not-allowed from-amber-600 to-rose-600'
                  : hasInsufficientCredits
                    ? 'opacity-65 cursor-not-allowed from-slate-400 to-slate-500'
                    : 'from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 hover:shadow-lg cursor-pointer'
            } text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md transition select-none tracking-wide h-[44px]`}
          >
            {activeView === 'gallery' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Return to 3D View to Adjust Angle</span>
              </>
            ) : isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{statusText || 'Generating...'}</span>
              </>
            ) : role === 'free' ? (
              <>
                <Lock className="w-4 h-4 text-amber-200" />
                <span>Upgrade to Pro to Render</span>
              </>
            ) : hasInsufficientCredits ? (
              <>
                <Lock className="w-4 h-4 opacity-75" />
                <span>Not Enough Credits • Needs {currentCreditCost}</span>
              </>
            ) : (
              <>
                {user ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Generate Render • {currentCreditCost} {currentCreditCost === 1 ? 'Credit' : 'Credits'}</span>
              </>
            )}
          </button>
          
          {hasInsufficientCredits && (
            <div className="mt-2 text-center text-[10px] text-rose-500 font-medium font-sans">
              You do not have enough credits remaining to generate a {renderResolution} quality render. Lower your resolution or upgrade your plan.
            </div>
          )}
        </div>

      </form>
    </div>
  );
};
