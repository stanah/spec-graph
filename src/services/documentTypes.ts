import type { JsonSchema } from './schemaManager';

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

  register(type: BaseDocumentType): void {
    const key = type.key?.trim();
    if (!key) throw new Error('DocumentType key is required');
    if (this.types.has(key)) {
      throw new Error(`DocumentType '${key}' is already registered`);
    }
    this.types.set(key, type);
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
  }
}

export const documentTypeRegistry = new DocumentTypeRegistry();

