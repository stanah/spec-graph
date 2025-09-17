import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('parsedDataからノード・エッジ数を集計して表示する', async () => {
    const data = makeData();
    // Zustandの直接更新でparsedDataを注入
    useAppStore.setState((s) => ({
      parse: { ...s.parse, parsedData: data }
    }));
    useAppStore.getState().setViewMode('deps' as any);

    setup();

    // 統計の非同期更新を待つ
    const stats = await screen.findByTestId('graph-stats');
    expect(stats).toBeInTheDocument();

    // 非同期でstatsが更新されるまで待つ
    await waitFor(() => {
      expect(stats.textContent).toMatch(/nodes\s*:\s*4/i);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(stats.textContent).toMatch(/edges\s*:\s*2/i);
    }, { timeout: 3000 });

    // 選択中ノードの表示
    useAppStore.getState().selectNode('B');
    const selected = await screen.findByTestId('selected-node');
    expect(selected.textContent).toMatch(/B/);
  });
});

