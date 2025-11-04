import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { syncApiPlugin } from './vite-sync-plugin.js'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    syncApiPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 8080,
    host: true, // Allow external connections
    cors: true
  }
})