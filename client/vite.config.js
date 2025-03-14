import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        garageSales: resolve(__dirname, 'garageSales.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
  }
})
