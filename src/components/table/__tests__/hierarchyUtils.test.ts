import { 
  flattenWithHierarchy, 
  groupByLevel, 
  groupByRootNode, 
  getMaxDepth, 
  getNodesByLevel, 
  getChildNodes, 
  getAncestors 
} from '../hierarchyUtils';
import type { MindmapNode } from '../../../types';

// テスト用モックデータ
const mockHierarchicalData: MindmapNode[] = [
  {
    id: '1',
    title: 'Root Node 1',
    children: [
      {
        id: '1-1',
        title: 'Child Node 1-1',
        children: [
          {
            id: '1-1-1',
            title: 'Grandchild Node 1-1-1',
          }
        ]
      },
      {
        id: '1-2',
        title: 'Child Node 1-2',
      }
    ]
  },
  {
    id: '2',
    title: 'Root Node 2',
    children: [
      {
        id: '2-1',
        title: 'Child Node 2-1',
      }
    ]
  },
  {
    id: '3',
    title: 'Root Node 3 (No Children)',
  }
];

describe('hierarchyUtils', () => {
  describe('flattenWithHierarchy', () => {
    it('階層データを正しく平坦化する', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      expect(result).toHaveLength(7); // 7つのノード（ルート3 + 子3 + 孫1）
      
      // ルートノードのレベルチェック
      const rootNodes = result.filter(node => node._level === 0);
      expect(rootNodes).toHaveLength(3);
      expect(rootNodes.map(n => n.id)).toEqual(['1', '2', '3']);
      
      // 子ノードのレベルチェック
      const childNodes = result.filter(node => node._level === 1);
      expect(childNodes).toHaveLength(3);
      expect(childNodes.map(n => n.id)).toEqual(['1-1', '1-2', '2-1']);
      
      // 孫ノードのレベルチェック
      const grandchildNodes = result.filter(node => node._level === 2);
      expect(grandchildNodes).toHaveLength(1);
      expect(grandchildNodes[0].id).toBe('1-1-1');
    });

    it('親ID情報が正しく設定される', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      // ルートノードは親IDがnull
      const rootNodes = result.filter(node => node._level === 0);
      rootNodes.forEach(node => {
        expect(node._parentId).toBeNull();
      });
      
      // 子ノードの親IDチェック
      expect(result.find(n => n.id === '1-1')?._parentId).toBe('1');
      expect(result.find(n => n.id === '1-2')?._parentId).toBe('1');
      expect(result.find(n => n.id === '2-1')?._parentId).toBe('2');
      
      // 孫ノードの親IDチェック
      expect(result.find(n => n.id === '1-1-1')?._parentId).toBe('1-1');
    });

    it('ノードパスが正しく設定される', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      // ルートノードのパス
      expect(result.find(n => n.id === '1')?._nodePath).toEqual(['1']);
      expect(result.find(n => n.id === '2')?._nodePath).toEqual(['2']);
      
      // 子ノードのパス
      expect(result.find(n => n.id === '1-1')?._nodePath).toEqual(['1', '1-1']);
      expect(result.find(n => n.id === '2-1')?._nodePath).toEqual(['2', '2-1']);
      
      // 孫ノードのパス
      expect(result.find(n => n.id === '1-1-1')?._nodePath).toEqual(['1', '1-1', '1-1-1']);
    });

    it('子ノードフラグが正しく設定される', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      // 子ノードを持つノード
      expect(result.find(n => n.id === '1')?._hasChildren).toBe(true);
      expect(result.find(n => n.id === '2')?._hasChildren).toBe(true);
      expect(result.find(n => n.id === '1-1')?._hasChildren).toBe(true);
      
      // 子ノードを持たないノード
      expect(result.find(n => n.id === '3')?._hasChildren).toBe(false);
      expect(result.find(n => n.id === '1-2')?._hasChildren).toBe(false);
      expect(result.find(n => n.id === '2-1')?._hasChildren).toBe(false);
      expect(result.find(n => n.id === '1-1-1')?._hasChildren).toBe(false);
    });

    it('グループキーが正しく設定される', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      // ルートノードのグループキーは自身のID
      expect(result.find(n => n.id === '1')?._groupKey).toBe('1');
      expect(result.find(n => n.id === '2')?._groupKey).toBe('2');
      expect(result.find(n => n.id === '3')?._groupKey).toBe('3');
      
      // 子ノード以下はルートノードのIDがグループキー
      expect(result.find(n => n.id === '1-1')?._groupKey).toBe('1');
      expect(result.find(n => n.id === '1-2')?._groupKey).toBe('1');
      expect(result.find(n => n.id === '1-1-1')?._groupKey).toBe('1');
      expect(result.find(n => n.id === '2-1')?._groupKey).toBe('2');
    });

    it('兄弟インデックスが正しく設定される', () => {
      const result = flattenWithHierarchy(mockHierarchicalData);
      
      // ルートレベルの兄弟インデックス
      expect(result.find(n => n.id === '1')?._siblingIndex).toBe(0);
      expect(result.find(n => n.id === '2')?._siblingIndex).toBe(1);
      expect(result.find(n => n.id === '3')?._siblingIndex).toBe(2);
      
      // ノード1の子レベルの兄弟インデックス
      expect(result.find(n => n.id === '1-1')?._siblingIndex).toBe(0);
      expect(result.find(n => n.id === '1-2')?._siblingIndex).toBe(1);
      
      // ノード2の子レベルの兄弟インデックス
      expect(result.find(n => n.id === '2-1')?._siblingIndex).toBe(0);
    });
  });

  describe('groupByLevel', () => {
    it('レベル別にノードをグループ化する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      const grouped = groupByLevel(flattened);
      
      expect(grouped.size).toBe(3); // レベル0, 1, 2
      
      // レベル0: 3つのルートノード
      expect(grouped.get(0)).toHaveLength(3);
      expect(grouped.get(0)?.map(n => n.id)).toEqual(['1', '2', '3']);
      
      // レベル1: 3つの子ノード
      expect(grouped.get(1)).toHaveLength(3);
      expect(grouped.get(1)?.map(n => n.id)).toEqual(['1-1', '1-2', '2-1']);
      
      // レベル2: 1つの孫ノード
      expect(grouped.get(2)).toHaveLength(1);
      expect(grouped.get(2)?.[0].id).toBe('1-1-1');
    });
  });

  describe('groupByRootNode', () => {
    it('ルートノード別にノードをグループ化する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      const grouped = groupByRootNode(flattened);
      
      expect(grouped.size).toBe(3); // 3つのルートノードグループ
      
      // ルートノード1のグループ: 4ノード（ルート + 子2 + 孫1）（深度優先順）
      expect(grouped.get('1')).toHaveLength(4);
      expect(grouped.get('1')?.map(n => n.id)).toEqual(['1', '1-1', '1-1-1', '1-2']);
      
      // ルートノード2のグループ: 2ノード（ルート + 子1）
      expect(grouped.get('2')).toHaveLength(2);
      expect(grouped.get('2')?.map(n => n.id)).toEqual(['2', '2-1']);
      
      // ルートノード3のグループ: 1ノード（ルートのみ）
      expect(grouped.get('3')).toHaveLength(1);
      expect(grouped.get('3')?.[0].id).toBe('3');
    });
  });

  describe('getMaxDepth', () => {
    it('階層の最大深度を正しく計算する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      const maxDepth = getMaxDepth(flattened);
      
      expect(maxDepth).toBe(3); // レベル0, 1, 2 = 3階層
    });

    it('空データの場合は0を返す', () => {
      const maxDepth = getMaxDepth([]);
      expect(maxDepth).toBe(0);
    });
  });

  describe('getNodesByLevel', () => {
    it('指定レベルのノードのみを取得する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      
      const level0Nodes = getNodesByLevel(flattened, 0);
      expect(level0Nodes).toHaveLength(3);
      expect(level0Nodes.map(n => n.id)).toEqual(['1', '2', '3']);
      
      const level1Nodes = getNodesByLevel(flattened, 1);
      expect(level1Nodes).toHaveLength(3);
      expect(level1Nodes.map(n => n.id)).toEqual(['1-1', '1-2', '2-1']);
      
      const level2Nodes = getNodesByLevel(flattened, 2);
      expect(level2Nodes).toHaveLength(1);
      expect(level2Nodes[0].id).toBe('1-1-1');
      
      const level3Nodes = getNodesByLevel(flattened, 3);
      expect(level3Nodes).toHaveLength(0);
    });
  });

  describe('getChildNodes', () => {
    it('指定親ノードの直接の子ノードを取得する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      
      const node1Children = getChildNodes(flattened, '1');
      expect(node1Children).toHaveLength(2);
      expect(node1Children.map(n => n.id)).toEqual(['1-1', '1-2']);
      
      const node2Children = getChildNodes(flattened, '2');
      expect(node2Children).toHaveLength(1);
      expect(node2Children[0].id).toBe('2-1');
      
      const node3Children = getChildNodes(flattened, '3');
      expect(node3Children).toHaveLength(0);
      
      const node11Children = getChildNodes(flattened, '1-1');
      expect(node11Children).toHaveLength(1);
      expect(node11Children[0].id).toBe('1-1-1');
    });
  });

  describe('getAncestors', () => {
    it('指定ノードの祖先ノードを取得する', () => {
      const flattened = flattenWithHierarchy(mockHierarchicalData);
      
      // ルートノードは祖先なし
      const node1Ancestors = getAncestors(flattened, '1');
      expect(node1Ancestors).toHaveLength(0);
      
      // 子ノードの祖先はルートノード
      const node11Ancestors = getAncestors(flattened, '1-1');
      expect(node11Ancestors).toHaveLength(1);
      expect(node11Ancestors[0].id).toBe('1');
      
      // 孫ノードの祖先はルートノードと親ノード
      const node111Ancestors = getAncestors(flattened, '1-1-1');
      expect(node111Ancestors).toHaveLength(2);
      expect(node111Ancestors.map(n => n.id)).toEqual(['1', '1-1']);
      
      // 存在しないノードは空配列
      const noNodeAncestors = getAncestors(flattened, 'nonexistent');
      expect(noNodeAncestors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('空データを処理できる', () => {
      const result = flattenWithHierarchy([]);
      expect(result).toHaveLength(0);
    });

    it('childrenがundefinedやnullの場合を処理できる', () => {
      const dataWithNullChildren: MindmapNode[] = [
        {
          id: '1',
          title: 'Node with null children',
          children: undefined
        }
      ];
      
      const result = flattenWithHierarchy(dataWithNullChildren);
      expect(result).toHaveLength(1);
      expect(result[0]._hasChildren).toBe(false);
      expect(result[0]._level).toBe(0);
    });

    it('空のchildrenを処理できる', () => {
      const dataWithEmptyChildren: MindmapNode[] = [
        {
          id: '1',
          title: 'Node with empty children',
          children: []
        }
      ];
      
      const result = flattenWithHierarchy(dataWithEmptyChildren);
      expect(result).toHaveLength(1);
      expect(result[0]._hasChildren).toBe(false);
      expect(result[0]._level).toBe(0);
    });

    it('深い階層を正しく処理する', () => {
      const deepData: MindmapNode[] = [
        {
          id: '1',
          title: 'Level 0',
          children: [
            {
              id: '1-1',
              title: 'Level 1',
              children: [
                {
                  id: '1-1-1',
                  title: 'Level 2',
                  children: [
                    {
                      id: '1-1-1-1',
                      title: 'Level 3',
                      children: [
                        {
                          id: '1-1-1-1-1',
                          title: 'Level 4'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];
      
      const result = flattenWithHierarchy(deepData);
      expect(result).toHaveLength(5);
      expect(getMaxDepth(result)).toBe(5); // レベル0-4 = 5階層
      
      const deepestNode = result.find(n => n.id === '1-1-1-1-1');
      expect(deepestNode?._level).toBe(4);
      expect(deepestNode?._nodePath).toEqual(['1', '1-1', '1-1-1', '1-1-1-1', '1-1-1-1-1']);
    });
  });
});