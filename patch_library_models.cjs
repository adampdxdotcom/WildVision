const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Auth/AdminConsole/ModelLibraryTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Patch 1: handleBlueprintCapture
content = content.replace(
  /const safeName = modelName\.replace\(\/\[\^a-zA-Z0-9\]\/g, '_'\);\s*const fileName = selectedModelId \|\| safeName;\s*const filePath = `clay_models\/\$\{fileName\}\.png`;/,
  `const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        setErrorMsg('User not authenticated');
        return;
      }
      const safeName = modelName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = selectedModelId || safeName;
      const filePath = \`\${userId}/clay_models/\${fileName}.png\`;`
);

// Patch 2: fetchDbLibraryModels
content = content.replace(
  /const fetchDbLibraryModels = async \(\) => \{\s*try \{\s*const \{ data: files, error \} = await supabase\.storage\.from\('custom_surfaces'\)\.list\('clay_models'\);\s*if \(error\) \{\s*console\.warn\('Could not fetch clay_models from storage:', error\.message\);\s*return;\s*\}/,
  `const fetchDbLibraryModels = async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const { data: files, error } = await supabase.storage.from('custom_surfaces').list(\`\${userId}/clay_models\`);
      if (error) {
        console.warn('Could not fetch clay_models from storage:', error.message);
        return;
      }`
);

// Patch 3: fetchDbLibraryModels inner mapping
content = content.replace(
  /const \{ data: modelData \} = supabase\.storage\.from\('custom_surfaces'\)\.getPublicUrl\(`clay_models\/\$\{f\.name\}`\);\s*let finalSvgUrl = undefined;\s*if \(hasPng\) \{\s*const \{ data: pngData \} = supabase\.storage\.from\('custom_surfaces'\)\.getPublicUrl\(`clay_models\/\$\{baseName\}\.png`\);\s*finalSvgUrl = pngData\.publicUrl \+ '\?t=' \+ Date\.now\(\);\s*\}/,
  `const { data: modelData } = supabase.storage.from('custom_surfaces').getPublicUrl(\`\${userId}/clay_models/\${f.name}\`);
          let finalSvgUrl = undefined;
          if (hasPng) {
             const { data: pngData } = supabase.storage.from('custom_surfaces').getPublicUrl(\`\${userId}/clay_models/\${baseName}.png\`);
             finalSvgUrl = pngData.publicUrl + '?t=' + Date.now();
          }`
);

// Patch 4: handleUploadModel
content = content.replace(
  /const safeName = modelName\.replace\(\/\[\^a-zA-Z0-9\.\]\/g, '_'\);\s*const storagePath = `clay_models\/\$\{safeName\}\.glb`;/,
  `const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          setUploadError('User not authenticated');
          setIsUploading(false);
          return;
        }
        const safeName = modelName.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = \`\${userId}/clay_models/\${safeName}.glb\`;`
);

// Patch 5: handleDeleteModel
content = content.replace(
  /const pathsToDelete = \[`clay_models\/\$\{modelId\}\.glb`, `clay_models\/\$\{modelId\}\.png`\];\s*await supabase\.storage\.from\('custom_surfaces'\)\.remove\(pathsToDelete\);/,
  `const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const pathsToDelete = [\`\${userId}/clay_models/\${modelId}.glb\`, \`\${userId}/clay_models/\${modelId}.png\`];
      await supabase.storage.from('custom_surfaces').remove(pathsToDelete);`
);

fs.writeFileSync(filePath, content);
console.log('Successfully patched ModelLibraryTab.tsx');
