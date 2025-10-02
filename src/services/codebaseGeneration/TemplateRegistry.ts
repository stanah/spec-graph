/**
 * Template Registry Implementation
 * Manages code generation templates
 */

import type {
  CodeTemplate,
  TemplateRegistry as ITemplateRegistry,
  TemplateValidationResult,
  SupportedLanguage,
  SupportedFramework,
} from './types';
import type { RPGNodeType, RPGNodeLevel } from '../../core/rpg/types';
import Handlebars from 'handlebars';

/**
 * Template registry implementation for managing code templates
 */
export class TemplateRegistry implements ITemplateRegistry {
  private templates: Map<string, CodeTemplate> = new Map();

  /**
   * Register a new template
   */
  register(template: CodeTemplate): void {
    // Validate template before registration
    const validation = this.validate(template);
    if (!validation.isValid) {
      throw new Error(
        `Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Check for duplicate template ID
    if (this.templates.has(template.metadata.id)) {
      throw new Error(`Template with ID '${template.metadata.id}' already exists`);
    }

    // Register partials if provided
    if (template.partials) {
      Object.entries(template.partials).forEach(([name, content]) => {
        Handlebars.registerPartial(name, content);
      });
    }

    // Register helpers if provided
    if (template.helpers) {
      Object.entries(template.helpers).forEach(([name, fn]) => {
        Handlebars.registerHelper(name, fn);
      });
    }

    this.templates.set(template.metadata.id, template);
  }

  /**
   * Unregister a template
   */
  unregister(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Unregister partials
    if (template.partials) {
      Object.keys(template.partials).forEach(name => {
        Handlebars.unregisterPartial(name);
      });
    }

    // Unregister helpers
    if (template.helpers) {
      Object.keys(template.helpers).forEach(name => {
        Handlebars.unregisterHelper(name);
      });
    }

    return this.templates.delete(templateId);
  }

  /**
   * Get template by ID
   */
  get(templateId: string): CodeTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Find templates by criteria
   */
  find(criteria: {
    language?: SupportedLanguage;
    framework?: SupportedFramework;
    nodeType?: RPGNodeType;
    nodeLevel?: RPGNodeLevel;
    tags?: string[];
  }): CodeTemplate[] {
    const results: CodeTemplate[] = [];

    for (const template of this.templates.values()) {
      let matches = true;

      // Filter by language
      if (criteria.language && template.metadata.language !== criteria.language) {
        matches = false;
      }

      // Filter by framework
      if (criteria.framework && template.metadata.framework !== criteria.framework) {
        matches = false;
      }

      // Filter by node type
      if (criteria.nodeType && !template.metadata.nodeTypes.includes(criteria.nodeType)) {
        matches = false;
      }

      // Filter by node level
      if (
        criteria.nodeLevel &&
        template.metadata.nodeLevels &&
        !template.metadata.nodeLevels.includes(criteria.nodeLevel)
      ) {
        matches = false;
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        const templateTags = template.metadata.tags || [];
        const hasAllTags = criteria.tags.every(tag => templateTags.includes(tag));
        if (!hasAllTags) {
          matches = false;
        }
      }

      if (matches) {
        results.push(template);
      }
    }

    return results;
  }

  /**
   * List all templates
   */
  list(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Validate a template
   */
  validate(template: CodeTemplate): TemplateValidationResult {
    const errors: Array<{ message: string; line?: number; column?: number }> = [];
    const warnings: Array<{ message: string; line?: number; column?: number }> = [];

    // Validate metadata
    if (!template.metadata.id || template.metadata.id.trim() === '') {
      errors.push({ message: 'Template ID is required' });
    }

    if (!template.metadata.name || template.metadata.name.trim() === '') {
      errors.push({ message: 'Template name is required' });
    }

    if (!template.metadata.language) {
      errors.push({ message: 'Template language is required' });
    }

    if (!template.metadata.nodeTypes || template.metadata.nodeTypes.length === 0) {
      errors.push({ message: 'At least one node type must be specified' });
    }

    if (!template.metadata.version) {
      errors.push({ message: 'Template version is required' });
    }

    // Validate template content
    if (!template.template || template.template.trim() === '') {
      errors.push({ message: 'Template content is required' });
    } else {
      // Try to compile the template to check for syntax errors
      try {
        Handlebars.compile(template.template);
      } catch (error) {
        errors.push({
          message: `Template compilation failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Validate partials
    if (template.partials) {
      Object.entries(template.partials).forEach(([name, content]) => {
        try {
          Handlebars.compile(content);
        } catch (error) {
          errors.push({
            message: `Partial '${name}' compilation failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      });
    }

    // Validate helpers
    if (template.helpers) {
      Object.entries(template.helpers).forEach(([name, fn]) => {
        if (typeof fn !== 'function') {
          errors.push({ message: `Helper '${name}' must be a function` });
        }
      });
    }

    // Warnings
    if (!template.metadata.description) {
      warnings.push({ message: 'Template description is recommended' });
    }

    if (!template.metadata.author) {
      warnings.push({ message: 'Template author is recommended' });
    }

    if (!template.metadata.tags || template.metadata.tags.length === 0) {
      warnings.push({ message: 'Template tags are recommended for better discoverability' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Clear all templates
   */
  clear(): void {
    // Unregister all partials and helpers
    for (const template of this.templates.values()) {
      if (template.partials) {
        Object.keys(template.partials).forEach(name => {
          Handlebars.unregisterPartial(name);
        });
      }
      if (template.helpers) {
        Object.keys(template.helpers).forEach(name => {
          Handlebars.unregisterHelper(name);
        });
      }
    }
    this.templates.clear();
  }

  /**
   * Get template count
   */
  get count(): number {
    return this.templates.size;
  }
}

// Export singleton instance
export const templateRegistry = new TemplateRegistry();
