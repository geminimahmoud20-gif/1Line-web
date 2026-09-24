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
        // Only split stable, always-needed vendors. jsPDF/html2canvas and leaflet are left to the
        // natural split so they load on demand instead of being preloaded on first paint
        // (a catch-all "vendor-libs" chunk previously dragged the 527KB PDF bundle into every page load).
        manualChunks(id) {
          if (!id.includes('node_modules') || id.includes('.css')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
        }
      }
    }
  }
})
