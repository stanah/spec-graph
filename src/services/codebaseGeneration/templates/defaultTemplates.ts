/**
 * Default template definitions for TypeScript
 */

import type { CodeTemplate } from '../types';
import { RPGNodeType, RPGNodeLevel } from '../../../core/rpg/types';
import { defaultHelpers } from './defaultHelpers';

// Template contents (in a real implementation, these would be loaded from .hbs files)
const classTemplate = `{{!-- TypeScript Class Template --}}
{{#if node.description}}
/**
 * {{node.description}}
 */
{{/if}}
export class {{node.name}} {
{{#if incomingEdges}}
  {{#each incomingEdges}}
  {{#if this.dataFlow}}
  private {{camelCase this.fromId}}: {{this.dataFlow.dataType}};
  {{/if}}
  {{/each}}
{{/if}}

{{#if children}}
  {{#each children}}
  {{#if (eq this.type 'function')}}
  {{#if this.description}}
  /**
   * {{this.description}}
   */
  {{/if}}
  {{#if this.metadata.visibility}}{{this.metadata.visibility}} {{else}}public {{/if}}{{#if this.metadata.async}}async {{/if}}{{this.name}}({{#if this.metadata.parameters}}{{join this.metadata.parameters ', '}}{{/if}}){{#if this.typeSignature}}: {{this.typeSignature}}{{/if}} {
    {{#if this.implementation.content}}
    {{this.implementation.content}}
    {{else}}
    // TODO: Implement {{this.name}}
    throw new Error('Not implemented');
    {{/if}}
  }

  {{/if}}
  {{/each}}
{{/if}}
}`;

const functionTemplate = `{{!-- TypeScript Function Template --}}
{{#if node.description}}
/**
 * {{node.description}}
 {{#if node.metadata.parameters}}
 {{#each node.metadata.parameters}}
 * @param {{this.name}} {{this.description}}
 {{/each}}
 {{/if}}
 {{#if node.typeSignature}}
 * @returns {{node.typeSignature}}
 {{/if}}
 */
{{/if}}
export {{#if node.metadata.async}}async {{/if}}function {{node.name}}({{#if node.metadata.parameters}}{{#each node.metadata.parameters}}{{this.name}}{{#if this.type}}: {{this.type}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}){{#if node.typeSignature}}: {{node.typeSignature}}{{/if}} {
{{#if node.implementation.content}}
  {{node.implementation.content}}
{{else}}
  // TODO: Implement {{node.name}}
  throw new Error('Not implemented');
{{/if}}
}`;

const interfaceTemplate = `{{!-- TypeScript Interface Template --}}
{{#if node.description}}
/**
 * {{node.description}}
 */
{{/if}}
export interface {{node.name}} {
{{#if children}}
  {{#each children}}
  {{#if this.description}}
  /** {{this.description}} */
  {{/if}}
  {{this.name}}{{#if this.metadata.optional}}?{{/if}}{{#if this.typeSignature}}: {{this.typeSignature}}{{/if}};
  {{/each}}
{{/if}}
{{#if node.metadata.properties}}
  {{#each node.metadata.properties}}
  {{#if this.description}}
  /** {{this.description}} */
  {{/if}}
  {{this.name}}{{#if this.optional}}?{{/if}}: {{this.type}};
  {{/each}}
{{/if}}
}`;

/**
 * TypeScript class template
 */
export const typescriptClassTemplate: CodeTemplate = {
  metadata: {
    id: 'typescript-class',
    name: 'TypeScript Class',
    description: 'Template for generating TypeScript class definitions',
    language: 'typescript',
    nodeTypes: [RPGNodeType.CLASS],
    nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
    version: '1.0.0',
    author: 'req-mindmap',
    tags: ['typescript', 'class', 'oop'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  template: classTemplate,
  helpers: defaultHelpers,
};

/**
 * TypeScript function template
 */
export const typescriptFunctionTemplate: CodeTemplate = {
  metadata: {
    id: 'typescript-function',
    name: 'TypeScript Function',
    description: 'Template for generating TypeScript function definitions',
    language: 'typescript',
    nodeTypes: [RPGNodeType.FUNCTION],
    nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
    version: '1.0.0',
    author: 'req-mindmap',
    tags: ['typescript', 'function'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  template: functionTemplate,
  helpers: defaultHelpers,
};

/**
 * TypeScript interface template
 */
export const typescriptInterfaceTemplate: CodeTemplate = {
  metadata: {
    id: 'typescript-interface',
    name: 'TypeScript Interface',
    description: 'Template for generating TypeScript interface definitions',
    language: 'typescript',
    nodeTypes: [RPGNodeType.INTERFACE],
    nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
    version: '1.0.0',
    author: 'req-mindmap',
    tags: ['typescript', 'interface', 'type'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  template: interfaceTemplate,
  helpers: defaultHelpers,
};

/**
 * All default TypeScript templates
 */
export const defaultTypeScriptTemplates: CodeTemplate[] = [
  typescriptClassTemplate,
  typescriptFunctionTemplate,
  typescriptInterfaceTemplate,
];

/**
 * All default templates for all languages
 */
export const defaultTemplates: CodeTemplate[] = [
  ...defaultTypeScriptTemplates,
];
