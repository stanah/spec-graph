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
  if (!registry.has('design')) registry.register(new DesignDocumentType());
  if (!registry.has('tasks')) registry.register(new TasksDocumentType());
}

export class DesignDocumentType extends BaseDocumentType {
  readonly key = 'design';
  readonly label = 'Design';
  readonly icon = 'mdi:draw-pen';
  readonly theme = { color: '#16a085' };

  getSchema(): JsonSchema {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              dependsOn: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    };
  }
}

export class TasksDocumentType extends BaseDocumentType {
  readonly key = 'tasks';
  readonly label = 'Tasks';
  readonly icon = 'mdi:check-decagram-outline';
  readonly theme = { color: '#e67e22' };

  getSchema(): JsonSchema {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              assignee: { type: 'string' },
            },
          },
        },
      },
    };
  }
}
