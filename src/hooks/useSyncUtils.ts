import { useCallback, useEffect, useRef } from 'react';

/**
 * 複数の setTimeout を一元管理するフック
 * - schedule: タイマー登録
 * - clearAll: 未実行タイマーの一括キャンセル
 * アンマウント時にも自動クリーンアップされます。
 */
export function useTimeoutManager() {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      // 実行後に自動的にリストから除外（リーク防止）
      timersRef.current = timersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  const clearAll = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return { schedule, clearAll } as const;
}

/**
 * 値の変更を監視して onChange を呼び出すフック
 * - デフォルトでは初回は呼ばれない（immediate=false）
 * - equality 比較は Object.is（compare指定可）
 */
export function useWatchedValue<T>(
  value: T,
  onChange?: (current: T, previous: T | undefined) => void,
  options?: { compare?: (a: T, b: T | undefined) => boolean; immediate?: boolean },
) {
  const prevRef = useRef<T | undefined>(undefined);
  const { compare = Object.is as (a: T, b: T | undefined) => boolean, immediate = false } = options || {};

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === undefined && immediate) {
      onChange?.(value, prev);
    } else if (!compare(value, prev)) {
      onChange?.(value, prev);
    }
    prevRef.current = value;
  }, [value, immediate, compare, onChange]);
}

