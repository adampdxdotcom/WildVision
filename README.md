📐 WildVision

2D/3D Accurate Tile, Accent Niche, & Vector Pattern Simulator

WildVision is a professional-grade, interactive architectural CAD tool and spatial simulator built with React, HTML5 Canvas, and Three.js. It goes beyond simple grid visualization by procedurally generating mathematically perfect tile layouts, calculating material estimations, detecting microscopic edge "slivers," simulating 3D origami folding rooms, hosting a vector tessellation editor, and exporting high-resolution multi-page PDF blueprints.
✨ Core Features
🛠 Procedural Layout Engine

    Multiple Geometries: Supports Rectangles, Hexagons, Pickets (elongated hexagons), Round (Penny), Diamond (Rhombus/Harlequin), Equilateral Triangles, Scallops (fish scale), Octagons, and custom user-designed data-driven shapes.

    Complex Tessellations: Dynamically calculates Running Bonds (1/2, 1/3), Stacked grids, mathematically interlocking Herringbone layouts using dual-basis vector offsets, 12-piece interlocking Versailles patterns, Pebble mosaics, and custom polygonal layouts.

    Shade Variation (V1-V4): Simulates real-world tile shade variation using a deterministic, coordinate-seeded pseudo-random HSL lightness and saturation shifting algorithm to prevent visual swimming during canvas panning.

    Micro-Displacement: Granular X/Y layout nudging down to 1/8th inch for perfect visual centering.

🧱 Custom Wall Boundaries & Stencils

    Wall Extensions & CAD Polygons: Support for non-standard wall geometries (L-shapes, bump-outs) merged via HTML5 Canvas boolean union paths, converting walls from simple rectangles to dynamic coordinate vertex arrays.

    Parametric Curves: Supports Roman/elliptical Arches and Ovals applicable to the Main Wall, Wall Extensions, and Accent Niches with customizable curve depths.

    Accent Niches & Panels: Draggable sub-areas with independent tile configurations and independent custom pattern data payloads.

    Blank Canvas & Stencil Cutouts: Ability to use the main wall purely as a boundary mask, allowing organic accent tiles to perfectly clip against the main wall's perimeter.

📦 3D Diorama & Origami Folding Engine (Three.js / React Three Fiber)

    Continuous Ribbon & Fold Lines: Users can split a custom polygon canvas using horizontal and vertical "Fold Lines" (hinges) to stand the wings of a layout upright into a 3D folded diorama.

    Z-Fighting Mitigation: Implements alpha testing to discard transparent pixels and applies microscopic coordinate offsets at hinges to prevent coordinate tearing at folded corners.

    Texture Baking & Depth Mapping (HD Depth): Bakes 2D tile layouts onto a memory texture and projects them onto 3D planes to prevent stretching. Features an "HD Depth" toggle that generates a grayscale bump map (White tiles, Black grout) to feed into the WebGL renderer, creating physical tile thickness and micro-shadows.

    Anti-Wallpaper Mapping: Uses pseudo-random coordinate offsets for seamless textures (wood, slate), stopping wood grain from continuously flowing across grout lines.

    Parametric Volumetric Features: Translates 2D accent regions crossing active fold lines into true 3D volumetric features:

        Niche Features: Renders recessed volumes with depth, front connections, sills, and tracked interior sill tile metadata.

        Shelf & Bench Features: Renders protruding shelves or floor-snapped benches that cut corresponding footprint holes in the 3D floor panel and render opaque 2D floor shadows.

🧠 Multimodal AI "WildVision" Rendering Pipeline

    WebGL Snapshot Capture: Captures the framed 3D WebGL canvas as a high-contrast base64 JPEG synchronized to active camera position, target, and FOV.

    Diorama Environment Shell: Projects a five-sided matte gray room shell (Floor, Back Wall, Side Walls, Ceiling) that automatically snaps to the model's bounding box and shifts to accommodate cabinetry volumes (lower and upper base cabinets), preventing "floating" AI scenes.

    Conversational Inpainting: Features an interactive canvas overlay with a translucent highlighter pen and eraser to generate binary black-and-white mask files, allowing users to send targeted inpainting edit instructions to the AI.

    Before/After Comparison Slider: An interactive CSS lightbox slider layering the 3D source blueprint over the photorealistic AI render with a draggable swipe clip-path.

