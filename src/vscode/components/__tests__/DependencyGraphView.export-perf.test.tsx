import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewProvider } from '../../../contexts/ViewContext';
import { ViewContainer } from '../ViewContainer';
import { useAppStore } from '../../../stores/appStore';
import type { MindmapData } from '../../../types';

const makeData = (): MindmapData => ({
  version: '1.0',
  title: 'Graph Sample',
  schema: { version: '1.0' },
  root: {
    id: 'root',
    title: 'Root',
    children: [
      { id: 'A', title: 'A', customFields: {} },
      { id: 'B', title: 'B', customFields: { dependsOn: ['A'] } as any },
    ]
  }
});

describe('DependencyGraphView - export & performance', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('エクスポートUIが表示され、SVGエクスポート結果が表示される', () => {
    const data = makeData();
    useAppStore.setState((s) => ({ parse: { ...s.parse, parsedData: data } }));
    useAppStore.getState().setViewMode('deps' as any);
    setup();

    const toolbar = screen.getByTestId('export-toolbar');
    expect(toolbar).toBeInTheDocument();
    const svgBtn = screen.getByTestId('export-svg');
    fireEvent.click(svgBtn);
    const info = screen.getByTestId('export-info');
    expect(info.textContent).toMatch(/type:\s*svg/i);
  });

  it('パフォーマンスモードの切替ができる', () => {
    useAppStore.getState().setViewMode('deps' as any);
    setup();
    const toggle = screen.getByTestId('perf-toggle') as HTMLInputElement;
    const indicator = screen.getByTestId('perf-indicator');
    expect(indicator.textContent).toMatch(/off/i);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    expect(indicator.textContent).toMatch(/on/i);
  });
});

