import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Pencil, Eraser, RotateCcw, Send, Check, Camera, Save, FileText, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Point {
  x: number; // Normalized coordinate (0 to 1)
  y: number; // Normalized coordinate (0 to 1)
}

interface Stroke {
  tool: 'pen' | 'eraser';
  points: Point[];
}

interface WildVisionAnnotatorProps {
  imageUrl: string;
  originalPrompt: string;
  onBack: () => void;
  onSubmit?: (originalPrompt: string, editRequest: string, originalImageBase64: string, maskImageBase64: string) => Promise<void>;
  onCreateNewView?: () => void;
  editingImage?: any;
}

type ToolType = 'pen' | 'eraser';

export const WildVisionAnnotator: React.FC<WildVisionAnnotatorProps> = ({ imageUrl, originalPrompt, onBack, onSubmit, onCreateNewView, editingImage }) => {
  const { 
    setStyleReferenceImage, 
    setActiveView, 
    setViewMode,
    setActiveCameraPosition,
    setActiveCameraTarget,
    setSavedCameraFov,
    setActiveCameraTrigger,
    updateRenderDetails
  } = useAppStore();
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [editRequest, setEditRequest] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Concept name and notes state management
  const [conceptName, setConceptName] = useState<string>('');
  const [conceptNotes, setConceptNotes] = useState<string>('');
  const [isSavingDetails, setIsSavingDetails] = useState<boolean>(false);
  const [detailsSavedIndicator, setDetailsSavedIndicator] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (editingImage) {
      setConceptName(editingImage.name || '');
      setConceptNotes(editingImage.notes || '');
    }
  }, [editingImage]);

  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingImage?.id) return;
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      await updateRenderDetails(editingImage.id, {
        name: conceptName.trim() || null,
        notes: conceptNotes.trim() || null,
      });
      setDetailsSavedIndicator(true);
      setTimeout(() => setDetailsSavedIndicator(false), 2000);
    } catch (err: any) {
      console.error("Failed to save render details:", err);
      setDetailsError(err?.message || "Failed to save details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Use a ref to always have the latest strokes available in resize observers/load callbacks
  const strokesRef = useRef<Stroke[]>([]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Completely clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentStrokes = strokesRef.current;

    // Redraw each stroke
    currentStrokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      // Select proper globalCompositeOperation
      if (stroke.tool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
        ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 20;

      // Draw the first point as a solid circle
      const firstPt = stroke.points[0];
      const startX = firstPt.x * canvas.width;
      const startY = firstPt.y * canvas.height;

      ctx.beginPath();
      ctx.arc(startX, startY, 10, 0, Math.PI * 2);
      ctx.fill();

      // Begin drawing the path lines
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        const currentX = pt.x * canvas.width;
        const currentY = pt.y * canvas.height;
        ctx.lineTo(currentX, currentY);
      }
      ctx.stroke();
    });

    // Reapply current tools settings to context
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 20;
    if (activeTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
      ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    }
  };

  const updateCanvasSize = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const w = img.clientWidth;
    const h = img.clientHeight;

    if (w > 0 && h > 0) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redrawCanvas();
      }
    }
  };

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(img);
    img.addEventListener('load', updateCanvasSize);

    // Call initially in case image is already loaded
    updateCanvasSize();

    return () => {
      resizeObserver.disconnect();
      img.removeEventListener('load', updateCanvasSize);
    };
  }, []);

  // Sync canvas redraw if strokes or activeTool changes
  useEffect(() => {
    redrawCanvas();
  }, [strokes, activeTool]);

  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    console.log(`Active drawing tool changed to: ${tool}`);
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    console.log('Undo clicked: Reverted last drawn stroke.');
  };

  const handleClearCanvas = () => {
    setStrokes([]);
    console.log('Clear Canvas clicked: Cleared all history strokes.');
  };

  const getCoordinates = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x,
      y,
      normX: rect.width > 0 ? x / rect.width : 0,
      normY: rect.height > 0 ? y / rect.height : 0
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    lastPointerRef.current = { x: coords.x, y: coords.y };

    const newStroke: Stroke = {
      tool: activeTool,
      points: [{ x: coords.normX, y: coords.normY }]
    };
    setCurrentStroke(newStroke);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 20;

        if (activeTool === 'pen') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
          ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
        } else {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0,0,0,1)';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        }

        ctx.arc(coords.x, coords.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointerRef.current || !currentStroke) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retrieve coalesced events if supported by the browser
    const rawEvent = e as any;
    const coalescedEvents = (typeof rawEvent.getCoalescedEvents === 'function')
      ? rawEvent.getCoalescedEvents()
      : ((rawEvent.nativeEvent && typeof rawEvent.nativeEvent.getCoalescedEvents === 'function')
          ? rawEvent.nativeEvent.getCoalescedEvents()
          : []);

    const processPoint = (ptEvent: { clientX: number; clientY: number }) => {
      if (!lastPointerRef.current) return;
      const coords = getCoordinates(ptEvent);
      if (!coords) return;

      // Record the normalized coordinates
      currentStroke.points.push({ x: coords.normX, y: coords.normY });

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 20;

      if (activeTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }

      ctx.moveTo(lastPointerRef.current.x, lastPointerRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastPointerRef.current = { x: coords.x, y: coords.y };
    };

    if (coalescedEvents && coalescedEvents.length > 0) {
      for (let i = 0; i < coalescedEvents.length; i++) {
        processPoint(coalescedEvents[i]);
      }
    } else {
      processPoint(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDrawing(false);
      lastPointerRef.current = null;
      if (currentStroke && currentStroke.points.length > 0) {
        setStrokes((prev) => [...prev, currentStroke]);
      }
      setCurrentStroke(null);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Left standard pointer capture handle release on pointerUp
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) {
      const commaIndex = url.indexOf(',');
      return commaIndex !== -1 ? url.substring(commaIndex + 1) : url;
    }
    
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        resolve(commaIndex !== -1 ? result.substring(commaIndex + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generateMaskBase64 = (): string => {
    const img = imageRef.current;
    if (!img) return '';

    const nativeWidth = img.naturalWidth || img.clientWidth || 1024;
    const nativeHeight = img.naturalHeight || img.clientHeight || 1024;
    const displayWidth = img.clientWidth || 1;
    const scale = nativeWidth / displayWidth;

    const canvas = document.createElement('canvas');
    canvas.width = nativeWidth;
    canvas.height = nativeHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Step 1: Fill the entire off-screen canvas with solid black (#000000)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, nativeWidth, nativeHeight);

    // Step 2: Loop through the Stroke history array and redraw the paths
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.globalCompositeOperation = 'source-over';
      if (stroke.tool === 'pen') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 20 * scale;

      // Draw the first point as a solid circle
      const firstPt = stroke.points[0];
      const startX = firstPt.x * nativeWidth;
      const startY = firstPt.y * nativeHeight;

      ctx.beginPath();
      ctx.arc(startX, startY, 10 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Begin drawing the path lines
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        const currentX = pt.x * nativeWidth;
        const currentY = pt.y * nativeHeight;
        ctx.lineTo(currentX, currentY);
      }
      ctx.stroke();
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const commaIndex = dataUrl.indexOf(',');
    return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editRequest.trim()) {
      setErrorMessage("Please describe your edit request.");
      return;
    }

    if (strokes.length === 0) {
      setErrorMessage("Please draw a mask on the image first.");
      return;
    }

    setIsSubmitting(true);
    console.log('Sending annotations payload with modifications back to Wild Vision pipeline...');

    try {
      // 1. Generate mask base64
      const maskBase64 = generateMaskBase64();
      
      // 2. Fetch original image base64
      const originalBase64 = await fetchImageAsBase64(imageUrl);

      // 3. Submit to parent with individual parameters
      if (onSubmit) {
        await onSubmit(originalPrompt, editRequest, originalBase64, maskBase64);
      } else {
        // Fallback mock if prop is missing
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Cleanup Annotator state (clear canvas history and text input)
      setStrokes([]);
      setEditRequest('');

      setShowSuccessToast(true);
      console.log('Annotation submit complete - successfully refined!');
      setTimeout(() => {
        setShowSuccessToast(false);
        onBack();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting inpaint refinement:', err);
      setErrorMessage(err?.message || 'Failed to submit refinement changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewView = () => {
    setStyleReferenceImage(imageUrl);
    if (editingImage) {
      let camState = editingImage.camera_state || {};
      if (typeof camState === 'string') {
        try {
          camState = JSON.parse(camState);
        } catch (e) {
          camState = {};
        }
      }
      const position = camState.position || editingImage.cameraPosition;
      const target = camState.target || editingImage.cameraTarget;
      const fov = camState.fov || editingImage.cameraFov;

      if (position && target) {
        setActiveCameraPosition(position);
        setActiveCameraTarget(target);
        if (fov) {
          setSavedCameraFov(fov);
        }
        setActiveCameraTrigger((prev: number) => prev + 1);
      }
    }
    if (onCreateNewView) {
      onCreateNewView();
    }
    setActiveView('canvas');
    setViewMode('3d');
  };

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-7 flex flex-col h-full overflow-hidden animate-fade-in animate-duration-200">
      {/* Annotator Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition text-xs font-bold bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/80 cursor-pointer select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Gallery</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNewView}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-white hover:text-indigo-100 transition text-xs font-bold bg-indigo-650 hover:bg-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-500 cursor-pointer select-none"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Create New View</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-amber-450 bg-amber-500/10 border border-amber-500/35 px-2.5 py-0.5 rounded tracking-wider font-mono">
            Inpainting Mask Mode
          </span>
        </div>
      </div>

      {/* Main Studio Arena */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 items-stretch relative">
        
        {/* Left Side: Interactive Custom Canvas Space with centered image */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center p-4">
          
          {/* Annotation Drawing Layer */}
          <div className="relative inline-block max-w-full max-h-[50vh] select-none">
            {/* The Image underlay */}
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Visual anchor to edit" 
              className="max-w-full max-h-[50vh] h-auto w-auto rounded-md block pointer-events-none"
              referrerPolicy="no-referrer"
            />
            
            {/* Absolutely positioned canvas matching the image size exactly */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              className="absolute inset-0 w-full h-full touch-none cursor-crosshair rounded-md"
            />

            {/* Float indicator */}
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 capitalize pointer-events-none">
              Cursor action: {activeTool} tool active
            </div>
          </div>
        </div>

        {/* Right Side: Control Center */}
        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4 overflow-y-auto max-h-full pr-1">
          
          {/* Concept Details Panel (Metadata Name/Notes) */}
          <div className="bg-slate-950/45 border border-slate-800 rounded-xl p-4 space-y-3.5 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Concept Details</span>
              </h4>
              {detailsSavedIndicator && (
                <span className="text-[10px] text-emerald-400 font-bold font-mono animate-fade-in">
                  Saved!
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>Name</span>
                </label>
                <input
                  type="text"
                  value={conceptName}
                  onChange={(e) => {
                    setConceptName(e.target.value);
                    setDetailsSavedIndicator(false);
                  }}
                  onBlur={() => handleSaveDetails()}
                  placeholder="e.g. Minimalist Bedroom"
                  maxLength={100}
                  className="w-full bg-slate-950 text-slate-200 text-xs border border-slate-850 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/85 focus:ring-1 focus:ring-amber-500/35 transition font-sans"
                />
              </div>

              {/* Notes field */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>Notes / Specifications</span>
                </label>
                <textarea
                  value={conceptNotes}
                  onChange={(e) => {
                    setConceptNotes(e.target.value);
                    setDetailsSavedIndicator(false);
                  }}
                  onBlur={() => handleSaveDetails()}
                  placeholder="Add design specs, materials, etc..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-slate-950 text-slate-200 text-xs border border-slate-850 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/85 focus:ring-1 focus:ring-amber-500/35 transition leading-relaxed resize-none font-sans"
                />
              </div>

              {detailsError && (
                <div className="text-[10px] text-rose-400 font-medium bg-rose-950/20 px-2 py-1 rounded">
                  {detailsError}
                </div>
              )}

              {/* Manual Save Button */}
              <button
                type="button"
                onClick={() => handleSaveDetails()}
                disabled={isSavingDetails}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-extrabold tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDetails ? 'Saving...' : 'Save Details'}</span>
              </button>
            </div>
          </div>

          {/* Floating and select-active Toolbar Panel */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Drawing Tools
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToolSelect('pen')}
                className={`py-2 px-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  activeTool === 'pen'
                    ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Pencil className="w-4 h-4" />
                <span className="text-[9px] font-bold font-mono">Pen</span>
              </button>

              <button
                type="button"
                onClick={() => handleToolSelect('eraser')}
                className={`py-2 px-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Eraser className="w-4 h-4" />
                <span className="text-[9px] font-bold font-mono">Eraser</span>
              </button>
            </div>

            {/* Utility action: Undo & Clear */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Last Draw</span>
              </button>
              
              <button
                type="button"
                onClick={handleClearCanvas}
                disabled={strokes.length === 0}
                className="w-full py-1.5 bg-slate-950/45 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-300 disabled:opacity-30 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Clear Canvas</span>
              </button>
            </div>
          </div>

          {/* Prompt refinement and submission panel */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between flex-1 gap-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Refine Instruction
                </h4>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-sans">
                  Highlight changes on the image above, then detail the edit request in the sidebar inputs below.
                </p>
              </div>

              {/* Read-only Original Prompt Display */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">
                  Original Prompt
                </label>
                <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-lg text-[10.5px] text-slate-400 font-medium leading-relaxed select-all max-h-[80px] overflow-y-auto">
                  {originalPrompt}
                </div>
              </div>

              {/* Edit Request input area */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">
                  Edit Request
                </label>
                <textarea
                  value={editRequest}
                  onChange={(e) => setEditRequest(e.target.value)}
                  placeholder="Describe what you want to change in the highlighted area..."
                  rows={4}
                  className="w-full bg-slate-950 text-slate-200 text-[11.5px] border border-slate-850 rounded-lg px-2.5 py-2 outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition leading-relaxed resize-none font-sans"
                />
              </div>

              {/* Display Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/40 text-rose-300 rounded-lg text-[10.5px] font-medium leading-relaxed">
                  {errorMessage}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-slate-800 cursor-not-allowed text-slate-500 border border-slate-700' 
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white hover:shadow-lg cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Elegant Toast Success banner */}
      {showSuccessToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 bg-emerald-600 text-white rounded-xl py-3 px-5 shadow-xl flex items-center gap-2 border border-emerald-500 z-50 animate-bounce">
          <Check className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold">Refinement Complete - Image Updated!</span>
        </div>
      )}
    </div>
  );
};
