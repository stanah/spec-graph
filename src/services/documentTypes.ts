import type { JsonSchema } from './schemaManager';
import { DependencyGraph } from '../core/deps/DependencyGraph.ts';

export type DocumentTypeTheme = Record<string, unknown>;

export abstract class BaseDocumentType {
  abstract readonly key: string; // unique id (e.g., 'requirements')
  abstract readonly label: string; // human readable name
  readonly icon?: string;
  readonly theme?: DocumentTypeTheme;

  // Optional: document-type specific schema (for later validation integration)
  getSchema?(): JsonSchema | null;
}

export class DocumentTypeRegistry {
  private types = new Map<string, BaseDocumentType>();
  private graph = new DependencyGraph();

  register(type: BaseDocumentType): void {
    const key = type.key?.trim();
    if (!key) throw new Error('DocumentType key is required');
    if (this.types.has(key)) {
      throw new Error(`DocumentType '${key}' is already registered`);
    }
    this.types.set(key, type);
    this.graph.addNode(key);
  }

  unregister(key: string): boolean {
    return this.types.delete(key);
  }

  get<T extends BaseDocumentType = BaseDocumentType>(key: string): T | undefined {
    return this.types.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.types.has(key);
  }

  list(): BaseDocumentType[] {
    return Array.from(this.types.values());
  }

  clear(): void {
    this.types.clear();
    this.graph.clear();
  }

  // Relations (dependencies)
  addRelation(fromKey: string, toKey: string): void {
    if (!this.types.has(fromKey)) this.graph.addNode(fromKey);
    if (!this.types.has(toKey)) this.graph.addNode(toKey);
    this.graph.addEdge(fromKey, toKey);
  }

  getDependencies(key: string): string[] {
    return this.graph.getDependencies(key);
  }

  getDependents(key: string): string[] {
    return this.graph.getDependents(key);
  }

  hasCycle(): boolean { return this.graph.hasCycle(); }
  findCycles(): string[][] { return this.graph.findCycles(); }
  resolveOrder(): string[] { return this.graph.topologicalSort(); }

  // Custom Type API
  registerCustomType(config: CustomDocumentTypeConfig): BaseDocumentType {
    const inst = new CustomDocumentType(config);
    this.register(inst);
    return inst;
  }
}

export const documentTypeRegistry = new DocumentTypeRegistry();

export interface CustomDocumentTypeConfig {
  key: string;
  label: string;
  icon?: string;
  theme?: DocumentTypeTheme;
  schema?: JsonSchema;
}

class CustomDocumentType extends BaseDocumentType {
  readonly key: string;
  readonly label: string;
  readonly icon?: string;
  readonly theme?: DocumentTypeTheme;
  private schema?: JsonSchema;

  constructor(cfg: CustomDocumentTypeConfig) {
    super();
    if (!cfg.key || !cfg.label) throw new Error('CustomDocumentType requires key and label');
    this.key = cfg.key;
    this.label = cfg.label;
    this.icon = cfg.icon;
    this.theme = cfg.theme;
    this.schema = cfg.schema;
  }

  getSchema(): JsonSchema | null {
    return this.schema ?? { type: 'object' };
  }
}
