import type { MindmapNode } from '../../types';

export interface HeadingBlock {
  type: 'heading';
  level: number; // 1..6
  text: string;
  nodeId: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
  nodeId: string;
}

export interface SectionBlock {
  type: 'section';
  heading: HeadingBlock;
  children: Array<SectionBlock | ParagraphBlock>;
  collapsed?: boolean;
}

export type DocumentOutline = SectionBlock;

export function buildDocumentOutline(root: MindmapNode): DocumentOutline {
  const toLevel = (depth: number) => Math.min(6, Math.max(1, depth + 1));

  function walk(node: MindmapNode, depth: number): SectionBlock {
    const section: SectionBlock = {
      type: 'section',
      heading: {
        type: 'heading',
        level: toLevel(depth),
        text: node.title,
        nodeId: node.id,
      },
      children: [],
      collapsed: node.collapsed ?? false,
    };

    if (node.description) {
      section.children.push({ type: 'paragraph', text: node.description, nodeId: node.id });
    }

    const kids = node.children ?? [];
    for (const child of kids) {
      section.children.push(walk(child, depth + 1));
    }

    return section;
  }

  return walk(root, 0);
}

// ツリーを線形ブロック列に展開（テスト補助用）
export function flattenOutline(outline: DocumentOutline): Array<HeadingBlock | ParagraphBlock> {
  const out: Array<HeadingBlock | ParagraphBlock> = [];
  function walk(section: SectionBlock) {
    out.push(section.heading);
    for (const child of section.children) {
      if ((child as SectionBlock).type === 'section') {
        walk(child as SectionBlock);
      } else {
        out.push(child as ParagraphBlock);
      }
    }
  }
  walk(outline);
  return out;
}

