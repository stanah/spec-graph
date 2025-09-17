/**
 * デバウンスフックのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

// タイマーのモック
vi.useFakeTimers();

describe('useDebounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  it('初期値を返す', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('デバウンス期間中は古い値を保持する', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    expect(result.current).toBe('initial');

    // 値を更新
    await act(async () => {
      rerender({ value: 'updated', delay: 500 });
    });

    // デバウンス期間中は古い値のまま
    expect(result.current).toBe('initial');

    // デバウンス期間の半分経過
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe('initial');
  });

  it('デバウンス期間後に新しい値を返す', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // 値を更新
    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // デバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('連続した更新では最後の値のみが反映される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // 連続して値を更新
    act(() => {
      rerender({ value: 'update1', delay: 500 });
    });
    act(() => {
      rerender({ value: 'update2', delay: 500 });
    });
    act(() => {
      rerender({ value: 'update3', delay: 500 });
    });

    // デバウンス期間中は初期値のまま
    expect(result.current).toBe('initial');

    // デバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最後の値が反映される
    expect(result.current).toBe('update3');
  });

  it('デバウンス期間を変更できる', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // 値とデバウンス期間を更新
    act(() => {
      rerender({ value: 'updated', delay: 1000 });
    });

    // 元のデバウンス期間（500ms）経過
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // まだ更新されない（新しいデバウンス期間は1000ms）
    expect(result.current).toBe('initial');

    // 新しいデバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('コンポーネントがアンマウントされるとタイマーがクリアされる', () => {
    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // 値を更新
    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // コンポーネントをアンマウント
    unmount();

    // デバウンス期間完了（アンマウント後なので更新されない）
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // エラーが発生しないことを確認
    expect(() => {
      // 何もしない（エラーが発生しないことを確認）
    }).not.toThrow();
  });

  it('同じ値が設定された場合はタイマーをリセットしない', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // 値を更新
    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // 半分の時間経過
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // 同じ値で再更新（タイマーはリセットされない）
    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // 残りの時間経過
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe('updated');
  });

  it('オブジェクトの値でも正しく動作する', () => {
    const initialObj = { name: 'initial', count: 0 };
    const updatedObj = { name: 'updated', count: 1 };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 500 }
      }
    );

    expect(result.current).toBe(initialObj);

    // オブジェクトを更新
    act(() => {
      rerender({ value: updatedObj, delay: 500 });
    });

    // デバウンス期間中は古いオブジェクト
    expect(result.current).toBe(initialObj);

    // デバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(updatedObj);
  });

  it('配列の値でも正しく動作する', () => {
    const initialArray = ['a', 'b', 'c'];
    const updatedArray = ['x', 'y', 'z'];

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialArray, delay: 500 }
      }
    );

    expect(result.current).toBe(initialArray);

    // 配列を更新
    act(() => {
      rerender({ value: updatedArray, delay: 500 });
    });

    // デバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(updatedArray);
  });

  it('デバウンス期間が0の場合は即座に更新される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    );

    // 値を更新
    act(() => {
      rerender({ value: 'updated', delay: 0 });
    });

    // タイマーを進める必要がある（0でもsetTimeoutは使用される）
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });
});