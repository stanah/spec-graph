import type { MindmapData, MindmapNode } from '../types';
import { findNodeById } from '../utils/helpers';

export type LinkToken = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export class LinkResolver {
  private data: MindmapData | null;

  constructor(data: MindmapData | null = null) {
    this.data = data;
  }

  setData(data: MindmapData | null) {
    this.data = data;
  }

  /**
   * [[ID]] または [[ID|LABEL]] を抽出
   */
  parseMarkdownLinks(text: string): LinkToken[] {
    const tokens: LinkToken[] = [];
    if (!text) return tokens;
    const re = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g; // [[id]] or [[id|label]]
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const id = m[1].trim();
      const label = (m[2] ?? id).trim();
      tokens.push({ id, label, start: m.index, end: m.index + m[0].length });
    }
    return tokens;
  }

  /**
   * MindmapDataからIDでノードを解決
   */
  resolve(id: string): MindmapNode | null {
    if (!this.data?.root) return null;
    return findNodeById(this.data.root, id);
  }

  /**
   * テキスト内リンクの一括検証
   */
  validateInline(text: string): {
    valid: LinkToken[];
    invalid: LinkToken[];
    validCount: number;
    invalidCount: number;
  } {
    const tokens = this.parseMarkdownLinks(text);
    const valid: LinkToken[] = [];
    const invalid: LinkToken[] = [];
    for (const t of tokens) {
      const ok = this.resolve(t.id);
      (ok ? valid : invalid).push(t);
    }
    return { valid, invalid, validCount: valid.length, invalidCount: invalid.length };
  }
}

