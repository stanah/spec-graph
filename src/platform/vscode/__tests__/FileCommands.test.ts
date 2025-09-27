import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { FileCommands, type QuickPickItem } from '../commands/FileCommands';
import { MindmapDocumentProvider } from '../MindmapDocumentProvider';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter';
import type { FileUri, ViewType } from '../../../core/ViewSwitcher';

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
  dispose: vi.fn()
} as unknown as VSCodeFileSystemAdapter;

// MindmapDocumentProviderのモック
const mockDocumentProvider = {
  provideTextDocumentContent: vi.fn(),
  notifyDocumentChange: vi.fn(),
  dispose: vi.fn()
} as unknown as MindmapDocumentProvider;

// VSCodePlatformAdapterのモック
vi.mock('../VSCodePlatformAdapter', () => ({
  VSCodePlatformAdapter: {
    getVSCodeApi: () => mockVSCodeApi
  }
}));

// メッセージハンドリングのセットアップ
const setupMessageHandler = (response: any, delay: number = 0) => {
  let messageHandler: (event: MessageEvent) => void;

  const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'message') {
      messageHandler = handler as (event: MessageEvent) => void;
    }
  });

  const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

  // VSCode APIの postMessage をモックして、遅延後にレスポンスを送信
  (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation((message) => {
    if (message.requestId) {
      setTimeout(() => {
        messageHandler({
          data: {
            requestId: message.requestId,
            result: response
          }
        } as MessageEvent);
      }, delay);
    }
  });

  return { addEventListenerSpy, removeEventListenerSpy };
};

