import { describe, it, expect } from 'vitest';
import type { MindmapNode } from '../../../types';
import { buildDocumentOutline } from '../buildDocumentOutline';
import { exportOutlineToPDF, outlineToLines } from '../pdfExport';

class MockDoc {
  calls: Array<{ text: string; x: number; y: number }> = [];
  text(t: string, x: number, y: number) { this.calls.push({ text: t, x, y }); }
  save() { /* noop */ }
  output() { return 'pdf-data'; }
}
// @ts-expect-error test global
globalThis.__mockJSPDF = MockDoc;

describe('pdfExport', () => {
  const root: MindmapNode = {
    id: 'root', title: 'Root', description: 'Intro', children: [
      { id: 'c1', title: 'Child', description: 'Body', children: [] }
    ]
  } as any;

  it('outlineToLinesで見出しと本文を行に展開', () => {
    const outline = buildDocumentOutline(root);
    const lines = outlineToLines(outline);
    expect(lines[0]).toMatch(/^# Root/);
    expect(lines).toContain('- Intro');
    expect(lines).toContain('## Child');
    expect(lines).toContain('- Body');
  });

  it('exportOutlineToPDF がjsPDFを用いてテキストを書き出す', async () => {
    const outline = buildDocumentOutline(root);
    const res = await exportOutlineToPDF(outline, { filename: 'test.pdf' });
    expect(res.success).toBe(true);
  });
});
