import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    publicDir: 'public',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [
      react(),
      {
        name: 'serve-static-files',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            if (url.startsWith('/basic-pitch/') || url.startsWith('/essentia/') || url.startsWith('/workers/')) {
              const filePath = path.join(__dirname, 'public', url);
              if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType =
                  ext === '.json'
                    ? 'application/json'
                    : ext === '.wasm'
                      ? 'application/wasm'
                      : 'application/octet-stream';
                fs.readFile(filePath, (err, data) => {
                  if (err) {
                    res.statusCode = 500;
                    res.end('Error reading file');
                    return;
                  }
                  res.setHeader('Content-Type', contentType);
                  res.end(data);
                });
              } else {
                res.statusCode = 404;
                res.end('File not found');
              }
              return;
            }
            next();
          });
        },
      },
    ],
  },
});
