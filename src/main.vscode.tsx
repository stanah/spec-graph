import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './vscode/VSCodeApp';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './index.css';
import './components/shared/ErrorBoundary.css';
import './styles/colorMode.css';

// VSCode拡張環境用のメインエントリーポイント
import { PlatformAdapterFactory } from './platform';
import { VSCodePlatformAdapter as _VSCodePlatformAdapter } from './platform/vscode/VSCodePlatformAdapter';
import VSCodeApiSingleton from './platform/vscode/VSCodeApiSingleton';

// VSCode環境の検出と設定
if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
  // VSCode拡張環境用のアダプターを設定
  // 現在はまだ実装されていないため、ブラウザアダプターを使用
  console.log('VSCode拡張環境で実行中（開発版）');
  
  // 将来的にVSCodeアダプターが実装されたら以下のコメントを解除
  // const vscodeAdapter = new VSCodePlatformAdapter();
  // PlatformAdapterFactory.setInstance(vscodeAdapter);
}

// VSCode Webview用のグローバル関数を設定（types/global.d.ts で定義済み）

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
            // VSCode拡張にエラーを通知
            const singleton = VSCodeApiSingleton.getInstance();
            if (singleton.isAvailable()) {
              singleton.postMessage({
                command: 'applicationError',
                error: {
                  message: error.message,
                  stack: error.stack,
                  componentStack: errorInfo.componentStack,
                }
              });
            }
          }}
        >
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    // VSCode拡張との通信用のグローバル関数は VSCodeApp.tsx で設定される
    
    // VSCode拡張に準備完了を通知
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'appInitialized',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    
    // VSCode拡張にエラーを通知
    const singleton = VSCodeApiSingleton.getInstance();
    if (singleton.isAvailable()) {
      singleton.postMessage({
        command: 'initializationError',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// アプリケーションの初期化を実行
initializeApp();