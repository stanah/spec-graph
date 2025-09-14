export function installLinkPreview(root: HTMLElement) {
  let tooltip: HTMLDivElement | null = null;

  const ensure = () => {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.dataset.testid = 'link-preview';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.padding = '4px 6px';
    tooltip.style.fontSize = '11px';
    tooltip.style.border = '1px solid var(--vscode-panel-border)';
    tooltip.style.background = 'var(--vscode-editor-background)';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    return tooltip;
  };

  const onOver = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const linkEl = t.closest('[data-link-id]') as HTMLElement | null;
    if (!linkEl) return;
    const id = linkEl.getAttribute('data-link-id') || '';
    const tip = ensure();
    tip.textContent = id ? `ID: ${id}` : 'リンク';
    tip.style.left = `${e.clientX + 8}px`;
    tip.style.top = `${e.clientY + 8}px`;
    tip.style.display = 'block';
  };

  const onOut = (e: MouseEvent) => {
    const tip = ensure();
    tip.style.display = 'none';
  };

  root.addEventListener('mouseover', onOver);
  root.addEventListener('mouseout', onOut);

  return () => {
    root.removeEventListener('mouseover', onOver);
    root.removeEventListener('mouseout', onOut);
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };
}

