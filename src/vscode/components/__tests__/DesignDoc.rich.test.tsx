import { render, screen } from '@testing-library/react';
import React from 'react';
import { DesignDocView } from '../docs/DesignDoc';

describe('DesignDocView (rich)', () => {
  it('インターフェースやデータモデル、技術スタック、重要度、リスクを表示できる', () => {
    const doc = {
      title: '設計ドキュメント',
      version: '2.0.0',
      components: [
        {
          id: 'DSG-ABC-001',
          name: 'Renderer',
          type: 'library',
          responsibilities: '描画',
          dependencies: ['DSG-ABC-002'],
          interfaces: ['render()', 'update()'],
          dataModels: ['Node', 'Edge'],
          techStack: ['react', 'd3'],
          criticality: 'high',
          risks: ['パフォーマンス劣化'],
        },
      ],
    } as any;

    render(<DesignDocView doc={doc} />);

    expect(screen.getByText(/設計ドキュメント/)).toBeInTheDocument();
    expect(screen.getByText('render()')).toBeInTheDocument();
    expect(screen.getByText('update()')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getByText('Edge')).toBeInTheDocument();
    expect(screen.getByText(/react/i)).toBeInTheDocument();
    expect(screen.getByText(/d3/i)).toBeInTheDocument();
    expect(screen.getByText(/criticality/i)).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/リスク/)).toBeInTheDocument();
    expect(screen.getByText('パフォーマンス劣化')).toBeInTheDocument();
  });
});

