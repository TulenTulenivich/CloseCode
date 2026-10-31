import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const rendererRoot = fileURLToPath(new URL('./src/renderer', import.meta.url))

function previewEntry(): Plugin {
  return {
    name: 'closecode-preview-entry',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === '/' || request.url === '/index.html') {
          request.url = '/preview.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  root: rendererRoot,
  plugins: [react(), previewEntry()],
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
    open: '/preview.html'
  }
})
