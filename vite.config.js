import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import path from 'node:path'
import react from '@vitejs/plugin-react'

function getSafeOutDir() {
  if (process.platform === 'win32') {
    try {
      const shortRoot = execSync(
        `powershell -NoProfile -Command "(New-Object -ComObject Scripting.FileSystemObject).GetFolder('${process.cwd()}').ShortPath"`,
        { encoding: 'utf8' }
      ).trim()
      if (shortRoot) {
        return path.posix.join(shortRoot.replace(/\\/g, '/'), 'dist')
      }
    } catch {
      // fallback to default
    }
  }
  return 'dist'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: getSafeOutDir(),
    emptyOutDir: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
