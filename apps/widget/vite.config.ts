import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  if (command === 'build') {
    // 本番ビルド: スクリプトタグとして埋め込み可能な IIFE バンドル
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/main.tsx'),
          name: 'AISalesWidget',
          fileName: () => 'widget',
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
        cssCodeSplit: false,
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    };
  }

  // 開発モード: 通常の Vite dev server
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
