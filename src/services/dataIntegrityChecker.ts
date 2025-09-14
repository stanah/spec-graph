import type { MindmapData, MindmapNode } from '../types';
import { LinkResolver, type LinkToken } from './linkResolver';
import { DependencyGraph } from '../core/deps/DependencyGraph';

export type DanglingReference = {
  token: LinkToken;
  sourceNodeId: string;
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

  constructor(data: MindmapData | null = null) {
    this.data = data;
    this.resolver = new LinkResolver(data);
  }

  setData(data: MindmapData | null) {
    this.data = data;
    this.resolver.setData(data);
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
  collectReferences(): Array<LinkToken & { sourceNodeId: string } > {
    const refs: Array<LinkToken & { sourceNodeId: string }> = [];
    const root = this.data?.root;
    if (!root) return refs;

    const walk = (node: MindmapNode) => {
      const texts: string[] = [];
      if (typeof node.title === 'string') texts.push(node.title);
      if (typeof node.description === 'string') texts.push(node.description);

      for (const t of texts) {
        const tokens = this.resolver.parseMarkdownLinks(t);
        for (const token of tokens) refs.push({ ...token, sourceNodeId: node.id });
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
}
