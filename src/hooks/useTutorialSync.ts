import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TileShape, RectanglePattern } from '../types';
import { tutorialSteps } from '../components/Tutorial/tutorialSteps';
import extension1Design from '../components/Tutorial/designs/extension1.json';
import walltile1Design from '../components/Tutorial/designs/walltile1.json';

export function useTutorialSync(handleResetWorkspace: () => void) {
  const {
    tutorialStepIndex,
    setActiveSidebarTab,
    setProjectName,
    setWallWidth,
    setWallHeight,
    setUnit,
    setShape,
    setTileWidth,
    setTileHeight,
    setPattern,
    setGroutWidth,
    setTileColors,
    setWallExtensions,
    setActiveWallExtensionId,
    setActiveTool,
  } = useAppStore();

  useEffect(() => {
    if (tutorialStepIndex !== -1 && tutorialStepIndex < tutorialSteps.length) {
      const step = tutorialSteps[tutorialStepIndex];
      if (step.id === 'wall-setup') {
        setActiveSidebarTab(1);
      } else if (step.id === 'wall-extension') {
        setActiveSidebarTab(1);
        // Load pre-configured layout instantly
        try {
          const data = extension1Design;
          const clampSafe = (val: any, backup: number) => {
            const num = Number(val);
            return isNaN(num) ? backup : Math.min(2000, Math.max(0.1, num));
          };

          if (data.projectName !== undefined) setProjectName(data.projectName);
          if (data.wallWidth !== undefined) setWallWidth(clampSafe(data.wallWidth, 120));
          if (data.wallHeight !== undefined) setWallHeight(clampSafe(data.wallHeight, 96));
          if (data.unit !== undefined) setUnit(data.unit === 'cm' ? 'cm' : 'in');

          const VALID_SHAPES: TileShape[] = ['rectangle', 'hexagon', 'round', 'diamond', 'chevron', 'octagon_dot', 'octagon', 'triangle', 'scallop'];
          let resolvedShape: TileShape = 'rectangle';
          if (data.shape !== undefined) {
            resolvedShape = VALID_SHAPES.includes(data.shape as any) ? (data.shape as TileShape) : 'rectangle';
          }
          setShape(resolvedShape);

          if (data.tileWidth !== undefined) setTileWidth(clampSafe(data.tileWidth, 12));
          if (data.tileHeight !== undefined) setTileHeight(clampSafe(data.tileHeight, 12));

          const VALID_PATTERNS: RectanglePattern[] = ['stack', 'running_50', 'third_33', 'herringbone', 'basket_weave', 'versailles', 'plank'];
          let resolvedPattern: RectanglePattern = 'running_50';
          if (data.pattern !== undefined) {
            resolvedPattern = VALID_PATTERNS.includes(data.pattern as any) ? (data.pattern as RectanglePattern) : 'running_50';
          }
          setPattern(resolvedPattern);

          if (data.groutWidth !== undefined) {
            const val = Number(data.groutWidth);
            setGroutWidth(isNaN(val) ? 0.125 : Math.min(10, Math.max(0, val)));
          }
          if (data.tileColors !== undefined) {
            setTileColors(data.tileColors as string[]);
          }
          if (data.wallExtensions !== undefined) {
            setWallExtensions(JSON.parse(JSON.stringify(data.wallExtensions)));
          }
          if (data.activeWallExtensionId !== undefined) {
            setActiveWallExtensionId(data.activeWallExtensionId);
          }
        } catch (err) {
          console.error("Failed to auto-load tutorial design:", err);
        }
      } else if (step.id === 'tool-bar') {
        // Reset the main canvas for step 5
        handleResetWorkspace();
        // Activate selection tool
        setActiveTool('select');
      } else if (step.id === 'tool-bar-interaction') {
        // Keep current workspace and allow free canvas/tools interaction
      } else if (step.id === 'wall-tile-setup') {
        setActiveSidebarTab(6);
        // Load pre-configured layout instantly
        try {
          const data = walltile1Design;
          const clampSafe = (val: any, backup: number) => {
            const num = Number(val);
            return isNaN(num) ? backup : Math.min(2000, Math.max(0.1, num));
          };

          if (data.projectName !== undefined) setProjectName(data.projectName);
          if (data.wallWidth !== undefined) setWallWidth(clampSafe(data.wallWidth, 120));
          if (data.wallHeight !== undefined) setWallHeight(clampSafe(data.wallHeight, 96));
          if (data.unit !== undefined) setUnit(data.unit === 'cm' ? 'cm' : 'in');

          const VALID_SHAPES: TileShape[] = ['rectangle', 'hexagon', 'round', 'diamond', 'chevron', 'octagon_dot', 'octagon', 'triangle', 'scallop'];
          let resolvedShape: TileShape = 'rectangle';
          if (data.shape !== undefined) {
            resolvedShape = VALID_SHAPES.includes(data.shape as any) ? (data.shape as TileShape) : 'rectangle';
          }
          setShape(resolvedShape);

          if (data.tileWidth !== undefined) setTileWidth(clampSafe(data.tileWidth, 12));
          if (data.tileHeight !== undefined) setTileHeight(clampSafe(data.tileHeight, 12));

          const VALID_PATTERNS: RectanglePattern[] = ['stack', 'running_50', 'third_33', 'herringbone', 'basket_weave', 'versailles', 'plank'];
          let resolvedPattern: RectanglePattern = 'running_50';
          if (data.pattern !== undefined) {
            resolvedPattern = VALID_PATTERNS.includes(data.pattern as any) ? (data.pattern as RectanglePattern) : 'running_50';
          }
          setPattern(resolvedPattern);

          if (data.groutWidth !== undefined) {
            const val = Number(data.groutWidth);
            setGroutWidth(isNaN(val) ? 0.125 : Math.min(10, Math.max(0, val)));
          }
          if (data.tileColors !== undefined) {
            setTileColors(data.tileColors as string[]);
          }
          if (data.wallExtensions !== undefined) {
            setWallExtensions(JSON.parse(JSON.stringify(data.wallExtensions)));
          }
          if (data.activeWallExtensionId !== undefined) {
            setActiveWallExtensionId(data.activeWallExtensionId);
          }
        } catch (err) {
          console.error("Failed to auto-load tutorial design:", err);
        }
      }
    }
  }, [tutorialStepIndex, handleResetWorkspace]);
}
