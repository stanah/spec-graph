import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installLinkHandler } from '../../utils/linkHandler';
import { useAppStore } from '../../../stores/appStore';

describe('linkHandler', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    document.body.innerHTML = '';
  });

  it('data-link-id クリックで選択とスクロールを行う', () => {
    // アンカー（スクロール先）
    const anchor = document.createElement('div');
    anchor.dataset.nodeId = 'A-1';
    (anchor as any).scrollIntoView = vi.fn();
    document.body.appendChild(anchor);

    // ルートとリンク
    const root = document.createElement('div');
    const link = document.createElement('a');
    link.textContent = 'Go';
    link.setAttribute('href', '#');
    link.setAttribute('data-link-id', 'A-1');
    root.appendChild(link);
    document.body.appendChild(root);

    installLinkHandler(root);
    link.click();

    expect(useAppStore.getState().ui.selectedNodeId).toBe('A-1');
    expect((anchor as any).scrollIntoView).toHaveBeenCalled();
  });
});