🎨 Integrated Vector Pattern Studio

    Interactive SVG Workspace: A dedicated CAD viewport replacing the main canvas, allowing users to visually plot, drag, add, and delete vertices on a normalized coordinate grid (-0.5 to 0.5).

    Lattice Offsets & Live Preview: Exposes manual block-geometry bounds (blockWidth / blockHeight) and manual tile offsets (dx / dy) to overlap bounding boxes, showing a live 3x3 repeating preview of interlocking tiles.

    Symmetrical Normalization: Translates the editor's pixel-based coordinates (e.g., 50px, -25px) into normalized float multipliers (e.g., 1.0, -0.5) on export, and expands them back upon import for seamless round-trip file editing.

📊 Advanced Material Analytics

    Sliver Detection: Algorithmic collision detection flags problematic edge cuts (e.g., cuts under 15% of the tile width) preventing brittle, unusable tile scraps on the job site.

    Smart Mosaic Mode: Automatically converts square footage into 12x12 mesh sheet requirements for tiny tiles, preventing massive numeric overload.

    Contractor Overage: Built-in waste calculation sliders (10%, 15%, etc.) applied instantly to final material counts.

🖨 Ultra-HD PDF Exports

    Generates instant, professional job-site blueprints using jsPDF organized into a structured 2-page document.

    Page 1: Features a scaled layout drawing rendered on a hidden, super-sampled off-screen canvas (ensuring gridlines, curve dimensions, and labels remain crisp), hiding the blueprint grid on print.

    Page 2: Displays full product ordering specifications, custom niche sill summaries, material pricing, and carton breakdowns, respecting imperial or metric units.

🏗 Architecture & Codebase

The monolithic state and rendering structures have been completely refactored into a high-performance, decoupled state-and-hooks architecture.

    src/store/useAppStore.ts: The global Zustand state store. Houses all coordinate vertices, active selections, scene objects, camera positions, custom pattern lists, and UI controls. Eliminates virtual DOM re-render loops on high-frequency drag events.

    src/store/useAuthStore.ts: Handles user authentication, session state, and RBAC (Role-Based Access Control) classifications (free, paid, admin).

    src/components/TileCanvas/useCanvasInteractions.ts: Encapsulates drafting physics, dragging vectors, marquee selections, and custom point snaps, completely decoupled from React render cycles.

    src/components/TileCanvas/useCanvasRenderer.ts: Manages the core 2D canvas repaint loop, utilizing drafting wireframe bypasses (isDrafting) during active dragging to eliminate fractional decimal rendering lag.

    src/features/PatternBuilder/: Houses the modular files for the integrated SVG vector pattern designer (PatternBuilderLayout, SidebarManager, VertexEditorCanvas, TessellationPreview).

    src/components/TileCanvas3D/: Coordinates the Three.js and @react-three/fiber diorama box, orbiting cameras, diorama shells, and volumetric features.

    src/utils/geometry.ts: Computes tile vertices, shape offset matrices, custom arch triangulation paths, and boolean combined perimeters.

    src/utils/generator.ts: Handles procedural loop mathematics. Standardizes grid arrays and executes the "custom_polygon" generator that scales raw JSON coordinates by the base unit size (tileWidth + groutWidth) without auto-bounding constraints.

🌐 Cloud & Security Infrastructure

    Self-Hosted Supabase: Dockerized Supabase backend mapping key services (auth, rest, storage, functions) behind a Caddy reverse proxy terminating SSL.

    Row-Level Security (RLS): Strictly gates database tables (projects, ai_renders, custom_patterns). Users can only read or write their own private data. Admins are granted elevated privileges to publish custom patterns globally.

    Secure AI Edge Proxy: Leverages Deno-based Supabase Edge Functions (generate-ai-render, admin-user-manager) to process secure JWT validations, manage Gemini API keys server-side, and execute administrative user operations securely.

💻 Tech Stack

    Framework: React 18 (Vite)

    State Management: Zustand

    Database & Auth: Supabase (PostgreSQL, RLS)

    3D Engine: Three.js, React Three Fiber (R3F), @react-three/drei

    Styling: Tailwind CSS v4

    Icons: Lucide React

    Rendering: HTML5 Canvas API (2D Context) & WebGL

    Exports: jsPDF

    Reverse Proxy: Caddy, Docker