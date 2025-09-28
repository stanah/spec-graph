/**
 * パフォーマンス最適化ユーティリティ
 * Re-render storm 防止と効率的な更新のためのヘルパー関数群
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { createSafeDebounce, createSafeThrottle, TimerManager } from './memoryLeakPrevention';

/**
 * 深い比較用のユーティリティ（循環参照対応版・改良版）
 */
export function deepEqual(a: unknown, b: unknown, seen?: WeakSet<object>): boolean {
  // 同じ参照の場合は即座にtrue
  if (a === b) return true;
  
  // null/undefinedチェック
  if (a == null || b == null) return a === b;
  
  // 型が異なる場合はfalse
  if (typeof a !== typeof b) return false;
  
  // プリミティブ型の場合は===で比較
  if (typeof a !== 'object') return a === b;
  
  // seenが未定義の場合は新しいWeakSetを作成
  if (!seen) {
    seen = new WeakSet();
  }

  // 循環参照の検出
  if (seen.has(a) || seen.has(b)) return a === b; // 循環の場合は参照が同じかを確認
  
  // 一時的にseenに追加して循環を検出
  seen.add(a);
  seen.add(b);
  
  // プロトタイプチェーンの比較
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  
  // 配列の場合
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }
  
  // ArrayBufferなどの特殊オブジェクト
  if (Array.isArray(b)) return false;
  
  // 特殊オブジェクトの詳細処理
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key), seen)) return false;
    }
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    const arrA = Array.from(a).sort();
    const arrB = Array.from(b).sort();
    return deepEqual(arrA, arrB, seen);
  }
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    return a.byteLength === b.byteLength && 
           new Uint8Array(a).every((val, i) => val === new Uint8Array(b)[i]);
  }
  
  // プレーンオブジェクトの場合
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  // hasOwnPropertyを使ってより正確に比較
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key], seen)) return false;
  }
  
  return true;
}

/**
 * 最適化されたメモ化フック
 * 深い比較を使用してより正確な依存関係チェックを行う
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps: [...deps],
      value: factory()
    };
  }
  
  return ref.current.value;
}

/**
 * 最適化されたコールバックフック
 * 深い比較を使用してより正確な依存関係チェックを行う
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  return useDeepMemo(() => callback, deps);
}

/**
 * 安定したセレクターフック
 * Zustand ストアで頻繁な再レンダリングを防ぐ
 */
export function useStableSelector<T>(
  selector: (state: ReturnType<typeof useAppStore.getState>) => T,
  equalityFn: (a: T, b: T) => boolean = deepEqual
): T {
  const prevValue = useRef<T | undefined>(undefined);
  const prevState = useRef<ReturnType<typeof useAppStore.getState> | undefined>(undefined);
  
  return useAppStore((state) => {
    // 状態が変わっていない場合は前回の値を返す
    if (prevState.current && state === prevState.current) {
      return prevValue.current as T;
    }
    
    const newValue = selector(state);
    
    // 等価性チェック
    if (prevValue.current !== undefined && equalityFn(prevValue.current, newValue)) {
      return prevValue.current;
    }
    
    // 新しい値を保存
    prevValue.current = newValue;
    prevState.current = state;
    
    return newValue;
  });
}

/**
 * バッチ更新フック
 * 複数の状態更新を一度にまとめて実行
 */
export function useBatchedUpdates() {
  const updateQueue = useRef<Array<() => void>>([]);
  const timerManager = useRef(new TimerManager());
  const isProcessing = useRef(false);
  
  const addUpdate = useCallback((update: () => void) => {
    updateQueue.current.push(update);
    
    if (!isProcessing.current) {
      isProcessing.current = true;
      
      // 次のマイクロタスクで実行
      timerManager.current.setTimeout(() => {
        const updates = updateQueue.current.splice(0);
        updates.forEach(update => update());
        isProcessing.current = false;
      }, 0);
    }
  }, []);
  
  useEffect(() => {
    const manager = timerManager.current;
    return () => {
      manager.clearAll();
    };
  }, []);
  
  return addUpdate;
}

/**
 * デバウンス付きストア更新フック
 */
export function useDebouncedStoreUpdate<T>(
  selector: (state: ReturnType<typeof useAppStore.getState>) => T,
  updater: (value: T) => void,
  delay: number = 300
) {
  const timerManager = useRef(new TimerManager());
  const lastValue = useRef<T | undefined>(undefined);
  
  const debouncedUpdate = useMemo(() => {
    return createSafeDebounce((...args: readonly unknown[]) => {
      const value = args[0] as T;
      if (!deepEqual(lastValue.current, value)) {
        lastValue.current = value;
        updater(value);
      }
    }, delay, timerManager.current);
  }, [updater, delay]);
  
  const currentValue = useAppStore(selector);
  
  useEffect(() => {
    debouncedUpdate(currentValue);
  }, [currentValue, debouncedUpdate]);
  
  useEffect(() => {
    const manager = timerManager.current;
    return () => {
      debouncedUpdate.cancel();
      manager.clearAll();
    };
  }, [debouncedUpdate]);
}

