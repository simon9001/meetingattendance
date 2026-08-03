import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  optimizeDeps: {
    include: ['mammoth', 'docx', 'file-saver'],
  },
  resolve: {
    // mammoth references 'path' in some code paths; provide an empty shim
    alias: {
      path: 'path-browserify',
    },
  },
})
