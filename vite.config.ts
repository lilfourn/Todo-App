import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: 'terser',
    // Enable source maps for development, disable for production
    sourcemap: mode === 'development',
    // Terser configuration to strip console statements in production
    // The logger utility (src/lib/logger.ts) handles production logging
    terserOptions: {
      compress: {
        // Remove all console statements in production builds
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        // Treat these console methods as side-effect-free for removal
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.info', 'console.warn'] : [],
      },
      format: {
        // Remove comments from production builds
        comments: false,
      },
    },
  },
  base: './',
}))

/**
 * Subresource Integrity (SRI) Configuration
 * 
 * SRI is currently NOT configured because this application bundles all assets
 * locally via Vite and does not load resources from external CDNs.
 * 
 * If you need to add external resources (e.g., fonts from Google Fonts,
 * scripts from CDNs), follow these steps:
 * 
 * 1. Install SRI plugin:
 *    npm install --save-dev vite-plugin-sri3
 * 
 * 2. Import and configure in this file:
 *    import sri from 'vite-plugin-sri3';
 *    
 *    export default defineConfig(({ mode }) => ({
 *      plugins: [
 *        react(),
 *        sri() // Add at the end of plugins array
 *      ],
 *      // ... rest of config
 *    }));
 * 
 * 3. The plugin will automatically add integrity attributes to:
 *    - <script> tags in index.html
 *    - <link rel="stylesheet"> tags
 *    - Dynamically imported chunks
 * 
 * 4. For external CDN resources, manually add integrity attributes:
 *    <link
 *      href="https://fonts.googleapis.com/css2?family=Inter"
 *      rel="stylesheet"
 *      integrity="sha384-..."
 *      crossorigin="anonymous"
 *    />
 * 
 * 5. Generate integrity hashes for external resources:
 *    curl -s https://example.com/resource.js | openssl dgst -sha384 -binary | openssl base64 -A
 * 
 * Security Note:
 * - SRI protects against compromised CDNs by verifying resource integrity
 * - Always use HTTPS with SRI (integrity checks fail over HTTP)
 * - Update integrity hashes when external resources change
 * - Consider using SRI for all external resources in production
 * 
 * References:
 * - vite-plugin-sri3: https://www.npmjs.com/package/vite-plugin-sri3
 * - MDN SRI: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
 * - W3C SRI Spec: https://www.w3.org/TR/SRI/
 */
