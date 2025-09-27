import { useAppStore } from '../../stores/appStore';
import { NavigationHistory } from '../../services/navigationHistory';

const nav = new NavigationHistory();

export function installLinkHandler(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // data-link-idを探す（先祖も含めて）
    const linkEl = target.closest('[data-link-id]') as HTMLElement | null;
    if (!linkEl) return;
    const id = linkEl.getAttribute('data-link-id') || '';
    if (!id) return;
    e.preventDefault();
    try {
      const { selectNode } = useAppStore.getState();
      selectNode(id);
      nav.goTo(id);
      const anchor = (root.querySelector(`[data-node-id="${CSS.escape(id)}"]`) as HTMLElement | null)
        || (typeof document !== 'undefined' ? document.querySelector(`[data-node-id="${CSS.escape(id)}"]`) as HTMLElement | null : null);
      if (anchor && typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      // スクロール操作中のエラーを無視
    }
  });
}
