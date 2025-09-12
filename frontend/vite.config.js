import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Forcer la re-pré-optimisation des dépendances
    force: true,
    include: ['date-fns', 'date-fns/locale']
  },
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
          // Séparer les dépendances externes
          vendor: ['react', 'react-dom'],
          icons: ['react-icons']
        },
        // Cache-busting pour forcer le rechargement
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    // Forcer la reconstruction complète
    emptyOutDir: true,
    // Désactiver le cache de build
    cache: false
  },
  // Configuration pour les assets
  assetsInclude: ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.webp']
})
