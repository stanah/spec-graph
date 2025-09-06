/**
 * 状態管理の型定義
 * 
 * このファイルは、Zustandを使用した状態管理で使用される
 * 型とインターフェースを定義します。
 */

import type { 
  MindmapData, 
  ParseError,
  NotificationType, 
  NodeSelection, 
  EditorSettings, 
  MindmapSettings,
  AppSettings,
  ValidationResult
} from './index';

/**
 * ビューモードの型
 */
export type ViewMode = 'mindmap' | 'table' | 'document';

/**
 * ファイル状態
 */
export interface FileState {
  /** 現在開いているファイルのパス */
  currentFile: string | null;
  /** ファイルの内容 */
  fileContent: string;
  /** 変更されているかどうか */
  isDirty: boolean;
  /** 最後に保存された時刻 */
  lastSaved: number | null;
  /** ファイル形式 */
  fileFormat: 'json' | 'yaml' | null;
  /** ファイルサイズ */
  fileSize: number;
  /** ファイルの文字エンコーディング */
  encoding: string;
}

/**
 * パース状態
 */
export interface ParseState {
  /** 解析されたマインドマップデータ */
  parsedData: MindmapData | null;
  /** パースエラーの配列 */
  parseErrors: ParseError[];
  /** バリデーション結果 */
  validationResult: ValidationResult | null;
  /** パース中かどうか */
  isParsing: boolean;
  /** 最後にパースした時刻 */
  lastParsed: number | null;
  /** パースの成功回数 */
  parseSuccessCount: number;
  /** パースの失敗回数 */
  parseErrorCount: number;
}

/**
 * エディタカーソル位置
 */
export interface EditorCursorPosition {
  /** 行番号（1-based） */
  line: number;
  /** 列番号（1-based） */
  column: number;
}

/**
 * エディタハイライト範囲
 */
export interface EditorHighlightRange {
  /** 開始行（1-based） */
  startLine: number;
  /** 開始列（1-based） */
  startColumn: number;
  /** 終了行（1-based） */
  endLine: number;
  /** 終了列（1-based） */
  endColumn: number;
  /** ハイライトの理由 */
  reason?: 'node-selection' | 'search' | 'error';
}

/**
 * UI状態
 */
export interface UIState {
  /** エディタ設定 */
  editorSettings: EditorSettings;
  /** マインドマップ設定 */
  mindmapSettings: MindmapSettings;
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** 選択されたノードID */
  selectedNodeId: string | null;
  /** ノード選択情報 */
  nodeSelection: NodeSelection | null;
  /** エディタのカーソル位置 */
  editorCursorPosition: EditorCursorPosition | null;
  /** エディタのハイライト範囲 */
  editorHighlightRange: EditorHighlightRange | null;
  /** カーソル位置に対応するノードID */
  cursorCorrespondingNodeId: string | null;
  /** サイドバーが開いているかどうか */
  sidebarOpen: boolean;
  /** 設定パネルが開いているかどうか */
  settingsPanelOpen: boolean;
  /** エラーパネルが開いているかどうか */
  errorPanelOpen: boolean;
  /** ローディング状態 */
  isLoading: boolean;
  /** ローディングメッセージ */
  loadingMessage: string;
  /** 通知メッセージ */
  notifications: Notification[];
  /** モーダルダイアログの状態 */
  modal: ModalState | null;
  /** パネルのサイズ */
  panelSizes: {
    editor: number;
    mindmap: number;
  };
  /** フルスクリーンモード */
  fullscreen: boolean;
  /** ダークモード */
  darkMode: boolean;
}

/**
 * 通知メッセージ
 */
export interface Notification {
  /** 通知ID */
  id: string;
  /** メッセージ */
  message: string;
  /** 通知タイプ */
  type: NotificationType;
  /** 表示時刻 */
  timestamp: number;
  /** 自動で消えるかどうか */
  autoHide: boolean;
  /** 表示時間（ミリ秒） */
  duration?: number;
  /** アクションボタン */
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * モーダルダイアログの状態
 */
export interface ModalState {
  /** モーダルタイプ */
  type: 'confirm' | 'prompt' | 'alert' | 'custom';
  /** タイトル */
  title: string;
  /** メッセージ */
  message: string;
  /** 入力値（promptタイプの場合） */
  inputValue?: string;
  /** 確認コールバック */
  onConfirm?: (value?: string) => void;
  /** キャンセルコールバック */
  onCancel?: () => void;
  /** カスタムコンテンツ */
  customContent?: React.ReactNode;
}

/**
 * アプリケーション状態
 */
export interface AppState {
  /** ファイル状態 */
  file: FileState;
  /** パース状態 */
  parse: ParseState;
  /** UI状態 */
  ui: UIState;
  /** アプリケーション設定 */
  settings: AppSettings;
  /** 最近開いたファイル */
  recentFiles: string[];
  /** アプリケーションの初期化状態 */
  initialized: boolean;
  /** デバッグモード */
  debugMode: boolean;
}

/**
 * アクション型定義
 */
export interface AppActions {
  // ファイル操作
  /** ファイルを読み込む */
  loadFile: (path: string) => Promise<void>;
  /** ファイルを保存する */
  saveFile: () => Promise<void>;
  /** 名前を付けて保存 */
  saveFileAs: (path: string) => Promise<void>;
  /** 新規ファイルを作成 */
  newFile: () => void;
  /** ファイルを閉じる */
  closeFile: () => void;
  /** 最近のファイルを開く */
  openRecentFile: (path: string) => Promise<void>;

