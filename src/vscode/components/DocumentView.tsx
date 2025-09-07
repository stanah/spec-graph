import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { buildDocumentOutline, type DocumentOutline, type SectionBlock, type ParagraphBlock } from '../document/buildDocumentOutline';
import { buildTOC } from '../document/buildTOC';
import { findNodeById } from '../../utils/helpers';
import type { MindmapNode } from '../../types';
import './DocumentView.print.css';
import { StatusBadge, PriorityBadge } from '../../components/table/Badges';
import { FileList } from './FileList';

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
        const [{ LexicalComposer }, { RichTextPlugin }, { ContentEditable }, { HistoryPlugin }, { OnChangePlugin }, lexical] = await Promise.all([
          importModule('@lexical/react/LexicalComposer'),
          importModule('@lexical/react/LexicalRichTextPlugin'),
          importModule('@lexical/react/LexicalContentEditable'),
          importModule('@lexical/react/LexicalHistoryPlugin'),
          importModule('@lexical/react/LexicalOnChangePlugin'),
          importModule('lexical'),
        ]);

        const Cmp: React.FC = () => {
          const initialConfig = React.useMemo(() => ({
            namespace: 'spec-graph-document',
            editable: false,
            theme,
            onError,
            nodes: [],
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
      const node: MindmapNode | null = parsedData?.root ? findNodeById(parsedData.root as unknown as MindmapNode, sec.heading.nodeId) : null;
      const chip: React.CSSProperties = {
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid var(--vscode-panel-border)',
        marginRight: 6,
        fontSize: 12,
        opacity: 0.9,
      };
      const metaRow: React.CSSProperties = { marginTop: 4, fontSize: 12, opacity: 0.8 };
      return (
        <section key={sec.heading.nodeId} data-nodeid={sec.heading.nodeId} data-collapsed={isCollapsed ? 'true' : 'false'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              data-print-hide="true"
              aria-label={isCollapsed ? 'expand' : 'collapse'}
              data-testid={`dv-toggle-${sec.heading.nodeId}`}
              onClick={() => toggle(sec.heading.nodeId)}
              style={{ border: '1px solid var(--vscode-panel-border)', background: 'transparent', cursor: 'pointer' }}
            >
              {isCollapsed ? '+' : '−'}
            </button>
            <Tag style={{ marginRight: 8 }}>{sec.heading.text}</Tag>
            {/* 見出し行にバッジを配置 */}
            {node?.status ? <StatusBadge status={node.status} /> : null}
            {node?.priority ? <PriorityBadge priority={node.priority} /> : null}
          </div>
          {!isCollapsed && (
            <div style={{ paddingLeft: 24 }}>
              {/* ノードのメタ情報（優先度・ステータス・タグ・期限など） */}
              {node ? (
                <div>
                  <div style={metaRow}>
                    {node.priority && (<><span style={{ fontWeight: 600 }}>priority:</span> <span>{node.priority}</span>{' '}</>)}
                    {node.status && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>status:</span> <span>{node.status}</span>{' '}</>)}
                    {node.deadline && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>期限:</span> <span>{new Date(node.deadline).toLocaleString()}</span>{' '}</>)}
                    {/* カスタムフィールドに良くあるメタ項目の取り出し */}
                    {node.customFields && (node.customFields as any).owner && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>owner:</span> <span>{(node.customFields as any).owner as string}</span>{' '}</>)}
                    {node.customFields && (node.customFields as any).component && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>component:</span> <span>{(node.customFields as any).component as string}</span>{' '}</>)}
                    {node.customFields && typeof (node.customFields as any).effort !== 'undefined' && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>effort:</span> <span>{String((node.customFields as any).effort)}</span>{' '}</>)}
                    {node.customFields && (node.customFields as any).risk && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>risk:</span> <span>{(node.customFields as any).risk as string}</span>{' '}</>)}
                  </div>
                  {Array.isArray(node.tags) && node.tags.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>タグ</span>
                      {node.tags.map((t, i) => <span key={i} style={chip}>{t}</span>)}
                    </div>
                  )}
                  {(node.createdAt || node.updatedAt) && (
                    <div style={metaRow}>
                      {node.createdAt && (<><span style={{ fontWeight: 600 }}>作成:</span> <span>{new Date(node.createdAt).toLocaleString()}</span>{' '}</>)}
                      {node.updatedAt && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>更新:</span> <span>{new Date(node.updatedAt).toLocaleString()}</span></>)}
                    </div>
                  )}
                  {/* よく使う構造化フィールドの特別扱い */}
                  {(() => {
                    const cf = (node.customFields || {}) as any;
                    const blocks: JSX.Element[] = [];
                    if (Array.isArray(cf.acceptanceCriteria) && cf.acceptanceCriteria.length > 0) {
                      blocks.push(
                        <div key="ac" style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>受け入れ条件</div>
                          <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                            {cf.acceptanceCriteria.map((c: string, i: number) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      );
                    }
                    if (Array.isArray(cf.dependsOn) && cf.dependsOn.length > 0) {
                      blocks.push(<div key="dep" style={metaRow}>依存: {cf.dependsOn.join(', ')}</div>);
                    }
                    if (Array.isArray(cf.relatesTo) && cf.relatesTo.length > 0) {
                      const text = cf.relatesTo.map((rel: any) => rel && typeof rel === 'object' && rel.type && rel.id ? `${rel.type}:${rel.id}` : String(rel)).join(', ');
                      blocks.push(<div key="rel" style={metaRow}>関連: {text}</div>);
                    }
                    return blocks.length > 0 ? <>{blocks}</> : null;
                  })()}

                  {node.customFields && Object.keys(node.customFields).length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>カスタムフィールド</div>
                      <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                        {Object.entries(node.customFields).map(([k, v]) => (
                          <li key={k} style={{ fontSize: 12, opacity: 0.9 }}>
                            <strong>{k}:</strong>{' '}
                            <span>{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
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

  const [activeTab, setActiveTab] = React.useState<'toc' | 'files'>('toc');
  const [documentRoot, setDocumentRoot] = React.useState<string>('./docs');
  
  // appStoreから設定を読み込み・保存
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  
  // 設定からドキュメントルートを初期化
  React.useEffect(() => {
    const savedDocumentRoot = (settings as any).documentRoot || './docs';
    setDocumentRoot(savedDocumentRoot);
  }, [settings]);
  
  // ドキュメントルート変更時の処理
  const handleDocumentRootChange = React.useCallback((newRoot: string) => {
    setDocumentRoot(newRoot);
    updateSettings({
      ...settings,
      documentRoot: newRoot
    } as any);
  }, [settings, updateSettings]);

  return (
    <div data-testid="document-view" data-print-root="true" style={{ 
      height: '100vh', 
      display: 'grid', 
      gridTemplateColumns: '240px 1fr',
      gridTemplateRows: '1fr',
      backgroundColor: 'var(--vscode-editor-background)',
      overflow: 'hidden'
    }}>
      {outline ? (
        <>
          <div 
            data-print-hide="true" 
            style={{ 
              borderRight: '1px solid var(--vscode-panel-border)', 
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: 'var(--vscode-sideBar-background)'
            }}
          >
            {/* タブヘッダー */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid var(--vscode-panel-border)', 
              flexShrink: 0,
              backgroundColor: 'var(--vscode-tab-inactiveBackground)'
            }}>
              <button
                onClick={() => setActiveTab('toc')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: activeTab === 'toc' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
                  border: 'none',
                  color: activeTab === 'toc' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderBottom: activeTab === 'toc' ? '2px solid var(--vscode-tab-activeBorder)' : 'none'
                }}
              >
                目次
              </button>
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: activeTab === 'files' ? 'var(--vscode-tab-activeBackground)' : 'transparent',
                  border: 'none',
                  color: activeTab === 'files' ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderBottom: activeTab === 'files' ? '2px solid var(--vscode-tab-activeBorder)' : 'none'
                }}
              >
                ファイル
              </button>
            </div>

            {/* タブコンテンツ - 完全独立スクロール */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              padding: '8px 12px',
              minHeight: 0
            }}>
              {activeTab === 'toc' ? (
                <nav data-testid="doc-toc" data-print-hide="true" aria-label="Table of contents">
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tocItems.map((t) => (
                      <li key={t.nodeId} style={{ marginBottom: '2px' }}>
                        <button
                          data-testid={`toc-item-${t.nodeId}`}
                          onClick={() => onClickTOC(t.nodeId)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--vscode-foreground)', 
                            cursor: 'pointer',
                            padding: '4px 8px',
                            paddingLeft: `${(t.level - 1) * 12 + 8}px`,
                            width: '100%',
                            textAlign: 'left',
                            borderRadius: '3px',
                            fontSize: '13px',
                            transition: 'background-color 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {t.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                <div data-testid="doc-files">
                  <FileList 
                    rootPath={documentRoot}
                    onRootPathChange={handleDocumentRootChange}
                    onFileSelect={(filePath) => {
                      console.log('選択されたファイル:', filePath);
                      // TODO: ファイルプレビュー機能を実装
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div style={{ 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px',
            minHeight: 0,
            backgroundColor: 'var(--vscode-editor-background)'
          }}>
            {renderOutline(outline)}
          </div>
        </>
      ) : (
        <div style={{ 
          gridColumn: '1 / -1', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          opacity: 0.7,
          padding: '12px'
        }}>
          ドキュメントを表示するデータがありません。
        </div>
      )}
      {Loaded ? <div aria-hidden>{/* Lexical view mount point (optional) */}<Loaded /></div> : null}
    </div>
  );
};

export default DocumentView;
