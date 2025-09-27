import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProgressSystem,
  createProgressSystem,
  type NodeProgress,
  type ProgressSummary,
  type ProgressCalculationOptions
} from '../progressSystem';
import type { MindmapNode } from '../../schemas/mindmap.zod';

// テスト用のサンプルデータ
const createSampleNode = (
  id: string,
  title: string,
  children: MindmapNode[] = []
): MindmapNode => ({
  id,
  title,
  children: children.length > 0 ? children : undefined
});

const createSampleProgress = (
  nodeId: string,
  progress: number,
  isManuallySet: boolean = true,
  note?: string
): NodeProgress => ({
  nodeId,
  progress,
  isManuallySet,
  updatedAt: new Date().toISOString(),
  note
});

describe('ProgressSystem', () => {
  let nodes: MindmapNode[];
  let progressSystem: ProgressSystem;

  beforeEach(() => {
    // 階層構造のテストデータを作成
    nodes = [
      createSampleNode('1', 'Root Node 1', [
        createSampleNode('1-1', 'Child 1-1', [
          createSampleNode('1-1-1', 'Grandchild 1-1-1'),
          createSampleNode('1-1-2', 'Grandchild 1-1-2')
        ]),
        createSampleNode('1-2', 'Child 1-2')
      ]),
      createSampleNode('2', 'Root Node 2', [
        createSampleNode('2-1', 'Child 2-1'),
        createSampleNode('2-2', 'Child 2-2')
      ]),
      createSampleNode('3', 'Root Node 3') // 子ノードなし
    ];

    progressSystem = new ProgressSystem(nodes);
  });

  describe('コンストラクタと初期化', () => {
    it('初期進捗データが正しく設定される', () => {
      const initialData = [
        createSampleProgress('1', 50),
        createSampleProgress('2', 75)
      ];
      
      const system = new ProgressSystem(nodes, initialData);
      
      expect(system.getProgress('1')).toBe(50);
      expect(system.getProgress('2')).toBe(75);
    });

    it('全ノードが初期化される', () => {
      // 全ノードが0%で初期化されることを確認
      expect(progressSystem.getProgress('1')).toBe(0);
      expect(progressSystem.getProgress('1-1')).toBe(0);
      expect(progressSystem.getProgress('1-1-1')).toBe(0);
      expect(progressSystem.getProgress('2')).toBe(0);
      expect(progressSystem.getProgress('3')).toBe(0);
    });

    it('createProgressSystem ファクトリー関数が動作する', () => {
      const system = createProgressSystem(nodes);
      expect(system).toBeInstanceOf(ProgressSystem);
      expect(system.getProgress('1')).toBe(0);
    });
  });

  describe('進捗の設定と取得', () => {
    it('ノードの進捗率を設定できる', () => {
      // デバッグ: ノードが見つかるかチェック
      expect(() => progressSystem.setProgress('1', 75, 'Test progress')).not.toThrow();

      expect(progressSystem.getProgress('1')).toBe(75);

      const progressInfo = progressSystem.getProgressInfo('1');
      expect(progressInfo?.progress).toBe(75);
      expect(progressInfo?.isManuallySet).toBe(true);
      expect(progressInfo?.note).toBe('Test progress');
    });

    it('無効な進捗率でエラーが発生する', () => {
      expect(() => progressSystem.setProgress('1', -10)).toThrow('Progress must be between 0 and 100');
      expect(() => progressSystem.setProgress('1', 150)).toThrow('Progress must be between 0 and 100');
    });

    it('存在しないノードでエラーが発生する', () => {
      expect(() => progressSystem.setProgress('nonexistent', 50)).toThrow('Node with id "nonexistent" not found');
    });

    it('カスケード更新を無効にできる', () => {
      progressSystem.setProgress('1-1-1', 100, undefined, false);
      
      // 親ノードは自動更新されない
      expect(progressSystem.getProgress('1-1')).toBe(0);
      expect(progressSystem.getProgress('1')).toBe(0);
    });
  });

  describe('親ノードの自動進捗計算', () => {
    it('子ノードの進捗から親ノードの進捗が自動計算される', () => {
      progressSystem.setProgress('1-1-1', 100, undefined, false);
      progressSystem.setProgress('1-1-2', 50, undefined, false);
      
      progressSystem.updateParentProgress('1-1');
      
      // 平均進捗率が計算される (100 + 50) / 2 = 75
      expect(progressSystem.getProgress('1-1')).toBe(75);
    });

    it('複数階層の自動進捗計算が正しく動作する', () => {
      // 葉ノードの進捗を設定
      progressSystem.setProgress('1-1-1', 80, undefined, false);
      progressSystem.setProgress('1-1-2', 100, undefined, false);
      progressSystem.setProgress('1-2', 60, undefined, false);
      
      // 親ノードから順に更新
      progressSystem.updateParentProgress('1-1');
      progressSystem.updateParentProgress('1');
      
      // 1-1の進捗: (80 + 100) / 2 = 90
      expect(progressSystem.getProgress('1-1')).toBe(90);
      
      // 1の進捗: (90 + 60) / 2 = 75
      expect(progressSystem.getProgress('1')).toBe(75);
    });

    it('全進捗の再計算が正しく動作する', () => {
      // 葉ノードの進捗を設定
      progressSystem.setProgress('1-1-1', 100, undefined, false);
      progressSystem.setProgress('1-1-2', 80, undefined, false);
      progressSystem.setProgress('1-2', 60, undefined, false);
      progressSystem.setProgress('2-1', 90, undefined, false);
      progressSystem.setProgress('2-2', 70, undefined, false);
      
      // 全進捗を再計算
      progressSystem.recalculateAllProgress();
      
      // 各階層の進捗が正しく計算されることを確認
      expect(progressSystem.getProgress('1-1')).toBe(90); // (100 + 80) / 2
      expect(progressSystem.getProgress('1')).toBe(75);   // (90 + 60) / 2
      expect(progressSystem.getProgress('2')).toBe(80);   // (90 + 70) / 2
    });
  });

  describe('進捗集計情報', () => {
    it('正しい集計情報を取得できる', () => {
      progressSystem.setProgress('1', 100, undefined, false);
      progressSystem.setProgress('1-1', 50, undefined, false);
      progressSystem.setProgress('1-1-1', 0, undefined, false);
      progressSystem.setProgress('2', 75, undefined, false);
      
      const summary: ProgressSummary = progressSystem.getProgressSummary();
      
      expect(summary.totalNodes).toBe(9); // 全ノード数 (修正: 1,1-1,1-1-1,1-1-2,1-2,2,2-1,2-2,3 = 9個)
      expect(summary.completedNodes).toBe(1); // 100%のノード (id: '1')
      expect(summary.inProgressNodes).toBe(2); // 1-99%のノード (id: '1-1', '2')
      expect(summary.notStartedNodes).toBe(6); // 0%のノード (残りの6個)
    });

    it('全体進捗率が正しく計算される', () => {
      // すべてのノードに進捗を設定
      progressSystem.setProgress('1', 80, undefined, false);
      progressSystem.setProgress('1-1', 90, undefined, false);
      progressSystem.setProgress('1-1-1', 100, undefined, false);
      progressSystem.setProgress('1-1-2', 60, undefined, false);
      progressSystem.setProgress('1-2', 70, undefined, false);
      progressSystem.setProgress('2', 85, undefined, false);
      progressSystem.setProgress('2-1', 95, undefined, false);
      progressSystem.setProgress('2-2', 75, undefined, false);
      progressSystem.setProgress('3', 50, undefined, false);
      
      const summary = progressSystem.getProgressSummary();
      
      // 全体進捗率の計算を確認
      const expectedOverallProgress = Math.round((80 + 90 + 100 + 60 + 70 + 85 + 95 + 75 + 50) / 9);
      expect(summary.overallProgress).toBe(expectedOverallProgress);
    });
  });

  describe('進捗履歴', () => {
    it('進捗変更履歴が記録される', () => {
      progressSystem.setProgress('1', 50, 'Initial progress', false);
      progressSystem.setProgress('1', 75, 'Updated progress', false);

      const history = progressSystem.getProgressHistory('1');

      expect(history).toHaveLength(2);
      expect(history[0].newProgress).toBe(75); // 最新が先頭
      expect(history[0].oldProgress).toBe(50);
      expect(history[1].newProgress).toBe(50);
      expect(history[1].oldProgress).toBe(0);
    });

    it('履歴の制限数が機能する', () => {
      // 複数回更新（カスケード更新を無効にして履歴をシンプルに保つ）
      for (let i = 1; i <= 5; i++) {
        progressSystem.setProgress('1', i * 10, `Update ${i}`, false);
      }

      const limitedHistory = progressSystem.getProgressHistory('1', 3);
      expect(limitedHistory).toHaveLength(3);

      // 最新3件が取得されることを確認
      expect(limitedHistory[0].newProgress).toBe(50);
      expect(limitedHistory[1].newProgress).toBe(40);
      expect(limitedHistory[2].newProgress).toBe(30);
    });

    it('全ノードの履歴を取得できる', () => {
      progressSystem.setProgress('1', 50, undefined, false);
      progressSystem.setProgress('2', 75, undefined, false);

      const allHistory = progressSystem.getProgressHistory();
      expect(allHistory).toHaveLength(2);
    });
  });

  describe('イベントリスナー', () => {
    it('進捗変更イベントが発火される', () => {
      const listener = vi.fn();
      progressSystem.addProgressChangeListener(listener);
      
      progressSystem.setProgress('1', 50, 'Test event');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: '1',
          newProgress: 50,
          oldProgress: 0,
          isCascadeUpdate: false
        })
      );
    });

    it('カスケード更新でもイベントが発火される', () => {
      const listener = vi.fn();
      progressSystem.addProgressChangeListener(listener);

      progressSystem.setProgress('1-1-1', 100);

      // 子ノードの更新と親ノードの自動更新の3つのイベントが発火
      // 1. '1-1-1' ノード自体の更新
      // 2. '1-1' 親ノードの自動更新
      // 3. '1' 祖父母ノードの自動更新
      expect(listener).toHaveBeenCalledTimes(3);

      // 2番目の呼び出し（親ノードの自動更新）を確認
      expect(listener).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          nodeId: '1-1',
          isCascadeUpdate: true
        })
      );

      // 3番目の呼び出し（祖父母ノードの自動更新）を確認
      expect(listener).toHaveBeenNthCalledWith(3,
        expect.objectContaining({
          nodeId: '1',
          isCascadeUpdate: true
        })
      );
    });

    it('イベントリスナーを削除できる', () => {
      const listener = vi.fn();
      progressSystem.addProgressChangeListener(listener);
      progressSystem.removeProgressChangeListener(listener);
      
      progressSystem.setProgress('1', 50);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('リスナーでエラーが発生しても処理が継続される', () => {
      // console.errorをモックしてstderr出力を抑制
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      progressSystem.addProgressChangeListener(errorListener);
      progressSystem.addProgressChangeListener(normalListener);

      // エラーが発生してもsetProgressが完了することを確認
      expect(() => progressSystem.setProgress('1', 50)).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in progress change listener:', expect.any(Error));

      // モックを復元
      consoleErrorSpy.mockRestore();
    });
  });

  describe('データのインポート・エクスポート', () => {
    it('進捗データをエクスポートできる', () => {
      progressSystem.setProgress('1', 50, 'Test export');
      progressSystem.setProgress('2', 75, 'Test export 2');
      
      const exportedData = progressSystem.exportProgressData();
      
      expect(exportedData.length).toBeGreaterThan(0);
      expect(exportedData.find(data => data.nodeId === '1')?.progress).toBe(50);
      expect(exportedData.find(data => data.nodeId === '2')?.progress).toBe(75);
    });

    it('進捗データをインポートできる', () => {
      const importData: NodeProgress[] = [
        createSampleProgress('1', 60, true, 'Imported progress'),
        createSampleProgress('2', 80, false, 'Auto calculated')
      ];
      
      progressSystem.importProgressData(importData);
      
      expect(progressSystem.getProgress('1')).toBe(60);
      expect(progressSystem.getProgress('2')).toBe(80);
      expect(progressSystem.getProgressInfo('1')?.note).toBe('Imported progress');
    });

    it('上書きしないインポートが機能する', () => {
      progressSystem.setProgress('1', 50, undefined, false);

      const importData: NodeProgress[] = [
        createSampleProgress('1', 80),
        createSampleProgress('2', 90)
      ];

      progressSystem.importProgressData(importData, false);

      expect(progressSystem.getProgress('1')).toBe(50); // 上書きされない
      expect(progressSystem.getProgress('2')).toBe(90); // 新しいデータは追加
    });
  });

  describe('ノード更新', () => {
    it('ノード配列を更新できる', () => {
      const newNodes = [
        createSampleNode('new-1', 'New Node 1'),
        createSampleNode('new-2', 'New Node 2')
      ];
      
      progressSystem.updateNodes(newNodes);
      
      // 新しいノードの進捗が初期化されることを確認
      expect(progressSystem.getProgress('new-1')).toBe(0);
      expect(progressSystem.getProgress('new-2')).toBe(0);
    });
  });

  describe('計算オプション', () => {
    it('最小進捗しきい値が機能する', () => {
      progressSystem.setProgress('1-1-1', 5, undefined, false);  // しきい値以下
      progressSystem.setProgress('1-1-2', 50, undefined, false); // しきい値以上
      
      const options: ProgressCalculationOptions = {
        useWeighting: false,
        includeEmptyNodes: true,
        minimumProgressThreshold: 10
      };
      
      progressSystem.updateParentProgress('1-1', options);
      
      // しきい値以下の進捗は除外されて計算される
      expect(progressSystem.getProgress('1-1')).toBe(50);
    });

    it('空のノードを除外する設定が機能する', () => {
      progressSystem.setProgress('1-1-1', 50, undefined, false);
      // 1-1-2は0%のまま
      
      const optionsInclude: ProgressCalculationOptions = {
        useWeighting: false,
        includeEmptyNodes: true,
        minimumProgressThreshold: 0
      };
      
      const optionsExclude: ProgressCalculationOptions = {
        useWeighting: false,
        includeEmptyNodes: false,
        minimumProgressThreshold: 0
      };
      
      progressSystem.updateParentProgress('1-1', optionsInclude);
      const progressInclude = progressSystem.getProgress('1-1');
      
      progressSystem.setProgress('1-1', 0, undefined, false); // リセット
      
      progressSystem.updateParentProgress('1-1', optionsExclude);
      const progressExclude = progressSystem.getProgress('1-1');
      
      expect(progressInclude).toBe(25); // (50 + 0) / 2
      expect(progressExclude).toBe(50); // 50 / 1 (0%のノードを除外)
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のノードでも効率的に動作する', () => {
      const largeNodes: MindmapNode[] = [];
      
      // 階層構造を作成（10個の親、各親に100個の子）
      for (let i = 0; i < 10; i++) {
        const children: MindmapNode[] = [];
        for (let j = 0; j < 100; j++) {
          children.push(createSampleNode(`${i}-${j}`, `Child ${i}-${j}`));
        }
        largeNodes.push(createSampleNode(`parent-${i}`, `Parent ${i}`, children));
      }
      
      const startTime = performance.now();
      const largeProgressSystem = new ProgressSystem(largeNodes);
      
      // 一部のノードに進捗を設定
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 50; j++) {
          largeProgressSystem.setProgress(`${i}-${j}`, Math.floor(Math.random() * 100), undefined, false);
        }
      }
      
      // 全進捗を再計算
      largeProgressSystem.recalculateAllProgress();
      const summary = largeProgressSystem.getProgressSummary();
      
      const endTime = performance.now();
      
      expect(summary.totalNodes).toBe(1010); // 10 + (10 * 100)
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内に完了
    });
  });
});