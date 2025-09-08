import React from 'react';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
  expanded?: boolean;
}

export interface FileListProps {
  rootPath?: string;
  onFileSelect?: (filePath: string) => void;
  fileExtensions?: string[];
  onRootPathChange?: (newPath: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ 
  rootPath = '.',
  onFileSelect,
  onRootPathChange,
  fileExtensions = ['.md', '.txt', '.json', '.yaml', '.yml']
}) => {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState(rootPath);
  const [showPathEditor, setShowPathEditor] = React.useState(false);
  const [pathInput, setPathInput] = React.useState(rootPath);

  // ファイル一覧を取得する関数（VSCode APIを使用）
  const loadFiles = React.useCallback(async (directoryPath: string): Promise<FileItem[]> => {
    if (typeof window !== 'undefined' && (window as any).vscode) {
      const vscode = (window as any).vscode;
      
      try {
        // VSCodeにファイル一覧取得を要求
        return new Promise((resolve) => {
          const requestId = Date.now().toString();
          
          // レスポンス待機
          const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'fileListResponse' && message.requestId === requestId) {
              window.removeEventListener('message', messageHandler);
              resolve(message.files || []);
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // ファイル一覧要求を送信
          vscode.postMessage({
            command: 'getFileList',
            requestId,
            directoryPath,
            extensions: fileExtensions
          });
        });
      } catch (error) {
        console.error('ファイル一覧の取得に失敗:', error);
        return [];
      }
    }
    
    // VSCode APIが利用できない場合のモックデータ
    return [
      {
        name: 'docs',
        path: 'docs',
        type: 'directory',
        children: [
          { name: 'README.md', path: 'docs/README.md', type: 'file' },
          { name: 'guide.md', path: 'docs/guide.md', type: 'file' }
        ]
      },
      { name: 'sample.json', path: 'sample.json', type: 'file' },
      { name: 'config.yaml', path: 'config.yaml', type: 'file' }
    ];
  }, [fileExtensions]);

  // パス変更の処理
  const handlePathChange = React.useCallback(async (newPath: string) => {
    setCurrentPath(newPath);
    setPathInput(newPath);
    onRootPathChange?.(newPath);
    
    setIsLoading(true);
    try {
      const fileList = await loadFiles(newPath);
      setFiles(fileList);
      setExpanded(new Set()); // 展開状態をリセット
    } catch (error) {
      console.error('ファイル一覧の読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadFiles, onRootPathChange]);

  // パス入力の確定
  const handlePathSubmit = React.useCallback(() => {
    if (pathInput !== currentPath) {
      handlePathChange(pathInput);
    }
    setShowPathEditor(false);
  }, [pathInput, currentPath, handlePathChange]);

  // 初期ロード
  React.useEffect(() => {
    handlePathChange(rootPath);
  }, [rootPath, handlePathChange]);

  // rootPathプロパティが変更された時の処理
  React.useEffect(() => {
    if (rootPath !== currentPath) {
      handlePathChange(rootPath);
    }
  }, [rootPath, currentPath, handlePathChange]);

  // ディレクトリの展開/折り畳み
  const toggleExpand = React.useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // ファイルクリック時の処理
  const handleFileClick = React.useCallback((file: FileItem) => {
    if (file.type === 'directory') {
      toggleExpand(file.path);
    } else {
      onFileSelect?.(file.path);
    }
  }, [toggleExpand, onFileSelect]);

  // ファイルツリーをレンダリング
  const renderFileTree = React.useCallback((items: FileItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expanded.has(item.path);
      const hasChildren = item.type === 'directory' && item.children && item.children.length > 0;
      
      return (
        <div key={item.path} style={{ marginLeft: depth * 12 }}>
          <div
            onClick={() => handleFileClick(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
              cursor: 'pointer',
              fontSize: '12px',
              borderRadius: '2px',
              ':hover': {
                backgroundColor: 'var(--vscode-list-hoverBackground)'
              }
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--vscode-list-hoverBackground)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {item.type === 'directory' ? (
              <span style={{ marginRight: 4, minWidth: '12px', textAlign: 'center' }}>
                {hasChildren ? (isExpanded ? '▼' : '▶') : '📁'}
              </span>
            ) : (
              <span style={{ marginRight: 4, minWidth: '12px', textAlign: 'center' }}>📄</span>
            )}
            <span>{item.name}</span>
          </div>
          {hasChildren && isExpanded && item.children && (
            <div>
              {renderFileTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }, [expanded, handleFileClick]);

  if (isLoading) {
    return (
      <div style={{ padding: '8px', fontSize: '12px', opacity: 0.7 }}>
        ファイル一覧を読み込み中...
      </div>
    );
  }

  return (
    <div data-testid="file-list">
      <div style={{ 
        padding: '4px 8px', 
        fontSize: '12px', 
        fontWeight: 'bold', 
        borderBottom: '1px solid var(--vscode-panel-border)',
        marginBottom: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>ファイル</span>
        <button
          onClick={() => setShowPathEditor(!showPathEditor)}
          style={{
            background: 'transparent',
            border: '1px solid var(--vscode-button-border)',
            color: 'var(--vscode-button-foreground)',
            fontSize: '10px',
            padding: '2px 4px',
            cursor: 'pointer',
            borderRadius: '2px'
          }}
          title="ディレクトリを変更"
        >
          📁
        </button>
      </div>

      {/* パス設定エリア */}
      {showPathEditor && (
        <div style={{ 
          padding: '4px 8px', 
          borderBottom: '1px solid var(--vscode-panel-border)',
          marginBottom: '4px'
        }}>
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePathSubmit();
              }
            }}
            placeholder="ディレクトリパスを入力"
            style={{
              width: '100%',
              padding: '2px 4px',
              fontSize: '11px',
              background: 'var(--vscode-input-background)',
              border: '1px solid var(--vscode-input-border)',
              color: 'var(--vscode-input-foreground)',
              marginBottom: '4px'
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handlePathSubmit}
              style={{
                background: 'var(--vscode-button-background)',
                border: 'none',
                color: 'var(--vscode-button-foreground)',
                fontSize: '10px',
                padding: '2px 6px',
                cursor: 'pointer',
                borderRadius: '2px',
                flex: 1
              }}
            >
              適用
            </button>
            <button
              onClick={() => {
                setPathInput(currentPath);
                setShowPathEditor(false);
              }}
              style={{
                background: 'var(--vscode-button-secondaryBackground)',
                border: 'none',
                color: 'var(--vscode-button-secondaryForeground)',
                fontSize: '10px',
                padding: '2px 6px',
                cursor: 'pointer',
                borderRadius: '2px',
                flex: 1
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 現在のパス表示 */}
      <div style={{ 
        padding: '2px 8px', 
        fontSize: '10px', 
        opacity: 0.7,
        borderBottom: '1px solid var(--vscode-panel-border)',
        marginBottom: '4px',
        wordBreak: 'break-all'
      }}>
        {currentPath}
      </div>
      
      {files.length === 0 ? (
        <div style={{ padding: '8px', fontSize: '12px', opacity: 0.7 }}>
          ファイルが見つかりませんでした
        </div>
      ) : (
        <div>
          {renderFileTree(files)}
        </div>
      )}
    </div>
  );
};

export default FileList;