import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const coderabbitTarget =
  process.env.CODERABBIT_PROXY_TARGET ||
  process.env.VITE_CODERABBIT_PROXY_TARGET ||
  'https://api.coderabbit.ai/api/v1';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'opsNest',
        short_name: 'opsNest',
        description: 'Developer-first SaaS dashboard for SDLC management',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/coderabbit': {
        target: coderabbitTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/coderabbit/, ''),
      },
    },
  },
});

