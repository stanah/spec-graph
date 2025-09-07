import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewContainer } from '../ViewContainer';
import { ViewProvider } from '../../../contexts/ViewContext';
import { useAppStore } from '../../../stores/appStore';

describe('ViewContainer', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewContainer />
    </ViewProvider>
  );

  it('デフォルトでドキュメント系ビューを表示する', () => {
    setup();
    // 初期viewModeがdocumentであること
    expect(useAppStore.getState().ui.viewMode).toBe('document');
    // テーブルのプレースホルダーは表示されない
    expect(screen.queryByText('テーブルビュー')).not.toBeInTheDocument();
    // コンテンツ未設定時は汎用ドキュメントビューの案内が出る
    expect(screen.getByText('サポート外のドキュメント形式')).toBeInTheDocument();
  });

  it('viewMode=tableでテーブルビューを表示', () => {
    useAppStore.getState().setViewMode('table');
    setup();
    // プレースホルダーは表示されない
    expect(screen.queryByText('テーブルビュー')).not.toBeInTheDocument();
    // HierarchicalTableViewConnected コンポーネントが表示される
    expect(document.querySelector('.hierarchical-table')).toBeInTheDocument();
  });

  it('viewMode=documentでドキュメント系ビューが表示される', () => {
    useAppStore.getState().setViewMode('document');
    setup();
    // コンテンツ未設定のため汎用ビューの案内が出る
    expect(screen.getByText('サポート外のドキュメント形式')).toBeInTheDocument();
  });
});
