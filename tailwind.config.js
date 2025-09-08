/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.vscode.html',
    './src/**/*.{ts,tsx,html}',
    './extension/webview/**/*.html'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // VSCode テーマ変数へのブリッジ（カスタムプロパティを利用）
        vscode: {
          bg: 'var(--vscode-editor-background)',
          fg: 'var(--vscode-foreground)',
          border: 'var(--vscode-panel-border)',
          link: 'var(--vscode-textLink-foreground)',
          sidebar: 'var(--vscode-sideBar-background)',
          tabActiveBg: 'var(--vscode-tab-activeBackground)',
          tabInactiveBg: 'var(--vscode-tab-inactiveBackground)',
          listHover: 'var(--vscode-list-hoverBackground)'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)'
      }
    }
  },
  plugins: []
}

