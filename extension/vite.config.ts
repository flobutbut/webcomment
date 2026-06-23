import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webExtension from 'vite-plugin-web-extension'
import { readFileSync } from 'fs'

function buildManifest(browser: string) {
  const manifest = JSON.parse(readFileSync('./manifest.json', 'utf-8'))
  if (browser === 'firefox') {
    const { service_worker, ...bgRest } = manifest.background
    manifest.background = { scripts: [service_worker], ...bgRest }
  }
  return manifest
}

export default defineConfig(({ mode }) => {
  const browser = mode === 'firefox' ? 'firefox' : 'chrome'
  return {
    plugins: [
      react(),
      tailwindcss(),
      webExtension({
        browser,
        manifest: () => buildManifest(browser),
      }),
    ],
  }
})
