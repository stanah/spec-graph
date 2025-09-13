import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewProvider } from '../../../contexts/ViewContext';
import { ViewContainer } from '../ViewContainer';
import { useAppStore } from '../../../stores/appStore';

describe('DependencyGraphView (smoke)', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('viewMode=deps で依存関係ビューのコンテナが表示される', () => {
    // 型の追加前でもテストは実行可能にするため as any
    useAppStore.getState().setViewMode('deps' as any);
    setup();
    expect(screen.getByTestId('dependency-graph-view')).toBeInTheDocument();
  });
});

