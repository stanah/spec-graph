const isTest = process.env.VITEST || process.env.NODE_ENV === 'test';

const plugins = {};

if (!isTest) {
  // テスト時は tailwindcss/autoprefixer を読み込まない（依存未インストールでも動作させるため）
  // ビルド/開発時は有効化
  // ここでは文字キー指定により PostCSS が require するため、条件下のみ設定する
  plugins['tailwindcss'] = {};
  plugins['autoprefixer'] = {};
}

export default {
  plugins,
};
