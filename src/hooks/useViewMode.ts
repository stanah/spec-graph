import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import type { ViewMode } from '../types/store';

export function useViewMode() {
  const viewMode = useAppStore((s) => s.ui.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const is = useCallback((mode: ViewMode) => viewMode === mode, [viewMode]);

  return { viewMode, setViewMode, is } as const;
}

