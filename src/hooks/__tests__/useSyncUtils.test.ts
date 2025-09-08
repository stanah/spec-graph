import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeoutManager, useWatchedValue } from '../useSyncUtils';

vi.useFakeTimers();

describe('useTimeoutManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scheduleで登録したタイマーが期限後に実行される', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useTimeoutManager());

    act(() => {
      result.current.schedule(fn, 300);
    });

    expect(fn).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clearAllで未実行のタイマーがキャンセルされる', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useTimeoutManager());

    act(() => {
      result.current.schedule(fn, 300);
      result.current.clearAll();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fn).not.toHaveBeenCalled();
  });

  it('アンマウント時に未実行のタイマーがクリーンアップされる', () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useTimeoutManager());

    act(() => {
      result.current.schedule(fn, 300);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fn).not.toHaveBeenCalled();
  });
});

describe('useWatchedValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初回レンダーでは onChange は呼ばれない（デフォルト）', () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(({ v }) => useWatchedValue(v, onChange), {
      initialProps: { v: 1 },
    });

    expect(onChange).not.toHaveBeenCalled();

    rerender({ v: 2 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2, 1);
  });

  it('immediate=true なら初回にも呼ばれる', () => {
    const onChange = vi.fn();
    renderHook(() => useWatchedValue(10, onChange, { immediate: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(10, undefined);
  });

  it('compareで等価と判定された場合は呼ばれない', () => {
    const onChange = vi.fn();
    const shallowEqual = (a: any, b: any) => a?.x === b?.x;

    const { rerender } = renderHook(({ v }) => useWatchedValue(v, onChange, { compare: shallowEqual }), {
      initialProps: { v: { x: 1, y: 1 } },
    });

    rerender({ v: { x: 1, y: 2 } });
    expect(onChange).not.toHaveBeenCalled();

    rerender({ v: { x: 2, y: 2 } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ x: 2, y: 2 }, { x: 1, y: 2 });
  });
});

