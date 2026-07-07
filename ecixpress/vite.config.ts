import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import buildingImages from './vite-plugin-building-images'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildingImages()],
})
