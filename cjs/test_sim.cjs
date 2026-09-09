const THREE = require('three');

// Let's set up the exact scenario:
// roomDimensions: width 96, height 96, depth 96 (in inches)
// to3D = (inches) => inches * 0.0254 (or whatever scale factor is used)
const to3D = (v) => v * 0.05; // example scaling

const roomDimensions = { width: 96, height: 96, depth: 96 };
const rWidth = to3D(roomDimensions.width);
const rHeight = to3D(roomDimensions.height);
const rDepth = to3D(roomDimensions.depth);

// Layout: 3 columns (Left return 36", Back main 60", Right return 36", height 80")
// Let's create d3Columns structure:
const d3Columns = [
  {
    startX: 0,
    endX: 36,
    width: 36,
    d3Width: to3D(36),
    foldAngle: 90,
    rightFoldAngle: 90,
    mainRow: {
      startX: 0,
      endX: 36,
      width: 36,
      startY: 0,
      height: 80,
      d3Height: to3D(80),
      d3CenterY: to3D(40),
    },
    topFlaps: [],
    bottomFlaps: [],
  },
  {
    startX: 36,
    endX: 96,
    width: 60,
    d3Width: to3D(60),
    foldAngle: 0,
    mainRow: {
      startX: 36,
      endX: 96,
      width: 60,
      startY: 0,
      height: 80,
      d3Height: to3D(80),
      d3CenterY: to3D(40),
    },
    topFlaps: [],
    bottomFlaps: [],
  },
  {
    startX: 96,
    endX: 132,
    width: 36,
    d3Width: to3D(36),
    foldAngle: 90,
    mainRow: {
      startX: 96,
      endX: 132,
      width: 36,
      startY: 0,
      height: 80,
      d3Height: to3D(80),
      d3CenterY: to3D(40),
    },
    topFlaps: [],
    bottomFlaps: [],
  }
];

// SubArea: Niche on left return (x: 10, y: 30, w: 14, h: 24)
const subAreas = [
  {
    id: 'niche-1',
    x: 10,
    y: 30,
    width: 14,
    height: 24,
    hasSill: true,
    accentType: 'niche',
  }
];

const layoutTransform = {
  position: [0, 0, 0], // wait, what is default layoutTransform position?
  attachedPlane: 'back',
  mountAnchor: 'back'
};

console.log("Testing simulation...");
