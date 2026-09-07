import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    // maplibre-gl loads its own worker via `new Worker(new URL(...))`,
    // which Vite's esbuild-based dep pre-bundler can't resolve correctly —
    // it ends up looking for a "maplibre-gl-worker.mjs" file inside
    // node_modules/.vite/deps that was never actually generated there.
    // Excluding it just means the browser loads maplibre-gl directly from
    // node_modules instead of a pre-bundled copy, which is fine since it
    // already ships pre-built ESM.
    exclude: ['maplibre-gl'],
  },
})
