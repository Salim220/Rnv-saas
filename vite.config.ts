import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative assets: required for GitHub Pages project sites (/<repo>/).
  base: './',
  plugins: [react(), tailwindcss()],
})
