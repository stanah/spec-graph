import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * ブラウザ版Web App用のVite設定
 */
export default defineConfig({
  plugins: [react()],

  // ブラウザ版の環境変数設定
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.VSCODE_WEBVIEW': JSON.stringify('false')
  },

  build: {
    // ブラウザアプリ用の出力設定
    outDir: 'dist/browser',
    emptyOutDir: true,

    // ブラウザ用のrollup設定
    rollupOptions: {
      input: resolve(__dirname, 'index.browser.html'),
      output: {
        format: 'es',
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },

      // ブラウザ版では外部モジュールは使用しない（すべてバンドル）
      external: [],

      // tree-shaking最適化設定
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        annotations: true
      }
    },

    // ブラウザ向けターゲット
    target: 'es2020',
    minify: 'terser',

    // ソースマップを生成（デバッグ用）
    sourcemap: true,

    // コード分割設定
    chunkSizeWarningLimit: 1000,
  },

  // ブラウザ版用の最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      // D3を個別モジュールとして最適化
      'd3-selection',
      'd3-zoom',
      'd3-hierarchy',
      'd3-shape',
      'd3-scale',
      'd3-interpolate',
      'd3-color',
      'js-yaml',
      'ajv',
      'zustand'
    ],
    esbuildOptions: {
      treeShaking: true
    }
  },

  // 静的アセットの処理設定
  assetsInclude: ['**/*.ttf', '**/*.woff', '**/*.woff2'],

  // 開発サーバー設定
  server: {
    port: 3000,
    strictPort: false,
    open: true,
    cors: true,
  },

  // プレビューサーバー設定
  preview: {
    port: 4173,
    strictPort: false,
    open: true,
  },

  // パス解決の設定
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@platform': resolve(__dirname, 'src/platform')
    }
  },

  // CSS設定
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
});
