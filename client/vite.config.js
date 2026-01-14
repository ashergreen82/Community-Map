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
    //port: 5173,
    cors: false, // Disable built-in CORS handling
    proxy: {
      '/auth-api': {
        target: 'https://br-auth-api-dev001-207215937730.us-central1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from:', req.url, proxyRes.statusCode);
          });
        }
      },
      '/session-api': {
        target: 'https://br-session-api-dev001-207215937730.us-central1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/session-api/, ''),
        secure: false
      },
      '/maps-api': {
        target: 'https://br-maps-mgt-api-dev001-207215937730.us-central1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-api/, ''),
        secure: false
      },
      '/customer-api': {
        target: 'https://br-customer-mgmt-api-dev001-207215937730.us-central1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/customer-api/, ''),
        secure: false
      }
    }
  }
})
