import React from 'react';
import type { JsonSchema } from '../../../services/schemaManager';
import { StatusBadge, PriorityBadge } from '../../../components/table/Badges';

type AnySchema = JsonSchema & {
  title?: string;
  properties?: Record<string, any>;
};

type UIHint = {
  label?: string;
  section?: string;
  order?: number;
  display?: 'list' | 'chips' | 'table' | 'badge' | 'text';
  collapsed?: boolean;
  hidden?: boolean;
  itemTitle?: string; // for array/object items (e.g., 'id+title')
};

function getUiHint(s: any): UIHint {
  const ui = (s && (s['x-ui'] as any)) || {};
  return ui;
}

function labelFor(propName: string, schema: any): string {
  const ui = getUiHint(schema);
  return ui.label || schema.title || propName;
}

const Section: React.FC<{ title: string }>=({ title, children })=> (
  <section style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
    <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
    <div>{children}</div>
  </section>
);

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid var(--vscode-panel-border)',
  marginRight: 6,
  fontSize: 12,
  opacity: 0.9,
};

const metaRow: React.CSSProperties = { marginTop: 4, fontSize: 12, opacity: 0.8 };

function renderPrimitive(name: string, schema: any, value: unknown): React.ReactNode {
  if (value === undefined || value === null) return null;
  const ui = getUiHint(schema);
  const lbl = labelFor(name, schema);

  if (ui.display === 'badge' || name === 'status' || name === 'priority') {
    if (name === 'status') return <><span style={{ fontWeight: 600 }}>{lbl}:</span>{' '}<StatusBadge status={String(value)} /></>;
    if (name === 'priority') return <><span style={{ fontWeight: 600 }}>{lbl}:</span>{' '}<PriorityBadge priority={String(value)} /></>;
    return <span style={chipStyle}>{String(value)}</span>;
  }

  return (
    <div>
      <span style={{ fontWeight: 600 }}>{lbl}:</span>{' '}<span>{String(value)}</span>
    </div>
  );
}

