import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolver } from '../ConflictResolver';
import type { UIAdapter, ConflictData, FileState } from '../../interfaces';

// UIAdapterのモック作成
const createMockUIAdapter = (): UIAdapter => ({
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showConfirmDialog: vi.fn(async (message: string, options: string[]) => options[0]),
  withProgress: vi.fn(async (title: string, task: any) => task({ report: vi.fn() })),
  showStatusBarMessage: vi.fn()
});

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;
  let mockUI: UIAdapter;

  beforeEach(() => {
    mockUI = createMockUIAdapter();
    conflictResolver = new ConflictResolver(mockUI);
  });

  describe('競合解決', () => {
    const createMockConflictData = (
      localContent: string = '{"local": "data"}',
      remoteContent: string = '{"remote": "data"}',
      baseContent?: string
    ): ConflictData => {
      const localState: FileState = {
        version: 1,
        lastModified: new Date('2024-01-01'),
        size: localContent.length,
        hash: 'local-hash',
        path: '/test.json'
      };

      const remoteState: FileState = {
        version: 2,
        lastModified: new Date('2024-01-02'),
        size: remoteContent.length,
        hash: 'remote-hash',
        path: '/test.json'
      };

      return {
        localState,
        remoteState,
        localContent,
        remoteContent,
        baseContent
      };
    };

    it('ユーザーがローカル版を選択した場合、ローカル状態を返す', async () => {
      vi.mocked(mockUI.showConfirmDialog).mockResolvedValue('ローカル版を使用');

      const conflictData = createMockConflictData();
      const result = await conflictResolver.resolve(conflictData);

      expect(result.success).toBe(true);
      expect(result.hasConflict).toBe(false);
      expect(result.conflictResolution).toBe('local');
      expect(result.finalState?.version).toBe(conflictData.localState.version + 1);
    });

    it('ユーザーがリモート版を選択した場合、リモート状態を返す', async () => {
      vi.mocked(mockUI.showConfirmDialog).mockResolvedValue('リモート版を使用');

      const conflictData = createMockConflictData();
      const result = await conflictResolver.resolve(conflictData);

      expect(result.success).toBe(true);
      expect(result.hasConflict).toBe(false);
      expect(result.conflictResolution).toBe('remote');
      expect(result.finalState?.version).toBe(conflictData.remoteState.version + 1);
    });

    it('ユーザーが手動マージを選択した場合、競合ありの結果を返す', async () => {
      vi.mocked(mockUI.showConfirmDialog).mockResolvedValue('手動でマージ');

      const conflictData = createMockConflictData();
      const result = await conflictResolver.resolve(conflictData);

      expect(result.success).toBe(false);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictResolution).toBe('user_choice');
    });

    it('ベース内容がある場合、3-wayマージを試行する', async () => {
      const baseContent = '{"base": "data"}';
      const localContent = '{"base": "data", "local": "added"}';
      const remoteContent = '{"base": "data", "remote": "added"}';

      const conflictData = createMockConflictData(localContent, remoteContent, baseContent);
      const result = await conflictResolver.resolve(conflictData);

      // 自動マージが成功した場合
      expect(result.success).toBe(true);
      expect(result.conflictResolution).toBe('merged');
    });
  });

  describe('3-wayマージ', () => {
    describe('JSONマージ', () => {
      it('競合のないJSONを正しくマージする', async () => {
        const baseContent = '{"shared": "data"}';
        const localContent = '{"shared": "data", "local": "addition"}';
        const remoteContent = '{"shared": "data", "remote": "addition"}';

        const result = await conflictResolver.threeWayMerge(baseContent, localContent, remoteContent);

        expect(result.success).toBe(true);
        expect(result.content).toBeDefined();

        const merged = JSON.parse(result.content!);
        expect(merged).toEqual({
          shared: 'data',
          local: 'addition',
          remote: 'addition'
        });
      });

      it('JSON構造で競合が発生する場合、競合情報を返す', async () => {
        const baseContent = '{"shared": "original"}';
        const localContent = '{"shared": "local-change"}';
        const remoteContent = '{"shared": "remote-change"}';

        const result = await conflictResolver.threeWayMerge(baseContent, localContent, remoteContent);

        expect(result.success).toBe(false);
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts!.length).toBeGreaterThan(0);
      });

      it('複雑な入れ子構造のJSONをマージする', async () => {
        const baseContent = '{"user": {"name": "John", "age": 30}}';
        const localContent = '{"user": {"name": "John", "age": 31, "city": "Tokyo"}}';
        const remoteContent = '{"user": {"name": "John Doe", "age": 30, "country": "Japan"}}';

        const result = await conflictResolver.threeWayMerge(baseContent, localContent, remoteContent);

        if (result.success) {
          const merged = JSON.parse(result.content!);
          expect(merged.user.city).toBe('Tokyo');
          expect(merged.user.country).toBe('Japan');
        }
      });
    });

    describe('テキストマージ', () => {
      it('競合のないテキストを正しくマージする', async () => {
        const baseContent = 'line1\nline2\nline3';
        const localContent = 'line1\nlocal-line2\nline3';
        const remoteContent = 'line1\nline2\nremote-line3';

        const result = await conflictResolver.threeWayMerge(baseContent, localContent, remoteContent);

        expect(result.success).toBe(true);
        expect(result.content).toBe('line1\nlocal-line2\nremote-line3');
      });

      it('テキストで競合が発生する場合、競合マーカーを含む内容を返す', async () => {
        const baseContent = 'line1\noriginal\nline3';
        const localContent = 'line1\nlocal-change\nline3';
        const remoteContent = 'line1\nremote-change\nline3';

        const result = await conflictResolver.threeWayMerge(baseContent, localContent, remoteContent);

        expect(result.success).toBe(false);
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts!.length).toBe(1);
      });
    });
  });

  describe('JSON差分検出', () => {
    it('オブジェクトの追加・削除・変更を正しく検出する', () => {
      const base = { shared: 'data', toRemove: 'value', modified: 'original-value' };
      const local = { shared: 'data', local: 'addition', modified: 'local-value' };
      const remote = { shared: 'data', remote: 'addition', modified: 'remote-value' };

      const differences = conflictResolver.detectJsonDiff(base, local, remote);

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'local',
          type: 'added',
          localValue: 'addition'
        })
      );

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'remote',
          type: 'added',
          remoteValue: 'addition'
        })
      );

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'toRemove',
          type: 'removed',
          baseValue: 'value'
        })
      );

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'modified',
          type: 'modified',
          baseValue: 'original-value',
          localValue: 'local-value',
          remoteValue: 'remote-value'
        })
      );
    });

    it('入れ子構造の変更を正しく検出する', () => {
      const base = { nested: { value: 'original' } };
      const local = { nested: { value: 'local-change' } };
      const remote = { nested: { value: 'remote-change' } };

      const differences = conflictResolver.detectJsonDiff(base, local, remote);

      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'nested.value',
          type: 'modified',
          baseValue: 'original',
          localValue: 'local-change',
          remoteValue: 'remote-change'
        })
      );
    });
  });

  describe('ユーザー選択プロンプト', () => {
    it('競合情報を含むダイアログを表示する', async () => {
      const conflictData = createMockConflictData();

      vi.mocked(mockUI.showConfirmDialog).mockResolvedValue('ローカル版を使用');

      const choice = await conflictResolver.promptUserChoice(conflictData);

      expect(mockUI.showConfirmDialog).toHaveBeenCalledWith(
        expect.stringContaining(conflictData.localState.path),
        ['ローカル版を使用', 'リモート版を使用', '手動でマージ']
      );
      expect(choice).toBe('local');
    });

    it('ユーザーがダイアログをキャンセルした場合、エラーを投げる', async () => {
      const conflictData = createMockConflictData();

      vi.mocked(mockUI.showConfirmDialog).mockResolvedValue(null);

      await expect(conflictResolver.promptUserChoice(conflictData)).rejects.toThrow('解決がキャンセルされました');
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なJSON形式の場合、エラーを返す', async () => {
      const invalidJson = '{"invalid": json}';
      const validJson = '{"valid": "json"}';

      const result = await conflictResolver.threeWayMerge(invalidJson, validJson, validJson);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('UIエラーが発生した場合、適切なエラー情報を返す', async () => {
      const conflictData = createMockConflictData();

      vi.mocked(mockUI.showConfirmDialog).mockRejectedValue(new Error('UI Error'));

      const result = await conflictResolver.resolve(conflictData);

      expect(result.success).toBe(false);
      expect(result.hasConflict).toBe(true);
      expect(result.error).toContain('競合解決に失敗しました');
    });
  });

  const createMockConflictData = (
    localContent: string = '{"local": "data"}',
    remoteContent: string = '{"remote": "data"}',
    baseContent?: string
  ): ConflictData => {
    const localState: FileState = {
      version: 1,
      lastModified: new Date('2024-01-01'),
      size: localContent.length,
      hash: 'local-hash',
      path: '/test.json'
    };

    const remoteState: FileState = {
      version: 2,
      lastModified: new Date('2024-01-02'),
      size: remoteContent.length,
      hash: 'remote-hash',
      path: '/test.json'
    };

    return {
      localState,
      remoteState,
      localContent,
      remoteContent,
      baseContent
    };
  };
});