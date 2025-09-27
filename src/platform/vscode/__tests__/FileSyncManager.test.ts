import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSyncManager } from '../FileSyncManager';
import type { FileSystemAdapter, ConflictResolver, FileState, ConflictData } from '../../interfaces';

// FileSystemAdapterのモック作成
const createMockFileSystemAdapter = (): FileSystemAdapter => {
  const mockFiles = new Map<string, { content: string; info: { lastModified: Date; size: number } }>();

  return {
    readFile: vi.fn(async (path: string) => {
      const file = mockFiles.get(path);
      if (!file) throw new Error('File not found');
      return file.content;
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      const _existing = mockFiles.get(path);
      mockFiles.set(path, {
        content,
        info: {
          lastModified: new Date(),
          size: content.length
        }
      });
    }),
    exists: vi.fn(async (path: string) => mockFiles.has(path)),
    getFileInfo: vi.fn(async (path: string) => {
      const file = mockFiles.get(path);
      if (!file) throw new Error('File not found');
      return {
        isFile: true,
        isDirectory: false,
        size: file.info.size,
        lastModified: file.info.lastModified
      };
    }),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    watchFile: vi.fn(),
    watchFiles: vi.fn(),
    // モック用のヘルパーメソッド
    _setMockFile: (path: string, content: string, lastModified?: Date) => {
      mockFiles.set(path, {
        content,
        info: {
          lastModified: lastModified || new Date(),
          size: content.length
        }
      });
    }
  } as any;
};

// ConflictResolverのモック作成
const createMockConflictResolver = (): ConflictResolver => ({
  resolve: vi.fn(async (conflictData: ConflictData) => ({
    success: true,
    hasConflict: false,
    finalState: conflictData.remoteState,
    conflictResolution: 'merged' as const
  })),
  threeWayMerge: vi.fn(),
  promptUserChoice: vi.fn(),
  detectJsonDiff: vi.fn()
});

