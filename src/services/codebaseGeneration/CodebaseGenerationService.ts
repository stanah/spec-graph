/**
 * Codebase Generation Service
 * Generates source code from RPG data using templates
 */

import Handlebars from 'handlebars';
import type {
  CodeGenerationOptions,
  CodeGenerationResult,
  TemplateContext,
  GeneratedFile,
  GeneratedDirectory,
  FileStructure,
  CodeTemplate,
} from './types';
import type { RPGGraph, RPGNode, RPGEdge } from '../../core/rpg/types';
import { TemplateRegistry } from './TemplateRegistry';
import { defaultTemplates } from './templates/defaultTemplates';
import { ExtendedDependencyGraph } from '../../core/deps/ExtendedDependencyGraph';
import type { BuildOrderOptions } from '../../core/deps/ExtendedDependencyGraph.interface';

/**
 * Service for generating codebase from RPG data
 */
export class CodebaseGenerationService {
  private registry: TemplateRegistry;

  constructor(registry?: TemplateRegistry) {
    this.registry = registry || new TemplateRegistry();

    // Register default templates
    this.registerDefaultTemplates();
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    for (const template of defaultTemplates) {
      try {
        this.registry.register(template);
      } catch (error) {
        console.warn(`Failed to register default template ${template.metadata.id}:`, error);
      }
    }
  }

