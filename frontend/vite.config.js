import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forcer HTTP/1.1 pour éviter les erreurs HTTP/2
    https: false,
    // Optimisations pour les images
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    // Optimisations pour la production
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les images dans un chunk dédié
          images: ['imageService']
        }
      }
    }
  },
  // Configuration pour les assets
  assetsInclude: ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.webp'],
  // Optimisation des images
  optimizeDeps: {
    include: ['imageService']
  }
})
