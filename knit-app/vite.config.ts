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
})
