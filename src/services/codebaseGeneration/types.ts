/**
 * Codebase Generation Service Types
 * Types for template-based code generation from RPG data
 */

import type { RPGNode, RPGEdge, RPGNodeType, RPGNodeLevel } from '../../core/rpg/types';

/**
 * Supported programming languages
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'rust';

/**
 * Supported frameworks
 */
export type SupportedFramework =
  | 'react'
  | 'vue'
  | 'angular'
  | 'express'
  | 'nestjs'
  | 'fastapi'
  | 'django'
  | 'spring'
  | 'dotnet';

/**
 * Template metadata
 */
export interface CodeTemplateMetadata {
  /** Unique template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description?: string;
  /** Target language */
  language: SupportedLanguage;
  /** Target framework (optional) */
  framework?: SupportedFramework;
  /** Node types this template can handle */
  nodeTypes: RPGNodeType[];
  /** Node levels this template can handle */
  nodeLevels?: RPGNodeLevel[];
  /** Template version */
  version: string;
  /** Template author */
  author?: string;
  /** Template tags for categorization */
  tags?: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Code template definition
 */
export interface CodeTemplate {
  /** Template metadata */
  metadata: CodeTemplateMetadata;
  /** Handlebars template content */
  template: string;
  /** Handlebars partials (reusable sub-templates) */
  partials?: Record<string, string>;
  /** Custom helper functions */
  helpers?: Record<string, (...args: any[]) => any>;
  /** Default template data */
  defaults?: Record<string, any>;
  /** Validation schema for template data */
  schema?: Record<string, any>;
}

/**
 * Template context for rendering
 */
export interface TemplateContext {
  /** Current node being rendered */
  node: RPGNode;
  /** Parent node if exists */
  parent?: RPGNode;
  /** Child nodes */
  children?: RPGNode[];
  /** Incoming edges (dependencies) */
  incomingEdges?: RPGEdge[];
  /** Outgoing edges (dependents) */
  outgoingEdges?: RPGEdge[];
  /** Project-level metadata */
  project?: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
  };
  /** Additional custom data */
  custom?: Record<string, any>;
}

/**
 * Generated file information
 */
export interface GeneratedFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Template ID used */
  templateId: string;
  /** File encoding */
  encoding?: string;
  /** File permissions (Unix-style) */
  permissions?: string;
  /** Whether file should be executable */
  executable?: boolean;
}

/**
 * Generated directory information
 */
export interface GeneratedDirectory {
  /** Directory path relative to project root */
  path: string;
  /** Source node ID */
  sourceNodeId?: string;
  /** Directory permissions (Unix-style) */
  permissions?: string;
}

/**
 * File structure (directories and files)
 */
export interface FileStructure {
  /** Root directory */
  root: string;
  /** Generated directories */
  directories: GeneratedDirectory[];
  /** Generated files */
  files: GeneratedFile[];
}

/**
 * Code generation options
 */
export interface CodeGenerationOptions {
  /** Target language */
  language: SupportedLanguage;
  /** Target framework (optional) */
  framework?: SupportedFramework;
  /** Output directory */
  outputDir: string;
  /** Project metadata */
  project?: TemplateContext['project'];
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  /** Whether to create backups before overwriting */
  createBackups?: boolean;
  /** File encoding */
  encoding?: string;
  /** Custom template overrides */
  templateOverrides?: Record<string, string>;
  /** Additional context data */
  customContext?: Record<string, any>;
  /** Dry run (generate but don't write files) */
  dryRun?: boolean;
  /** Batch size for processing (default: 10, 0 = no batching) */
  batchSize?: number;
  /** Enable progress callbacks during generation */
  enableProgress?: boolean;
  /** Maximum retry attempts on failure */
  maxRetries?: number;
}

/**
 * Code generation result
 */
export interface CodeGenerationResult {
  /** Generated file structure */
  structure: FileStructure;
  /** Generation metadata */
  metadata: {
    /** Generation timestamp */
    generatedAt: Date;
    /** Language used */
    language: SupportedLanguage;
    /** Framework used (if any) */
    framework?: SupportedFramework;
    /** Number of files generated */
    fileCount: number;
    /** Number of directories created */
    directoryCount: number;
    /** Templates used */
    templatesUsed: string[];
  };
  /** Errors encountered during generation */
  errors?: Array<{
    nodeId: string;
    message: string;
    templateId?: string;
  }>;
  /** Warnings */
  warnings?: Array<{
    nodeId: string;
    message: string;
    templateId?: string;
  }>;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  /** Whether template is valid */
  isValid: boolean;
  /** Validation errors */
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
  /** Validation warnings */
  warnings: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
}

/**
 * Template registry for managing templates
 */
export interface TemplateRegistry {
  /** Register a new template */
  register(template: CodeTemplate): void;
  /** Unregister a template */
  unregister(templateId: string): boolean;
  /** Get template by ID */
  get(templateId: string): CodeTemplate | undefined;
  /** Find templates by criteria */
  find(criteria: {
    language?: SupportedLanguage;
    framework?: SupportedFramework;
    nodeType?: RPGNodeType;
    nodeLevel?: RPGNodeLevel;
    tags?: string[];
  }): CodeTemplate[];
  /** List all templates */
  list(): CodeTemplate[];
  /** Validate a template */
  validate(template: CodeTemplate): TemplateValidationResult;
}
