import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/demo_vault/**',
        '**/src-tauri/**',
        '**/.git/**',
      ],
    },
  },
})
