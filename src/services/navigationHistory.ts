export class NavigationHistory {
  private backStack: string[] = [];
  private forwardStack: string[] = [];
  private current: string | null = null;

  constructor() {
    // ブラウザHistory APIが使える場合は最低限同期（テスト環境ではメモリ運用）
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('popstate', (e) => {
        const state = (e.state as { nodeId?: string } | null) ?? {};
        if (state && typeof state.nodeId === 'string') {
          // popstateは過去/未来への移動なので、currentも差し替え
          this.current = state.nodeId;
        }
      });
    }
  }

  getCurrent(): string | null { return this.current; }
  canBack(): boolean { return this.backStack.length > 0; }
  canForward(): boolean { return this.forwardStack.length > 0; }

  goTo(nodeId: string) {
    if (this.current !== null) this.backStack.push(this.current);
    this.current = nodeId;
    this.forwardStack = [];
    // History APIがあればpush
    try {
      if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
        history.pushState({ nodeId }, '', `#${encodeURIComponent(nodeId)}`);
      }
    } catch {
      // ブラウザ履歴の操作エラーを無視
    }
  }

  back() {
    if (!this.canBack()) return;
    const prev = this.backStack.pop()!;
    if (this.current !== null) this.forwardStack.push(this.current);
    this.current = prev;
    try {
      if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
        history.pushState({ nodeId: prev }, '', `#${encodeURIComponent(prev)}`);
      }
    } catch {
      // ブラウザ履歴の操作エラーを無視
    }
  }

  forward() {
    if (!this.canForward()) return;
    const next = this.forwardStack.pop()!;
    if (this.current !== null) this.backStack.push(this.current);
    this.current = next;
    try {
      if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
        history.pushState({ nodeId: next }, '', `#${encodeURIComponent(next)}`);
      }
    } catch {
      // ブラウザ履歴の操作エラーを無視
    }
  }
}

