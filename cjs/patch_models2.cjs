const fs = require('fs');
let code = fs.readFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', 'utf8');

// 1. Add Trash2 to imports
code = code.replace(
  "import { Users, Database, Cpu, RefreshCw, Loader2, Save } from 'lucide-react';",
  "import { Users, Database, Cpu, RefreshCw, Loader2, Save, Trash2 } from 'lucide-react';"
);

// 2. Add originalModels state
code = code.replace(
  "  const [models, setModels] = useState<AiModel[]>([]);",
  "  const [models, setModels] = useState<AiModel[]>([]);\n  const [originalModels, setOriginalModels] = useState<AiModel[]>([]);"
);

// 3. Update fetchModels
const newFetchModels = `  const fetchModels = async () => {
    try {
      const { data, error } = await supabase.from('ai_models').select('*').order('name');
      if (!error && data) {
        setModels(data);
        setOriginalModels(JSON.parse(JSON.stringify(data)));
      }
    } catch (err) {
      console.error('Error fetching ai_models:', err);
    }
  };`;

code = code.replace(
  /  const fetchModels = async \(\) => \{[\s\S]*?  \};\n/,
  newFetchModels + '\n\n'
);

// 4. Add handler functions
const handlers = `  const handleSaveModel = async (modelId: string) => {
    const modelToSave = models.find(m => m.id === modelId);
    if (!modelToSave) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({
          name: modelToSave.name,
          api_slug: modelToSave.api_slug,
          cost_input_usd: modelToSave.cost_input_usd,
          cost_1k_out_usd: modelToSave.cost_1k_out_usd,
          cost_4k_out_usd: modelToSave.cost_4k_out_usd
        })
        .eq('id', modelId);
      if (error) throw error;
      setSuccessMsg('Model updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(\`Error updating model: \${err.message}\`);
    }
  };

  const handleActivateModel = async (modelId: string) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: true })
        .eq('id', modelId);
      if (error) throw error;
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(\`Error activating model: \${err.message}\`);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId);
      if (error) throw error;
      setSuccessMsg('Model deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchModels();
    } catch (err: any) {
      setErrorMsg(\`Error deleting model: \${err.message}\`);
    }
  };

  const isModelDirty = (modelId: string) => {
    const current = models.find(m => m.id === modelId);
    const original = originalModels.find(m => m.id === modelId);
    if (!current || !original) return false;
    return current.name !== original.name ||
           current.api_slug !== original.api_slug ||
           current.cost_input_usd !== original.cost_input_usd ||
           current.cost_1k_out_usd !== original.cost_1k_out_usd ||
           current.cost_4k_out_usd !== original.cost_4k_out_usd;
  };
`;

code = code.replace(
  "  const handleSaveSettings = async (e: React.FormEvent) => {",
  handlers + "\n  const handleSaveSettings = async (e: React.FormEvent) => {"
);

fs.writeFileSync('src/components/Auth/AdminConsole/SystemSettingsTab.tsx', code);
