import React, { createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import type { ViewMode } from '../types/store';

type ViewContextValue = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const ViewContext = createContext<ViewContextValue | undefined>(undefined);

export const ViewProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const viewMode = useAppStore((s) => s.ui.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const value = useMemo(() => ({ viewMode, setViewMode }), [viewMode, setViewMode]);
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};

export const useViewContext = (): ViewContextValue => {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error('useViewContext must be used within ViewProvider');
  return ctx;
};

