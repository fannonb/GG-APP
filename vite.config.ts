import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Registration is handled manually in src/services/pwa.ts
      injectRegister: null,
      // Keep the hand-maintained public/manifest.webmanifest
      manifest: false,
      devOptions: { enabled: false },
      injectManifest: {
        // Everything the shell needs to boot offline: hashed bundles,
        // index.html, manifest, icons and public images.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