/**
 * スロットル付きイベントハンドラーフック
 */
export function useThrottledEventHandler<T extends (...args: unknown[]) => void>(
  handler: T,
  delay: number = 100
): T {
  const timerManager = useRef(new TimerManager());
  
  const throttledHandler = useMemo(() => {
    return createSafeThrottle(handler, delay, timerManager.current);
  }, [handler, delay]);
  
  useEffect(() => {
    const manager = timerManager.current;
    return () => {
      throttledHandler.cancel();
      manager.clearAll();
    };
  }, [throttledHandler]);
  
  return throttledHandler as T;
}

/**
 * レンダリング回数監視フック（開発用）
 */
export function useRenderCount(name: string = 'Component') {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name} rendered ${renderCount.current} times`);
      
      // 異常な再レンダリング数を警告
      if (renderCount.current > 10) {
        console.warn(`[Performance] ${name} has rendered ${renderCount.current} times - potential performance issue`);
      }
    }
  });
  
  return renderCount.current;
}

/**
 * 大きなデータセット用の仮想化選択フック（scrollTop処理改良版）
 */
export function useVirtualizedSelection<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number = 0,
  overscan: number = 5
) {
  return useMemo(() => {
    // 入力値の妥当性チェック
    const safeItemHeight = Math.max(1, itemHeight); // 最小1pxに制限
    const safeContainerHeight = Math.max(1, containerHeight);
    const safeScrollTop = Math.max(0, Math.floor(scrollTop)); // 負の値を防止し、整数に丸める
    const safeOverscan = Math.max(0, overscan);
    const totalCount = items.length;
    
    // アイテムが空の場合の早期リターン
    if (totalCount === 0) {
      return {
        visibleItems: [],
        startIndex: 0,
        endIndex: 0,
        totalCount: 0,
        offsetY: 0,
        scrollIndex: 0,
        visibleCount: 0
      };
    }
    
    // 表示可能なアイテム数を計算
    const visibleCount = Math.ceil(safeContainerHeight / safeItemHeight);
    
    // スクロール位置を考慮した表示範囲を計算
    const scrollIndex = Math.floor(safeScrollTop / safeItemHeight);
    
    // オーバースキャンを考慮した開始・終了インデックス
    const startIndex = Math.max(0, scrollIndex - safeOverscan);
    const endIndex = Math.min(
      Math.max(startIndex + visibleCount + (safeOverscan * 2), startIndex + 1), // 最低1アイテムは表示
      totalCount
    );
    
    // 実際に表示するアイテムを取得
    const visibleItems = items.slice(startIndex, endIndex);
    
    // オフセット計算（レンダリング位置の調整用）
    const offsetY = startIndex * safeItemHeight;
    
    return {
      visibleItems,
      startIndex,
      endIndex,
      totalCount,
      offsetY,
      scrollIndex,
      visibleCount,
      // デバッグ用の追加情報
      debug: {
        safeScrollTop,
        safeItemHeight,
        safeContainerHeight,
        calculatedVisibleCount: visibleCount
      }
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
}

/**
 * メモリ効率的なキャッシュフック
 */
export function useMemoryEfficientCache<K, V>(maxSize: number = 100) {
  const cache = useRef(new Map<K, V>());
  
  const get = useCallback((key: K): V | undefined => {
    return cache.current.get(key);
  }, []);
  
  const set = useCallback((key: K, value: V): void => {
    // LRU実装：サイズ上限に達したら最も古いエントリを削除
    if (cache.current.size >= maxSize && !cache.current.has(key)) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey !== undefined) {
        cache.current.delete(firstKey);
      }
    }
    
    // 既存キーの場合は削除してから追加（LRU順序更新）
    if (cache.current.has(key)) {
      cache.current.delete(key);
    }
    
    cache.current.set(key, value);
  }, [maxSize]);
  
  const clear = useCallback(() => {
    cache.current.clear();
  }, []);
  
  const has = useCallback((key: K): boolean => {
    return cache.current.has(key);
  }, []);
  
  return { get, set, clear, has, size: cache.current.size };
}

/**
 * パフォーマンス測定フック
 */
export function usePerformanceMeasurement(name: string) {
  const startTime = useRef<number | undefined>(undefined);
  
  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);
  
  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = undefined;
      return duration;
    }
    return 0;
  }, [name]);
  
  return { start, end };
}

/**
 * リアクティブな要素サイズ観測フック
 * ResizeObserver を使用してパフォーマンスを最適化
 */
export function useElementSize() {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    
    resizeObserver.observe(element);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  return [ref, size] as const;
}

