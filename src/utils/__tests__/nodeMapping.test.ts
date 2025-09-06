import { describe, it, expect } from 'vitest';
import {
  createNodeMapping,
  getNodeIdAtCursor,
  getEditorPositionForNode,
  getNodesInRange,
  getNodeLevel,
} from '../../utils/nodeMapping';
import type { EditorCursorPosition } from '../../types/store';

describe('utils/nodeMapping', () => {
  it('JSON: 子ノードの位置・パス・範囲マッピングが作成される', async () => {
    const json = [
      '{',
      '  "root": {',
      '    "id": "root",',
      '    "title": "Root",',
      '    "children": [',
      '      {',
      '        "id": "child1",',
      '        "title": "Child One"',
      '      },',
      '      {',
      '        "id": "child2",',
      '        "title": "Child Two"',
      '      }',
      '    ]',
      '  }',
      '}',
    ].join('\n');

    const mapping = await createNodeMapping(json, 'json');
    expect(mapping.mindmapData).not.toBeNull();

    // child1 の開始/終了行は id/title を含む行の min/max
    const lines = json.split('\n');
    const idLineIdx = lines.findIndex(l => l.includes('"id": "child1"'));
    const titleLineIdx = lines.findIndex(l => l.includes('"title": "Child One"'));
    const expectedStart = Math.min(idLineIdx, titleLineIdx) + 1; // 1-based
    const expectedEnd = Math.max(idLineIdx, titleLineIdx) + 1;   // 1-based

    const pos = getEditorPositionForNode('child1', mapping);
    expect(pos).not.toBeNull();
    expect(pos!.startLine).toBe(expectedStart);
    expect(pos!.endLine).toBe(expectedEnd);
    expect(pos!.jsonPath).toBe('root.children[0]');

    // カーソル行からノードIDを取得
    const cursor: EditorCursorPosition = { line: expectedStart, column: 1 };
    const nodeIdAtCursor = getNodeIdAtCursor(cursor, mapping);
    expect(nodeIdAtCursor).toBe('child1');

    // 範囲指定で重複なくノードIDが取得できる
    const ids = getNodesInRange(expectedStart, expectedEnd, mapping);
    expect(ids).toContain('child1');
  });

  it('YAML: 子ノードの位置・パス・範囲マッピングが作成される', async () => {
    const yaml = [
      'root:',
      '  id: root',
      '  title: Root',
      '  children:',
      '    - id: child1',
      '      title: "Child One"',
      '    - id: child2',
      '      title: "Child Two"',
    ].join('\n');

    const mapping = await createNodeMapping(yaml, 'yaml');
    expect(mapping.mindmapData).not.toBeNull();

    const lines = yaml.split('\n');
    const idLineIdx = lines.findIndex(l => l.includes('id: child2'));
    const titleLineIdx = lines.findIndex(l => l.includes('title: "Child Two"'));
    const expectedStart = Math.min(idLineIdx, titleLineIdx) + 1;
    const expectedEnd = Math.max(idLineIdx, titleLineIdx) + 1;

    const pos = getEditorPositionForNode('child2', mapping);
    expect(pos).not.toBeNull();
    expect(pos!.startLine).toBe(expectedStart);
    expect(pos!.endLine).toBe(expectedEnd);
    expect(pos!.jsonPath).toBe('root.children[1]');

    const cursor: EditorCursorPosition = { line: expectedEnd, column: 1 };
    const nodeIdAtCursor = getNodeIdAtCursor(cursor, mapping);
    expect(nodeIdAtCursor).toBe('child2');
  });

  it('getNodeLevel: ルート=0, 子=1, 孫=2 を返す', async () => {
    const json = [
      '{',
      '  "root": {',
      '    "id": "root",',
      '    "title": "Root",',
      '    "children": [',
      '      {',
      '        "id": "child1",',
      '        "title": "Child One",',
      '        "children": [',
      '          { "id": "grand1", "title": "Grand One" }',
      '        ]',
      '      }',
      '    ]',
      '  }',
      '}',
    ].join('\n');

    const mapping = await createNodeMapping(json, 'json');
    expect(getNodeLevel('root', mapping.mindmapData)).toBe(0);
    expect(getNodeLevel('child1', mapping.mindmapData)).toBe(1);
    expect(getNodeLevel('grand1', mapping.mindmapData)).toBe(2);
  });
});

