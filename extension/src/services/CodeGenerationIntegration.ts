/**
 * Code Generation Integration Service for VSCode Extension
 * Integrates CodebaseGenerationService with VSCode APIs
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import from parent project
import { CodebaseGenerationService } from '../../../src/services/codebaseGeneration/CodebaseGenerationService.ts';
import type {
  CodeGenerationOptions,
  CodeGenerationResult,
  GeneratedFile,
  SupportedLanguage,
  SupportedFramework,
} from '../../../src/services/codebaseGeneration/types.ts';
import type { RPGGraph } from '../../../src/core/rpg/types.ts';

/**
 * Progress notification for code generation
 */
interface GenerationProgress {
  current: number;
  total: number;
  message: string;
}

/**
 * Code generation integration service for VSCode
 */
export class CodeGenerationIntegration {
  private service: CodebaseGenerationService;
  private outputChannel: vscode.OutputChannel;
  private fileWatchers: vscode.FileSystemWatcher[] = [];
  private watcherEnabled: boolean = false;
  private lastGenerationState: Map<string, { graph: RPGGraph; options: CodeGenerationOptions }> = new Map();

  constructor() {
    this.service = new CodebaseGenerationService();
    this.outputChannel = vscode.window.createOutputChannel('Code Generation');
  }

  /**
   * Generate codebase from RPG graph with VSCode integration
   */
  async generateCodebase(
    graph: RPGGraph,
    options: CodeGenerationOptions
  ): Promise<CodeGenerationResult> {
    // Show progress notification
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating codebase',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Initializing...' });

        try {
          // Generate code
          const result = await this.service.generate(graph, options);

          progress.report({ increment: 50, message: 'Writing files...' });

          // Write files to workspace if not dry run
          if (!options.dryRun) {
            await this.writeFilesToWorkspace(result, options, progress);
          }

          progress.report({ increment: 100, message: 'Complete!' });

          // Show success message
          this.outputChannel.appendLine(
            `Code generation completed: ${result.structure.files.length} files, ${result.structure.directories.length} directories`
          );

          if (result.errors && result.errors.length > 0) {
            vscode.window.showWarningMessage(
              `Code generation completed with ${result.errors.length} errors. Check Output for details.`
            );
            this.outputChannel.appendLine('\nErrors:');
            result.errors.forEach((error) => {
              this.outputChannel.appendLine(`  - [${error.nodeId}] ${error.message}`);
            });
          } else {
            vscode.window.showInformationMessage(
              `Successfully generated ${result.structure.files.length} files`
            );
          }

          if (result.warnings && result.warnings.length > 0) {
            this.outputChannel.appendLine('\nWarnings:');
            result.warnings.forEach((warning) => {
              this.outputChannel.appendLine(`  - [${warning.nodeId}] ${warning.message}`);
            });
          }

          return result;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(
            `Code generation failed: ${message}`
          );
          this.outputChannel.appendLine(`\nError: ${message}`);
          throw error;
        }
      }
    );
  }

  /**
   * Write generated files to workspace
   */
  private async writeFilesToWorkspace(
    result: CodeGenerationResult,
    options: CodeGenerationOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    const rootPath = workspaceFolder.uri.fsPath;
    const outputPath = path.join(rootPath, options.outputDir);

    // Create directories first
    const totalSteps = result.structure.directories.length + result.structure.files.length;
    let completed = 0;

    for (const dir of result.structure.directories) {
      const dirPath = path.join(rootPath, dir.path);
      await this.ensureDirectory(dirPath);
      completed++;
      progress.report({
        increment: (completed / totalSteps) * 50,
        message: `Creating directories... (${completed}/${result.structure.directories.length})`,
      });
    }

    // Write files
    for (const file of result.structure.files) {
      const filePath = path.join(rootPath, file.path);

      // Check if file exists and handle overwrite
      if (fs.existsSync(filePath) && !options.overwrite) {
        const shouldOverwrite = await this.confirmOverwrite(file.path);
        if (!shouldOverwrite) {
          continue;
        }
      }

      // Create backup if requested
      if (fs.existsSync(filePath) && options.createBackups) {
        await this.createBackup(filePath);
      }

      // Write file
      await this.writeFile(filePath, file);
      completed++;
      progress.report({
        increment: (completed / totalSteps) * 50,
        message: `Writing files... (${completed - result.structure.directories.length}/${result.structure.files.length})`,
      });
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Write file to filesystem
   */
  private async writeFile(filePath: string, file: GeneratedFile): Promise<void> {
    await fs.promises.writeFile(filePath, file.content, {
      encoding: (file.encoding as BufferEncoding) || 'utf-8',
    });

    if (file.executable) {
      await fs.promises.chmod(filePath, 0o755);
    }
  }

  /**
   * Confirm file overwrite
   */
  private async confirmOverwrite(filePath: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
      `File ${filePath} already exists. Overwrite?`,
      { modal: true },
      'Overwrite',
      'Skip'
    );
    return result === 'Overwrite';
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.promises.copyFile(filePath, backupPath);
  }

  /**
   * Preview generated code without writing to filesystem
   */
  async previewCodeGeneration(
    graph: RPGGraph,
    options: CodeGenerationOptions
  ): Promise<void> {
    // Generate code in dry run mode
    const dryRunOptions: CodeGenerationOptions = {
      ...options,
      dryRun: true,
    };

    const result = await this.service.generate(graph, dryRunOptions);

    // Show preview in new untitled document
    const content = this.formatPreviewContent(result);
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Format preview content
   */
  private formatPreviewContent(result: CodeGenerationResult): string {
    let content = '# Code Generation Preview\n\n';
    content += `## Metadata\n\n`;
    content += `- **Generated At:** ${result.metadata.generatedAt.toISOString()}\n`;
    content += `- **Language:** ${result.metadata.language}\n`;
    content += `- **Framework:** ${result.metadata.framework || 'N/A'}\n`;
    content += `- **Files:** ${result.metadata.fileCount}\n`;
    content += `- **Directories:** ${result.metadata.directoryCount}\n\n`;

    if (result.errors && result.errors.length > 0) {
      content += `## Errors (${result.errors.length})\n\n`;
      result.errors.forEach((error) => {
        content += `- **[${error.nodeId}]** ${error.message}\n`;
      });
      content += '\n';
    }

    if (result.warnings && result.warnings.length > 0) {
      content += `## Warnings (${result.warnings.length})\n\n`;
      result.warnings.forEach((warning) => {
        content += `- **[${warning.nodeId}]** ${warning.message}\n`;
      });
      content += '\n';
    }

    content += `## File Structure\n\n`;
    content += '```\n';
    content += result.structure.root + '/\n';

    // Show directories
    const dirTree = this.buildDirectoryTree(result);
    content += dirTree;
    content += '```\n\n';

    // Show file previews (first 20 lines of each file)
    content += `## File Previews\n\n`;
    for (const file of result.structure.files.slice(0, 10)) {
      content += `### ${file.path}\n\n`;
      content += `Template: \`${file.templateId}\`\n\n`;
      content += '```\n';
      const lines = file.content.split('\n').slice(0, 20);
      content += lines.join('\n');
      if (file.content.split('\n').length > 20) {
        content += '\n... (truncated)\n';
      }
      content += '\n```\n\n';
    }

    if (result.structure.files.length > 10) {
      content += `\n_... and ${result.structure.files.length - 10} more files_\n`;
    }

    return content;
  }

  /**
   * Build directory tree visualization
   */
  private buildDirectoryTree(result: CodeGenerationResult): string {
    const tree: string[] = [];
    const dirSet = new Set(result.structure.directories.map(d => d.path));
    const filesByDir = new Map<string, string[]>();

    // Group files by directory
    for (const file of result.structure.files) {
      const dir = path.dirname(file.path);
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, []);
      }
      filesByDir.get(dir)!.push(path.basename(file.path));
    }

    // Sort directories by depth
    const sortedDirs = Array.from(dirSet).sort((a, b) => {
      const depthA = a.split('/').length;
      const depthB = b.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    });

    // Build tree
    for (const dir of sortedDirs) {
      const depth = dir.split('/').filter(p => p).length;
      const indent = '  '.repeat(depth);
      const dirName = path.basename(dir);
      tree.push(`${indent}${dirName}/`);

      // Add files in this directory
      const files = filesByDir.get(dir) || [];
      for (const file of files.sort()) {
        tree.push(`${indent}  ${file}`);
      }
    }

    return tree.join('\n');
  }

  /**
   * Enable real-time file watching for automatic code regeneration
   */
  enableFileWatching(patterns: string[] = ['**/*.yaml', '**/*.yml']): void {
    if (this.watcherEnabled) {
      return;
    }

    this.outputChannel.appendLine('Enabling real-time file watching...');

    for (const pattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      // Handle file changes
      watcher.onDidChange(async (uri) => {
        await this.handleFileChange(uri, 'changed');
      });

      // Handle file creation
      watcher.onDidCreate(async (uri) => {
        await this.handleFileChange(uri, 'created');
      });

      // Handle file deletion
      watcher.onDidDelete(async (uri) => {
        await this.handleFileChange(uri, 'deleted');
      });

      this.fileWatchers.push(watcher);
    }

    this.watcherEnabled = true;
    this.outputChannel.appendLine(`File watching enabled for patterns: ${patterns.join(', ')}`);
  }

  /**
   * Disable file watching
   */
  disableFileWatching(): void {
    if (!this.watcherEnabled) {
      return;
    }

    this.outputChannel.appendLine('Disabling file watching...');

    for (const watcher of this.fileWatchers) {
      watcher.dispose();
    }

    this.fileWatchers = [];
    this.watcherEnabled = false;
    this.outputChannel.appendLine('File watching disabled');
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(
    uri: vscode.Uri,
    changeType: 'changed' | 'created' | 'deleted'
  ): Promise<void> {
    this.outputChannel.appendLine(`File ${changeType}: ${uri.fsPath}`);

    // Get the stored generation state for this file
    const stateKey = uri.fsPath;
    const state = this.lastGenerationState.get(stateKey);

    if (!state) {
      // No previous generation state, skip regeneration
      this.outputChannel.appendLine('No previous generation state found, skipping regeneration');
      return;
    }

    if (changeType === 'deleted') {
      // Remove state for deleted file
      this.lastGenerationState.delete(stateKey);
      this.outputChannel.appendLine('File deleted, removing generation state');
      return;
    }

    // Regenerate code with incremental update
    try {
      await this.regenerateCodeIncremental(uri, state.graph, state.options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Failed to regenerate code: ${message}`);
      vscode.window.showWarningMessage(
        `Failed to regenerate code for ${uri.fsPath}: ${message}`
      );
    }
  }

  /**
   * Regenerate code incrementally (only changed files)
   */
  private async regenerateCodeIncremental(
    sourceUri: vscode.Uri,
    graph: RPGGraph,
    options: CodeGenerationOptions
  ): Promise<void> {
    this.outputChannel.appendLine('Starting incremental regeneration...');

    // TODO: Implement incremental update logic
    // For now, we'll regenerate everything but this could be optimized
    // to only regenerate affected files based on the changed nodes

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Regenerating code (incremental)',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Analyzing changes...' });

        // Generate new code
        const result = await this.service.generate(graph, options);

        progress.report({ increment: 50, message: 'Updating files...' });

        // Only update files that have changed
        if (!options.dryRun) {
          await this.updateChangedFiles(result, options, progress);
        }

        progress.report({ increment: 100, message: 'Complete!' });

        this.outputChannel.appendLine(
          `Incremental regeneration completed: ${result.structure.files.length} files processed`
        );
      }
    );
  }

  /**
   * Update only changed files (incremental update)
   */
  private async updateChangedFiles(
    result: CodeGenerationResult,
    options: CodeGenerationOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    const rootPath = workspaceFolder.uri.fsPath;
    let updatedCount = 0;

    for (const file of result.structure.files) {
      const filePath = path.join(rootPath, file.path);

      // Check if file content has changed
      if (fs.existsSync(filePath)) {
        const existingContent = await fs.promises.readFile(filePath, 'utf-8');
        if (existingContent === file.content) {
          // Skip unchanged files
          continue;
        }
      }

      // Create backup if file exists
      if (fs.existsSync(filePath) && options.createBackups) {
        await this.createBackup(filePath);
      }

      // Write updated file
      await this.writeFile(filePath, file);
      updatedCount++;
    }

    this.outputChannel.appendLine(`Updated ${updatedCount} changed files`);
  }

  /**
   * Store generation state for future incremental updates
   */
  storeGenerationState(sourceUri: vscode.Uri, graph: RPGGraph, options: CodeGenerationOptions): void {
    const stateKey = sourceUri.fsPath;
    this.lastGenerationState.set(stateKey, { graph, options });
    this.outputChannel.appendLine(`Stored generation state for ${sourceUri.fsPath}`);
  }

  /**
   * Get output channel
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * Check if file watching is enabled
   */
  isFileWatchingEnabled(): boolean {
    return this.watcherEnabled;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disableFileWatching();
    this.outputChannel.dispose();
    this.lastGenerationState.clear();
  }
}
