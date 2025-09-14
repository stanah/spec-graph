import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationHistory } from '../navigationHistory';

describe('NavigationHistory', () => {
  let nav: NavigationHistory;

  beforeEach(() => {
    nav = new NavigationHistory();
  });

  it('goToで現在位置を更新し、back/forwardが機能する', () => {
    expect(nav.getCurrent()).toBeNull();
    nav.goTo('A');
    expect(nav.getCurrent()).toBe('A');
    nav.goTo('B');
    expect(nav.getCurrent()).toBe('B');
    expect(nav.canBack()).toBe(true);
    nav.back();
    expect(nav.getCurrent()).toBe('A');
    expect(nav.canForward()).toBe(true);
    nav.forward();
    expect(nav.getCurrent()).toBe('B');
  });

  it('新規遷移するとforwardスタックがクリアされる', () => {
    nav.goTo('A');
    nav.goTo('B');
    nav.back();
    expect(nav.getCurrent()).toBe('A');
    nav.goTo('C');
    expect(nav.getCurrent()).toBe('C');
    expect(nav.canForward()).toBe(false);
  });
});