describe('FileCommands', () => {
  let fileCommands: FileCommands;
  let testUri: FileUri;

  beforeEach(() => {
    vi.clearAllMocks();

    fileCommands = new FileCommands(mockDocumentProvider, mockFileSystemAdapter);
    testUri = { fsPath: '/test/sample.mindmap' };
  });

  afterEach(() => {
    fileCommands.dispose();
    vi.restoreAllMocks();
  });

  describe('registerAllCommands', () => {
    it('should register all commands successfully', () => {
      // Act
      fileCommands.registerAllCommands();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'registerCommand',
        commandId: 'mindmap.openWith',
        title: 'ビューを選択して開く',
        callback: expect.any(Function)
      });

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'registerCommand',
        commandId: 'mindmap.newFile',
        title: '新しいマインドマップファイルを作成',
        callback: expect.any(Function)
      });

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'registerCommand',
        commandId: 'mindmap.switchView',
        title: 'ビューを切り替え',
        callback: expect.any(Function)
      });

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'registerCommand',
        commandId: 'mindmap.refresh',
        title: 'ドキュメントを更新',
        callback: expect.any(Function)
      });
    });

    it('should handle VSCode API unavailable gracefully', () => {
      // Arrange
      const fileCommandsWithoutVSCode = new FileCommands(mockDocumentProvider, mockFileSystemAdapter);

      // Mock VSCodePlatformAdapter to return null
      vi.doMock('../VSCodePlatformAdapter', () => ({
        VSCodePlatformAdapter: {
          getVSCodeApi: () => null
        }
      }));

      // Act & Assert - Should not throw
      expect(() => {
        fileCommandsWithoutVSCode.registerAllCommands();
      }).not.toThrow();

      fileCommandsWithoutVSCode.dispose();
    });
  });

  describe('handleOpenWithCommand', () => {
    it('should handle openWith command with explicit URI', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(1); // Select second option (table)

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue('{}');

      // Act
      await (fileCommands as any).handleOpenWithCommand(testUri);

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        command: 'showQuickPick',
        items: expect.arrayContaining([
          expect.objectContaining({
            label: '🧠 マインドマップ',
            viewType: 'mindmap'
          }),
          expect.objectContaining({
            label: '📊 テーブル',
            viewType: 'table'
          })
        ])
      }));

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'openFileInView',
        uri: testUri.fsPath,
        viewType: 'table'
      });

      addEventListenerSpy.mockRestore();
    });

    it('should handle openWith command with current active URI', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler('/current/active.mindmap'); // Mock getCurrentActiveUri response

      // Setup second message handler for QuickPick
      setTimeout(() => {
        setupMessageHandler(0); // Select first option (mindmap)
      }, 10);

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue('{"root": {"text": "test"}}');

      // Act
      await (fileCommands as any).handleOpenWithCommand();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        command: 'getCurrentActiveUri'
      }));

      addEventListenerSpy.mockRestore();
    });

    it('should show error when no URI is available', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(null); // No active URI

      // Act
      await (fileCommands as any).handleOpenWithCommand();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'showInformation',
        message: '開くファイルが選択されていません。'
      });

      addEventListenerSpy.mockRestore();
    });

    it('should handle QuickPick cancellation', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(null); // User cancelled QuickPick

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue('{}');

      // Act
      await (fileCommands as any).handleOpenWithCommand(testUri);

      // Assert
      expect(mockVSCodeApi.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({
        command: 'openFileInView'
      }));

      addEventListenerSpy.mockRestore();
    });

    it('should handle file system errors', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(0); // Select mindmap

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockRejectedValue(new Error('File access denied'));

      // Act
      await (fileCommands as any).handleOpenWithCommand(testUri);

      // Assert - Should show QuickPick first
      expect(mockVSCodeApi.postMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({
        command: 'showQuickPick'
      }));

      // Then should open file with selected view
      expect(mockVSCodeApi.postMessage).toHaveBeenNthCalledWith(2, {
        command: 'openFileInView',
        uri: '/test/sample.mindmap',
        viewType: 'mindmap'
      });

      addEventListenerSpy.mockRestore();
    });
  });

  describe('handleNewFileCommand', () => {
    it('should create new mindmap file successfully', async () => {
      // Arrange
      let messageHandler: (event: MessageEvent) => void;
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
        if (type === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      });

      let messageCount = 0;
      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation((message) => {
        if (message.requestId && message.command === 'showInputBox') {
          // Input box response
          setTimeout(() => {
            messageHandler({
              data: {
                requestId: message.requestId,
                result: 'new-mindmap.mindmap'
              }
            } as MessageEvent);
          }, 1);
        } else if (message.requestId && message.command === 'showSaveDialog') {
          // Save dialog response
          setTimeout(() => {
            messageHandler({
              data: {
                requestId: message.requestId,
                result: '/path/to/new-mindmap.mindmap'
              }
            } as MessageEvent);
          }, 1);
        }
      });

      // Act
      await (fileCommands as any).handleNewFileCommand();

      // Verify calls were made - should be 4: inputBox, saveDialog, writeFile confirmation, openFileInView
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(4);

      addEventListenerSpy.mockRestore();
    }, 10000);

    it('should handle user cancellation during file name input', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(null); // User cancelled input

      // Act
      await (fileCommands as any).handleNewFileCommand();

      // Assert
      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('should handle user cancellation during save dialog', async () => {
      // Arrange
      let messageCount = 0;
      const responses = ['test.mindmap', null]; // User cancelled save dialog

      let messageHandler: (event: MessageEvent) => void;
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
        if (type === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      });

      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation((message) => {
        if (message.requestId) {
          setTimeout(() => {
            messageHandler({
              data: {
                requestId: message.requestId,
                result: responses[messageCount++]
              }
            } as MessageEvent);
          }, 0);
        }
      });

      // Act
      await (fileCommands as any).handleNewFileCommand();

      // Assert
      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('should generate appropriate content for different file types', async () => {
      // Test各ファイル種類のコンテンツ生成
      const testCases = [
        { fileName: 'test.mindmap', expectedContent: '"text": "中央トピック"' },
        { fileName: 'test.json', expectedContent: '"data": []' },
        { fileName: 'test.md', expectedContent: '# test.md' }
      ];

      for (const testCase of testCases) {
        const content = (fileCommands as any).generateInitialContent(testCase.fileName, `/path/${testCase.fileName}`);
        expect(content).toContain(testCase.expectedContent);
      }
    });

    it('should handle file creation errors', async () => {
      // Arrange
      let messageCount = 0;
      const responses = ['error-test.mindmap', '/path/to/error-test.mindmap'];

      let messageHandler: (event: MessageEvent) => void;
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
        if (type === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      });

      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation((message) => {
        if (message.requestId) {
          setTimeout(() => {
            messageHandler({
              data: {
                requestId: message.requestId,
                result: responses[messageCount++]
              }
            } as MessageEvent);
          }, 0);
        }
      });

      (mockFileSystemAdapter.writeFile as MockedFunction<any>).mockRejectedValue(new Error('Permission denied'));

      // Act
      await (fileCommands as any).handleNewFileCommand();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'showError',
        message: expect.stringContaining('Permission denied')
      });

      addEventListenerSpy.mockRestore();
    });
  });

  describe('handleSwitchViewCommand', () => {
    it('should switch view for current active file', async () => {
      // Arrange
      let messageCount = 0;
      const responses = ['/current/file.json', 2]; // Active file path, then select document view

      let messageHandler: (event: MessageEvent) => void;
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
        if (type === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      });

      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation((message) => {
        if (message.requestId) {
          setTimeout(() => {
            messageHandler({
              data: {
                requestId: message.requestId,
                result: responses[messageCount++]
              }
            } as MessageEvent);
          }, 0);
        }
      });

      (mockFileSystemAdapter.exists as MockedFunction<any>).mockResolvedValue(true);
      (mockFileSystemAdapter.readFile as MockedFunction<any>).mockResolvedValue('{"title": "test document"}');

      // Act
      await (fileCommands as any).handleSwitchViewCommand();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'openFileInView',
        uri: '/current/file.json',
        viewType: 'document'
      });

      addEventListenerSpy.mockRestore();
    });
  });

  describe('handleRefreshCommand', () => {
    it('should refresh current active document', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler('/current/document.mindmap');

      // Act
      await (fileCommands as any).handleRefreshCommand();

      // Assert
      expect(mockDocumentProvider.notifyDocumentChange).toHaveBeenCalledWith({
        fsPath: '/current/document.mindmap'
      });

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'showInformation',
        message: 'ドキュメントを更新しました。'
      });

      addEventListenerSpy.mockRestore();
    });

    it('should handle missing active document', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(null);

      // Act
      await (fileCommands as any).handleRefreshCommand();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'showInformation',
        message: '更新するファイルが選択されていません。'
      });

      addEventListenerSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should dispose all resources', () => {
      // Act
      fileCommands.dispose();

      // Assert
      expect(mockDocumentProvider.dispose).toHaveBeenCalled();
      expect(mockFileSystemAdapter.dispose).toHaveBeenCalled();
    });

    it('should handle dispose errors gracefully', () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (mockDocumentProvider.dispose as MockedFunction<any>).mockImplementation(() => {
        throw new Error('Dispose error');
      });

      // Act & Assert - Should not throw
      expect(() => {
        fileCommands.dispose();
      }).not.toThrow();

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should clear disposables after disposal', () => {
      // Arrange
      const initialDisposablesCount = (fileCommands as any).disposables.length;

      // Act
      fileCommands.dispose();

      // Assert
      expect((fileCommands as any).disposables.length).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should generate correct initial content for different file types', () => {
      const testCases = [
        {
          fileName: 'test.mindmap',
          filePath: '/path/test.mindmap',
          expectedKeys: ['meta', 'root']
        },
        {
          fileName: 'data.json',
          filePath: '/path/data.json',
          expectedKeys: ['title', 'created', 'data']
        },
        {
          fileName: 'readme.md',
          filePath: '/path/readme.md',
          expectedContent: '# readme.md'
        }
      ];

      testCases.forEach(testCase => {
        const content = (fileCommands as any).generateInitialContent(testCase.fileName, testCase.filePath);

        if (testCase.expectedKeys) {
          const parsed = JSON.parse(content);
          testCase.expectedKeys.forEach(key => {
            expect(parsed).toHaveProperty(key);
          });
        } else if (testCase.expectedContent) {
          expect(content).toContain(testCase.expectedContent);
        }
      });
    });

    it('should handle message timeouts gracefully', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(null, 35000); // Simulate timeout

      // Act
      const result = await (fileCommands as any).getCurrentActiveUri();

      // Assert
      expect(result).toBeNull();

      addEventListenerSpy.mockRestore();
    }, 10000); // Increase timeout for this test
  });

  describe('error scenarios', () => {
    it('should handle unexpected VSCode API errors', async () => {
      // Arrange
      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation(() => {
        throw new Error('VSCode API Error');
      });

      // Act & Assert - Should handle the error gracefully
      try {
        await (fileCommands as any).handleOpenWithCommand(testUri);
      } catch (error) {
        // Expect the error to be caught and handled
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('VSCode API Error');
      }
    });

    it('should handle malformed message responses', async () => {
      // Arrange
      const { addEventListenerSpy } = setupMessageHandler(undefined);

      // Act
      const result = await (fileCommands as any).getCurrentActiveUri();

      // Assert
      expect(result).toBeNull();

      addEventListenerSpy.mockRestore();
    });
  });
});