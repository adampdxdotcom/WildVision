import fs from 'fs';
let code = fs.readFileSync('projectnotes/filebreakdown.txt', 'utf8');

// I will just replace the first analytics.ts section with the updated text
const oldAnalytics = `### src/utils/analytics.ts
- Governs real-time layout metrics, area intersections, and quality auditing.
- Computes comprehensive color-grouped material estimates for Paint Mode, providing breakdowns of custom-painted tile counts, areas, and purchasing costs.`;

const newAnalytics = `### src/utils/analytics.ts
- Governs real-time layout metrics, area intersections, and quality auditing.
- Computes comprehensive color-grouped material estimates for Paint Mode, providing breakdowns of custom-painted tile counts, areas, and purchasing costs.
- Houses the main math logic for calculating required tiles, tracking cut tile counts (both strict geometric counts and true fractional area usages), generating reports, applying 15% kerf/waste penalties, and compiling color-group breakouts.`;

code = code.replace(oldAnalytics, newAnalytics);

// Then remove the second one I added under shapeTransformations
const mistakenlyAdded = `

### src/utils/analytics.ts
- Houses the main math logic for calculating required tiles, tracking cut tile counts (both strict geometric counts and true fractional area usages), generating reports, applying 15% kerf/waste penalties, and compiling color-group breakouts.`;

code = code.replace(mistakenlyAdded, "");

fs.writeFileSync('projectnotes/filebreakdown.txt', code);
