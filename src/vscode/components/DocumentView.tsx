import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { buildDocumentOutline, type DocumentOutline, type SectionBlock, type ParagraphBlock } from '../document/buildDocumentOutline';
import { buildTOC } from '../document/buildTOC';

const theme = {
  paragraph: 'lexical-paragraph',
};

function onError(error: unknown) {
  // For now simply rethrow; later we can integrate app-level error handling
  throw error instanceof Error ? error : new Error(String(error));
}

export const DocumentView: React.FC = () => {
  // Lazy-load Lexical to avoid hard dependency in environments where it isn't installed yet.
  const [Loaded, setLoaded] = React.useState<null | React.ComponentType>(null);
  const parsedData = useAppStore((s) => s.parse.parsedData);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  // 初期collapsedを反映
  React.useEffect(() => {
    const next = new Set<string>();
    if (parsedData?.root) {
      const outline = buildDocumentOutline(parsedData.root);
      const collect = (sec: SectionBlock) => {
        if (sec.collapsed) next.add(sec.heading.nodeId);
        for (const c of sec.children) {
          if ((c as SectionBlock).type === 'section') collect(c as SectionBlock);
        }
      };
      collect(outline);
    }
    setCollapsed(next);
  }, [parsedData]);

  const toggle = React.useCallback((nodeId: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(nodeId)) n.delete(nodeId); else n.add(nodeId);
      return n;
    });
  }, []);

  React.useEffect(() => {
    // Skip loading during Vitest to keep tests lightweight
    // @ts-expect-error vitest flag injected by Vitest
    if (import.meta?.vitest) return;
    const importModule = (p: string) => import(/* @vite-ignore */ p);
    (async () => {
      try {
        const [{ LexicalComposer }, { RichTextPlugin }, { ContentEditable }, { HistoryPlugin }, { OnChangePlugin }, lexical, reqNodeMod] = await Promise.all([
          importModule('@lexical/react/LexicalComposer'),
          importModule('@lexical/react/LexicalRichTextPlugin'),
          importModule('@lexical/react/LexicalContentEditable'),
          importModule('@lexical/react/LexicalHistoryPlugin'),
          importModule('@lexical/react/LexicalOnChangePlugin'),
          importModule('lexical'),
          importModule('../lexical/nodes/RequirementNode'),
        ]);

        const Cmp: React.FC = () => {
          const initialConfig = React.useMemo(() => ({
            namespace: 'req-mindmap-document',
            editable: false,
            theme,
            onError,
            nodes: [reqNodeMod.RequirementNode],
            editorState: () => {
              const root = lexical.$getRoot();
              void root; // empty state for now
            },
          }), []);

          return (
            <LexicalComposer initialConfig={initialConfig}>
              <RichTextPlugin contentEditable={<ContentEditable style={{ outline: 'none', padding: 16 }} />} placeholder={null} />
              <HistoryPlugin />
              <OnChangePlugin onChange={() => { /* read-only for now */ }} />
            </LexicalComposer>
          );
        };

        setLoaded(() => Cmp);
      } catch (e) {
        // Lexical not available; keep fallback
        console.warn('[DocumentView] Lexical not available, using fallback.', e);
      }
    })();
  }, []);

  const renderOutline = React.useCallback((outline: DocumentOutline) => {
    const renderSection = (sec: SectionBlock) => {
      const Tag = (`h${Math.min(6, Math.max(1, sec.heading.level))}`) as keyof JSX.IntrinsicElements;
      const isCollapsed = collapsed.has(sec.heading.nodeId);
      return (
        <section key={sec.heading.nodeId} data-nodeid={sec.heading.nodeId} data-collapsed={isCollapsed ? 'true' : 'false'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              aria-label={isCollapsed ? 'expand' : 'collapse'}
              data-testid={`dv-toggle-${sec.heading.nodeId}`}
              onClick={() => toggle(sec.heading.nodeId)}
              style={{ border: '1px solid var(--vscode-panel-border)', background: 'transparent', cursor: 'pointer' }}
            >
              {isCollapsed ? '+' : '−'}
            </button>
            <Tag>{sec.heading.text}</Tag>
          </div>
          {!isCollapsed && (
            <div style={{ paddingLeft: 24 }}>
              {sec.children.map((c, i) => (
                (c as SectionBlock).type === 'section'
                  ? renderSection(c as SectionBlock)
                  : <p key={`${sec.heading.nodeId}-p-${i}`}>{(c as ParagraphBlock).text}</p>
              ))}
            </div>
          )}
        </section>
      );
    };
    return renderSection(outline);
  }, [collapsed, toggle]);

  const outline = React.useMemo(() => (parsedData?.root ? buildDocumentOutline(parsedData.root) : null), [parsedData]);
  const tocItems = React.useMemo(() => (outline ? buildTOC(outline) : []), [outline]);
  const onClickTOC = React.useCallback((nodeId: string) => {
    const el = document.querySelector(`[data-nodeid="${nodeId}"]`) as HTMLElement | null;
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div data-testid="document-view" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      {outline ? (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
          <nav data-testid="doc-toc" aria-label="Table of contents" style={{ borderRight: '1px solid var(--vscode-panel-border)', paddingRight: 12 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tocItems.map((t) => (
                <li key={t.nodeId} style={{ marginLeft: (t.level - 1) * 12 }}>
                  <button
                    data-testid={`toc-item-${t.nodeId}`}
                    onClick={() => onClickTOC(t.nodeId)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--vscode-foreground)', cursor: 'pointer' }}
                  >
                    {t.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            {renderOutline(outline)}
          </div>
        </div>
      ) : (
        <div style={{ opacity: 0.7 }}>ドキュメントを表示するデータがありません。</div>
      )}
      {Loaded ? <div aria-hidden>{/* Lexical view mount point (optional) */}<Loaded /></div> : null}
    </div>
  );
};

export default DocumentView;
