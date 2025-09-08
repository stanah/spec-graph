import { describe, it, expect } from 'vitest';
import type { MindmapNode } from '../../../types';
import { buildDocumentOutline } from '../../document/buildDocumentOutline';
import { outlineToLexicalState } from '../outlineToLexical';

describe('outlineToLexicalState', () => {
  it('見出しと段落をLexical JSON構造に変換する', () => {
    const root: MindmapNode = {
      id: 'root', title: 'Root', description: 'Intro', children: [
        { id: 'c1', title: 'Child', description: 'Body', children: [] }
      ]
    } as any;
    const outline = buildDocumentOutline(root);
    const state = outlineToLexicalState(outline);

    // ルート
    expect(state).toHaveProperty('root');
    expect(state.root.type).toBe('root');
    expect(Array.isArray(state.root.children)).toBe(true);

    // 先頭はH1テキスト、その後段落
    const [h1, p1, h2, p2] = state.root.children;
    expect(h1.type).toBe('heading');
    expect(h1.tag).toBe('h1');
    expect(h1.children?.[0]?.text).toBe('Root');
    expect(p1.type).toBe('paragraph');
    expect(p1.children?.[0]?.text).toBe('Intro');
    expect(h2.tag).toBe('h2');
    expect(p2.children?.[0]?.text).toBe('Body');
  });
});

