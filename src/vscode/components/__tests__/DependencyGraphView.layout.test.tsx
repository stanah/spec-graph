import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewProvider } from '../../../contexts/ViewContext';
import { ViewContainer } from '../ViewContainer';
import { useAppStore } from '../../../stores/appStore';

describe('DependencyGraphView - layout toolbar', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('レイアウト選択UIが表示され、デフォルトがcoseである', async () => {
    useAppStore.getState().setViewMode('deps' as any);
    setup();
    const toolbar = await screen.findByTestId('layout-toolbar');
    expect(toolbar).toBeInTheDocument();
    const select = screen.getByTestId('layout-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('cose');
    // 代表的な選択肢が存在する
    expect(screen.getByRole('option', { name: 'cose' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'grid' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'dagre' })).toBeInTheDocument();
  });

  it('選択変更で選択値が更新される（フォールバック時も）', () => {
    useAppStore.getState().setViewMode('deps' as any);
    setup();
    const select = screen.getByTestId('layout-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'grid' } });
    expect(select.value).toBe('grid');
  });
});

