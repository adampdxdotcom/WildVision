import fs from 'fs';
let code = fs.readFileSync('src/components/QuantitiesPanel.tsx', 'utf8');

// I will insert `reuseCuts` into `QuantitiesPanel`
const str1 = `  const overage = useAppStore(state => state.overage);`;
const rep1 = `  const overage = useAppStore(state => state.overage);
  const reuseCuts = useAppStore(state => state.reuseCuts);
  const setReuseCuts = useAppStore(state => state.setReuseCuts);`;
code = code.replace(str1, rep1);

fs.writeFileSync('src/components/QuantitiesPanel.tsx', code);
