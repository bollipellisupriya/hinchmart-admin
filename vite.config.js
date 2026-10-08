import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawTarget = env.VITE_API_BASE_URL || env.VITE_API_URL || 'https://api.hinchmart.com';
  // Strip trailing slashes and /api so proxy doesn't double-nest /api/api
  const cleanTarget = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '');

  return {
    plugins: [react()],
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      },
      proxy: {
        '/api': {
          target: cleanTarget,
          changeOrigin: true,
          secure: false,
          timeout: 60000,
          proxyTimeout: 60000,
          agent: cleanTarget.startsWith('https')
            ? new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true,
              })
            : undefined,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Backend API is currently offline/unreachable',
                  message: err.message,
                  target: cleanTarget
                }));
              }
            });
          },
        },
      },
    },
  };
});