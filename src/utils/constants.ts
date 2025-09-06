// アプリケーション定数

export const APP_CONFIG = {
  name: 'spec-graph',
  version: '1.0.0',
  supportedFormats: ['json', 'yaml'] as const,
  defaultSettings: {
    editor: {
      theme: 'light' as const,
      fontSize: 14,
      wordWrap: true,
      minimap: false,
      language: 'json' as const,
    },
    mindmap: {
      layout: 'tree' as const,
      nodeSize: 'medium' as const,
      showMetadata: true,
      autoCollapse: false,
      animationEnabled: true,
    },
  },
} as const;

export const DEBOUNCE_DELAY = {
  EDITOR_CHANGE: 300, // エディタ変更のデバウンス時間（ms）
  RESIZE: 100, // リサイズのデバウンス時間（ms）
  SEARCH: 200, // 検索のデバウンス時間（ms）
} as const;

export const STORAGE_KEYS = {
  EDITOR_SETTINGS: 'mindmap-editor-settings',
  MINDMAP_SETTINGS: 'mindmap-mindmap-settings',
  RECENT_FILES: 'mindmap-recent-files',
  WINDOW_STATE: 'mindmap-window-state',
} as const;

export const ERROR_MESSAGES = {
  FILE_NOT_FOUND: 'ファイルが見つかりません',
  INVALID_JSON: 'JSONファイルの形式が正しくありません',
  INVALID_YAML: 'YAMLファイルの形式が正しくありません',
  SCHEMA_VALIDATION_FAILED: 'データ構造の検証に失敗しました',
  FILE_SAVE_FAILED: 'ファイルの保存に失敗しました',
  FILE_LOAD_FAILED: 'ファイルの読み込みに失敗しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  UNKNOWN_ERROR: '不明なエラーが発生しました',
} as const;

export const MINDMAP_CONFIG = {
  NODE: {
    MIN_WIDTH: 120,
    MAX_WIDTH: 300,
    MIN_HEIGHT: 40,
    PADDING: 10,
    BORDER_RADIUS: 8,
  },
  LAYOUT: {
    LEVEL_HEIGHT: 100,
    SIBLING_SPACING: 20,
    TREE_SPACING: 150,
  },
  ANIMATION: {
    DURATION: 300,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  ZOOM: {
    MIN: 0.1,
    MAX: 3.0,
    STEP: 0.1,
  },
} as const;
