import { defineConfig } from 'vite'

export default defineConfig({
  // Base path removed so assets resolve correctly at the root on Vercel
  build: {
    // We removed outDir 'docs' so it defaults back to 'dist' which Vercel expects
    emptyOutDir: true,
  }
})
