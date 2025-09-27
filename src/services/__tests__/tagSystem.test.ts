import { describe, it, expect, beforeEach } from 'vitest';
import { TagSystem, createTagSystem, type TagStatistics, type TagFilterOptions } from '../tagSystem';
import type { MindmapNode, TagDefinition } from '../../schemas/mindmap.zod';

// テスト用のサンプルデータ
const createSampleNode = (
  id: string, 
  title: string, 
  tags: string[] = [],
  children: MindmapNode[] = []
): MindmapNode => ({
  id,
  title,
  tags: tags.length > 0 ? tags : undefined,
  children: children.length > 0 ? children : undefined
});

const createSampleTagDefinition = (
  name: string, 
  color?: string, 
  description?: string
): TagDefinition => ({
  name,
  color,
  description
});

describe('TagSystem', () => {
  let nodes: MindmapNode[];
  let tagSystem: TagSystem;

  beforeEach(() => {
    nodes = [
      createSampleNode('1', 'Node 1', ['work', 'urgent']),
      createSampleNode('2', 'Node 2', ['personal']),
      createSampleNode('3', 'Node 3', ['work']),
      createSampleNode('4', 'Node 4', ['work', 'project-a'], [
        createSampleNode('4-1', 'Child Node 4-1', ['work'])
      ]),
      createSampleNode('5', 'Node 5') // タグなし
    ];
    
    const initialTags: TagDefinition[] = [
      createSampleTagDefinition('work', '#ff6b6b', 'Work related tasks'),
      createSampleTagDefinition('personal', '#4ecdc4', 'Personal tasks')
    ];
    
    tagSystem = new TagSystem(nodes, initialTags);
  });

  describe('コンストラクタとタグ同期', () => {
    it('初期タグが正しく設定される', () => {
      expect(tagSystem.hasTag('work')).toBe(true);
      expect(tagSystem.hasTag('personal')).toBe(true);
    });

    it('ノードから未定義のタグが自動的に同期される', () => {
      expect(tagSystem.hasTag('urgent')).toBe(true);
      expect(tagSystem.hasTag('project-a')).toBe(true);
    });

    it('createTagSystem ファクトリー関数が動作する', () => {
      const newTagSystem = createTagSystem(nodes);
      expect(newTagSystem).toBeInstanceOf(TagSystem);
      expect(newTagSystem.hasTag('work')).toBe(true);
    });
  });

  describe('タグの基本操作', () => {
    it('新しいタグを追加できる', () => {
      const newTag = createSampleTagDefinition('test', '#000000', 'Test tag');
      tagSystem.addTag(newTag);
      
      expect(tagSystem.hasTag('test')).toBe(true);
      expect(tagSystem.getTag('test')).toEqual(newTag);
    });

    it('タグを削除できる', () => {
      tagSystem.removeTag('urgent');
      
      expect(tagSystem.hasTag('urgent')).toBe(false);
      // ノードからもタグが削除されることを確認
      const node1 = nodes.find(n => n.id === '1');
      expect(node1?.tags).not.toContain('urgent');
    });

    it('タグを更新できる', () => {
      const updatedTag = createSampleTagDefinition('work-updated', '#ffffff', 'Updated work tag');
      tagSystem.updateTag('work', updatedTag);
      
      expect(tagSystem.hasTag('work')).toBe(false);
      expect(tagSystem.hasTag('work-updated')).toBe(true);
      
      // ノードのタグも更新されることを確認
      const node1 = nodes.find(n => n.id === '1');
      expect(node1?.tags).toContain('work-updated');
      expect(node1?.tags).not.toContain('work');
    });

    it('存在しないタグの更新でエラーが発生する', () => {
      const updatedTag = createSampleTagDefinition('new-tag');
      expect(() => tagSystem.updateTag('nonexistent', updatedTag)).toThrow('Tag "nonexistent" not found');
    });
  });

  describe('ノードのタグ操作', () => {
    it('ノードにタグを追加できる', () => {
      tagSystem.addTagToNode('5', 'new-tag');
      
      const node5 = nodes.find(n => n.id === '5');
      expect(node5?.tags).toContain('new-tag');
      expect(tagSystem.hasTag('new-tag')).toBe(true);
    });

    it('ノードから既存のタグを削除できる', () => {
      tagSystem.removeTagFromNode('1', 'work');
      
      const node1 = nodes.find(n => n.id === '1');
      expect(node1?.tags).not.toContain('work');
      expect(node1?.tags).toContain('urgent'); // 他のタグは残る
    });

    it('存在しないノードへのタグ追加でエラーが発生する', () => {
      expect(() => tagSystem.addTagToNode('nonexistent', 'test')).toThrow('Node with id "nonexistent" not found');
    });

    it('重複するタグは追加されない', () => {
      const originalLength = nodes.find(n => n.id === '1')?.tags?.length || 0;
      tagSystem.addTagToNode('1', 'work'); // 既に存在するタグ
      
      const node1 = nodes.find(n => n.id === '1');
      expect(node1?.tags?.length).toBe(originalLength);
    });
  });

  describe('タグフィルタリング', () => {
    it('単一タグでフィルタリングできる（OR演算）', () => {
      const options: TagFilterOptions = {
        tags: ['work'],
        useAndOperator: false,
        caseSensitive: true
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered).toHaveLength(3); // Node 1, 3, 4, 4-1のうち、4-1は子ノードなのでルートレベルでは3つ
    });

    it('複数タグでAND演算フィルタリングできる', () => {
      const options: TagFilterOptions = {
        tags: ['work', 'urgent'],
        useAndOperator: true,
        caseSensitive: true
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered).toHaveLength(1); // Node 1のみ
      expect(filtered[0].id).toBe('1');
    });

    it('複数タグでOR演算フィルタリングできる', () => {
      const options: TagFilterOptions = {
        tags: ['urgent', 'personal'],
        useAndOperator: false,
        caseSensitive: true
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered).toHaveLength(2); // Node 1, 2
    });

    it('大文字小文字を区別しないフィルタリングができる', () => {
      const options: TagFilterOptions = {
        tags: ['WORK'],
        useAndOperator: false,
        caseSensitive: false
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('空のタグ配列では全ノードが返される', () => {
      const options: TagFilterOptions = {
        tags: [],
        useAndOperator: false,
        caseSensitive: true
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered).toHaveLength(nodes.length);
    });

    it('存在しないタグでフィルタリングすると空配列が返される', () => {
      const options: TagFilterOptions = {
        tags: ['nonexistent'],
        useAndOperator: false,
        caseSensitive: true
      };
      
      const filtered = tagSystem.filterByTag(options);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('タグ統計', () => {
    it('正しい統計情報を取得できる', () => {
      const stats: TagStatistics = tagSystem.getTagStats();
      
      expect(stats.totalTags).toBeGreaterThan(0);
      expect(stats.usedTags).toBeGreaterThan(0);
      expect(stats.tagUsageCounts.get('work')).toBe(4); // Node 1, 3, 4, 4-1
      expect(stats.mostUsedTag).toBe('work');
    });

    it('使用回数が正しくカウントされる', () => {
      const stats = tagSystem.getTagStats();
      
      expect(stats.tagUsageCounts.get('urgent')).toBe(1);
      expect(stats.tagUsageCounts.get('personal')).toBe(1);
      expect(stats.tagUsageCounts.get('project-a')).toBe(1);
    });
  });

  describe('ノードの更新', () => {
    it('ノード配列を更新できる', () => {
      const newNodes = [
        createSampleNode('new-1', 'New Node 1', ['new-tag']),
        createSampleNode('new-2', 'New Node 2', ['another-tag'])
      ];
      
      tagSystem.updateNodes(newNodes);
      
      expect(tagSystem.hasTag('new-tag')).toBe(true);
      expect(tagSystem.hasTag('another-tag')).toBe(true);
    });
  });

  describe('階層構造のサポート', () => {
    it('子ノードのタグも正しく処理される', () => {
      const parentNode = createSampleNode('parent', 'Parent', ['parent-tag'], [
        createSampleNode('child-1', 'Child 1', ['child-tag']),
        createSampleNode('child-2', 'Child 2', ['child-tag', 'parent-tag'])
      ]);
      
      const hierarchicalNodes = [parentNode];
      const hierarchicalTagSystem = new TagSystem(hierarchicalNodes);
      
      expect(hierarchicalTagSystem.hasTag('parent-tag')).toBe(true);
      expect(hierarchicalTagSystem.hasTag('child-tag')).toBe(true);
      
      // 子ノードのタグ操作
      hierarchicalTagSystem.addTagToNode('child-1', 'new-child-tag');
      expect(hierarchicalTagSystem.hasTag('new-child-tag')).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('タグなしノードでのタグ削除は安全に処理される', () => {
      expect(() => tagSystem.removeTagFromNode('5', 'nonexistent')).not.toThrow();
    });

    it('すべてのタグ定義を取得できる', () => {
      const allTags = tagSystem.getAllTags();
      expect(allTags.size).toBeGreaterThan(0);
      expect(allTags.has('work')).toBe(true);
      expect(allTags.has('personal')).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のノードでも効率的に動作する', () => {
      const largeNodeSet: MindmapNode[] = [];
      for (let i = 0; i < 1000; i++) {
        largeNodeSet.push(createSampleNode(`node-${i}`, `Node ${i}`, [`tag-${i % 10}`]));
      }
      
      const startTime = performance.now();
      const largeTagSystem = new TagSystem(largeNodeSet);
      const stats = largeTagSystem.getTagStats();
      const endTime = performance.now();
      
      expect(stats.totalTags).toBe(10);
      expect(stats.usedTags).toBe(10);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内に完了
    });
  });
});