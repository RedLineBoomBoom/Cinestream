import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/opensubtitles': {
        target: 'https://api.opensubtitles.com/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensubtitles/, ''),
        headers: {
          'User-Agent': 'AntigravityStreaming v1.0.0',
        },
      },
    },
  },
})

