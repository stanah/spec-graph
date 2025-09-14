import type { MindmapData, MindmapNode } from '../types';
import { LinkResolver, type LinkToken } from './linkResolver';
import { DependencyGraph } from '../core/deps/DependencyGraph';
import { deepClone } from '../utils/helpers';

export type DanglingReference = {
  token: LinkToken;
  sourceNodeId: string;
};

type SourceField = 'title' | 'description';
type ReferenceToken = LinkToken & { sourceNodeId: string; sourceField: SourceField };

export type SafeFix = {
  type: 'removeLink';
  nodeId: string;
  linkId: string;
  field: SourceField;
  start: number;
  end: number;
};

/**
 * データ整合性チェックの基盤クラス
 * - ノードID収集
 * - テキスト中の参照抽出（[[ID]] / [[ID|LABEL]])
 * - ダングリング参照検出
 */
export class DataIntegrityChecker {
  private data: MindmapData | null;
  private resolver: LinkResolver;
  private listeners: Map<'report'|'issue', Set<(payload: unknown) => void>> = new Map();

  constructor(data: MindmapData | null = null) {
    this.data = data;
    this.resolver = new LinkResolver(data);
    this.listeners.set('report', new Set());
    this.listeners.set('issue', new Set());
  }

  setData(data: MindmapData | null) {
    this.data = data;
    this.resolver.setData(data);
  }

  on(event: 'report'|'issue', cb: (payload: unknown) => void) {
    this.listeners.get(event)?.add(cb);
  }

  off(event: 'report'|'issue', cb: (payload: unknown) => void) {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: 'report'|'issue', payload: unknown) {
    for (const cb of this.listeners.get(event) ?? []) {
      try { cb(payload); } catch { /* no-op */ }
    }
  }

  /** 全ノードのIDをSetで収集 */
  collectIds(): Set<string> {
    const ids = new Set<string>();
    const root = this.data?.root;
    if (!root) return ids;

    const walk = (node: MindmapNode) => {
      ids.add(node.id);
      if (node.children) node.children.forEach(walk);
    };
    walk(root);
    return ids;
  }

  /** ノードのタイトル/説明からリンク参照を抽出 */
  collectReferences(): ReferenceToken[] {
    const refs: ReferenceToken[] = [];
    const root = this.data?.root;
    if (!root) return refs;

    const walk = (node: MindmapNode) => {
      if (typeof node.title === 'string') {
        const tokens = this.resolver.parseMarkdownLinks(node.title);
        for (const token of tokens) refs.push({ ...token, sourceNodeId: node.id, sourceField: 'title' });
      }
      if (typeof node.description === 'string') {
        const tokens = this.resolver.parseMarkdownLinks(node.description);
        for (const token of tokens) refs.push({ ...token, sourceNodeId: node.id, sourceField: 'description' });
      }

      if (node.children) node.children.forEach(walk);
    };
    walk(root);
    return refs;
  }

  /** 参照のうち、ID集合に存在しないもの（ダングリング）を検出 */
  detectDanglingReferences(): DanglingReference[] {
    const ids = this.collectIds();
    const refs = this.collectReferences();
    return refs
      .filter(r => !ids.has(r.id))
      .map(({ sourceNodeId, ...token }) => ({ token, sourceNodeId }));
  }

  /**
   * 参照関係から依存グラフを構築
   */
  buildReferenceGraph(): DependencyGraph {
    const g = new DependencyGraph();
    const ids = this.collectIds();
    for (const id of ids) g.addNode(id);

    const refs = this.collectReferences();
    for (const r of refs) {
      // 既存ノード間の参照のみエッジに採用（未知IDは除外）
      if (ids.has(r.id) && ids.has(r.sourceNodeId)) {
        g.addEdge(r.sourceNodeId, r.id);
      }
    }
    return g;
  }

  /**
   * 循環参照を検出し、各循環をノードID配列として返す
   */
  detectCycles(): string[][] {
    const g = this.buildReferenceGraph();
    return g.findCycles();
  }

  /**
   * 参照されていないID（ROOTは除外）
   */
  detectUnusedIds(): string[] {
    const ids = this.collectIds();
    const refs = this.collectReferences();
    const referenced = new Set<string>();
    for (const r of refs) referenced.add(r.id);
    // 未使用 = ids - referenced - {ROOT}
    const result: string[] = [];
    for (const id of ids) {
      if (id === 'ROOT') continue;
      if (!referenced.has(id)) result.push(id);
    }
    result.sort();
    return result;
  }

