import type { DocumentOutline, ParagraphBlock, SectionBlock } from './buildDocumentOutline';

export function outlineToLines(outline: DocumentOutline): string[] {
  const lines: string[] = [];
  const toPrefix = (level: number) => '#'.repeat(Math.min(6, Math.max(1, level)));

  function walk(sec: SectionBlock) {
    lines.push(`${toPrefix(sec.heading.level)} ${sec.heading.text}`);
    for (const c of sec.children) {
      if ((c as SectionBlock).type === 'section') walk(c as SectionBlock);
      else lines.push(`- ${(c as ParagraphBlock).text}`);
    }
  }
  walk(outline);
  return lines;
}

function getJSPDFGlobal(): { jsPDF: any } | null {
  const g: any = globalThis as any;
  if (g?.__mockJSPDF) return { jsPDF: g.__mockJSPDF };
  if (g?.jsPDF) return { jsPDF: g.jsPDF };
  if (g?.jspdf?.jsPDF) return { jsPDF: g.jspdf.jsPDF };
  return null;
}

export async function exportOutlineToPDF(outline: DocumentOutline, opts?: { filename?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const mod = getJSPDFGlobal();
    if (!mod) {
      return { success: false, error: 'jsPDF not available' };
    }
    const { jsPDF } = mod;
    // @ts-expect-error jsPDF type is provided at runtime or mocked in tests
    const doc = new jsPDF();
    const lines = outlineToLines(outline);
    let y = 10;
    for (const ln of lines) {
      // @ts-expect-error jsPDF instance in runtime or mock in tests
      doc.text(ln, 10, y);
      y += 8;
      if (y > 280) {
        // @ts-expect-error jsPDF instance method
        doc.addPage && doc.addPage();
        y = 10;
      }
    }
    if (opts?.filename && typeof (doc as any).save === 'function') {
      (doc as any).save(opts.filename);
    }
    return { success: true };
  } catch (e) {
    // jsPDFが未導入でも失敗ではなく gracefully degrade する
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
