import { ElementNode, DOMExportOutput, EditorConfig, LexicalNode, NodeKey } from 'lexical';
import type { DOMConversionMap, LexicalEditor } from 'lexical';

export class RequirementNode extends ElementNode {
  static getType(): string {
    return 'requirement';
  }

  static clone(node: RequirementNode): RequirementNode {
    return new RequirementNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement('section');
    el.setAttribute('data-node-type', 'requirement');
    return el;
  }

  updateDOM(_prevNode: RequirementNode, _dom: HTMLElement, _config: EditorConfig): boolean {
    // No dynamic updates for now
    return false;
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM({} as EditorConfig);
    return { element };
  }

  static importDOM(): DOMConversionMap {
    // No DOM import yet
    return {};
  }

  static importJSON(_serializedNode: unknown): RequirementNode {
    return new RequirementNode();
  }

  exportJSON(): unknown {
    return {
      type: RequirementNode.getType(),
      version: 1,
      children: [],
      format: '',
      indent: 0,
      direction: null,
    };
  }
}

export function $createRequirementNode(): RequirementNode {
  return new RequirementNode();
}

export function $isRequirementNode(node: LexicalNode | null | undefined): node is RequirementNode {
  return node instanceof RequirementNode;
}
