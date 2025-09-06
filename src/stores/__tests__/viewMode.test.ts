import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('ViewMode in AppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('初期値は mindmap である', () => {
    const state = useAppStore.getState();
    expect(state.ui.viewMode).toBe('mindmap');
  });

  it('setViewMode でビューモードを更新できる', () => {
    const { setViewMode } = useAppStore.getState();
    setViewMode('table');
    expect(useAppStore.getState().ui.viewMode).toBe('table');
    setViewMode('document');
    expect(useAppStore.getState().ui.viewMode).toBe('document');
  });
});

