import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toolbar } from '../Toolbar';

// Mindmap用ツールバーにカラーモード切り替え（VSCodeThemeToggle）が無いことを確認
describe('Toolbar (VSCode - Mindmap)', () => {
  const setup = () =>
    render(
      <Toolbar
        selectedNodeId={null}
        data={null as any}
        rendererRef={{ current: null } as any}
        onAddChild={() => {}}
        onAddSibling={() => {}}
        onDeleteNode={() => {}}
        onTogglePanel={() => {}}
        isPanelVisible={false}
        zoomLevel={100}
        onZoomChange={() => {}}
      />
    );

  it('マインドマップツールバーにテーマ切り替えボタンが表示されない', () => {
    setup();
    // VSCodeThemeToggle が出すアクセシブルラベル/タイトルの断片で検証
    expect(screen.queryByLabelText(/マインドマップテーマ/)).toBeNull();
    expect(screen.queryByTitle(/マインドマップテーマ/)).toBeNull();
  });
});

