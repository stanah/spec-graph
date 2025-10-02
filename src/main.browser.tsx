import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './browser/BrowserApp';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './index.css';
import './components/shared/ErrorBoundary.css';
import './styles/colorMode.css';

// ブラウザ環境用のメインエントリーポイント
import { PlatformAdapterFactory } from './platform';

// ブラウザ環境の設定
console.log('ブラウザ環境で実行中');

// アプリケーションの初期化
async function initializeApp() {
  try {
    // プラットフォームアダプターの初期化
    const platformAdapter = PlatformAdapterFactory.getInstance();
    await platformAdapter.initialize();

    console.log(`プラットフォーム: ${platformAdapter.getPlatformType()}`);

    // Reactアプリケーションのマウント
    const root = ReactDOM.createRoot(
      document.getElementById('root') as HTMLElement
    );

    root.render(
      <React.StrictMode>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('アプリケーションエラー:', error, errorInfo);
            // ブラウザ版ではコンソールとアラートでエラーを通知
            alert(`エラーが発生しました: ${error.message}`);
          }}
        >
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('ブラウザアプリケーションの初期化が完了しました');
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    alert(`初期化エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// アプリケーションの初期化を実行
initializeApp();
