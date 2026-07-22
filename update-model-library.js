const fs = require('fs');

const file = 'src/components/Auth/AdminConsole/ModelLibraryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add states
content = content.replace(
  "const [isDragging, setIsDragging] = useState(false);",
  "const [isDragging, setIsDragging] = useState(false);\n  const [svgSource, setSvgSource] = useState<'upload' | 'url'>('url');\n  const [svgUrl, setSvgUrl] = useState('');\n  const [uploadSvgFile, setUploadSvgFile] = useState<File | null>(null);\n  const [svgUploadError, setSvgUploadError] = useState<string | null>(null);\n  const [isDraggingSvg, setIsDraggingSvg] = useState(false);"
);

// update fetchDbLibraryModels
content = content.replace(
  "modelUrl: row.model_url,",
  "modelUrl: row.model_url,\n          svgUrl: row.svg_url,"
);

// Add SVG drag handlers
const dragHandlers = `
  const handleSvgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSvg(true);
  };
  const handleSvgDragLeave = () => {
    setIsDraggingSvg(false);
  };
  const handleSvgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSvg(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.svg')) {
        setUploadSvgFile(file);
        setSvgUploadError(null);
      } else {
        setSvgUploadError('Only .svg files are supported.');
      }
    }
  };
  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.svg')) {
        setUploadSvgFile(file);
        setSvgUploadError(null);
      } else {
        setSvgUploadError('Only .svg files are supported.');
      }
    }
  };
`;

content = content.replace(
  "const handleAddModel = async (e: React.FormEvent) => {",
  dragHandlers + "\n  const handleAddModel = async (e: React.FormEvent) => {"
);

fs.writeFileSync(file, content);
