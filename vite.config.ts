import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'serve-project-notes',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const cleanUrl = req.url?.split('?')[0] || '';
            if (cleanUrl.toLowerCase().startsWith('/projectnotes/')) {
              const relativePath = cleanUrl.slice(1);
              const parts = relativePath.split('/');
              const fileName = parts[parts.length - 1];
              const projectNotesDir = path.resolve(__dirname, 'projectnotes');
              if (fs.existsSync(projectNotesDir)) {
                const files = fs.readdirSync(projectNotesDir);
                const match = files.find(f => f.toLowerCase() === fileName.toLowerCase());
                if (match) {
                  const filePath = path.join(projectNotesDir, match);
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.end(fs.readFileSync(filePath));
                  return;
                }
              }
            }
            next();
          });
        },
        generateBundle() {
          const projectNotesDir = path.resolve(__dirname, 'projectnotes');
          if (fs.existsSync(projectNotesDir)) {
            const files = fs.readdirSync(projectNotesDir);
            for (const file of files) {
              const filePath = path.join(projectNotesDir, file);
              const content = fs.readFileSync(filePath);
              this.emitFile({
                type: 'asset',
                fileName: `projectnotes/${file.toLowerCase()}`,
                source: content
              });
              this.emitFile({
                type: 'asset',
                fileName: `projectnotes/${file}`,
                source: content
              });
            }
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
