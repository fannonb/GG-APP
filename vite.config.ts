import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mockApiEnabled = env.VITE_USE_MOCK_API ?? process.env.VITE_USE_MOCK_API

  // Mock API mode ships fake authentication and mock-access-* "sessions".
  // It must never reach a production build, even if a deploy forgets the
  // VITE_USE_MOCK_API=false flag (config.ts defaults mock mode to ON).
  if (mode === 'production' && mockApiEnabled !== 'false') {
    throw new Error(
      'Production build refused: VITE_USE_MOCK_API must be "false" (mock API mode would ship fake authentication).',
    )
  }

  return {
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
  }
})
