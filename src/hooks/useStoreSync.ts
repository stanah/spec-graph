/**
 * ストア同期用カスタムフック
 * 
 * このファイルは、ストアとコンポーネント間の同期を管理し、
 * リアルタイム更新のためのデバウンス機能を提供します。
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores';
import { DEBOUNCE_DELAY } from '../utils/constants';
import { useTimeoutManager, useWatchedValue } from './useSyncUtils';

/**
 * エディタ内容の同期を管理するフック
 */
export function useEditorSync() {
  const updateContent = useAppStore(state => state.updateContent);
  const fileContent = useAppStore(state => state.file.fileContent);
  const parseErrors = useAppStore(state => state.parse.parseErrors);
  const isParsing = useAppStore(state => state.parse.isParsing);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * デバウンス付きでコンテンツを更新
   */
  const debouncedUpdateContent = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateContent(content);
    }, DEBOUNCE_DELAY.EDITOR_CHANGE);
  }, [updateContent]);

  /**
   * 即座にコンテンツを更新（デバウンスなし）
   */
  const immediateUpdateContent = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    updateContent(content);
  }, [updateContent]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    fileContent,
    parseErrors,
    isParsing,
    debouncedUpdateContent,
    immediateUpdateContent,
  };
}

/**
 * マインドマップの同期を管理するフック
 */
export function useMindmapSync() {
  const parsedData = useAppStore(state => state.parse.parsedData);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const selectNode = useAppStore(state => state.selectNode);
  const toggleNodeCollapse = useAppStore(state => state.toggleNodeCollapse);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const updateMindmapSettings = useAppStore(state => state.updateMindmapSettings);

  /**
   * ノード選択の同期
   */
  const syncNodeSelection = useCallback((nodeId: string) => {
    selectNode(nodeId);
  }, [selectNode]);

  /**
   * ノード折りたたみの同期
   */
  const syncNodeCollapse = useCallback((nodeId: string) => {
    toggleNodeCollapse(nodeId);
  }, [toggleNodeCollapse]);

  return {
    parsedData,
    selectedNodeId,
    mindmapSettings,
    syncNodeSelection,
    syncNodeCollapse,
    updateMindmapSettings,
  };
}

/**
 * ファイル操作の同期を管理するフック
 */
export function useFileSync() {
  const currentFile = useAppStore(state => state.file.currentFile);
  const isDirty = useAppStore(state => state.file.isDirty);
  const isLoading = useAppStore(state => state.ui.isLoading);
  const loadFile = useAppStore(state => state.loadFile);
  const saveFile = useAppStore(state => state.saveFile);
  const saveFileAs = useAppStore(state => state.saveFileAs);
  const newFile = useAppStore(state => state.newFile);
  const closeFile = useAppStore(state => state.closeFile);

  /**
   * 自動保存機能
   */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorSettings = useAppStore(state => state.ui.editorSettings);

  useEffect(() => {
    if (editorSettings.autoSave && isDirty && currentFile) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveFile();
      }, 5000); // 5秒後に自動保存
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, currentFile, editorSettings.autoSave, saveFile]);

  return {
    currentFile,
    isDirty,
    isLoading,
    loadFile,
    saveFile,
    saveFileAs,
    newFile,
    closeFile,
  };
}

/**
 * UI状態の同期を管理するフック
 */
export function useUISync() {
  const notifications = useAppStore(state => state.ui.notifications);
  const modal = useAppStore(state => state.ui.modal);
  const addNotification = useAppStore(state => state.addNotification);
  const removeNotification = useAppStore(state => state.removeNotification);
  const clearNotifications = useAppStore(state => state.clearNotifications);
  const showModal = useAppStore(state => state.showModal);
  const closeModal = useAppStore(state => state.closeModal);
  const { schedule, clearAll } = useTimeoutManager();

  /**
   * 通知の自動削除を管理
   */
  useEffect(() => {
    // 古いタイマーをクリアしてから再スケジュール
    clearAll();
    notifications.forEach(notification => {
      if (notification.autoHide && notification.duration) {
        schedule(() => removeNotification(notification.id), notification.duration);
      }
    });
  }, [notifications, removeNotification, schedule, clearAll]);

  return {
    notifications,
    modal,
    addNotification,
    removeNotification,
    clearNotifications,
    showModal,
    closeModal,
  };
}

/**
 * 設定の同期を管理するフック
 */
export function useSettingsSync() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const updateEditorSettings = useAppStore(state => state.updateEditorSettings);
  const updateMindmapSettings = useAppStore(state => state.updateMindmapSettings);
  const resetSettings = useAppStore(state => state.resetSettings);
  const exportSettings = useAppStore(state => state.exportSettings);
  const importSettings = useAppStore(state => state.importSettings);

  // 設定変更の監視
  useWatchedValue(settings, (curr) => {
    // 設定が変更された場合の処理（現状はログのみ）
    console.log('Settings changed:', curr);
  });

  return {
    settings,
    updateSettings,
    updateEditorSettings,
    updateMindmapSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };
}

/**
 * アプリケーション全体の同期を管理するメインフック
 */
export function useAppSync() {
  const initialized = useAppStore(state => state.initialized);
  const initialize = useAppStore(state => state.initialize);
  const debugMode = useAppStore(state => state.debugMode);
  const toggleDebugMode = useAppStore(state => state.toggleDebugMode);

  // アプリケーション初期化
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S または Cmd+S で保存
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const saveFile = useAppStore.getState().saveFile;
        saveFile();
      }

      // Ctrl+N または Cmd+N で新規ファイル
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        const newFile = useAppStore.getState().newFile;
        newFile();
      }

      // Ctrl+O または Cmd+O でファイルを開く
      if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        // TODO: ファイル選択ダイアログを表示
        console.log('Open file dialog');
      }

      // F12でデバッグモード切り替え
      if (event.key === 'F12') {
        event.preventDefault();
        toggleDebugMode();
      }
    };

    // document が存在することを確認してからイベントリスナーを追加
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    
    return undefined;
  }, [toggleDebugMode]);

  return {
    initialized,
    debugMode,
    initialize,
    toggleDebugMode,
  };
}

/**
 * パフォーマンス監視用フック
 */
export function usePerformanceMonitor() {
  const parseStats = useAppStore(state => ({
    successCount: state.parse.parseSuccessCount,
    errorCount: state.parse.parseErrorCount,
    isParsing: state.parse.isParsing,
    lastParsed: state.parse.lastParsed,
  }));

  const renderTimerRef = useRef<number | null>(null);

  /**
   * レンダリング時間を測定
   */
  const startRenderTimer = useCallback(() => {
    renderTimerRef.current = performance.now();
  }, []);

  const endRenderTimer = useCallback((label: string) => {
    if (renderTimerRef.current) {
      const duration = performance.now() - renderTimerRef.current;
      console.log(`${label} render time: ${duration.toFixed(2)}ms`);
      renderTimerRef.current = null;
    }
  }, []);

  return {
    parseStats,
    startRenderTimer,
    endRenderTimer,
  };
}
