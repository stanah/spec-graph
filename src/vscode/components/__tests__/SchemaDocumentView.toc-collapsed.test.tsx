import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SchemaDocumentView } from '../schema/SchemaDocumentView';

describe('SchemaDocumentView (toc & collapsed)', () => {
  it('x-uiのsection/orderからTOCを生成し、collapsedヒントを初期状態に反映する', () => {
    const schema: any = {
      $id: 'urn:test:toc-collapsed',
      title: 'Doc with TOC',
      type: 'object',
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        goals: { type: 'array', items: { type: 'string' }, 'x-ui': { display: 'list', section: 'meta', order: 1, collapsed: true } },
        items: {
          type: 'array',
          items: { type: 'string' },
          'x-ui': { display: 'list', section: 'main', order: 2, collapsed: false }
        }
      }
    };

    const data: any = {
      title: 'サンプル',
      version: '1.0.0',
      goals: ['A', 'B'],
      items: ['X', 'Y']
    };

    render(<SchemaDocumentView data={data} schema={schema} />);

    // TOCが出力される
    const toc = screen.getByTestId('schema-toc');
    expect(toc).toBeInTheDocument();
    // セクション名や項目リンクが表示
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByTestId('toc-item-prop-meta-goals')).toBeInTheDocument();
    expect(screen.getByTestId('toc-item-prop-main-items')).toBeInTheDocument();

    // collapsed 初期状態（goalsは閉じ、itemsは開き）
    const goalsBlock = screen.getByTestId('prop-block-meta-goals');
    const itemsBlock = screen.getByTestId('prop-block-main-items');
    expect(goalsBlock).toHaveAttribute('data-collapsed', 'true');
    expect(itemsBlock).toHaveAttribute('data-collapsed', 'false');

    // トグルでgoalsを展開
    const toggleGoals = screen.getByTestId('toggle-meta-goals');
    fireEvent.click(toggleGoals);
    expect(screen.getByTestId('prop-block-meta-goals')).toHaveAttribute('data-collapsed', 'false');
    // 展開後、要素の中身が見える
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();

    // TOCリンクが存在する（動作はアンカー/スクロールに依存するため存在のみ確認）
    fireEvent.click(screen.getByTestId('toc-item-prop-main-items'));
  });
});

