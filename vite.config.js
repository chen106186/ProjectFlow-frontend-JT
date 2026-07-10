import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.110.136:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 'frappe-gantt': fileURLToPath(new URL('./src/vendor/frappe-gantt.js', import.meta.url)),
      // 'frappe-gantt-css': fileURLToPath(new URL('./src/vendor/frappe-gantt.css', import.meta.url)),
    },
  },
})
