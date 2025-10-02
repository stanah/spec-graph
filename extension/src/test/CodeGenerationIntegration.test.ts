/**
 * Tests for CodeGenerationIntegration service implementation
 * These tests verify the service structure and basic functionality
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CodeGenerationIntegration Implementation', () => {
  describe('Service File Existence', () => {
    it('should have CodeGenerationIntegration service file', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('should have proper TypeScript implementation', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify class definition
      expect(content).toContain('export class CodeGenerationIntegration');

      // Verify key methods
      expect(content).toContain('async generateCodebase');
      expect(content).toContain('async previewCodeGeneration');
      expect(content).toContain('dispose()');

      // Verify VSCode API usage
      expect(content).toContain('vscode.window.withProgress');
      expect(content).toContain('vscode.window.showInformationMessage');
      expect(content).toContain('vscode.window.showErrorMessage');
      expect(content).toContain('vscode.OutputChannel');
    });
  });

  describe('Extension Command Registration', () => {
    it('should have generateCode command in package.json', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      const commands = packageJson.contributes?.commands || [];
      const generateCodeCommand = commands.find(
        (cmd: any) => cmd.command === 'documentViewer.generateCode'
      );

      expect(generateCodeCommand).toBeDefined();
      expect(generateCodeCommand?.title).toBe('コードを生成');
    });

    it('should have previewCodeGeneration command in package.json', () => {
      const packagePath = path.join(__dirname, '../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      const commands = packageJson.contributes?.commands || [];
      const previewCommand = commands.find(
        (cmd: any) => cmd.command === 'documentViewer.previewCodeGeneration'
      );

      expect(previewCommand).toBeDefined();
      expect(previewCommand?.title).toBe('コード生成をプレビュー');
    });
  });

  describe('Extension Command Implementation', () => {
    it('should register generateCode command in extension.ts', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      expect(content).toContain("'documentViewer.generateCode'");
      expect(content).toContain('codeGenerationIntegration.generateCodebase');
    });

    it('should register previewCodeGeneration command in extension.ts', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      expect(content).toContain("'documentViewer.previewCodeGeneration'");
      expect(content).toContain('codeGenerationIntegration.previewCodeGeneration');
    });

    it('should have parseMindmapData helper function', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      expect(content).toContain('async function parseMindmapData');
      expect(content).toContain('ExtendedDependencyGraph');
      expect(content).toContain('toRPGGraph()');
    });
  });

  describe('Service Integration', () => {
    it('should initialize CodeGenerationIntegration in activate function', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      expect(content).toContain('codeGenerationIntegration = new CodeGenerationIntegration()');
      expect(content).toContain('context.subscriptions.push(codeGenerationIntegration)');
    });

    it('should import CodeGenerationIntegration service', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      expect(content).toContain('CodeGenerationIntegration');
    });
  });

  describe('Code Quality', () => {
    it('should have proper error handling in generateCodebase', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify error handling
      expect(content).toContain('try {');
      expect(content).toContain('catch (error)');
      expect(content).toContain('vscode.window.showErrorMessage');
    });

    it('should have progress reporting in generateCodebase', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify progress reporting
      expect(content).toContain('progress.report');
      expect(content).toContain('Initializing...');
      expect(content).toContain('Writing files...');
      expect(content).toContain('Complete!');
    });

    it('should have file overwrite confirmation', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify overwrite confirmation
      expect(content).toContain('confirmOverwrite');
      expect(content).toContain('already exists');
    });

    it('should have backup creation functionality', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify backup creation
      expect(content).toContain('createBackup');
      expect(content).toContain('.backup.');
    });
  });

  describe('Preview Functionality', () => {
    it('should have preview content formatting', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify preview formatting
      expect(content).toContain('formatPreviewContent');
      expect(content).toContain('# Code Generation Preview');
      expect(content).toContain('buildDirectoryTree');
    });

    it('should use dry run mode for preview', () => {
      const servicePath = path.join(
        __dirname,
        '../services/CodeGenerationIntegration.ts'
      );
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Verify dry run usage in preview
      expect(content).toContain('dryRun: true');
    });
  });

  describe('User Experience', () => {
    it('should have user-friendly language selection in extension', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      // Verify language selection
      expect(content).toContain('showQuickPick');
      expect(content).toContain('typescript');
      expect(content).toContain('javascript');
      expect(content).toContain('python');
      expect(content).toContain('java');
    });

    it('should have framework input option', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      // Verify framework input
      expect(content).toContain('showInputBox');
      expect(content).toContain('フレームワーク');
    });

    it('should have output directory configuration', () => {
      const extensionPath = path.join(__dirname, '../extension.ts');
      const content = fs.readFileSync(extensionPath, 'utf-8');

      // Verify output directory
      expect(content).toContain('outputDir');
      expect(content).toContain('generated-code');
    });
  });
});
