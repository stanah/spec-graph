import { describe, it, expect, beforeEach } from 'vitest';
import { installLinkPreview } from '../../utils/linkPreview';

describe('linkPreview', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('ホバーでツールチップを表示する', () => {
    const link = document.createElement('a');
    link.textContent = 'Jump';
    link.setAttribute('data-link-id', 'A-1');
    root.appendChild(link);
    installLinkPreview(root);

    const evt = new MouseEvent('mouseover', { bubbles: true, clientX: 10, clientY: 20 });
    link.dispatchEvent(evt);
    const tip = document.querySelector('[data-testid="link-preview"], [data-testId="link-preview"], [data-testid="link-preview"]') as HTMLElement | null;
    expect(tip).not.toBeNull();
    if (tip) {
      expect(tip.style.display).toBe('block');
      expect(tip.textContent).toMatch(/A-1/);
    }
  });
});

