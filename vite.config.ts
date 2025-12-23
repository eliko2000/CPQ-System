import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      // Note: Compression is handled automatically by Cloudflare Pages edge network
      // No need for vite-plugin-compression
    ],
    server: {
      port: 3001, // Different from Kurate's port 3000
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001/api',
          changeOrigin: true,
          secure: false,
        },
      },
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
      },
      // Force all packages to use the same React instance (fixes duplicate React error)
      dedupe: ['react', 'react-dom', 'use-sync-external-store'],
    },
    define: {
      // Environment variables will be loaded from .env.local
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      exclude: [],
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/coverage/**',
          '**/__tests__/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          'src/main.tsx',
          'src/vite-env.d.ts',
          '**/types.ts',
          '**/types/**',
        ],
        thresholds: {
          // Global thresholds - enforced across all code
          lines: 75,
          functions: 75,
          branches: 75,
          statements: 75,
          // CPQ critical utilities need higher coverage
          'src/utils/pricingUtils.ts': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
          },
          'src/utils/bomUtils.ts': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
          },
          'src/utils/currencyConversion.ts': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
          },
          // Parser services are critical for data quality
          'src/services/excelParser.ts': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
          'src/services/documentParser.ts': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 600, // Increase slightly to avoid warnings for ag-grid

      // Asset optimization
      assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
      cssCodeSplit: true, // Split CSS into separate files per chunk
      minify: 'esbuild', // Fast minification with esbuild

      // Ensure proper module resolution order
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },

      rollupOptions: {
        output: {
          // Simplified chunking: Only split truly massive libraries
          // Let Vite automatically handle vendor chunking for React ecosystem
          manualChunks: id => {
            // Only chunk the absolute largest libraries that don't use React
            // This prevents chunk loading order issues

            // PDF and Excel parsing libraries (1.3MB+ combined)
            if (
              id.includes('xlsx') ||
              id.includes('exceljs') ||
              id.includes('pdf-parse') ||
              id.includes('pdfjs-dist')
            ) {
              return 'parsers';
            }

            // AG Grid (896KB - independent of React hooks)
            if (id.includes('ag-grid')) {
              return 'agGrid';
            }

            // Let Vite automatically chunk everything else
            // This ensures proper dependency resolution and loading order
          },
        },
      },
    },
  };
});
