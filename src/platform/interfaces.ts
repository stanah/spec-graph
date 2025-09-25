/**
 * プラットフォーム抽象化インターフェース
 * ブラウザ環境とVSCode拡張環境の両方に対応するための抽象化レイヤー
 */

// ファイルシステム操作の抽象化
export interface FileSystemAdapter {
  /**
   * ファイルを読み込む
   * @param path ファイルパス
   * @returns ファイル内容
   */
  readFile(path: string): Promise<string>;

  /**
   * ファイルを保存する
   * @param path ファイルパス
   * @param content ファイル内容
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * ファイルの存在確認
   * @param path ファイルパス
   * @returns ファイルが存在するかどうか
   */
  exists(path: string): Promise<boolean>;

  /**
   * ファイル選択ダイアログを表示
   * @param options ファイル選択オプション
   * @returns 選択されたファイルパス
   */
  showOpenDialog(options: FileDialogOptions): Promise<string | null>;

  /**
   * ファイル保存ダイアログを表示
   * @param options ファイル保存オプション
   * @returns 保存先ファイルパス
   */
  showSaveDialog(options: FileDialogOptions): Promise<string | null>;

  /**
   * ファイル変更の監視
   * @param path ファイルパス
   * @param callback 変更時のコールバック
   * @returns 監視を停止する関数
   */
  watchFile(path: string, callback: (content: string) => void): () => void;

  /**
   * 複数のファイル形式を監視（RelativePatternを使用）
   * @param patterns 監視するファイルパターンの配列
   * @param callback 変更時のコールバック
   * @returns 監視を停止する関数
   */
  watchFiles(patterns: string[], callback: (uri: string, changeType: 'created' | 'changed' | 'deleted') => void): () => void;
}

// エディタ操作の抽象化
export interface EditorAdapter {
  /**
   * エディタの内容を取得
   * @returns エディタの内容
   */
  getValue(): string;

  /**
   * エディタの内容を設定
   * @param value 設定する内容
   */
  setValue(value: string): void;

  /**
   * エディタの言語モードを設定
   * @param language 言語モード
   */
  setLanguage(language: 'json' | 'yaml'): void;

  /**
   * エディタのテーマを設定
   * @param theme テーマ名
   */
  setTheme(theme: string): void;

  /**
   * 指定行にカーソルを移動
   * @param line 行番号
   * @param column 列番号
   */
  setCursor(line: number, column?: number): void;

  /**
   * 指定範囲をハイライト
   * @param startLine 開始行
   * @param startColumn 開始列
   * @param endLine 終了行
   * @param endColumn 終了列
   */
  highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): void;

  /**
   * エラーマーカーを設定
   * @param errors エラー情報
   */
  setErrorMarkers(errors: EditorError[]): void;

  /**
   * 内容変更時のコールバックを設定
   * @param callback 変更時のコールバック
   */
  onDidChangeContent(callback: (content: string) => void): void;

  /**
   * カーソル位置変更時のコールバックを設定
   * @param callback カーソル位置変更時のコールバック
   */
  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void;
}

// UI操作の抽象化
export interface UIAdapter {
  /**
   * 情報メッセージを表示
   * @param message メッセージ
   */
  showInformationMessage(message: string): void;

  /**
   * 警告メッセージを表示
   * @param message メッセージ
   */
  showWarningMessage(message: string): void;

  /**
   * エラーメッセージを表示
   * @param message メッセージ
   */
  showErrorMessage(message: string): void;

  /**
   * 確認ダイアログを表示
   * @param message メッセージ
   * @param options 選択肢
   * @returns 選択された選択肢
   */
  showConfirmDialog(message: string, options: string[]): Promise<string | null>;

  /**
   * プログレスバーを表示
   * @param title タイトル
   * @param task 実行するタスク
   */
  withProgress<T>(title: string, task: (progress: ProgressReporter) => Promise<T>): Promise<T>;

  /**
   * ステータスバーにメッセージを表示
   * @param message メッセージ
   * @param timeout タイムアウト（ミリ秒）
   */
  showStatusBarMessage(message: string, timeout?: number): void;
}

// 設定管理の抽象化
export interface SettingsAdapter {
  /**
   * 設定値を取得
   * @param key 設定キー
   * @param defaultValue デフォルト値
   * @returns 設定値
   */
  get<T>(key: string, defaultValue?: T): T;

  /**
   * 設定値を保存
   * @param key 設定キー
   * @param value 設定値
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * 設定変更時のコールバックを設定
   * @param callback 変更時のコールバック
   */
  onDidChange(callback: (key: string, value: unknown) => void): void;

  /**
   * すべての設定を取得
   * @returns すべての設定
   */
  getAll(): Record<string, unknown>;

