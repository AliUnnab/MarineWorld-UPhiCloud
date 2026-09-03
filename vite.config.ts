import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function fileProxyPlugin(): Plugin {
  return {
    name: 'file-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy-file-base64', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
          let targetUrl = parsedUrl.searchParams.get('url');

          if (!targetUrl && req.method === 'POST') {
            const body = await new Promise<string>((resolve) => {
              let b = '';
              req.on('data', chunk => { b += chunk; });
              req.on('end', () => resolve(b));
              req.on('error', () => resolve(''));
            });
            const json = JSON.parse(body || '{}');
            targetUrl = json.url;
          }

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing url query param or body' }));
            return;
          }

          const fetchRes = await fetch(targetUrl);
          if (!fetchRes.ok) {
            res.statusCode = fetchRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Failed to fetch: ${fetchRes.statusText}` }));
            return;
          }

          const buffer = await fetchRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = fetchRes.headers.get('content-type') || 'application/pdf';
          
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ base64, mimeType }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), fileProxyPlugin()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