describe('FileSyncManager', () => {
  let fileSyncManager: FileSyncManager;
  let mockFileSystem: ReturnType<typeof createMockFileSystemAdapter>;
  let mockConflictResolver: ConflictResolver;

  beforeEach(() => {
    mockFileSystem = createMockFileSystemAdapter();
    mockConflictResolver = createMockConflictResolver();
    fileSyncManager = new FileSyncManager(mockFileSystem, mockConflictResolver);
  });

  describe('ファイル状態管理', () => {
    it('ファイル状態を設定・取得できる', () => {
      const state: FileState = {
        version: 1,
        lastModified: new Date(),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      fileSyncManager.setFileState('/test.json', state);
      const retrievedState = fileSyncManager.getFileState('/test.json');

      expect(retrievedState).toEqual(state);
    });

    it('存在しないファイル状態を取得するとundefinedが返る', () => {
      const state = fileSyncManager.getFileState('/nonexistent.json');
      expect(state).toBeUndefined();
    });
  });

  describe('競合検出', () => {
    it('バージョンと更新時刻が同じ場合は競合なしと判定', () => {
      const date = new Date();
      const localState: FileState = {
        version: 1,
        lastModified: date,
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };
      const remoteState: FileState = {
        version: 1,
        lastModified: date,
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      const hasConflict = fileSyncManager.hasConflict(localState, remoteState);
      expect(hasConflict).toBe(false);
    });

    it('バージョン・更新時刻・ハッシュがすべて異なる場合は競合ありと判定', () => {
      const localState: FileState = {
        version: 1,
        lastModified: new Date('2024-01-01'),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };
      const remoteState: FileState = {
        version: 2,
        lastModified: new Date('2024-01-02'),
        size: 120,
        hash: 'def456',
        path: '/test.json'
      };

      const hasConflict = fileSyncManager.hasConflict(localState, remoteState);
      expect(hasConflict).toBe(true);
    });

    it('どちらか一方が存在しない場合は競合なしと判定', () => {
      const localState: FileState = {
        version: 1,
        lastModified: new Date(),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      expect(fileSyncManager.hasConflict(localState, undefined)).toBe(false);
      expect(fileSyncManager.hasConflict(undefined, localState)).toBe(false);
    });
  });

  describe('状態マージ', () => {
    it('ローカル状態が存在しない場合はリモート状態を採用', () => {
      const remoteState: FileState = {
        version: 1,
        lastModified: new Date(),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      const result = fileSyncManager.mergeStates(undefined, remoteState);

      expect(result.success).toBe(true);
      expect(result.hasConflict).toBe(false);
      expect(result.conflictResolution).toBe('remote');
      expect(result.finalState).toEqual(remoteState);
    });

    it('リモート状態の方がバージョンが新しい場合はリモート状態を採用', () => {
      const localState: FileState = {
        version: 1,
        lastModified: new Date('2024-01-01'),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };
      const remoteState: FileState = {
        version: 2,
        lastModified: new Date('2024-01-02'),
        size: 120,
        hash: 'def456',
        path: '/test.json'
      };

      const result = fileSyncManager.mergeStates(localState, remoteState);

      expect(result.success).toBe(true);
      expect(result.conflictResolution).toBe('remote');
      expect(result.finalState).toEqual(remoteState);
    });

    it('ローカル状態の方がバージョンが新しい場合はローカル状態を採用', () => {
      const localState: FileState = {
        version: 2,
        lastModified: new Date('2024-01-02'),
        size: 120,
        hash: 'def456',
        path: '/test.json'
      };
      const remoteState: FileState = {
        version: 1,
        lastModified: new Date('2024-01-01'),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      const result = fileSyncManager.mergeStates(localState, remoteState);

      expect(result.success).toBe(true);
      expect(result.conflictResolution).toBe('local');
      expect(result.finalState).toEqual(localState);
    });
  });

  describe('ファイル状態作成', () => {
    it('現在のファイル状態を正しく作成する', async () => {
      const content = '{"test": "data"}';
      const lastModified = new Date('2024-01-01');

      mockFileSystem._setMockFile('/test.json', content, lastModified);

      const state = await fileSyncManager.createFileState('/test.json', content);

      expect(state.path).toBe('/test.json');
      expect(state.size).toBe(content.length);
      expect(state.lastModified).toEqual(lastModified);
      expect(state.hash).toBeDefined();
      expect(state.version).toBe(Math.floor(lastModified.getTime() / 1000));
    });
  });

  describe('ローカル状態更新', () => {
    it('ファイル内容変更時にローカル状態を更新する', async () => {
      const newContent = '{"updated": "data"}';
      const lastModified = new Date();

      mockFileSystem._setMockFile('/test.json', newContent, lastModified);

      await fileSyncManager.updateLocalState('/test.json', newContent);

      const updatedState = fileSyncManager.getFileState('/test.json');
      expect(updatedState).toBeDefined();
      expect(updatedState!.path).toBe('/test.json');
      expect(updatedState!.size).toBe(newContent.length);
    });
  });

  describe('同期処理', () => {
    it('競合がない場合は正常に同期される', async () => {
      const content = '{"test": "data"}';
      const lastModified = new Date();

      mockFileSystem._setMockFile('/test.json', content, lastModified);

      // ローカル状態を設定（リモートと同じバージョン）
      const localState: FileState = {
        version: Math.floor(lastModified.getTime() / 1000),
        lastModified,
        size: content.length,
        hash: 'abc123',
        path: '/test.json'
      };
      fileSyncManager.setFileState('/test.json', localState);

      const result = await fileSyncManager.syncFileState('/test.json');

      expect(result.success).toBe(true);
      expect(result.hasConflict).toBe(false);
    });

    it('競合がある場合はConflictResolverが呼び出される', async () => {
      const content = '{"test": "data"}';
      const lastModified = new Date();

      mockFileSystem._setMockFile('/test.json', content, lastModified);

      // 競合する状態を設定
      const localState: FileState = {
        version: 1,
        lastModified: new Date('2024-01-01'),
        size: 100,
        hash: 'different-hash',
        path: '/test.json'
      };
      fileSyncManager.setFileState('/test.json', localState);

      await fileSyncManager.syncFileState('/test.json');

      expect(mockConflictResolver.resolve).toHaveBeenCalled();
    });
  });

  describe('ユーティリティ機能', () => {
    it('すべてのファイル状態をクリアできる', () => {
      const state: FileState = {
        version: 1,
        lastModified: new Date(),
        size: 100,
        hash: 'abc123',
        path: '/test.json'
      };

      fileSyncManager.setFileState('/test.json', state);
      expect(fileSyncManager.getFileState('/test.json')).toBeDefined();

      fileSyncManager.clearAllStates();
      expect(fileSyncManager.getFileState('/test.json')).toBeUndefined();
    });

    it('管理中のファイル状態一覧を取得できる', () => {
      const state1: FileState = {
        version: 1,
        lastModified: new Date(),
        size: 100,
        hash: 'abc123',
        path: '/test1.json'
      };
      const state2: FileState = {
        version: 2,
        lastModified: new Date(),
        size: 200,
        hash: 'def456',
        path: '/test2.json'
      };

      fileSyncManager.setFileState('/test1.json', state1);
      fileSyncManager.setFileState('/test2.json', state2);

      const allStates = fileSyncManager.getAllFileStates();
      expect(allStates.size).toBe(2);
      expect(allStates.get('/test1.json')).toEqual(state1);
      expect(allStates.get('/test2.json')).toEqual(state2);
    });
  });
});