function renderArrayOfStrings(name: string, schema: any, value: unknown): React.ReactNode {
  if (!Array.isArray(value)) return null;
  const ui = getUiHint(schema);
  const lbl = labelFor(name, schema);
  if (ui.display === 'chips') {
    return (
      <div>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>{lbl}</span>
        {value.map((v: unknown, i: number) => <span key={i} style={chipStyle}>{String(v)}</span>)}
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{lbl}</div>
      <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
        {value.map((v: unknown, i: number) => <li key={i}>{String(v)}</li>)}
      </ul>
    </div>
  );
}

function renderArrayOfObjects(name: string, schema: any, value: unknown): React.ReactNode {
  if (!Array.isArray(value)) return null;
  const lbl = labelFor(name, schema);
  const itemSchema = (schema && schema.items) || {};

  // table 表示（例: glossary）
  const ui = getUiHint(schema);
  if (ui.display === 'table') {
    // 単純な2列(term/definition)ケースを優先対応
    const cols = Object.keys((itemSchema.properties || {}));
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 6 }}>{lbl}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {cols.map(c => <th key={c}>{labelFor(c, itemSchema.properties?.[c])}</th>)}
            </tr>
          </thead>
          <tbody>
            {value.map((row: any, i: number) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c} style={{ verticalAlign: 'top', whiteSpace: c === 'definition' ? 'pre-wrap' : undefined }}>
                    {String(row?.[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // デフォルト: リスト表示（id/title/description/priority/statusなどをリッチ表示）
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>{lbl}</div>
      {value.length === 0 ? (
        <div style={{ opacity: 0.7 }}>なし</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {value.map((r: any, idx: number) => (
            <li key={r?.id || idx} style={{ marginBottom: 6 }}>
              {(() => {
                const ui = getUiHint(schema);
                const itemTitle = (ui.itemTitle as string | undefined)?.split('+').map(s => s.trim()).filter(Boolean);
                if (itemTitle && itemTitle.length > 0) {
                  const parts = itemTitle.map((k) => String(r?.[k] ?? '')).filter(Boolean);
                  return <strong>{parts.join(': ') || (r?.title || '(無題)')}</strong>;
                }
                return <strong>{r?.id ? `${r.id}: ` : ''}{r?.title || '(無題)'}</strong>;
              })()}
              {/* バッジ */}
              <span style={{ marginLeft: 8 }}>
                {r?.status ? <StatusBadge status={r.status} /> : null}
              </span>
              <span style={{ marginLeft: 6 }}>
                {r?.priority ? <PriorityBadge priority={r.priority} /> : null}
              </span>
              {r?.description && <div style={{ marginTop: 4, opacity: 0.9 }}>{r.description}</div>}
              {/* 追加フィールド（role/availability/tagsなど x-ui を尊重） */}
              {(() => {
                const itemSchema = (schema && schema.items) || {};
                const props = (itemSchema.properties || {}) as Record<string, any>;
                const ui = getUiHint(schema);
                const tokens = (ui.itemTitle as string | undefined)?.split('+').map(s => s.trim()) ?? [];
                const exclude = new Set<string>(['id', 'title', 'name', 'description', 'status', 'priority', ...tokens]);
                const blocks: JSX.Element[] = [];
                for (const k of Object.keys(props)) {
                  if (exclude.has(k)) continue;
                  const ps = props[k];
                  const val = r?.[k];
                  if (val === undefined || val === null) continue;
                  // array<string> with chips
                  if (ps?.type === 'array' && ps?.items?.type === 'string') {
                    const iui = getUiHint(ps);
                    if (iui.display === 'chips' && Array.isArray(val)) {
                      blocks.push(
                        <div key={`chips-${k}`} style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>{labelFor(k, ps)}</span>
                          {(val as unknown[]).map((v, i) => <span key={i} style={chipStyle}>{String(v)}</span>)}
                        </div>
                      );
                      continue;
                    }
                  }
                  // primitive with badge/text
                  if (ps?.type === 'string' || ps?.type === 'number' || ps?.type === 'integer' || ps?.type === 'boolean' || getUiHint(ps).display === 'badge') {
                    blocks.push(<div key={`meta-${k}`} style={metaRow}>{renderPrimitive(k, ps, val)}</div>);
                    continue;
                  }
                }
                return blocks.length ? <>{blocks}</> : null;
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderProperty(name: string, schema: any, value: unknown): React.ReactNode {
  const type = schema?.type;
  if (value === undefined) return null;

  if (type === 'array') {
    const itemType = schema.items?.type;
    if (itemType === 'string') return renderArrayOfStrings(name, schema, value);
    if (itemType === 'object' || !itemType) return renderArrayOfObjects(name, schema, value);
  }

  if (type === 'string' || type === 'number' || type === 'integer' || type === 'boolean') {
    return renderPrimitive(name, schema, value);
  }

  // オブジェクトは簡易に key:value 羅列（必要に応じて拡張）
  if (type === 'object' && value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return null;
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{labelFor(name, schema)}</div>
        <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
          {entries.map(([k, v]) => (
            <li key={k} style={{ fontSize: 12, opacity: 0.9 }}>
              <strong>{k}:</strong>{' '}
              <span>{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // その他は文字列化
  return (
    <div>
      <span style={{ fontWeight: 600 }}>{labelFor(name, schema)}:</span>{' '}
      <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
    </div>
  );
}

function orderOf(name: string, schema: any, defaultIndex: number): number {
  const ui = getUiHint(schema);
  if (typeof ui.order === 'number') return ui.order;
  return defaultIndex;
}

export const SchemaDocumentView: React.FC<{ data: any; schema: AnySchema }>=({ data, schema }) => {
  // ヘッダー（title/version）
  const headerTitle = (data && (data.title as string)) || schema.title || 'Document';
  const headerVersion = (data && (data.version as string)) || undefined;

  // プロパティをセクションごとにグルーピング
  const sections = new Map<string, Array<{ name: string; schema: any }>>();
  const topProps = schema.properties || {};
  const keys = Object.keys(topProps);
  keys.forEach((k) => {
    const ps = topProps[k];
    const ui = getUiHint(ps);
    if (ui.hidden) return;
    if (k === 'title' || k === 'version') return; // ヘッダーで表示
    const sec = ui.section || 'main';
    const arr = sections.get(sec) || [];
    arr.push({ name: k, schema: ps });
    sections.set(sec, arr);
  });

  // セクション順（セクション内で order 指定を尊重）
  const orderedSections = Array.from(sections.entries()).map(([secName, props]) => {
    const orderedProps = props
      .sort((a, b) => orderOf(a.name, a.schema, 999) - orderOf(b.name, b.schema, 999));
    return { name: secName, props: orderedProps };
  });

  // 折りたたみ状態: prop単位で管理
  const initialCollapsed = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of orderedSections) {
      for (const p of s.props) {
        const ui = getUiHint(p.schema);
        if (ui.collapsed) set.add(`${s.name}/${p.name}`);
      }
    }
    return set;
  }, [orderedSections]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(initialCollapsed);
  const toggle = React.useCallback((section: string, prop: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const key = `${section}/${prop}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return (
    <div>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <h2 style={{ margin: 0 }}>
          {headerTitle}
          {headerVersion ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}> (v{headerVersion})</span>
          ) : null}
        </h2>
      </header>

      {/* TOC: セクションとプロパティの一覧 */}
      <nav data-testid="schema-toc" aria-label="Schema TOC" style={{ padding: '8px 16px', opacity: 0.9 }}>
        {orderedSections.map((sec) => (
          <div key={`toc-${sec.name}`} style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>{sec.name}</div>
            <ul style={{ margin: '2px 0 0 12px', padding: 0, listStyle: 'none' }}>
              {sec.props.map((p) => (
                <li key={`toc-${sec.name}-${p.name}`}>
                  <a
                    href={`#prop-${sec.name}-${p.name}`}
                    data-testid={`toc-item-prop-${sec.name}-${p.name}`}
                    style={{ color: 'var(--vscode-textLink-foreground)', textDecoration: 'none' }}
                  >
                    {labelFor(p.name, p.schema)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {orderedSections.map((sec) => (
        <Section key={sec.name} title={sec.name}>
          {sec.props.map(({ name, schema: ps }) => {
            const key = `${sec.name}/${name}`;
            const isCollapsed = collapsed.has(key);
            return (
              <div key={name} id={`prop-${sec.name}-${name}`} data-testid={`prop-block-${sec.name}-${name}`} data-collapsed={isCollapsed ? 'true' : 'false'} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    data-testid={`toggle-${sec.name}-${name}`}
                    onClick={() => toggle(sec.name, name)}
                    aria-label={isCollapsed ? 'expand' : 'collapse'}
                    style={{ border: '1px solid var(--vscode-panel-border)', background: 'transparent', cursor: 'pointer' }}
                  >
                    {isCollapsed ? '+' : '−'}
                  </button>
                  <div style={{ fontWeight: 600 }}>{labelFor(name, ps)}</div>
                </div>
                {!isCollapsed && (
                  <div style={{ marginTop: 6 }}>
                    {renderProperty(name, ps, (data as any)?.[name])}
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      ))}
    </div>
  );
};

export default SchemaDocumentView;
