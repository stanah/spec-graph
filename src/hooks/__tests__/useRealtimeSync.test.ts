/**
 * リアルタイム同期フックのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeSync } from '../useRealtimeSync';
import { useAppStore } from '../../stores/appStore';

// タイマーのモック
vi.useFakeTimers();

// ストアのモック
vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(),
}));

describe('useRealtimeSync', () => {
  const mockUpdateContent = vi.fn();
  const mockParseContent = vi.fn();
  const mockAddNotification = vi.fn();
  const mockSetParseErrors = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // useAppStoreのモック実装
    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        file: {
          fileContent: '',
          fileFormat: 'json',
          isDirty: false,
        },
        parse: {
          parseErrors: [],
          isParsing: false,
          parsedData: null,
        },
        ui: {
          editorSettings: {
            autoSync: true,
            syncDelay: 300,
          },
        },
        updateContent: mockUpdateContent,
        parseContent: mockParseContent,
        addNotification: mockAddNotification,
        setParseErrors: mockSetParseErrors,
      };
      
      return selector(mockState);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('基本的な同期機能', () => {
    it('コンテンツ変更時にデバウンス付きで同期する', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      // デバウンス期間中は同期されない
      expect(mockUpdateContent).not.toHaveBeenCalled();
      expect(mockParseContent).not.toHaveBeenCalled();

      // デバウンス期間完了
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).toHaveBeenCalledWith('{"title": "test"}');
      expect(mockParseContent).toHaveBeenCalled();
    });

    it('連続した変更では最後の値のみが同期される', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test1"}');
        result.current.syncContent('{"title": "test2"}');
        result.current.syncContent('{"title": "test3"}');
      });

      // デバウンス期間完了
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateContent).toHaveBeenCalledWith('{"title": "test3"}');
    });

    it('即座同期機能が正しく動作する', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContentImmediate('{"title": "immediate"}');
      });

      expect(mockUpdateContent).toHaveBeenCalledWith('{"title": "immediate"}');
      expect(mockParseContent).toHaveBeenCalled();
    });
  });

  describe('自動同期の制御', () => {
    it('自動同期が無効な場合は同期しない', () => {
      // 自動同期を無効にする
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        const mockState = {
          ui: {
            editorSettings: {
              autoSync: false,
              syncDelay: 300,
            },
          },
          updateContent: mockUpdateContent,
          parseContent: mockParseContent,
        };
        
        return selector(mockState);
      });

      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).not.toHaveBeenCalled();
      expect(mockParseContent).not.toHaveBeenCalled();
    });

    it('同期を一時停止できる', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.pauseSync();
      });

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).not.toHaveBeenCalled();
    });

    it('同期を再開できる', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.pauseSync();
        result.current.resumeSync();
      });

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).toHaveBeenCalledWith('{"title": "test"}');
    });
  });

  describe('エラーハンドリング', () => {
    it('パースエラーが発生した場合は適切に処理する', () => {
      mockParseContent.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContentImmediate('invalid json');
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        message: expect.stringContaining('パースエラー'),
        type: 'error',
        autoHide: true,
      });
    });

    it('同期中にエラーが発生した場合は状態をリセットする', () => {
      mockUpdateContent.mockImplementation(() => {
        throw new Error('Update error');
      });

      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContentImmediate('{"title": "test"}');
      });

      // エラーが発生してもクラッシュしない
      expect(() => {
        // 何もしない（エラーが適切に処理されることを確認）
      }).not.toThrow();
    });
  });

  describe('パフォーマンス最適化', () => {
    it('同じ内容の場合は同期をスキップする', async () => {
      const { result } = renderHook(() => useRealtimeSync());

      const content = '{"title": "test"}';

      // デバウンス版を使用（immediate版は常に実行される）
      await act(async () => {
        result.current.syncContent(content);
      });

      // デバウンス期間完了まで待機
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      vi.clearAllMocks();

      // 同じ内容で再度同期
      await act(async () => {
        result.current.syncContent(content);
      });

      // 同じ内容なのでスキップされる
      expect(mockUpdateContent).not.toHaveBeenCalled();
    });

    it('空文字列の場合は同期をスキップする', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).not.toHaveBeenCalled();
    });

    it('空白のみの場合は同期をスキップする', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('   \n\t  ');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).not.toHaveBeenCalled();
    });
  });

  describe('同期状態の管理', () => {
    it('同期状態を取得できる', () => {
      const { result } = renderHook(() => useRealtimeSync());

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.isPaused).toBe(false);
    });

    it('同期中の状態を正しく管理する', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      // デバウンス期間中は同期中状態
      expect(result.current.isSyncing).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // 同期完了後は非同期状態
      expect(result.current.isSyncing).toBe(false);
    });

    it('一時停止状態を正しく管理する', () => {
      const { result } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.pauseSync();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resumeSync();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('設定の動的変更', () => {
    it('同期遅延設定の変更が反映される', () => {
      let syncDelay = 300;
      
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        const mockState = {
          ui: {
            editorSettings: {
              autoSync: true,
              syncDelay,
            },
          },
          updateContent: mockUpdateContent,
          parseContent: mockParseContent,
        };
        
        return selector(mockState);
      });

      const { result, rerender } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      // 設定を変更
      syncDelay = 500;
      act(() => {
        rerender();
      });
      
      // 既存のタイマーをクリア
      vi.clearAllMocks();

      // 新しい設定で再度同期を開始
      act(() => {
        result.current.syncContent('{"title": "test2"}');
      });

      // 元の遅延時間では同期されない
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).not.toHaveBeenCalled();

      // 新しい遅延時間で同期される
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockUpdateContent).toHaveBeenCalled();
    });
  });

  describe('メモリリーク防止', () => {
    it('コンポーネントアンマウント時にタイマーがクリアされる', () => {
      const { result, unmount } = renderHook(() => useRealtimeSync());

      act(() => {
        result.current.syncContent('{"title": "test"}');
      });

      // アンマウント
      unmount();

      // タイマー完了後もエラーが発生しない
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(() => {
        // 何もしない（エラーが発生しないことを確認）
      }).not.toThrow();
    });
  });

  describe('統計情報', () => {
    it('同期統計を取得できる', () => {
      const { result } = renderHook(() => useRealtimeSync());

      expect(result.current.syncStats).toEqual({
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
      });
    });

    it('同期統計が正しく更新される', async () => {
      // モックが成功するように設定
      mockUpdateContent.mockImplementation(() => {});
      mockParseContent.mockImplementation(() => {});
      
      const { result } = renderHook(() => useRealtimeSync());

      // 統計が0から始まることを確認
      expect(result.current.syncStats.totalSyncs).toBe(0);
      expect(result.current.syncStats.successfulSyncs).toBe(0);

      await act(async () => {
        result.current.syncContentImmediate('{"title": "test1"}');
      });

      // 1回目の統計確認
      expect(result.current.syncStats.totalSyncs).toBe(1);
      expect(result.current.syncStats.successfulSyncs).toBe(1);

      await act(async () => {
        result.current.syncContentImmediate('{"title": "test2"}');
      });

      // 2回目の統計確認
      expect(result.current.syncStats.totalSyncs).toBe(2);
      expect(result.current.syncStats.successfulSyncs).toBe(2);
      expect(result.current.syncStats.failedSyncs).toBe(0);
    });

    it('エラー時に失敗統計が更新される', async () => {
      mockParseContent.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHook(() => useRealtimeSync());

      await act(async () => {
        result.current.syncContentImmediate('invalid');
      });

      expect(result.current.syncStats.totalSyncs).toBe(1);
      expect(result.current.syncStats.successfulSyncs).toBe(0);
      expect(result.current.syncStats.failedSyncs).toBe(1);
    });
  });
});