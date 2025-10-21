import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174, // Different port from platform-dashboard (5173)
    proxy: {
      '/functions': {
        target: 'http://localhost:54321',
        changeOrigin: true,
      },
    },
  },
})
