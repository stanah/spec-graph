import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { MindmapDocumentProvider, type DocumentChangeEmitter } from '../MindmapDocumentProvider';
import { type FileUri } from '../../../core/ViewSwitcher';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter';

// VSCode APIのモック
const mockVSCodeApi = {
  postMessage: vi.fn(),
  setState: vi.fn(),
  getState: vi.fn()
};

// VSCodeFileSystemAdapterのモック
const mockFileSystemAdapter = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  watchFile: vi.fn(),
  dispose: vi.fn()
} as unknown as VSCodeFileSystemAdapter;

// DocumentChangeEmitterのモック
const mockChangeEmitter: DocumentChangeEmitter = {
  fire: vi.fn(),
  dispose: vi.fn()
};

// VSCodePlatformAdapterのモック
vi.mock('../VSCodePlatformAdapter', () => ({
  VSCodePlatformAdapter: {
    getVSCodeApi: () => mockVSCodeApi
  }
}));

describe('MindmapDocumentProvider', () => {
  let provider: MindmapDocumentProvider;
  let testUri: FileUri;

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new MindmapDocumentProvider(mockFileSystemAdapter, mockChangeEmitter);
    testUri = { fsPath: '/test/file.mindmap' };
  });

  afterEach(() => {
    provider.dispose();
  });

  describe('provideTextDocumentContent', () => {
    it('should provide content for existing mindmap file', async () => {
      // Arrange
      const mockContent = JSON.stringify({
        root: {
          text: 'Central Topic',
          children: [
            { text: 'Topic 1', children: [] },
            { text: 'Topic 2', children: [] }
          ]
        }
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(mockContent);

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - マインドマップビュー');
      expect(result).toContain('ノード数: 3');
      expect(result).toContain('Central Topic');
      expect(mockFileSystemAdapter.exists).toHaveBeenCalledWith('/test/file.mindmap');
      expect(mockFileSystemAdapter.readFile).toHaveBeenCalledWith('/test/file.mindmap');
    });

    it('should handle non-existent file', async () => {
      // Arrange
      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(false);

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - 新しいファイル');
      expect(result).toContain('このファイルは空です');
      expect(mockFileSystemAdapter.exists).toHaveBeenCalledWith('/test/file.mindmap');
      expect(mockFileSystemAdapter.readFile).not.toHaveBeenCalled();
    });

    it('should handle file read error', async () => {
      // Arrange
      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockRejectedValue(new Error('File read failed'));

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - エラー');
      expect(result).toContain('File read failed');
    });

    it('should provide content for table file', async () => {
      // Arrange
      const tableUri: FileUri = { fsPath: '/test/data.csv' };
      const csvContent = 'Name,Age,City\nJohn,25,Tokyo\nJane,30,Osaka';

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(csvContent);

      // Act
      const result = await provider.provideTextDocumentContent(tableUri);

      // Assert
      expect(result).toContain('data.csv - テーブルビュー');
      expect(result).toContain('行数: 3');
      expect(result).toContain('Name,Age,City');
    });

    it('should provide content for document file', async () => {
      // Arrange
      const docUri: FileUri = { fsPath: '/test/readme.md' };
      const markdownContent = '# Hello World\n\nThis is a test document.';

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(markdownContent);

      // Act
      const result = await provider.provideTextDocumentContent(docUri);

      // Assert
      expect(result).toContain('readme.md - ドキュメントビュー');
      expect(result).toContain('# Hello World');
      expect(result).toContain('This is a test document.');
    });

    it('should provide content for dependency file', async () => {
      // Arrange
      const depsUri: FileUri = { fsPath: '/test/package.json' };
      const packageContent = JSON.stringify({
        dependencies: {
          'react': '^18.0.0',
          'typescript': '^4.9.0'
        },
        devDependencies: {
          'vitest': '^0.28.0'
        }
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(packageContent);

      // Act
      const result = await provider.provideTextDocumentContent(depsUri);

      // Assert
      expect(result).toContain('package.json - 依存関係ビュー');
      expect(result).toContain('- react: ^18.0.0');
      expect(result).toContain('- typescript: ^4.9.0');
      expect(result).toContain('## 開発依存関係');
      expect(result).toContain('- vitest: ^0.28.0');
    });
  });

  describe('renderContent method variants', () => {
    it('should render mindmap content with node count', async () => {
      // Arrange
      const complexMindmapContent = JSON.stringify({
        root: {
          text: 'Root',
          children: [
            {
              text: 'Branch 1',
              children: [
                { text: 'Leaf 1', children: [] },
                { text: 'Leaf 2', children: [] }
              ]
            },
            { text: 'Branch 2', children: [] }
          ]
        }
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(complexMindmapContent);

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('ノード数: 5'); // Root + Branch1 + Leaf1 + Leaf2 + Branch2
    });

    it('should handle JSON array table format', async () => {
      // Arrange
      const jsonTableUri: FileUri = { fsPath: '/test/data.json' };
      const jsonTableContent = JSON.stringify([
        { id: 1, name: 'Alice', score: 95 },
        { id: 2, name: 'Bob', score: 87 },
        { id: 3, name: 'Charlie', score: 92 }
      ]);

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(jsonTableContent);

      // Act
      const result = await provider.provideTextDocumentContent(jsonTableUri);

      // Assert
      expect(result).toContain('data.json - テーブルビュー');
      expect(result).toContain('行数: 3');
      expect(result).toContain('| id | name | score |');
      expect(result).toContain('| 1 | Alice | 95 |');
      expect(result).toContain('| 2 | Bob | 87 |');
    });

    it('should handle document with sections', async () => {
      // Arrange
      const docUri: FileUri = { fsPath: '/test/structured.json' };
      const structuredDocContent = JSON.stringify({
        title: 'Project Documentation',
        content: 'This is the main content.',
        sections: [
          {
            title: 'Installation',
            content: 'Run npm install to get started.'
          },
          {
            title: 'Usage',
            content: 'Import the library and use it.'
          }
        ]
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(structuredDocContent);

      // Act
      const result = await provider.provideTextDocumentContent(docUri);

      // Assert
      expect(result).toContain('structured.json - ドキュメントビュー');
      expect(result).toContain('## Project Documentation');
      expect(result).toContain('### Installation');
      expect(result).toContain('Run npm install to get started.');
      expect(result).toContain('### Usage');
    });

    it('should handle dependency graph format', async () => {
      // Arrange
      const graphUri: FileUri = { fsPath: '/test/dependencies.json' };
      const graphContent = JSON.stringify({
        nodes: [
          { id: 'moduleA', name: 'Module A' },
          { id: 'moduleB', name: 'Module B' },
          { id: 'moduleC', name: 'Module C' }
        ],
        edges: [
          { source: 'moduleA', target: 'moduleB' },
          { source: 'moduleB', target: 'moduleC' }
        ]
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(graphContent);

      // Act
      const result = await provider.provideTextDocumentContent(graphUri);

      // Assert
      expect(result).toContain('dependencies.json - 依存関係ビュー');
      expect(result).toContain('ノード数: 3');
      expect(result).toContain('エッジ数: 2');
      expect(result).toContain('1. Module A');
      expect(result).toContain('1. moduleA → moduleB');
      expect(result).toContain('2. moduleB → moduleC');
    });

    it('should truncate large tables', async () => {
      // Arrange
      const largeTableUri: FileUri = { fsPath: '/test/large.json' };
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        value: `Item ${i + 1}`
      }));

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(JSON.stringify(largeData));

      // Act
      const result = await provider.provideTextDocumentContent(largeTableUri);

      // Assert
      expect(result).toContain('行数: 15');
      expect(result).toContain('5行省略されています'); // Only first 10 rows shown
      expect(result).toContain('| 10 | Item 10 |'); // Last visible row
      expect(result).not.toContain('| 11 | Item 11 |'); // Should be truncated
    });
  });

  describe('notifyDocumentChange', () => {
    it('should fire change emitter when available', () => {
      // Act
      provider.notifyDocumentChange(testUri);

      // Assert
      expect(mockChangeEmitter.fire).toHaveBeenCalledWith(testUri);
    });

    it('should handle missing change emitter gracefully', () => {
      // Arrange
      const providerWithoutEmitter = new MindmapDocumentProvider(mockFileSystemAdapter);

      // Act & Assert - Should not throw
      expect(() => {
        providerWithoutEmitter.notifyDocumentChange(testUri);
      }).not.toThrow();

      providerWithoutEmitter.dispose();
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', () => {
      // Act
      provider.dispose();

      // Assert
      expect(mockChangeEmitter.dispose).toHaveBeenCalled();
      expect(mockFileSystemAdapter.dispose).toHaveBeenCalled();
    });

    it('should handle missing disposables gracefully', () => {
      // Arrange
      const providerWithoutDisposables = new MindmapDocumentProvider();

      // Act & Assert - Should not throw
      expect(() => {
        providerWithoutDisposables.dispose();
      }).not.toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      // Arrange
      const invalidJsonContent = '{ invalid json content }';

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue(invalidJsonContent);

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - mindmapビュー');
      expect(result).toContain('{ invalid json content }');
    });

    it('should handle empty file content', async () => {
      // Arrange
      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue('');

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - mindmapビュー');
      expect(result).toContain('```\n\n```'); // Empty content block
    });

    it('should handle file names with special characters', async () => {
      // Arrange
      const specialUri: FileUri = { fsPath: '/test/file with spaces & symbols!.mindmap' };

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(false);

      // Act
      const result = await provider.provideTextDocumentContent(specialUri);

      // Assert
      expect(result).toContain('file with spaces & symbols!.mindmap - 新しいファイル');
    });

    it('should handle file system adapter errors gracefully', async () => {
      // Arrange
      (mockFileSystemAdapter.exists as MockedFunction<any>).mockRejectedValue(new Error('FileSystem error'));

      // Act
      const result = await provider.provideTextDocumentContent(testUri);

      // Assert
      expect(result).toContain('file.mindmap - エラー');
      expect(result).toContain('FileSystem error');
    });

    it('should handle Windows file paths', async () => {
      // Arrange
      const windowsUri: FileUri = { fsPath: 'C:\\Users\\test\\file.mindmap' };

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(false);

      // Act
      const result = await provider.provideTextDocumentContent(windowsUri);

      // Assert
      expect(result).toContain('file.mindmap - 新しいファイル');
    });
  });
});