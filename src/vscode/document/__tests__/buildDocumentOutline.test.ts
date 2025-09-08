import { describe, it, expect } from 'vitest';
import type { MindmapNode } from '../../../types';
import { buildDocumentOutline, flattenOutline } from '../buildDocumentOutline';

describe('buildDocumentOutline', () => {
  const sample: MindmapNode = {
    id: 'root',
    title: 'Root',
    description: 'Root description',
    children: [
      {
        id: 'c1',
        title: 'Child 1',
        description: 'Child 1 description',
        children: [],
      },
    ],
  };

  it('深さに応じた見出しレベルを割り当てる（root=H1, child=H2）', () => {
    const outline = buildDocumentOutline(sample);
    const blocks = flattenOutline(outline);
    const headings = blocks.filter((b) => b.type === 'heading');
    expect(headings[0]).toMatchObject({ level: 1, text: 'Root' });
    expect(headings[1]).toMatchObject({ level: 2, text: 'Child 1' });
  });

  it('説明がある場合は段落として含める', () => {
    const outline = buildDocumentOutline(sample);
    const blocks = flattenOutline(outline);
    const paragraphs = blocks.filter((b) => b.type === 'paragraph');
    expect(paragraphs[0]).toMatchObject({ text: 'Root description' });
    expect(paragraphs[1]).toMatchObject({ text: 'Child 1 description' });
  });

  it('見出しレベルは最大H6にクリップされる', () => {
    // 10段深いチェーン
    const deep: MindmapNode = { id: 'n0', title: 'N0', children: [] } as any;
    let current = deep;
    for (let i = 1; i <= 10; i++) {
      const next = { id: `n${i}`, title: `N${i}`, children: [] } as any;
      current.children = [next];
      current = next;
    }
    const outline = buildDocumentOutline(deep);
    const blocks = flattenOutline(outline).filter((b) => b.type === 'heading');
    const last = blocks[blocks.length - 1] as any;
    expect(last.level).toBe(6);
  });
});

