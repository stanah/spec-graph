import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      { id: 'C', title: 'C', customFields: { dependsOn: ['B'] } as any },
    ]
  }
});

describe('DependencyGraphView - data integration', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('parsedDataからノード・エッジ数を集計して表示する', () => {
    const data = makeData();
    // Zustandの直接更新でparsedDataを注入
    useAppStore.setState((s) => ({
      parse: { ...s.parse, parsedData: data }
    }));
    useAppStore.getState().setViewMode('deps' as any);

    setup();

    const stats = screen.getByTestId('graph-stats');
    expect(stats).toBeInTheDocument();
    expect(stats.textContent).toMatch(/nodes\s*:\s*3/i);
    expect(stats.textContent).toMatch(/edges\s*:\s*2/i);

    // 選択中ノードの表示
    useAppStore.getState().selectNode('B');
    const selected = screen.getByTestId('selected-node');
    expect(selected.textContent).toMatch(/B/);
  });
});

