const fs = require('fs');
let code = fs.readFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', 'utf8');

code = code.replace(
  "      if (error) throw error;\n      await fetchModels();",
  "      if (error) throw error;\n      const activatedModel = models.find(m => m.id === modelId);\n      if (activatedModel) {\n        setActiveModel(activatedModel.api_slug);\n      }\n      await fetchModels();"
);

fs.writeFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', code);
