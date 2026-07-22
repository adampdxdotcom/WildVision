import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { LibraryModel } from '../../../types';
import { Plus, Upload, Loader2, Box, Trash2 } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, useGLTF } from '@react-three/drei';

const SnapshotHandler = ({ 
  setCaptureFn, 
  onCapture 
}: { 
  setCaptureFn: (fn: () => void) => void, 
  onCapture: (url: string) => void 
}) => {
  const { gl, scene, camera } = useThree();
  
  React.useEffect(() => {
    setCaptureFn(() => () => {
      const oldBg = scene.background;
      scene.background = null;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      scene.background = oldBg;
      onCapture(dataUrl);
    });
    return () => setCaptureFn(() => () => {});
  }, [gl, scene, camera, setCaptureFn, onCapture]);

  return null;
};

const ClayModelPreview = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const { camera, controls } = useThree();

  React.useEffect(() => {
    clonedScene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#f3f4f6',
          roughness: 0.9,
          metalness: 0.1,
        });
      }
    });

    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    clonedScene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) / 0.85;
      camera.position.set(0, 0, cameraZ);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    if (controls) {
      (controls as any).target.set(0, 0, 0);
      (controls as any).update();
    }
  }, [clonedScene, camera, controls]);

  return <primitive object={clonedScene} />;
};

class GLTFErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GLTF load error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-rose-500 bg-rose-50 dark:bg-rose-950/20">
          <Box className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-xs font-bold font-mono tracking-wide uppercase">Failed to load 3D GLB Model</p>
          <p className="text-[10px] mt-1 opacity-80 max-w-[200px]">Please verify the URL is direct and public.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ModelLibraryTabProps {
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const ModelLibraryTab: React.FC<ModelLibraryTabProps> = ({
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { user } = useAuthStore();
  const { libraryModels, addLibraryModel, setLibraryModels } = useAppStore();

  // Model uploader state
  const [modelName, setModelName] = useState('');
  const [modelSource, setModelSource] = useState<'upload' | 'url'>('url');
  const [modelUrl, setModelUrl] = useState('');
  const [modelWidth, setModelWidth] = useState(24);
  const [modelHeight, setModelHeight] = useState(24);
  const [modelDepth, setModelDepth] = useState(24);
  const [modelColor, setModelColor] = useState('#f3f4f6');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [svgSource, setSvgSource] = useState<'upload' | 'url'>('url');
  const [svgUrl, setSvgUrl] = useState('');
  const [uploadSvgFile, setUploadSvgFile] = useState<File | null>(null);
  const [svgUploadError, setSvgUploadError] = useState<string | null>(null);
  const [isDraggingSvg, setIsDraggingSvg] = useState(false);

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [captureFn, setCaptureFn] = useState<(() => void) | null>(null);
  const [isUploadingBlueprint, setIsUploadingBlueprint] = useState(false);

  const handleBlueprintCapture = async (dataUrl: string) => {
    try {
      setIsUploadingBlueprint(true);
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        setErrorMsg('User not authenticated');
        return;
      }
      
      let rawFilename = '';
      if (modelSource === 'upload' && uploadFile) {
        rawFilename = uploadFile.name;
      } else if (modelUrl) {
        const urlStr = modelUrl.trim();
        rawFilename = urlStr.substring(urlStr.lastIndexOf('/') + 1);
        const questionMarkIdx = rawFilename.indexOf('?');
        if (questionMarkIdx !== -1) {
          rawFilename = rawFilename.substring(0, questionMarkIdx);
        }
        const hashIdx = rawFilename.indexOf('#');
        if (hashIdx !== -1) {
          rawFilename = rawFilename.substring(0, hashIdx);
        }
      }

      if (!rawFilename) {
        rawFilename = 'unnamed_model';
      }

      // Strip .glb extension (case-insensitive)
      let baseName = rawFilename;
      if (baseName.toLowerCase().endsWith('.glb')) {
        baseName = baseName.substring(0, baseName.length - 4);
      }

      try {
        baseName = decodeURIComponent(baseName);
      } catch (e) {}

      // Clean the name of invalid characters but keep it matching the model
      baseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Upload PNG directly to user's clay_models folder
      const filePath = `${userId}/clay_models/${baseName}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('custom_surfaces')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw new Error(uploadError.message);
      
      await fetchDbLibraryModels();
      setSuccessMsg('Successfully captured and uploaded 2D blueprint!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to upload blueprint:', err);
      setErrorMsg(err.message || 'Failed to upload blueprint');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsUploadingBlueprint(false);
    }
  };

  const fetchDbLibraryModels = async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const { data: files, error } = await supabase.storage.from('custom_surfaces').list(`${userId}/clay_models`);
      if (error) {
        console.warn('Could not fetch clay_models from storage:', error.message);
        return;
      }
      if (files) {
        const glbFiles = files.filter(f => f.name.endsWith('.glb'));
        const storageModels = glbFiles.map((f) => {
          const baseName = f.name.replace('.glb', '');
          const hasPng = files.some(pngF => pngF.name === `${baseName}.png`);
          
          const { data: modelData } = supabase.storage.from('custom_surfaces').getPublicUrl(`${userId}/clay_models/${f.name}`);
          let finalSvgUrl = undefined;
          if (hasPng) {
             const { data: pngData } = supabase.storage.from('custom_surfaces').getPublicUrl(`${userId}/clay_models/${baseName}.png`);
             finalSvgUrl = pngData.publicUrl + '?t=' + Date.now();
          }

          return {
            id: baseName,
            name: baseName.replace(/_/g, ' '),
            modelUrl: modelData.publicUrl,
            svgUrl: finalSvgUrl,
            dimensions: [24, 24, 24] as [number, number, number],
            color: '#f3f4f6',
            isCustom: true,
          };
        });
        setLibraryModels(storageModels);
      }
    } catch (err) {
      console.warn('Exception fetching db library models:', err);
    }
  };

  const handleSelectModel = (model: LibraryModel) => {
    setSelectedModelId(model.id);
    setModelName(model.name);
    setModelSource('url');
    setModelUrl(model.modelUrl);
    setSvgSource('url');
    setSvgUrl(model.svgUrl || '');
    setModelWidth(model.dimensions?.[0] || 24);
    setModelHeight(model.dimensions?.[1] || 24);
    setModelDepth(model.dimensions?.[2] || 24);
    setModelColor(model.color || '#f3f4f6');
  };

  const clearSelection = () => {
    setSelectedModelId(null);
    setModelName('');
    setModelUrl('');
    setSvgUrl('');
    setUploadFile(null);
    setUploadSvgFile(null);
    setModelWidth(24);
    setModelHeight(24);
    setModelDepth(24);
    setModelColor('#f3f4f6');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.glb')) {
        setUploadFile(file);
        setUploadError(null);
        if (!modelName) {
          setModelName(file.name.replace('.glb', ''));
        }
      } else {
        setUploadError('Only .glb files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.glb')) {
        setUploadFile(file);
        setUploadError(null);
        if (!modelName) {
          setModelName(file.name.replace('.glb', ''));
        }
      } else {
        setUploadError('Only .glb files are supported.');
      }
    }
  };

  const handleSvgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSvg(true);
  };

  const handleSvgDragLeave = () => {
    setIsDraggingSvg(false);
  };

  const handleSvgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSvg(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.svg')) {
        setUploadSvgFile(file);
        setSvgUploadError(null);
      } else {
        setSvgUploadError('Only .svg files are supported.');
      }
    }
  };

  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.svg')) {
        setUploadSvgFile(file);
        setSvgUploadError(null);
      } else {
        setSvgUploadError('Only .svg files are supported.');
      }
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!modelName.trim()) {
      setUploadError('Please specify a model name.');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const trimmedName = modelName.trim();
      
      // Step 1: Check existing files in the bucket folder to prevent overwrite and determine next incremented index
      setUploadProgress(20);
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('custom_surfaces')
        .list(`${userId}/clay_models`);

      if (listError) {
        console.warn('Could not list existing files during anti-overwrite check:', listError.message);
      }

      const existingNames = existingFiles ? existingFiles.map(f => f.name.toLowerCase()) : [];
      const cleanName = trimmedName.replace(/[^a-zA-Z0-9._-]/g, '_');
      let finalBaseName = cleanName;
      let counter = 1;
      
      while (existingNames.includes(`${finalBaseName}.glb`.toLowerCase())) {
        finalBaseName = `${cleanName}_${counter}`;
        counter++;
      }

      const storagePath = `${userId}/clay_models/${finalBaseName}.glb`;
      let fileToUpload: Blob | File;

      if (modelSource === 'url') {
        if (!modelUrl.trim()) {
          throw new Error('Please specify a GLB URL.');
        }
        setUploadProgress(40);
        // Download the GLB from pasted URL as a Blob
        const response = await fetch(modelUrl.trim());
        if (!response.ok) {
          throw new Error(`Failed to download GLB file (HTTP ${response.status} ${response.statusText})`);
        }
        fileToUpload = await response.blob();
      } else {
        if (!uploadFile) {
          throw new Error('Please select or drag in a .glb file.');
        }
        fileToUpload = uploadFile;
      }

      setUploadProgress(70);
      const { error: uploadErr } = await supabase.storage
        .from('custom_surfaces')
        .upload(storagePath, fileToUpload, {
          contentType: 'model/gltf-binary',
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadErr) {
        throw new Error(`Upload error: ${uploadErr.message}`);
      }

      setUploadProgress(90);
      await fetchDbLibraryModels();

      // Retrieve the public URL for the newly uploaded GLB to select it
      const { data: modelData } = supabase.storage.from('custom_surfaces').getPublicUrl(`${userId}/clay_models/${finalBaseName}.glb`);

      // Update local viewing and selection states so that the viewport immediately displays the correct GLB file
      setSelectedModelId(finalBaseName);
      setModelName(finalBaseName.replace(/_/g, ' '));
      setModelSource('url');
      setModelUrl(modelData.publicUrl);
      setSvgSource('url');
      setSvgUrl('');
      setUploadFile(null);
      setUploadSvgFile(null);

      setUploadProgress(100);
      setSuccessMsg(`Successfully added "${finalBaseName.replace(/_/g, ' ')}" to the global 3D library!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to add model:', err);
      const errMsg = err.message || 'Failed to add model.';
      setUploadError(errMsg);
      setErrorMsg(errMsg);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      setIsUploading(true);
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const pathsToDelete = [`${userId}/clay_models/${modelId}.glb`, `${userId}/clay_models/${modelId}.png`];
      await supabase.storage.from('custom_surfaces').remove(pathsToDelete);
      
      if (modelId === selectedModelId) {
        clearSelection();
      }
      fetchDbLibraryModels();
    } catch (err: any) {
      console.error('Error deleting model:', err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchDbLibraryModels();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
          Global 3D Model Library (Clay)
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Upload .glb model files or add custom links. These models appear instantly in the Canvas sidebar's library grid for all users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form (span 5) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-rose-500" />
              {selectedModelId ? 'Edit Model' : 'Add New Model'}
            </h4>
            {selectedModelId && (
              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1.5 py-1 px-3 rounded-lg border text-[10px] font-bold font-mono uppercase transition bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            )}
          </div>

          <form onSubmit={handleAddModel} className="space-y-3.5">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                Model Name
              </label>
              <input
                type="text"
                required
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. Modern Vase"
                className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
              />
            </div>

            {/* Source Select */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                Model Source
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModelSource('url');
                    setUploadError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition ${
                    modelSource === 'url'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  GLB URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModelSource('upload');
                    setUploadError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition ${
                    modelSource === 'upload'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* URL Input */}
            {modelSource === 'url' ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Model GLB URL
                </label>
                <input
                  type="text"
                  required={modelSource === 'url'}
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  placeholder="Paste a stable, direct .glb link"
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                />
              </div>
            ) : (
              /* File Drag and Drop zone */
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Drag & Drop .glb file
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('admin-glb-file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/10'
                      : uploadFile
                      ? 'border-emerald-500 bg-emerald-50/5'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    id="admin-glb-file-input"
                    type="file"
                    accept=".glb"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <div className="space-y-1">
                      <Box className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {uploadFile.name}
                      </p>
                      <p className="text-[9px] text-slate-450">
                        Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                        Click or Drag .glb here
                      </p>
                      <p className="text-[9px] text-slate-450">
                        Max file size: 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SVG Source Select */}
            <div className="space-y-1 mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                2D SVG Blueprint (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSvgSource('url');
                    setSvgUploadError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition ${
                    svgSource === 'url'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  SVG URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSvgSource('upload');
                    setSvgUploadError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-bold font-mono uppercase transition ${
                    svgSource === 'upload'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* SVG URL Input */}
            {svgSource === 'url' ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={svgUrl}
                  onChange={(e) => setSvgUrl(e.target.value)}
                  placeholder="Paste a direct .svg link"
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition font-mono"
                />
              </div>
            ) : (
              /* File Drag and Drop zone */
              <div className="space-y-1">
                <div
                  onDragOver={handleSvgDragOver}
                  onDragLeave={handleSvgDragLeave}
                  onDrop={handleSvgDrop}
                  onClick={() => document.getElementById('admin-svg-file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                    isDraggingSvg
                      ? 'border-indigo-500 bg-indigo-50/10'
                      : uploadSvgFile
                      ? 'border-emerald-500 bg-emerald-50/5'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    id="admin-svg-file-input"
                    type="file"
                    accept=".svg"
                    onChange={handleSvgFileChange}
                    className="hidden"
                  />
                  {uploadSvgFile ? (
                    <div className="space-y-1">
                      <Box className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {uploadSvgFile.name}
                      </p>
                      <p className="text-[9px] text-slate-455">
                        Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                        Click or Drag .svg here
                      </p>
                      <p className="text-[9px] text-slate-455">
                        Max file size: 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Bounding envelope dimensions (W, H, D) in inches */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">
                Default Dimensions (inches)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-0.5">Width</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={modelWidth}
                    onChange={(e) => setModelWidth(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-0.5">Height</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={modelHeight}
                    onChange={(e) => setModelHeight(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-0.5">Depth</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={modelDepth}
                    onChange={(e) => setModelDepth(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Model Clay Color */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">
                Default Matte Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={modelColor}
                  onChange={(e) => setModelColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800 p-0 overflow-hidden"
                />
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{modelColor}</span>
              </div>
            </div>

            {/* Error and progress display */}
            {uploadError && (
              <p className="text-[10px] text-rose-500 font-bold leading-normal">{uploadError}</p>
            )}
            {isUploading && (
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono text-right">{uploadProgress}%</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {selectedModelId && (
                <button
                  type="button"
                  onClick={() => handleDeleteModel(selectedModelId)}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-rose-500 font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer transition font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete Model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isUploading}
                className="flex-[2] flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer transition font-mono uppercase tracking-wider"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{selectedModelId ? 'Save Changes' : 'Add to Global Library'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Existing Model List (span 7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono">
              Current Library Models ({libraryModels.length})
            </h4>
          </div>

          <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="max-h-[264px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono border-b border-slate-150 dark:border-slate-850">
                  <tr>
                    <th className="px-4 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Default Dimensions</th>
                    <th className="px-3 py-2.5">Color</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60">
                  {libraryModels.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => handleSelectModel(m)}
                      className={`cursor-pointer transition-colors ${
                        selectedModelId === m.id
                          ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-l-2 border-indigo-500'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-950/20 border-l-2 border-transparent'
                      } text-slate-700 dark:text-slate-300`}
                    >
                      <td className="px-4 py-3 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0 flex items-center justify-center text-slate-500">
                            {m.svgUrl ? (
                              <img src={m.svgUrl} alt={m.name} className="w-8 h-8 rounded-md border border-slate-200 object-contain bg-slate-50" />
                            ) : (
                              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Box className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate max-w-[150px]">{m.name}</p>
                            <p className="text-[9px] text-slate-455 truncate max-w-[150px]" title={m.modelUrl}>
                              {m.modelUrl.substring(0, 30)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[10.5px]">
                        {m.dimensions ? `${m.dimensions[0]}" × ${m.dimensions[1]}" × ${m.dimensions[2]}"` : 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 dark:border-slate-800"
                            style={{ backgroundColor: m.color }}
                          />
                          <span className="text-[10px] font-mono text-slate-400">{m.color}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {m.isCustom ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModel(m.id);
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Remove model from library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            System
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col h-[300px]">
            <div className="px-4 py-3 border-b border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/40">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  2D BLUEPRINT STAGING VIEWPORT
               </h4>
            </div>
            <div className="flex-1 relative bg-white dark:bg-slate-950 flex flex-col justify-center items-center">
               {!modelUrl ? (
                 <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg max-w-[80%] mx-auto my-auto">
                   <Box className="w-8 h-8 text-slate-400 mb-3" />
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                     Select a model
                   </p>
                   <p className="text-[10px] text-slate-400 mt-1">
                     Select a model from the list above or paste a GLB URL to begin blueprint staging
                   </p>
                 </div>
               ) : (
                 <GLTFErrorBoundary>
                   <Canvas gl={{ preserveDrawingBuffer: true }}>
                     <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                     <ambientLight intensity={0.5} />
                     <directionalLight position={[10, 10, 10]} intensity={1} />
                     <OrbitControls makeDefault enableZoom={false} enableRotate={true} enablePan={false} minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} />
                     <Suspense fallback={
                       <mesh>
                         <boxGeometry args={[1, 1, 1]} />
                         <meshStandardMaterial color="#e2e8f0" wireframe />
                       </mesh>
                     }>
                       <ClayModelPreview url={modelUrl} />
                     </Suspense>
                                          <SnapshotHandler 
                       setCaptureFn={setCaptureFn} 
                       onCapture={handleBlueprintCapture} 
                     />
                   </Canvas>
                 </GLTFErrorBoundary>
               )}
            </div>
            {modelUrl && (
              <div className="px-4 py-3 border-t border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => captureFn?.()}
                  disabled={!captureFn || isUploadingBlueprint}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm cursor-pointer transition font-mono uppercase tracking-wider"
                >
                  {isUploadingBlueprint ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading to Storage...
                    </>
                  ) : (
                    <>Capture 2D Blueprint</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

