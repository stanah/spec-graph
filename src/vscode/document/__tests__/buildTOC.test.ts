import { describe, it, expect } from 'vitest';
import type { MindmapNode } from '../../../types';
import { buildDocumentOutline } from '../buildDocumentOutline';
import { buildTOC } from '../buildTOC';

describe('buildTOC', () => {
  it('アウトラインから見出しのTOCを生成する（順序とレベル）', () => {
    const root: MindmapNode = {
      id: 'root', title: 'Root', children: [
        { id: 'c1', title: 'Child 1', children: [] } as any,
        { id: 'c2', title: 'Child 2', children: [] } as any,
      ]
    } as any;
    const outline = buildDocumentOutline(root);
    const toc = buildTOC(outline);
    expect(toc.map(t => [t.nodeId, t.text, t.level])).toEqual([
      ['root', 'Root', 1],
      ['c1', 'Child 1', 2],
      ['c2', 'Child 2', 2],
    ]);
  });
});

