const fs = require('fs');
let code = fs.readFileSync('projectnotes/filebreakdown.txt', 'utf8');

code = code.replace(
  "### src/utils/syncBroadcaster.ts\n- Houses the decoupled Supabase Realtime broadcaster, handling `cursor_move` and `state_sync` global events to avoid circular hook dependencies across Zustand slices.",
  "### src/utils/syncBroadcaster.ts\n- Houses the decoupled Supabase Realtime broadcaster, handling `cursor_move`, `state_sync`, and element locking/unlocking global events to avoid circular hook dependencies across Zustand slices."
);

code = code.replace(
  "### src/components/TileCanvas/hooks/useCanvasInteractions.ts\n- The master event router for the 2D viewport.\n- Stripped of monolithic inline math; now acts as a clean traffic cop delegating pointer events to specialized physics handlers.\n- Enforces strict requirements (e.g., `activeTool === 'paint'`) before intercepting clicks.",
  "### src/components/TileCanvas/hooks/useCanvasInteractions.ts\n- The master event router for the 2D viewport.\n- Stripped of monolithic inline math; now acts as a clean traffic cop delegating pointer events to specialized physics handlers.\n- Enforces strict requirements (e.g., `activeTool === 'paint'`) before intercepting clicks.\n- Intercepts drag interactions to acquire/release remote CAD element locks, preventing conflicts during multiplayer sessions."
);

fs.writeFileSync('projectnotes/filebreakdown.txt', code);
