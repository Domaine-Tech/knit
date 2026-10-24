import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const appRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(appRoot, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Autoriser le glob `demo_vault/` (hors de knit-app/) pour le coffre démo
  server: {
    fs: {
      allow: [appRoot, repoRoot],
    },
    watch: {
      ignored: [
        '**/demo_vault/**',
        '**/src-tauri/**',
        '**/.git/**',
      ],
    },
  },
  build: {
    minify: true,
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/dagre')) {
            return 'mermaid'
          }
          if (
            id.includes('node_modules/yjs') ||
            id.includes('node_modules/y-protocols') ||
            id.includes('node_modules/y-codemirror') ||
            id.includes('node_modules/lib0')
          ) {
            return 'yjs'
          }
          if (
            id.includes('node_modules/@codemirror') ||
            id.includes('node_modules/@lezer') ||
            id.includes('node_modules/style-mod')
          ) {
            return 'codemirror'
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
