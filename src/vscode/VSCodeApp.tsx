import { useState, useEffect, useCallback } from 'react';
import { ViewSwitcher } from './components/ViewSwitcher';
import { ViewContainer } from './components/ViewContainer';
import { AlertComponent } from '../components/shared/AlertComponent';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useAppStore } from '../stores/appStore';
import { PlatformAdapterFactory } from '../platform';
import VSCodeApiSingleton from '../platform/vscode/VSCodeApiSingleton';
import '../index.css';
import { ViewProvider } from '../contexts/ViewContext';

/**
 * VSCode拡張用のアプリケーションコンポーネント
 * マインドマップのプレビューのみを表示（エディタはVSCode側で管理）
 */
function VSCodeApp() {
  const { 
    initialize,
    initialized,
    ui: { isLoading, loadingMessage },
    file: { fileContent },
    addNotification,
    updateContent
  } = useAppStore();

  const [isVSCodeReady, setIsVSCodeReady] = useState(false);
  const [currentContent, setCurrentContent] = useState('');

  // VSCode側との通信処理
  const handleVSCodeMessage = useCallback((event: MessageEvent) => {
    const message = event.data as { command?: string; content?: string; fileName?: string };
    if (!message || typeof message !== 'object' || !message.command) return;

    switch (message.command) {
      case 'updateDocument':
      case 'updateContent': {
        const content = message.content ?? '';
        setCurrentContent(content);
        if (message.fileName) {
          document.title = `Mindmap Preview: ${message.fileName.split('/').pop()}`;
        }
        try {
          updateContent(content, true);
        } catch {
          /* no-op */
        }
        break;
      }
      case 'configurationChanged': {
        const config = (message as any).configuration;
        console.log('VSCode設定が変更されました:', config);
        break;
      }
      case 'themeChanged': {
        console.log('VSCodeテーマが変更されました');
        break;
      }
      default:
        console.log('未知のVSCodeメッセージ:', message);
        break;
    }
  }, [updateContent]);

  // VSCode APIの初期化
  useEffect(() => {
    const singleton = VSCodeApiSingleton.getInstance();
    
    if (singleton.isAvailable()) {
      const vscode = singleton.getApi();
      
      // VSCodeからのメッセージを監視
      window.addEventListener('message', handleVSCodeMessage);
      
      // VSCode側に準備完了を通知
      if (vscode) {
        vscode.postMessage({
          command: 'webviewReady'
        });
      }
      
      // 初期ファイル内容を読み込み（VSCodeからの初期データ）
      if (window.initialData?.content) {
        const initialContent = window.initialData.content;
        setCurrentContent(initialContent);
        updateContent(initialContent);
      } else {
        // no-op
      }
      
      setIsVSCodeReady(true);
      
      // VSCode用のグローバル関数を設定
      window.mindmapApp = {
        updateContent: (content: string) => {
          setCurrentContent(content);
          updateContent(content, true); // fromVSCode: true
        },
        
        saveFile: () => {
          console.log('保存要求を受信（現在は自動保存）');
        },
        
        getCurrentContent: () => {
          return currentContent;
        }
      };
      
      return () => {
        window.removeEventListener('message', handleVSCodeMessage);
      };
    } else {
      setIsVSCodeReady(true); // ブラウザモードとして続行
    }
  }, [handleVSCodeMessage, updateContent, currentContent]);

  // アプリケーションの初期化
  useEffect(() => {
    const initApp = async () => {
      try {
        if (!isVSCodeReady) {
          return;
        }
        await initialize();
        const platformAdapter = PlatformAdapterFactory.getInstance();
        
        if (platformAdapter.getPlatformType() === 'vscode') {
          const editorAdapter = platformAdapter.editor;
          
          // エディタの内容変更を監視
          editorAdapter.onDidChangeContent((content: string) => {
            setCurrentContent(content);
            updateContent(content, true); // fromVSCode: true
          });
        }
        
      } catch (error) {
        addNotification({
          type: 'error',
          message: `初期化エラー: ${error instanceof Error ? error.message : String(error)}`,
          duration: 5000,
          autoHide: true
        });
      }
    };

    initApp();
  }, [initialize, isVSCodeReady, initialized, addNotification, updateContent]);

  // ローディング中の表示
  if (!initialized || isLoading) {
    return (
      <div className="vscode-app loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-message">
            {loadingMessage || 'VSCodeマインドマップビューアを初期化中...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vscode-app" data-testid="vscode-app">
      {/* アラート表示 */}
      <AlertComponent />
      
      {/* ビュー切り替え + コンテンツ */}
      <ViewProvider>
        <ViewSwitcher />
        <div className="vscode-content">
          <ErrorBoundary
            fallback={
              <div className="mindmap-error">
                <h3>🗺️ ビュー表示でエラーが発生しました</h3>
                <p>ビューのレンダリング中にエラーが発生しました。</p>
                <button onClick={() => window.location.reload()}>
                  リロード
                </button>
              </div>
            }
            onError={(error, errorInfo) => {
              console.error('ViewContainer error:', error, errorInfo);
              addNotification({
                type: 'error',
                message: `ビューエラー: ${error.message}`,
                duration: 5000,
                autoHide: true
              });
            }}
          >
            <ViewContainer />
          </ErrorBoundary>
        </div>
      </ViewProvider>
      
      {/* VSCode用のステータス表示 */}
      <div className="vscode-status">
        <span className="status-indicator">
          {isVSCodeReady ? '🔗 VSCode連携中' : '⚠️ ブラウザモード'}
        </span>
        {fileContent && (
          <span className="content-status">
            📊 データ読み込み済み
          </span>
        )}
      </div>
    </div>
  );
}

export default VSCodeApp;