  // エディタ操作
  /** エディタの内容を更新 */
  updateContent: (content: string, fromVSCode?: boolean) => void;
  /** エディタ設定を更新 */
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  /** エディタにフォーカス */
  focusEditor: () => void;
  /** 指定行にジャンプ */
  goToLine: (line: number) => void;
  /** エディタのカーソル位置を更新 */
  updateEditorCursorPosition: (position: EditorCursorPosition) => void;
  /** エディタのハイライト範囲を設定 */
  setEditorHighlight: (range: EditorHighlightRange | null) => void;
  /** エディタの該当箇所をハイライト */
  highlightEditorRange: (startLine: number, startColumn: number, endLine: number, endColumn: number, reason?: 'node-selection' | 'search' | 'error') => void;

  // パース操作
  /** コンテンツをパースする */
  parseContent: (content: string) => Promise<void>;

  // マインドマップ操作
  /** ノードを選択 */
  selectNode: (nodeId: string | null) => void;
  /** ノードの折りたたみ状態を切り替え */
  toggleNodeCollapse: (nodeId: string) => void;
  /** マインドマップ設定を更新 */
  updateMindmapSettings: (settings: Partial<MindmapSettings>) => void;
  /** ズームレベルを設定 */
  setZoom: (level: number) => void;
  /** 中心位置を設定 */
  setCenter: (x: number, y: number) => void;
  /** レイアウトをリセット */
  resetLayout: () => void;

  // UI操作
  /** サイドバーの表示/非表示を切り替え */
  toggleSidebar: () => void;
  /** 設定パネルの表示/非表示を切り替え */
  toggleSettingsPanel: () => void;
  /** エラーパネルの表示/非表示を切り替え */
  toggleErrorPanel: () => void;
  /** パネルサイズを更新 */
  updatePanelSizes: (sizes: { editor: number; mindmap: number }) => void;
  /** フルスクリーンモードを切り替え */
  toggleFullscreen: () => void;
  /** ダークモードを切り替え */
  toggleDarkMode: () => void;
  /** ビューモードを設定 */
  setViewMode: (mode: ViewMode) => void;

  // 通知操作
  /** 通知を追加 */
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  /** 通知を削除 */
  removeNotification: (id: string) => void;
  /** 全ての通知をクリア */
  clearNotifications: () => void;

  // モーダル操作
  /** モーダルを表示 */
  showModal: (modal: ModalState) => void;
  /** モーダルを閉じる */
  closeModal: () => void;

  // 設定操作
  /** 設定を更新 */
  updateSettings: (settings: Partial<AppSettings>) => void;
  /** 設定をリセット */
  resetSettings: () => void;
  /** 設定をエクスポート */
  exportSettings: () => Record<string, unknown>;
  /** 設定をインポート */
  importSettings: (settings: Record<string, unknown>) => void;

  // アプリケーション操作
  /** アプリケーションを初期化 */
  initialize: () => Promise<void>;
  /** デバッグモードを切り替え */
  toggleDebugMode: () => void;
  /** アプリケーションをリセット */
  reset: () => void;

  // パフォーマンス関連
  /** ノード数をカウント */
  countNodes: (node: import('./index').MindmapNode) => number;
  /** パフォーマンス統計を取得 */
  getPerformanceStats: () => {
    parseMetrics: Record<string, unknown> | null;
    memoryInfo: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
      usageRatio: number;
    } | null;
    totalMetrics: number;
  };
  /** パフォーマンス統計をログ出力 */
  logPerformanceStats: () => void;
  /** メモリ使用量を最適化 */
  optimizeMemory: () => void;
}

/**
 * ストアの型定義
 */
export type AppStore = AppState & AppActions;

/**
 * ストアセレクター
 */
export interface StoreSelectors {
  /** ファイルが開かれているかどうか */
  hasOpenFile: (state: AppState) => boolean;
  /** ファイルが変更されているかどうか */
  isFileDirty: (state: AppState) => boolean;
  /** パースエラーがあるかどうか */
  hasParseErrors: (state: AppState) => boolean;
  /** ノードが選択されているかどうか */
  hasSelectedNode: (state: AppState) => boolean;
  /** ローディング中かどうか */
  isLoading: (state: AppState) => boolean;
  /** 通知があるかどうか */
  hasNotifications: (state: AppState) => boolean;
  /** モーダルが開いているかどうか */
  isModalOpen: (state: AppState) => boolean;
  /** 現在のファイル名を取得 */
  getCurrentFileName: (state: AppState) => string | null;
  /** 現在のファイル拡張子を取得 */
  getCurrentFileExtension: (state: AppState) => string | null;
  /** エラー数を取得 */
  getErrorCount: (state: AppState) => number;
  /** 警告数を取得 */
  getWarningCount: (state: AppState) => number;
}

/**
 * ストアミドルウェア
 */
export interface StoreMiddleware {
  /** アクション実行前の処理 */
  beforeAction?: (actionName: string, args: unknown[]) => void;
  /** アクション実行後の処理 */
  afterAction?: (actionName: string, args: unknown[], result: unknown) => void;
  /** エラー処理 */
  onError?: (error: Error, actionName: string, args: unknown[]) => void;
}

/**
 * ストア設定
 */
export interface StoreConfig {
  /** 永続化するかどうか */
  persist: boolean;
  /** 永続化キー */
  persistKey: string;
  /** デバッグモード */
  debug: boolean;
  /** ミドルウェア */
  middleware: StoreMiddleware[];
}

/**
 * ストアイベント
 */
export interface StoreEvent {
  /** イベントタイプ */
  type: string;
  /** イベントデータ */
  data: unknown;
  /** イベント発生時刻 */
  timestamp: number;
}

/**
 * ストアリスナー
 */
export type StoreListener = (event: StoreEvent, state: AppState) => void;