  /**
   * 安全な修正提案（ダングリング参照のリンク文字列を除去）
   */
  suggestSafeFixes(): SafeFix[] {
    const ids = this.collectIds();
    const refs = this.collectReferences();
    const fixes: SafeFix[] = [];
    for (const r of refs) {
      if (!ids.has(r.id)) {
        fixes.push({
          type: 'removeLink',
          nodeId: r.sourceNodeId,
          linkId: r.id,
          field: r.sourceField,
          start: r.start,
          end: r.end,
        });
      }
    }
    return fixes;
  }

  /**
   * 提案された安全な修正を適用した新しいデータを返す
   */
  applySafeFixes(): MindmapData {
    const fixes = this.suggestSafeFixes();
    const data = deepClone(this.data)!;
    if (!data?.root) return data as MindmapData;

    // ノードごと・フィールドごとにグループ化し、start降順で適用
    const grouped = new Map<string, { field: SourceField; start: number; end: number }[]>();
    for (const f of fixes) {
      const key = `${f.nodeId}::${f.field}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ field: f.field, start: f.start, end: f.end });
    }

    const applyToNode = (node: MindmapNode) => {
      for (const field of ['title', 'description'] as const) {
        const key = `${node.id}::${field}`;
        const list = grouped.get(key);
        if (!list?.length) continue;
        // start の降順に並べて末尾から切り落としていく
        list.sort((a, b) => b.start - a.start);
        const src = (node as any)[field];
        if (typeof src !== 'string') continue;
        let text = src;
        for (const fix of list) {
          text = text.slice(0, fix.start) + text.slice(fix.end);
        }
        (node as any)[field] = text;
      }
      if (node.children) node.children.forEach(applyToNode);
    };
    applyToNode(data.root);
    return data;
  }

  /** JSON形式の整合性レポート */
  generateReportJSON(): {
    timestamp: string;
    danglingReferences: Array<{ nodeId: string; id: string; field: SourceField; start: number; end: number; }>;
    cycles: string[][];
    unusedIds: string[];
  } {
    const fixes = this.suggestSafeFixes();
    const dangling = fixes.map(f => ({ nodeId: f.nodeId, id: f.linkId, field: f.field, start: f.start, end: f.end }));
    return {
      timestamp: new Date().toISOString(),
      danglingReferences: dangling,
      cycles: this.detectCycles(),
      unusedIds: this.detectUnusedIds(),
    };
  }

  /** HTML形式の整合性レポート（簡易） */
  generateReportHTML(): string {
    const r = this.generateReportJSON();
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const rowsDangling = r.danglingReferences
      .map(d => `<tr><td>${esc(d.nodeId)}</td><td>${esc(d.id)}</td><td>${esc(d.field)}</td><td>${d.start}-${d.end}</td></tr>`)
      .join('');
    const rowsCycles = r.cycles
      .map(c => `<li>${esc(c.join(' -> '))}</li>`)
      .join('');
    const rowsUnused = r.unusedIds
      .map(id => `<li>${esc(id)}</li>`) 
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Integrity Report</title></head><body>
      <h1>Integrity Report</h1>
      <p>Generated: ${esc(r.timestamp)}</p>
      <h2>Dangling References</h2>
      <table border="1" cellspacing="0" cellpadding="4">
        <thead><tr><th>Node</th><th>ID</th><th>Field</th><th>Range</th></tr></thead>
        <tbody>${rowsDangling || '<tr><td colspan="4">None</td></tr>'}</tbody>
      </table>
      <h2>Cycles</h2>
      <ul>${rowsCycles || '<li>None</li>'}</ul>
      <h2>Unused IDs</h2>
      <ul>${rowsUnused || '<li>None</li>'}</ul>
    </body></html>`;
  }

  /**
   * 非同期に整合性チェックを実行し、進捗（issue）と完了（report）を通知
   */
  async runInBackground(): Promise<ReturnType<DataIntegrityChecker['generateReportJSON']>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const report = this.generateReportJSON();
        if (report.danglingReferences.length > 0) {
          this.emit('issue', { type: 'dangling', count: report.danglingReferences.length });
        }
        if (report.cycles.length > 0) {
          this.emit('issue', { type: 'cycles', count: report.cycles.length });
        }
        if (report.unusedIds.length > 0) {
          this.emit('issue', { type: 'unused', count: report.unusedIds.length });
        }
        this.emit('report', report);
        resolve(report);
      }, 0);
    });
  }
}
