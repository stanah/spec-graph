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

  it('デフォルトでMindmapViewerを表示（プレースホルダー文言が出ない）', () => {
    setup();
    expect(screen.queryByText('テーブルビュー')).not.toBeInTheDocument();
    expect(screen.queryByText('ドキュメントビュー')).not.toBeInTheDocument();
  });

  it('viewMode=tableでテーブルプレースホルダーを表示', () => {
    useAppStore.getState().setViewMode('table');
    setup();
    expect(screen.getByText('テーブルビュー')).toBeInTheDocument();
  });

  it('viewMode=documentでドキュメントプレースホルダーを表示', () => {
    useAppStore.getState().setViewMode('document');
    setup();
    expect(screen.getByText('ドキュメントビュー')).toBeInTheDocument();
  });
});

