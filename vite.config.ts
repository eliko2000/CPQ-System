import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

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
    },
    define: {
      // Environment variables will be loaded from .env.local
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
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            agGrid: ['ag-grid-community', 'ag-grid-react'],
            supabase: ['@supabase/supabase-js'],
            radix: ['@radix-ui/react-slot', '@radix-ui/react-dialog'],
          },
        },
      },
    },
  };
});
