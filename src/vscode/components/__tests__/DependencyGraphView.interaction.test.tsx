import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewProvider } from '../../../contexts/ViewContext';
import { ViewContainer } from '../ViewContainer';
import { useAppStore } from '../../../stores/appStore';

describe('DependencyGraphView - interaction', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('ズームUIとミニマップが表示され、ズーム操作が反映される', () => {
    useAppStore.getState().setViewMode('deps' as any);
    setup();
    // UI要素
    const zoomIn = screen.getByTestId('zoom-in');
    const zoomOut = screen.getByTestId('zoom-out');
    const zoomReset = screen.getByTestId('zoom-reset');
    const indicator = screen.getByTestId('zoom-indicator');
    const miniMap = screen.getByTestId('mini-map');

    expect(zoomIn).toBeInTheDocument();
    expect(zoomOut).toBeInTheDocument();
    expect(zoomReset).toBeInTheDocument();
    expect(miniMap).toBeInTheDocument();
    // 初期ズーム
    expect(indicator.textContent).toMatch(/1\.00/);
    // ズームインで値が増える
    fireEvent.click(zoomIn);
    expect(indicator.textContent).not.toMatch(/1\.00/);
    // リセットで1.00に戻る
    fireEvent.click(zoomReset);
    expect(indicator.textContent).toMatch(/1\.00/);
    // ズームアウトで減る
    fireEvent.click(zoomOut);
    // 0.9xなどに変化するはず（厳密値は問わない）
    expect(indicator.textContent).not.toMatch(/1\.00/);
  });
});

