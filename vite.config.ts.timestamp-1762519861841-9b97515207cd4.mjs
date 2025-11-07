// vite.config.ts
import { defineConfig } from "file:///C:/Users/Eli/Desktop/Claude%20Code/CPQ-System/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Eli/Desktop/Claude%20Code/CPQ-System/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Eli\\Desktop\\Claude Code\\CPQ-System";
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      port: 3001,
      // Different from Kurate's port 3000
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:3001/api",
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
        "@contexts": path.resolve(__vite_injected_original_dirname, "./src/contexts"),
        "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
        "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
        "@types": path.resolve(__vite_injected_original_dirname, "./src/types"),
        "@lib": path.resolve(__vite_injected_original_dirname, "./src/lib")
      }
    },
    define: {
      // Environment variables will be loaded from .env.local
    },
    test: {
      globals: true,
      environment: "happy-dom",
      setupFiles: "./src/test/setup.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "node_modules/",
          "src/test/",
          "**/*.d.ts",
          "**/*.config.*",
          "**/coverage/**"
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
          },
          // CPQ critical utilities need higher coverage
          "src/utils/pricingUtils.ts": {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
          },
          "src/utils/bomUtils.ts": {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
          }
        }
      }
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            agGrid: ["ag-grid-community", "ag-grid-react"],
            supabase: ["@supabase/supabase-js"],
            radix: ["@radix-ui/react-slot", "@radix-ui/react-dialog"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFbGlcXFxcRGVza3RvcFxcXFxDbGF1ZGUgQ29kZVxcXFxDUFEtU3lzdGVtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFbGlcXFxcRGVza3RvcFxcXFxDbGF1ZGUgQ29kZVxcXFxDUFEtU3lzdGVtXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9FbGkvRGVza3RvcC9DbGF1ZGUlMjBDb2RlL0NQUS1TeXN0ZW0vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJ1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogMzAwMSwgLy8gRGlmZmVyZW50IGZyb20gS3VyYXRlJ3MgcG9ydCAzMDAwXHJcbiAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMS9hcGknLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgICAnQGNvbXBvbmVudHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cycpLFxyXG4gICAgICAgICdAY29udGV4dHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29udGV4dHMnKSxcclxuICAgICAgICAnQHNlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXHJcbiAgICAgICAgJ0B1dGlscyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy91dGlscycpLFxyXG4gICAgICAgICdAdHlwZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdHlwZXMnKSxcclxuICAgICAgICAnQGxpYic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9saWInKSxcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGRlZmluZToge1xyXG4gICAgICAvLyBFbnZpcm9ubWVudCB2YXJpYWJsZXMgd2lsbCBiZSBsb2FkZWQgZnJvbSAuZW52LmxvY2FsXHJcbiAgICB9LFxyXG4gICAgdGVzdDoge1xyXG4gICAgICBnbG9iYWxzOiB0cnVlLFxyXG4gICAgICBlbnZpcm9ubWVudDogJ2hhcHB5LWRvbScsXHJcbiAgICAgIHNldHVwRmlsZXM6ICcuL3NyYy90ZXN0L3NldHVwLnRzJyxcclxuICAgICAgY292ZXJhZ2U6IHtcclxuICAgICAgICBwcm92aWRlcjogJ3Y4JyxcclxuICAgICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCddLFxyXG4gICAgICAgIGV4Y2x1ZGU6IFtcclxuICAgICAgICAgICdub2RlX21vZHVsZXMvJyxcclxuICAgICAgICAgICdzcmMvdGVzdC8nLFxyXG4gICAgICAgICAgJyoqLyouZC50cycsXHJcbiAgICAgICAgICAnKiovKi5jb25maWcuKicsXHJcbiAgICAgICAgICAnKiovY292ZXJhZ2UvKionXHJcbiAgICAgICAgXSxcclxuICAgICAgICB0aHJlc2hvbGRzOiB7XHJcbiAgICAgICAgICBnbG9iYWw6IHtcclxuICAgICAgICAgICAgYnJhbmNoZXM6IDcwLFxyXG4gICAgICAgICAgICBmdW5jdGlvbnM6IDcwLFxyXG4gICAgICAgICAgICBsaW5lczogNzAsXHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IDcwXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgLy8gQ1BRIGNyaXRpY2FsIHV0aWxpdGllcyBuZWVkIGhpZ2hlciBjb3ZlcmFnZVxyXG4gICAgICAgICAgJ3NyYy91dGlscy9wcmljaW5nVXRpbHMudHMnOiB7XHJcbiAgICAgICAgICAgIGJyYW5jaGVzOiA5MCxcclxuICAgICAgICAgICAgZnVuY3Rpb25zOiA5MCxcclxuICAgICAgICAgICAgbGluZXM6IDkwLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiA5MFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdzcmMvdXRpbHMvYm9tVXRpbHMudHMnOiB7XHJcbiAgICAgICAgICAgIGJyYW5jaGVzOiA5MCxcclxuICAgICAgICAgICAgZnVuY3Rpb25zOiA5MCxcclxuICAgICAgICAgICAgbGluZXM6IDkwLFxyXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiA5MFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXHJcbiAgICAgICAgICAgIGFnR3JpZDogWydhZy1ncmlkLWNvbW11bml0eScsICdhZy1ncmlkLXJlYWN0J10sXHJcbiAgICAgICAgICAgIHN1cGFiYXNlOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG4gICAgICAgICAgICByYWRpeDogWydAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJ10sXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVUsU0FBUyxvQkFBb0I7QUFDOVYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakIsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsUUFDcEMsZUFBZSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsUUFDekQsYUFBYSxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsUUFDckQsYUFBYSxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsUUFDckQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLFFBQy9DLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxRQUMvQyxRQUFRLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDN0M7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUE7QUFBQSxJQUVSO0FBQUEsSUFDQSxNQUFNO0FBQUEsTUFDSixTQUFTO0FBQUEsTUFDVCxhQUFhO0FBQUEsTUFDYixZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsUUFDUixVQUFVO0FBQUEsUUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxRQUNqQyxTQUFTO0FBQUEsVUFDUDtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsUUFDQSxZQUFZO0FBQUEsVUFDVixRQUFRO0FBQUEsWUFDTixVQUFVO0FBQUEsWUFDVixXQUFXO0FBQUEsWUFDWCxPQUFPO0FBQUEsWUFDUCxZQUFZO0FBQUEsVUFDZDtBQUFBO0FBQUEsVUFFQSw2QkFBNkI7QUFBQSxZQUMzQixVQUFVO0FBQUEsWUFDVixXQUFXO0FBQUEsWUFDWCxPQUFPO0FBQUEsWUFDUCxZQUFZO0FBQUEsVUFDZDtBQUFBLFVBQ0EseUJBQXlCO0FBQUEsWUFDdkIsVUFBVTtBQUFBLFlBQ1YsV0FBVztBQUFBLFlBQ1gsT0FBTztBQUFBLFlBQ1AsWUFBWTtBQUFBLFVBQ2Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxZQUM3QixRQUFRLENBQUMscUJBQXFCLGVBQWU7QUFBQSxZQUM3QyxVQUFVLENBQUMsdUJBQXVCO0FBQUEsWUFDbEMsT0FBTyxDQUFDLHdCQUF3Qix3QkFBd0I7QUFBQSxVQUMxRDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
