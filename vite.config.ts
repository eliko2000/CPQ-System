import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      port: 3001, // Different from Kurate's port 3000
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001/api',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@lib': path.resolve(__dirname, './src/lib'),
      }
    },
    define: {
      // Environment variables will be loaded from .env.local
    },
    optimizeDeps: {
      include: ['pdfjs-dist', 'xlsx'],
      esbuildOptions: {
        // Needed for pdfjs-dist and xlsx to work properly in Vite
        target: 'esnext',
      }
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/coverage/**'
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
          },
          // CPQ critical utilities need higher coverage
          'src/utils/pricingUtils.ts': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
          },
          'src/utils/bomUtils.ts': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
          }
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            agGrid: ['ag-grid-community', 'ag-grid-react'],
            supabase: ['@supabase/supabase-js'],
            radix: ['@radix-ui/react-slot', '@radix-ui/react-dialog'],
          }
        }
      }
    }
  }
})