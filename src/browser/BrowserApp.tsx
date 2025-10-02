import { useState, useEffect, useCallback } from 'react';
import { ViewSwitcher } from '../vscode/components/ViewSwitcher';
import { ViewContainer } from '../vscode/components/ViewContainer';
import { AlertComponent } from '../components/shared/AlertComponent';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useAppStore } from '../stores/appStore';
import { PlatformAdapterFactory } from '../platform';
import '../index.css';
import './BrowserApp.css';
import { ViewProvider } from '../contexts/ViewContext';

/**
 * ブラウザ版のアプリケーションコンポーネント
 * マインドマップの表示専用（編集機能なし）
 */
function BrowserApp() {
  const {
    initialize,
    initialized,
    ui: { isLoading, loadingMessage },
    file: { fileContent: _fileContent },
    addNotification,
    updateContent
  } = useAppStore();

  const [currentContent, setCurrentContent] = useState('');
  const [currentFileName, setCurrentFileName] = useState<string>('');

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback(async () => {
    try {
      const platformAdapter = PlatformAdapterFactory.getInstance();
      const filePath = await platformAdapter.fileSystem.showOpenDialog({
        title: 'マインドマップファイルを選択',
        filters: [
          { name: 'JSON/YAML', extensions: ['json', 'yaml', 'yml'] }
        ]
      });

      if (filePath) {
        const content = await platformAdapter.fileSystem.readFile(filePath);
        setCurrentContent(content);
        setCurrentFileName(filePath);
        updateContent(content, true);

        addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: `ファイルを読み込みました: ${filePath}`
        });
      }
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました'
      });
    }
  }, [addNotification, updateContent]);

  // ドラッグ&ドロップハンドラー
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      try {
        const content = await file.text();
        setCurrentContent(content);
        setCurrentFileName(file.name);
        updateContent(content, true);

        // ファイルをPlatformAdapterのキャッシュにも保存
        const platformAdapter = PlatformAdapterFactory.getInstance();
        (platformAdapter.fileSystem as any).setFile?.(file.name, content);

        addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: `ファイルを読み込みました: ${file.name}`
        });
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: 'ファイルの読み込みに失敗しました'
        });
      }
    }
  }, [addNotification, updateContent]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // 初期化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        await platformAdapter.initialize();

        console.log(`プラットフォーム: ${platformAdapter.getPlatformType()}`);

        await initialize();
      } catch (error) {
        console.error('アプリケーションの初期化エラー:', error);
        addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: 'アプリケーションの初期化に失敗しました'
        });
      }
    };

    initializeApp();
  }, [initialize, addNotification]);

  if (!initialized) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>初期化中...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('アプリケーションエラー:', error, errorInfo);
        addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: error.message
        });
      }}
    >
      <ViewProvider>
        <div
          className="browser-app-container"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* ヘッダー */}
          <div className="browser-app-header">
            <h1 className="app-title">Spec Graph Viewer</h1>
            <div className="header-actions">
              <button onClick={handleFileSelect} className="file-select-button">
                ファイルを開く
              </button>
              {currentFileName && (
                <span className="current-file-name">{currentFileName}</span>
              )}
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="browser-app-content">
            {isLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner" />
                <p>{loadingMessage}</p>
              </div>
            ) : (
              <>
                {currentContent ? (
                  <>
                    <ViewSwitcher />
                    <ViewContainer />
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-content">
                      <h2>ファイルを開く</h2>
                      <p>JSON/YAMLファイルをドラッグ&ドロップ、または「ファイルを開く」ボタンをクリックしてください</p>
                      <button onClick={handleFileSelect} className="empty-state-button">
                        ファイルを開く
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* アラート表示 */}
          <AlertComponent />
        </div>
      </ViewProvider>
    </ErrorBoundary>
  );
}

export default BrowserApp;
