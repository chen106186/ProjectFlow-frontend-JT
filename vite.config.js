import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: assetInfo => {
          const ext = assetInfo.name?.split('.').pop()
          if (ext === 'css') return 'css/[name]-[hash][extname]'
          return `${ext}/[name]-[hash][extname]`
        },
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) return 'vendor-vue'
          if (id.includes('node_modules/ant-design-vue') || id.includes('node_modules/@ant-design')) return 'vendor-antd'
          if (id.includes('node_modules/@wangeditor')) return 'vendor-editor'
          if (id.includes('node_modules/echarts')) return 'vendor-echarts'
          if (id.includes('node_modules/frappe-gantt')) return 'vendor-gantt'
          if (id.includes('node_modules/axios')) return 'vendor-request'
          if (id.includes('node_modules/dayjs')) return 'vendor-dayjs'
          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.110.137:8080',
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