  /**
   * 設定をリセット
   * @param key 設定キー
   */
  reset(key: string): Promise<void>;
}

// メインのプラットフォームアダプター
export interface PlatformAdapter {
  fileSystem: FileSystemAdapter;
  editor: EditorAdapter;
  ui: UIAdapter;
  settings: SettingsAdapter;
  
  /**
   * プラットフォームの種類を取得
   */
  getPlatformType(): 'browser' | 'vscode';

  /**
   * プラットフォーム固有の初期化処理
   */
  initialize(): Promise<void>;

  /**
   * プラットフォーム固有のクリーンアップ処理
   */
  dispose(): void;
}

// 共通の型定義
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  allowMultiple?: boolean;
}

export interface EditorError {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ProgressReporter {
  report(value: { message?: string; increment?: number }): void;
}

// ファイル同期関連の型定義
export interface FileState {
  /** ファイルのバージョン番号 */
  version: number;
  /** 最終更新時刻 */
  lastModified: Date;
  /** ファイルサイズ */
  size: number;
  /** ハッシュ値（内容の検証用） */
  hash: string;
  /** ファイルパス */
  path: string;
}

export interface SyncResult {
  /** 同期が成功したか */
  success: boolean;
  /** 競合が発生したか */
  hasConflict: boolean;
  /** 同期されたファイルの状態 */
  finalState?: FileState;
  /** エラーメッセージ */
  error?: string;
  /** 競合解決の結果 */
  conflictResolution?: 'local' | 'remote' | 'merged' | 'user_choice';
}

export interface ConflictData {
  /** ローカルファイルの状態 */
  localState: FileState;
  /** リモートファイルの状態 */
  remoteState: FileState;
  /** ベース状態（共通の祖先） */
  baseState?: FileState;
  /** ローカルファイルの内容 */
  localContent: string;
  /** リモートファイルの内容 */
  remoteContent: string;
  /** ベース内容 */
  baseContent?: string;
}

export interface MergeResult {
  /** マージが成功したか */
  success: boolean;
  /** マージされた内容 */
  content?: string;
  /** 自動マージできない競合箇所 */
  conflicts?: Array<{
    startLine: number;
    endLine: number;
    localContent: string;
    remoteContent: string;
  }>;
  /** エラーメッセージ */
  error?: string;
}

// ファイル状態同期インターフェース
export interface FileSyncManager {
  /**
   * ファイル状態を同期する
   * @param uri ファイルURI
   * @returns 同期結果
   */
  syncFileState(uri: string): Promise<SyncResult>;

  /**
   * ローカルとリモートで競合があるかチェック
   * @param localState ローカルファイルの状態
   * @param remoteState リモートファイルの状態
   * @returns 競合があるかどうか
   */
  hasConflict(localState: FileState | undefined, remoteState: FileState | undefined): boolean;

  /**
   * ファイル状態をマップに保存
   * @param uri ファイルURI
   * @param state ファイル状態
   */
  setFileState(uri: string, state: FileState): void;

  /**
   * ファイル状態をマップから取得
   * @param uri ファイルURI
   * @returns ファイル状態
   */
  getFileState(uri: string): FileState | undefined;

  /**
   * リモートファイル状態を取得
   * @param uri ファイルURI
   * @returns リモートファイル状態
   */
  fetchRemoteState(uri: string): Promise<FileState>;

  /**
   * ローカルとリモートの状態をマージ
   * @param localState ローカル状態
   * @param remoteState リモート状態
   * @returns マージ結果
   */
  mergeStates(localState: FileState | undefined, remoteState: FileState): SyncResult;
}

// 競合解決インターフェース
export interface ConflictResolver {
  /**
   * 競合を解決する
   * @param conflictData 競合データ
   * @returns 解決結果
   */
  resolve(conflictData: ConflictData): Promise<SyncResult>;

  /**
   * 3-wayマージを実行
   * @param baseContent ベース内容
   * @param localContent ローカル内容
   * @param remoteContent リモート内容
   * @returns マージ結果
   */
  threeWayMerge(baseContent: string, localContent: string, remoteContent: string): Promise<MergeResult>;

  /**
   * ユーザーに競合解決の選択肢を提示
   * @param conflictData 競合データ
   * @returns ユーザーの選択結果
   */
  promptUserChoice(conflictData: ConflictData): Promise<'local' | 'remote' | 'merge'>;

  /**
   * JSON構造の差分を検出
   * @param base ベース内容
   * @param local ローカル内容
   * @param remote リモート内容
   * @returns 差分情報
   */
  detectJsonDiff(base: unknown, local: unknown, remote: unknown): Array<{
    path: string;
    type: 'added' | 'removed' | 'modified';
    baseValue?: unknown;
    localValue?: unknown;
    remoteValue?: unknown;
  }>;
}