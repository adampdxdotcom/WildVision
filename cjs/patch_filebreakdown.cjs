const fs = require('fs');
let code = fs.readFileSync('projectnotes/filebreakdown.txt', 'utf8');

code = code.replace(
  "### src/hooks/useCloudAutoSave.ts",
  "### src/hooks/useCloudAutoSave.ts\n- Debounces and uploads full state payload snapshots to Supabase.\n- Delegates cloud-saving authority to the active project owner during multiplayer sessions to prevent race conditions and save storms."
);

if (!code.includes("Delegates cloud-saving authority")) {
    code = code.replace(
      "## 10. PROJECT BROWSER & CLOUD SYNC",
      "## 10. PROJECT BROWSER & CLOUD SYNC\n### src/hooks/useCloudAutoSave.ts\n- Debounces and uploads full state payload snapshots to Supabase.\n- Delegates cloud-saving authority to the active project owner during multiplayer sessions to prevent race conditions and save storms.\n"
    );
}

fs.writeFileSync('projectnotes/filebreakdown.txt', code);
