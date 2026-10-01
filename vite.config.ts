/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // caminhos relativos: o app funciona em qualquer subpasta de hospedagem
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'LogosQuest: A Jornada dos Originais',
        short_name: 'LogosQuest',
        description: 'Aprenda Hebraico Bíblico e Grego Koiné do zero até a leitura dos textos originais.',
        lang: 'pt-BR',
        theme_color: '#2b2118',
        background_color: '#f4ecdc',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
        // áudios gravados entram sob demanda, não no pré-cache
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.(mp3|ogg|wav)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 2000 } },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
