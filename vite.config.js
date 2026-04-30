import { defineConfig } from 'vite'

export default defineConfig({
  // Base path matches the GitHub repo name so assets resolve correctly on GitHub Pages
  base: '/nomination/',
  build: {
    outDir: 'docs',
    emptyOutDir: true, // Clean the docs folder before building
  }
})
