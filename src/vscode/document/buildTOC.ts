import type { DocumentOutline, SectionBlock } from './buildDocumentOutline';

export interface TOCItem {
  nodeId: string;
  text: string;
  level: number; // 1..6
}

export function buildTOC(outline: DocumentOutline): TOCItem[] {
  const items: TOCItem[] = [];
  function walk(sec: SectionBlock) {
    items.push({ nodeId: sec.heading.nodeId, text: sec.heading.text, level: sec.heading.level });
    for (const c of sec.children) {
      if ((c as SectionBlock).type === 'section') walk(c as SectionBlock);
    }
  }
  walk(outline);
  return items;
}

