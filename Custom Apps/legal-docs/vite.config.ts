import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Local shim for the SharePoint Embedded Copilot SDK (tgz not installable via npm/bun)
    
      // Force all React imports to use the same instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    // Deduplicate React to fix "Cannot read properties of null (reading 'useState')"
    // This ensures the SharePoint SDK uses the same React instance as the app
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    // Force pre-bundling of these to ensure single instance
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    // Exclude the SDK from optimization to let it use our React
    
  },
  build: {
    commonjsOptions: {
      // Handle CommonJS modules that might bundle their own React
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