  /**
   * Generate codebase from RPG graph
   */
  async generate(
    graph: RPGGraph,
    options: CodeGenerationOptions
  ): Promise<CodeGenerationResult> {
    const errors: Array<{ nodeId: string; message: string; templateId?: string }> = [];
    const warnings: Array<{ nodeId: string; message: string; templateId?: string }> = [];
    const files: GeneratedFile[] = [];
    const directories: GeneratedDirectory[] = [];
    const templatesUsed = new Set<string>();

    // Build dependency graph from RPG graph
    const depGraph = this.buildDependencyGraph(graph);

    // Detect and handle cycles
    const cycles = depGraph.findCycles();
    if (cycles.length > 0) {
      warnings.push({
        nodeId: 'graph',
        message: `Detected ${cycles.length} circular dependencies. Generation order may not be optimal.`,
      });
      cycles.forEach((cycle, index) => {
        warnings.push({
          nodeId: cycle[0],
          message: `Circular dependency ${index + 1}: ${cycle.join(' -> ')}`,
        });
      });
    }

    // Get optimal generation order
    let nodeOrder: string[];
    try {
      nodeOrder = this.determineGenerationOrder(depGraph, options);
    } catch (error) {
      // Fallback to simple iteration if topological sort fails
      warnings.push({
        nodeId: 'graph',
        message: 'Failed to determine optimal generation order, using default order',
      });
      nodeOrder = Array.from(graph.nodes.keys());
    }

    // Process nodes in dependency order
    for (const nodeId of nodeOrder) {
      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      try {
        // Find appropriate template for this node
        const template = this.findTemplateForNode(node, options);

        if (!template) {
          warnings.push({
            nodeId,
            message: `No template found for node type ${node.type}`,
          });
          continue;
        }

        templatesUsed.add(template.metadata.id);

        // Build template context
        const context = this.buildContext(graph, node, options);

        // Render template
        const content = this.renderTemplate(template, context);

        // Determine file path
        const filePath = this.determineFilePath(node, options);

        // Add generated file
        files.push({
          path: filePath,
          content,
          sourceNodeId: nodeId,
          templateId: template.metadata.id,
          encoding: options.encoding || 'utf-8',
        });

        // Add directory if needed
        const dirPath = this.getDirectoryPath(filePath);
        if (dirPath && !directories.find(d => d.path === dirPath)) {
          directories.push({
            path: dirPath,
            sourceNodeId: nodeId,
          });
        }
      } catch (error) {
        errors.push({
          nodeId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      structure: {
        root: options.outputDir,
        directories: this.sortDirectoriesByDepth(directories),
        files,
      },
      metadata: {
        generatedAt: new Date(),
        language: options.language,
        framework: options.framework,
        fileCount: files.length,
        directoryCount: directories.length,
        templatesUsed: Array.from(templatesUsed),
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Find template for a given node
   */
  private findTemplateForNode(
    node: RPGNode,
    options: CodeGenerationOptions
  ): CodeTemplate | undefined {
    // Check for custom template override
    if (options.templateOverrides && options.templateOverrides[node.type]) {
      const templateId = options.templateOverrides[node.type];
      const template = this.registry.get(templateId);
      if (template) {
        return template;
      }
    }

    // Find templates matching the node criteria
    const templates = this.registry.find({
      language: options.language,
      framework: options.framework,
      nodeType: node.type,
      nodeLevel: node.level,
    });

    // Return the first matching template
    return templates[0];
  }

  /**
   * Build template context from graph and node
   */
  private buildContext(
    graph: RPGGraph,
    node: RPGNode,
    options: CodeGenerationOptions
  ): TemplateContext {
    // Get parent node
    const parent = node.parentId ? graph.nodes.get(node.parentId) : undefined;

    // Get child nodes
    const children = node.childIds
      ? node.childIds.map(id => graph.nodes.get(id)).filter((n): n is RPGNode => !!n)
      : undefined;

    // Get incoming edges (dependencies)
    const incomingEdges: RPGEdge[] = [];
    const outgoingEdges: RPGEdge[] = [];

    for (const edge of graph.edges.values()) {
      if (edge.toId === node.id) {
        incomingEdges.push(edge);
      }
      if (edge.fromId === node.id) {
        outgoingEdges.push(edge);
      }
    }

    return {
      node,
      parent,
      children,
      incomingEdges: incomingEdges.length > 0 ? incomingEdges : undefined,
      outgoingEdges: outgoingEdges.length > 0 ? outgoingEdges : undefined,
      project: options.project,
      custom: options.customContext,
    };
  }

  /**
   * Render template with context
   */
  private renderTemplate(template: CodeTemplate, context: TemplateContext): string {
    try {
      const compiledTemplate = Handlebars.compile(template.template);
      return compiledTemplate(context);
    } catch (error) {
      throw new Error(
        `Template rendering failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Determine file path for a node
   */
  private determineFilePath(node: RPGNode, options: CodeGenerationOptions): string {
    // Use explicit file path if provided
    if (node.filePath) {
      return node.filePath;
    }

    // Generate file path based on node information
    const fileName = this.generateFileName(node, options);
    const dirPath = node.directoryPath || this.generateDirectoryPath(node);

    return dirPath ? `${dirPath}/${fileName}` : fileName;
  }

  /**
   * Generate file name for a node
   */
  private generateFileName(node: RPGNode, options: CodeGenerationOptions): string {
    const baseName = node.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Determine file extension based on language
    const extension = this.getFileExtension(options.language);

    return `${baseName}${extension}`;
  }

  /**
   * Generate directory path for a node
   */
  private generateDirectoryPath(node: RPGNode): string {
    // Default directory structure based on node level and type
    switch (node.level) {
      case 'implementation':
        return 'src';
      case 'module':
        return 'src/modules';
      case 'file_system':
        return '.';
      default:
        return 'src';
    }
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      java: '.java',
      csharp: '.cs',
      go: '.go',
      rust: '.rs',
    };
    return extensions[language] || '.txt';
  }

  /**
   * Get directory path from file path
   */
  private getDirectoryPath(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
  }

  /**
   * Sort directories by depth (shallow first)
   */
  private sortDirectoriesByDepth(directories: GeneratedDirectory[]): GeneratedDirectory[] {
    return directories.sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      return depthA - depthB;
    });
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: CodeTemplate): void {
    this.registry.register(template);
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(templateId: string): boolean {
    return this.registry.unregister(templateId);
  }

  /**
   * Get template registry
   */
  getRegistry(): TemplateRegistry {
    return this.registry;
  }

  /**
   * Build dependency graph from RPG graph
   * This creates an ExtendedDependencyGraph for analyzing dependencies
   * and determining optimal generation order
   */
  private buildDependencyGraph(graph: RPGGraph): ExtendedDependencyGraph {
    const depGraph = new ExtendedDependencyGraph();

    // Add all nodes with their attributes
    for (const [nodeId, node] of graph.nodes.entries()) {
      depGraph.addNode(nodeId, {
        level: node.level,
        type: node.type,
        status: node.status,
        filePath: node.filePath,
        language: node.language,
        typeSignature: node.typeSignature,
        parentId: node.parentId,
        metadata: node.metadata,
        implementation: node.implementation,
      });
    }

    // Add all edges with their attributes
    for (const edge of graph.edges.values()) {
      depGraph.addEdge(edge.fromId, edge.toId, {
        type: edge.type,
        weight: edge.weight,
        bidirectional: edge.bidirectional,
        constraint: edge.constraint,
        dataFlow: edge.dataFlow,
        metadata: edge.metadata,
      });
    }

    return depGraph;
  }

  /**
   * Determine optimal generation order based on dependencies
   * Uses topological sort to ensure dependencies are generated before dependents
   */
  private determineGenerationOrder(
    depGraph: ExtendedDependencyGraph,
    options: CodeGenerationOptions
  ): string[] {
    // Build order options for controlling the generation sequence
    const buildOptions: BuildOrderOptions = {
      considerPriorities: true,
      considerWeights: true,
    };

    // Try topological sort with cycle handling
    if (depGraph.hasCycle()) {
      // If there are cycles, use build order groups
      // which can handle cycles more gracefully
      const buildGroups = depGraph.generateBuildOrder(buildOptions);

      // Flatten groups into a single ordered list
      const order: string[] = [];
      for (const group of buildGroups) {
        // Sort nodes within each group by priority and dependencies
        const sortedNodes = this.sortNodesWithinGroup(group.nodes, depGraph);
        order.push(...sortedNodes);
      }

      return order;
    } else {
      // No cycles, use advanced topological sort
      return depGraph.topologicalSortAdvanced(buildOptions);
    }
  }

  /**
   * Sort nodes within a build group
   * Used when there are cycles and we need to order nodes within parallel groups
   */
  private sortNodesWithinGroup(nodeIds: string[], depGraph: ExtendedDependencyGraph): string[] {
    return nodeIds.sort((a, b) => {
      const attrsA = depGraph.getNodeAttributes(a);
      const attrsB = depGraph.getNodeAttributes(b);

      // Sort by priority (higher priority first)
      const priorityA = attrsA?.priority || 0;
      const priorityB = attrsB?.priority || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Sort by level (higher level first)
      const levelOrder = {
        proposal: 4,
        module: 3,
        implementation: 2,
        file_system: 1,
      };
      const levelA = levelOrder[attrsA?.level || 'implementation'];
      const levelB = levelOrder[attrsB?.level || 'implementation'];
      if (levelA !== levelB) {
        return levelB - levelA;
      }

      // Sort by number of dependencies (fewer dependencies first)
      const depsA = depGraph.getDependencies(a).length;
      const depsB = depGraph.getDependencies(b).length;
      if (depsA !== depsB) {
        return depsA - depsB;
      }

      // Lexicographic order for stability
      return a.localeCompare(b);
    });
  }

  /**
   * Generate file structure hierarchy
   * Creates a hierarchical directory structure based on node relationships
   */
  generateFileHierarchy(
    graph: RPGGraph,
    options: CodeGenerationOptions
  ): {
    structure: Map<string, { directories: string[]; files: string[] }>;
    rootDirectories: string[];
  } {
    const structure = new Map<string, { directories: string[]; files: string[] }>();
    const allDirectories = new Set<string>();

    // Build directory structure from nodes
    for (const [nodeId, node] of graph.nodes.entries()) {
      const filePath = this.determineFilePath(node, options);
      const dirPath = this.getDirectoryPath(filePath);

      if (dirPath) {
        allDirectories.add(dirPath);

        // Track parent-child directory relationships
        const parentDir = this.getParentDirectory(dirPath);
        if (parentDir && parentDir !== dirPath) {
          allDirectories.add(parentDir);

          if (!structure.has(parentDir)) {
            structure.set(parentDir, { directories: [], files: [] });
          }

          const parentEntry = structure.get(parentDir)!;
          if (!parentEntry.directories.includes(dirPath)) {
            parentEntry.directories.push(dirPath);
          }
        }

        // Add file to directory
        if (!structure.has(dirPath)) {
          structure.set(dirPath, { directories: [], files: [] });
        }
        structure.get(dirPath)!.files.push(filePath);
      }
    }

    // Find root directories (those with no parent in the structure)
    const rootDirectories = Array.from(allDirectories).filter(dir => {
      const parent = this.getParentDirectory(dir);
      return !parent || !allDirectories.has(parent);
    });

    return { structure, rootDirectories };
  }

  /**
   * Get parent directory path
   */
  private getParentDirectory(dirPath: string): string {
    const parts = dirPath.split('/').filter(p => p.length > 0);
    if (parts.length <= 1) {
      return '';
    }
    return parts.slice(0, -1).join('/');
  }
}

// Export singleton instance
export const codebaseGenerationService = new CodebaseGenerationService();
