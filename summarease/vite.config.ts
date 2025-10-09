import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for production debugging (optional)
    sourcemap: false,
    
    // Minify using esbuild for better compatibility
    minify: 'esbuild',
    
    // Chunk size warning limit (500 KB)
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-toast', '@radix-ui/react-tooltip', '@radix-ui/themes'],
          'chart-vendor': ['d3', 'recharts', 'vega', 'vega-embed', 'vega-lite', 'mermaid'],
        },
      },
    },
  },
  
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
  },
})
