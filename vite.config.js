import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * İçerik Güvenlik Politikası — ikinci savunma hattı. Uygulama hiçbir dış
 * kaynağa bağlanmıyor; bir XSS açığı çıksa bile veri dışarı sızdırılamasın
 * ve dış script yüklenemesin diye her şey 'self' ile sınırlı.
 *  - style 'unsafe-inline': React/framer-motion satır içi stil yazıyor.
 *  - worker blob: canvas-confetti animasyonu Blob URL'li worker'da çiziyor.
 *  - img/connect data: blob: paylaşım kartı (html-to-image) data URL üretip
 *    fetch ile Blob'a çeviriyor.
 * frame-ancestors meta etiketinde çalışmaz; o public/_headers'ta.
 * Yalnızca derlemede: dev sunucusu satır içi script enjekte ediyor.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

// charset'in hemen arkasına: charset ilk 1024 baytta olmalı, CSP ise
// kendisinden SONRAKİ kaynakları yönetir (başa ya da sona konamaz).
const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) => {
    const anchor = '<meta charset="UTF-8" />';
    if (!html.includes(anchor)) throw new Error('[inject-csp] index.html charset etiketi bulunamadı');
    return html.replace(anchor, `${anchor}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
  },
};

// Sürüm etiketi: Cloudflare Pages derlemede commit kimliğini verir.
const BUILD_ID = (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 7) || 'yerel';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(BUILD_DATE),
  },
  plugins: [
    react(),
    cspPlugin,
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      workbox: {
        // Yazı tipinin yalnızca Türkçe'yi kapsayan iki alt kümesi önbelleğe
        // alınır; kiril/yunan dosyaları hiç indirilmiyor, çevrimdışı için
        // önbelleğe almak ~300 KB israf olurdu.
        globPatterns: ['**/*.{js,css,html}', '**/inter-latin-wght-normal-*.woff2', '**/inter-latin-ext-wght-normal-*.woff2'],
        // Service worker her gezintiye uygulamanın index.html'ini döndürür;
        // ayrı bir HTML sayfası olan gizlilik notu bunun dışında kalmalı.
        navigateFallbackDenylist: [/^\/gizlilik/],
      },
      manifest: {
        // Sabit kimlik: start_url ileride değişse de kurulu uygulama aynı kalır.
        // Play Store (TWA) paketi de bu kimliğe bağlanacak.
        id: '/',
        name: 'YKS Hazırlık Takip',
        short_name: 'YKS Hazırlık',
        description: 'YKS Hazırlık, Net Takip ve Odak Kronometresi',
        lang: 'tr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        categories: ['education', 'productivity'],
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        // PNG şart: iOS SVG ikonu ana ekranda göstermiyor, Play Store paketleyicisi
        // 512px PNG istiyor. Maskable ayrı dosya, çünkü Android maskesi şeffaf
        // köşeli ikonu kırpınca kenarlarda boşluk kalıyor.
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
});
