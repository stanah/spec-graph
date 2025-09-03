import React from 'react';

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

  return (
    <div data-testid="document-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {Loaded ? <Loaded /> : null}
    </div>
  );
};

export default DocumentView;
