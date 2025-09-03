import type { DocumentOutline, ParagraphBlock, SectionBlock } from '../document/buildDocumentOutline';

// Lexical互換のシリアライズ構造（最小限）
type LexicalTextNode = {
  type: 'text';
  text: string;
  detail: number;
  format: number;
  mode: 'normal';
  style: string;
  version: 1;
};

type LexicalHeadingNode = {
  type: 'heading';
  tag: `h1` | `h2` | `h3` | `h4` | `h5` | `h6`;
  direction: null;
  format: '';
  indent: 0;
  version: 1;
  children: LexicalTextNode[];
};

type LexicalParagraphNode = {
  type: 'paragraph';
  direction: null;
  format: '';
  indent: 0;
  version: 1;
  children: LexicalTextNode[];
};

type LexicalRootNode = {
  type: 'root';
  direction: null;
  format: '';
  indent: 0;
  version: 1;
  children: Array<LexicalHeadingNode | LexicalParagraphNode>;
};

export type LexicalEditorStateJSON = { root: LexicalRootNode };

function textNode(text: string): LexicalTextNode {
  return { type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 };
}

function headingTag(level: number): `h1` | `h2` | `h3` | `h4` | `h5` | `h6` {
  const lv = Math.min(6, Math.max(1, level));
  return `h${lv}` as const;
}

function pushParagraph(nodes: LexicalRootNode['children'], p: ParagraphBlock) {
  nodes.push({ type: 'paragraph', direction: null, format: '', indent: 0, version: 1, children: [textNode(p.text)] });
}

function walkSection(nodes: LexicalRootNode['children'], section: SectionBlock) {
  nodes.push({
    type: 'heading',
    tag: headingTag(section.heading.level),
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    children: [textNode(section.heading.text)],
  });

  for (const child of section.children) {
    if ((child as SectionBlock).type === 'section') {
      walkSection(nodes, child as SectionBlock);
    } else {
      pushParagraph(nodes, child as ParagraphBlock);
    }
  }
}

export function outlineToLexicalState(outline: DocumentOutline): LexicalEditorStateJSON {
  const root: LexicalRootNode = { type: 'root', direction: null, format: '', indent: 0, version: 1, children: [] };
  walkSection(root.children, outline);
  return { root };
}

