import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewSwitcher } from '../ViewSwitcher';
import { ViewProvider } from '../../../contexts/ViewContext';
import { useAppStore } from '../../../stores/appStore';

describe('ViewSwitcher', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  const setup = () => render(
    <ViewProvider>
      <ViewSwitcher />
    </ViewProvider>
  );

  it('初期表示でドキュメントが選択されている', () => {
    setup();
    const documentBtn = screen.getByRole('button', { name: 'ドキュメント' });
    expect(documentBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('テーブル/ドキュメントへ切り替えできる', () => {
    setup();
    const tableBtn = screen.getByRole('button', { name: 'テーブル' });
    fireEvent.click(tableBtn);
    expect(useAppStore.getState().ui.viewMode).toBe('table');

    const documentBtn = screen.getByRole('button', { name: 'ドキュメント' });
    fireEvent.click(documentBtn);
    expect(useAppStore.getState().ui.viewMode).toBe('document');
  });
});
