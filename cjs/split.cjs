const fs = require('fs');

const file = fs.readFileSync('src/components/Sidebar/RoomSetupEditor.tsx', 'utf8');
const lines = file.split('\n');

const dimensions = lines.slice(117, 192).join('\n');
const imported = lines.slice(193, 585).join('\n');
const customBoxes = lines.slice(586, 1100).join('\n');
const clayModels = lines.slice(1100, 1530).join('\n');
const advanced = lines.slice(1531, 1607).join('\n');

fs.mkdirSync('src/components/Sidebar/RoomSetup', { recursive: true });

fs.writeFileSync('src/components/Sidebar/RoomSetup/RoomDimensionsPanel.tsx', 
`import React from 'react';
import { Palette } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const RoomDimensionsPanel: React.FC = () => {
  const { roomDimensions, setRoomDimensions, roomColors, setRoomColors } = useAppStore();

  return (
    <>
${dimensions}
    </>
  );
};
`);

fs.writeFileSync('src/components/Sidebar/RoomSetup/ImportedLayoutsPanel.tsx', 
`import React, { useState, useRef } from 'react';
import { Home, Box, Trash2, Plus, RotateCw, RefreshCw, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { supabase } from '../../../utils/supabaseClient';

export const ImportedLayoutsPanel: React.FC = () => {
  const { 
    roomDimensions, 
    sceneObjects,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId
  } = useAppStore();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const localSyncInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpdateLayoutPayload = (objectId: string, payload: any) => {
    const blueprint = {
      wallWidth: payload.wallWidth,
      wallHeight: payload.wallHeight,
      wallVertices: payload.wallVertices,
      subAreas: payload.subAreas,
      foldLines: payload.foldLines,
      unit: payload.unit,
      shape: payload.shape,
      tileWidth: payload.tileWidth,
      tileHeight: payload.tileHeight,
      pattern: payload.pattern,
      tileColors: payload.tileColors,
      groutColor: payload.groutColor,
      groutWidth: payload.groutWidth,
      tileFinish: payload.tileFinish,
    };

    updateSceneObject(objectId, {
      metadata: {
        ...sceneObjects[objectId]?.metadata,
        name: payload.projectName || sceneObjects[objectId]?.metadata?.name || 'Imported Layout',
        dimensions: [
          payload.wallWidth || 120,
          payload.wallHeight || 96,
          sceneObjects[objectId]?.metadata?.dimensions?.[2] || 4,
        ],
        blueprint,
      },
    });
  };

  const handleLocalSyncChange = (e: React.ChangeEvent<HTMLInputElement>, objectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string || '').trim();
        const data = JSON.parse(text);
        handleUpdateLayoutPayload(objectId, data);
        alert('Layout synced successfully from local JSON!');
      } catch (err) {
        alert('Failed to parse local JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCloudSync = async (objectId: string, sourceId: string) => {
    setSyncingId(objectId);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('state_payload')
        .eq('id', sourceId)
        .single();

      if (error) {
        alert(\`Failed to sync from cloud: \${error.message}\`);
      } else if (data && data.state_payload) {
        handleUpdateLayoutPayload(objectId, data.state_payload);
      } else {
        alert('Cloud project data not found.');
      }
    } catch (err: any) {
      alert(\`Error syncing from cloud: \${err?.message || String(err)}\`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <>
${imported}
    </>
  );
};
`);

fs.writeFileSync('src/components/Sidebar/RoomSetup/CustomBoxesPanel.tsx', 
`import React, { useState } from 'react';
import { Home, Box, Trash2, Plus, RotateCw, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { SurfaceSelector } from '../SurfaceSelector';

export const CustomBoxesPanel: React.FC = () => {
  const { 
    roomDimensions,
    sceneObjects,
    addSceneObject,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId
  } = useAppStore();

  const [activeBoxFaces, setActiveBoxFaces] = useState<Record<string, string[]>>({});

  return (
    <>
${customBoxes}
    </>
  );
};
`);

fs.writeFileSync('src/components/Sidebar/RoomSetup/ClayModelsPanel.tsx', 
`import React from 'react';
import { Box, Trash2, RotateCw, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const ClayModelsPanel: React.FC = () => {
  const { 
    roomDimensions,
    sceneObjects,
    addSceneObject,
    updateSceneObject,
    toggleObjectLock,
    removeSceneObject,
    activeObjectId,
    setActiveObjectId,
    libraryModels
  } = useAppStore();

  return (
    <>
${clayModels}
    </>
  );
};
`);

fs.writeFileSync('src/components/Sidebar/RoomSetup/AdvancedSurfacesPanel.tsx', 
`import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

export const AdvancedSurfacesPanel: React.FC = () => {
  const { roomColors, setRoomColors } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
${advanced}
    </>
  );
};
`);
