import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

/**
 * Serves `/gg-app.mobileconfig` with the `application/x-apple-aspen-config`
 * MIME type iOS Safari requires to open the native Web Clip profile installer,
 * rewriting the payload URL to match the active host.
 */
function iosMobileconfigPlugin(): Plugin {
  const handler = (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => {
    if (!req.url || !req.url.split('?')[0].endsWith('/gg-app.mobileconfig')) {
      next()
      return
    }
    try {
      const filePath = path.resolve(__dirname, 'public/gg-app.mobileconfig')
      const raw = fs.readFileSync(filePath, 'utf8')
      const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || 'http'
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173'
      const body = raw.replace(
        'https://app.gatewayglobal.africa/?source=pwa',
        `${proto}://${host}/?source=pwa`,
      )
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/x-apple-aspen-config')
      res.setHeader('Content-Disposition', 'attachment; filename="gg-app.mobileconfig"')
      res.setHeader('Cache-Control', 'no-store')
      res.end(body)
    } catch {
      next()
    }
  }
  return {
    name: 'gg-ios-mobileconfig',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

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
      iosMobileconfigPlugin(),
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
          // Install-dialog screenshots are only fetched by the browser's install UI.
          globIgnores: ['screenshots/**'],
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
