import { BaseDocumentType, DocumentTypeRegistry } from './documentTypes';
import type { JsonSchema } from './schemaManager';

export class RequirementsDocumentType extends BaseDocumentType {
  readonly key = 'requirements';
  readonly label = 'Requirements';
  readonly icon = 'mdi:file-document-outline';
  readonly theme = { color: '#2b7cff' };

  getSchema(): JsonSchema {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
      },
    };
  }
}

export class StakeholdersDocumentType extends BaseDocumentType {
  readonly key = 'stakeholders';
  readonly label = 'Stakeholders';
  readonly icon = 'mdi:account-group-outline';
  readonly theme = { color: '#9b59b6' };

  getSchema(): JsonSchema {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        people: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
              contact: { type: 'string' },
            },
          },
        },
      },
    };
  }
}

export function registerDefaultDocumentTypes(registry: DocumentTypeRegistry) {
  // idempotent-ish: try to avoid duplicates
  if (!registry.has('requirements')) registry.register(new RequirementsDocumentType());
  if (!registry.has('stakeholders')) registry.register(new StakeholdersDocumentType());
}

