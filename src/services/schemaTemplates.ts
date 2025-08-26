import type { JsonSchema } from './schemaManager';

export type TemplateName = 'mindmap-basic' | 'mindmap-extended' | 'project-management';

const templates: Record<TemplateName, { version: string; schema: JsonSchema; description: string }> = {
  'mindmap-basic': {
    version: '1.0.0',
    description: 'Basic mindmap data schema (version/title/root required)',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        title: { type: 'string', nonEmptyString: true as unknown as boolean },
        root: {
          type: 'object',
          properties: {
            id: { type: 'string', nonEmptyString: true as unknown as boolean },
            title: { type: 'string', nonEmptyString: true as unknown as boolean },
            children: { type: 'array' },
          },
          required: ['id', 'title'],
        },
      },
      required: ['version', 'title', 'root'],
      uniqueNodeIds: true as unknown as boolean,
    },
  },
  'mindmap-extended': {
    version: '1.1.0',
    description: 'Extended mindmap schema with optional description and tags',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        title: { type: 'string', nonEmptyString: true as unknown as boolean },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        root: {
          type: 'object',
          properties: {
            id: { type: 'string', nonEmptyString: true as unknown as boolean },
            title: { type: 'string', nonEmptyString: true as unknown as boolean },
            description: { type: 'string' },
            children: { type: 'array' },
          },
          required: ['id', 'title'],
        },
      },
      required: ['version', 'title', 'root'],
      uniqueNodeIds: true as unknown as boolean,
    },
  },
  'project-management': {
    version: '2.0.0',
    description: 'Project management oriented schema (status/priority fields)',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        title: { type: 'string', nonEmptyString: true as unknown as boolean },
        root: {
          type: 'object',
          properties: {
            id: { type: 'string', nonEmptyString: true as unknown as boolean },
            title: { type: 'string', nonEmptyString: true as unknown as boolean },
            status: { type: 'string' },
            priority: { type: 'string' },
            children: { type: 'array' },
          },
          required: ['id', 'title'],
        },
      },
      required: ['version', 'title', 'root'],
      uniqueNodeIds: true as unknown as boolean,
    },
  },
};

export function listTemplateNames(): TemplateName[] {
  return Object.keys(templates) as TemplateName[];
}

export function getTemplate(name: TemplateName) {
  return templates[name];
}

