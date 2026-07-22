export interface TutorialStep {
  id: string;
  targetSelector: string | null;
  title: string;
  content: string;
  alignment?: 'start' | 'center' | 'end';
  offsetY?: number;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: null,
    title: 'Welcome to WildVision',
    content: 'Would you like a tutorial of the program?',
  },
  {
    id: 'main-canvas',
    targetSelector: '#tile-canvas-workspace',
    title: 'Interactive Main Wall Canvas',
    content: 'This is the main canvas. It shows all changes instantly. To zoom, use the controls at the top. To move the canvas on the stage, press and hold the space bar.',
    alignment: 'center',
  },
  {
    id: 'wall-setup',
    targetSelector: '#wall-setup-area',
    title: 'Wall Setup Area',
    content: "In the Wall Setup, you can change the dimensions of the main wall. You can choose your basic starting shape by selecting the wall boundary. If you don't want tile on the main wall, activate Blank Canvas Mode.",
    alignment: 'start',
    offsetY: -20,
  },
  {
    id: 'wall-extension',
    targetSelector: '#wall-setup-area',
    title: 'Wall Setup Lock',
    content: 'If you make any changes outside of the Wall Setup, all of these options will lock to protect your work. If you need to start over, you can use the ‘Reset Workspace’ button.',
    alignment: 'start',
    offsetY: -20,
  },
  {
    id: 'tool-bar',
    targetSelector: '#floating-toolbar',
    title: 'Tool Bar',
    content: 'You can manipulate the main wall and accent areas with the node tools. The selector tool allows you to grab and move nodes.',
    alignment: 'start',
    offsetY: 20,
  },
  {
    id: 'tool-bar-interaction',
    targetSelector: '#tile-canvas-workspace',
    title: 'Tool Bar',
    content: "There are several ways to modify the Main Canvas.\n\n• **Corner Node**: Adding a corner node to a line allows you to change the shape of your wall.\n• **Curve Node**: Curve nodes allow for arches between two Corner Nodes.\n• **Marquee Selector**: Select and move multiple nodes simultaneously.\n• **Eraser Tool**: Use this to delete nodes.",
    alignment: 'center',
  },
  {
    id: 'wall-tile-setup',
    targetSelector: '#tile-specs-section',
    title: 'Wall Tile Specifications',
    content: 'The main wall tile is adjusted from the Wall Tile area. Chose the tile shape you want to work with, and then adjust aspects of the tile and pattern.',
    alignment: 'start',
    offsetY: -20,
  },
];
