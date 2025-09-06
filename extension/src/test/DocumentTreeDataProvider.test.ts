import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode } from './setup';
import { DocumentTreeDataProvider, DocumentTreeItem } from '../DocumentTreeDataProvider';
import type { MockTextDocument } from './types';

describe('DocumentTreeDataProvider', () => {
  let provider: DocumentTreeDataProvider;
  let mockDocument: MockTextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DocumentTreeDataProvider();

    mockDocument = {
      uri: { toString: () => '/test/mindmap.json' },
      fileName: '/test/mindmap.json',
      getText: vi.fn(),
      save: vi.fn(),
      positionAt: vi.fn((pos) => ({ line: 0, character: pos }))
    };
  });

  describe('setCurrentDocument', () => {
    it('should set document and load tree data', async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Test Root',
          description: 'Test Description',
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(1);
      expect(treeData[0].label).toBe('Test Root');
      expect(treeData[0].nodeId).toBe('root');
    });

    it('should handle YAML files', async () => {
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children:
    - id: child1
      title: YAML Child
      children: []
      `;

      mockDocument.fileName = '/test/mindmap.yaml';
      mockDocument.getText.mockReturnValue(yamlContent);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(1);
      expect(treeData[0].label).toBe('YAML Root');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockDocument.getText.mockReturnValue('invalid json');

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle malformed YAML gracefully', async () => {
      mockDocument.fileName = '/test/mindmap.yml';
      mockDocument.getText.mockReturnValue('invalid: yaml: [unclosed');

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle document without root', async () => {
      const contentWithoutRoot = JSON.stringify({
        someOtherProperty: 'value'
      });

      mockDocument.getText.mockReturnValue(contentWithoutRoot);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle undefined document', async () => {
      const provider = new DocumentTreeDataProvider();

      // ドキュメントを設定せずにgetChildrenを呼ぶ
      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });
  });

  describe('getChildren', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              children: [
                {
                  id: 'grandchild1',
                  title: 'Grandchild 1',
                  children: []
                }
              ]
            },
            {
              id: 'child2',
              title: 'Child 2',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      await provider.setCurrentDocument(mockDocument);
    });

    it('should return root items when no element is provided', () => {
      const children = provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Root');
    });

    it('should return child items for parent element', () => {
      const rootItem = provider.getChildren()[0];
      const children = provider.getChildren(rootItem);
      
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Child 1');
      expect(children[1].label).toBe('Child 2');
    });

    it('should return grandchild items', () => {
      const rootItem = provider.getChildren()[0];
      const childItems = provider.getChildren(rootItem);
      const grandchildren = provider.getChildren(childItems[0]);
      
      expect(grandchildren).toHaveLength(1);
      expect(grandchildren[0].label).toBe('Grandchild 1');
    });

    it('should return empty array for item without children', () => {
      const rootItem = provider.getChildren()[0];
      const childItems = provider.getChildren(rootItem);
      const leafChildren = provider.getChildren(childItems[1]); // Child 2 has no children
      
      expect(leafChildren).toHaveLength(0);
    });

    it('should return empty array for item with no nodeData', () => {
      const itemWithoutData = new DocumentTreeItem('test', 'Test', 0, 'node');
      const children = provider.getChildren(itemWithoutData);
      
      expect(children).toHaveLength(0);
    });
  });

  describe('getTreeItem', () => {
    it('should return the tree item as-is', () => {
      const treeItem = new DocumentTreeItem(
        'test-id',
        'Test Label',
        0, // TreeItemCollapsibleState.None
        'mindmapNode'
      );

      const result = provider.getTreeItem(treeItem);
      expect(result).toBe(treeItem);
    });
  });

  describe('findTreeItem', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'target-node',
              title: 'Target Node',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      await provider.setCurrentDocument(mockDocument);
    });

    it('should find tree item by node ID', () => {
      const found = provider.findTreeItem('target-node');
      expect(found).toBeDefined();
      expect(found?.nodeId).toBe('target-node');
      expect(found?.label).toBe('Target Node');
    });

    it('should return undefined for non-existent node ID', () => {
      const found = provider.findTreeItem('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('addNode', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: []
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      
      // WorkspaceEditとRangeのモック
      const mockEdit = {
        replace: vi.fn()
      };
      mockVSCode.WorkspaceEdit.mockReturnValue(mockEdit);
      mockVSCode.Range.mockReturnValue({});
      mockVSCode.workspace.applyEdit.mockResolvedValue(true);

      await provider.setCurrentDocument(mockDocument);
    });

    it('should add node to parent and update document', async () => {
      const newNodeData = {
        id: 'new-node',
        title: 'New Node',
        description: 'New Description'
      };

      await provider.addNode('root', newNodeData);

      // WorkspaceEdit.replace が呼ばれたことを確認
      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle add node when no document is set', async () => {
      const provider = new DocumentTreeDataProvider();
      const newNodeData = {
        id: 'new-node',
        title: 'New Node'
      };

      // ドキュメントが設定されていない場合は何もしない
      await provider.addNode('root', newNodeData);

      expect(mockVSCode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it('should handle YAML files when adding nodes', async () => {
      const yamlProvider = new DocumentTreeDataProvider();
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children: []
      `;

      const yamlDocument = {
        ...mockDocument,
        fileName: '/test/mindmap.yaml',
        getText: vi.fn().mockReturnValue(yamlContent)
      };

      await yamlProvider.setCurrentDocument(yamlDocument);

      const newNodeData = {
        id: 'new-node',
        title: 'New YAML Node'
      };

      await yamlProvider.addNode('root', newNodeData);

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(yamlDocument.save).toHaveBeenCalled();
    });

    it('should handle add node errors gracefully', async () => {
      mockVSCode.workspace.applyEdit.mockRejectedValue(new Error('Apply edit failed'));

      const newNodeData = {
        id: 'new-node',
        title: 'New Node'
      };

      await provider.addNode('root', newNodeData);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('ノードの追加に失敗しました')
      );
    });
  });

  describe('deleteNode', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'node-to-delete',
              title: 'Node to Delete',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      
      const mockEdit = {
        replace: vi.fn()
      };
      mockVSCode.WorkspaceEdit.mockReturnValue(mockEdit);
      mockVSCode.Range.mockReturnValue({});
      mockVSCode.workspace.applyEdit.mockResolvedValue(true);

      await provider.setCurrentDocument(mockDocument);
    });

    it('should delete node and update document', async () => {
      await provider.deleteNode('node-to-delete');

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle delete node when no document is set', async () => {
      const provider = new DocumentTreeDataProvider();

      await provider.deleteNode('some-node');

      expect(mockVSCode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it('should handle YAML files when deleting nodes', async () => {
      const yamlProvider = new DocumentTreeDataProvider();
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children:
    - id: node-to-delete
      title: Node to Delete
      children: []
      `;

      const yamlDocument = {
        ...mockDocument,
        fileName: '/test/mindmap.yml',
        getText: vi.fn().mockReturnValue(yamlContent)
      };

      await yamlProvider.setCurrentDocument(yamlDocument);

      await yamlProvider.deleteNode('node-to-delete');

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(yamlDocument.save).toHaveBeenCalled();
    });

    it('should handle delete node errors gracefully', async () => {
      mockVSCode.workspace.applyEdit.mockRejectedValue(new Error('Delete failed'));

      await provider.deleteNode('node-to-delete');

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('ノードの削除に失敗しました')
      );
    });
  });

  describe('refresh and expansion methods', () => {
    it('should call refresh without errors', () => {
      expect(() => provider.refresh()).not.toThrow();
    });

    it('should call expandAll without errors', () => {
      expect(() => provider.expandAll()).not.toThrow();
    });

    it('should call collapseAll without errors', () => {
      expect(() => provider.collapseAll()).not.toThrow();
    });

    it('should trigger onDidChangeTreeData when refresh is called', () => {
      const spy = vi.fn();
      const disposable = provider.onDidChangeTreeData(spy);
      
      provider.refresh();
      
      // EventEmitterを直接呼び出すため、即座に呼ばれる
      expect(spy).toHaveBeenCalledTimes(1);
      disposable.dispose();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle getTreeItem with undefined element', () => {
      // getTreeItemは単純にelementを返すだけなので、undefinedでも例外は投げない
      expect(() => provider.getTreeItem(undefined as any)).not.toThrow();
      const result = provider.getTreeItem(undefined as any);
      expect(result).toBeUndefined();
    });

    it('should handle getChildren with invalid parent', () => {
      const result = provider.getChildren('invalid-id');
      expect(result).toEqual([]);
    });

    it('should handle setCurrentDocument with null document', async () => {
      // setCurrentDocumentはnullでも例外を投げない（loadTreeDataでundefinedチェックがある）
      await expect(provider.setCurrentDocument(null as any)).resolves.not.toThrow();
    });

    it('should handle document with missing uri', async () => {
      const invalidDocument = {
        ...mockDocument,
        uri: undefined
      };

      // URIがなくても例外は投げない（getText()が呼ばれるまで）
      await expect(provider.setCurrentDocument(invalidDocument as any)).resolves.not.toThrow();
    });

    it('should handle empty YAML document', async () => {
      const emptyYamlDocument = {
        ...mockDocument,
        fileName: '/test/empty.yml',
        getText: vi.fn().mockReturnValue('')
      };

      await provider.setCurrentDocument(emptyYamlDocument);
      
      const children = provider.getChildren();
      expect(children).toEqual([]);
    });

    it('should handle YAML document with only comments', async () => {
      const commentOnlyYaml = `
# This is a comment
# Another comment
`;
      const commentDocument = {
        ...mockDocument,
        fileName: '/test/comments.yml',
        getText: vi.fn().mockReturnValue(commentOnlyYaml)
      };

      await provider.setCurrentDocument(commentDocument);
      
      const children = provider.getChildren();
      expect(children).toEqual([]);
    });

    it('should handle deeply nested JSON structure', async () => {
      const deepNestedJson = {
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'level1',
              title: 'Level 1',
              children: [
                {
                  id: 'level2',
                  title: 'Level 2',
                  children: [
                    {
                      id: 'level3',
                      title: 'Level 3'
                    }
                  ]
                }
              ]
            }
          ]
        }
      };

      const deepDocument = {
        ...mockDocument,
        fileName: '/test/deep.json',
        getText: vi.fn().mockReturnValue(JSON.stringify(deepNestedJson))
      };

      await provider.setCurrentDocument(deepDocument);
      
      const rootChildren = provider.getChildren();
      expect(rootChildren).toHaveLength(1);
      
      const level1Children = provider.getChildren(rootChildren[0]);
      expect(level1Children).toHaveLength(1);
      
      const level2Children = provider.getChildren(level1Children[0]);
      expect(level2Children).toHaveLength(1);
      
      const level3Children = provider.getChildren(level2Children[0]);
      expect(level3Children).toHaveLength(1);
    });

    it('should handle addNode with invalid parent ID', async () => {
      await provider.setCurrentDocument(mockDocument);
      
      const invalidNodeData = { id: 'new-node', title: 'New Node' };
      
      // addNodeは存在しないparentIdでも例外を投げない（単に何もしない）
      await expect(provider.addNode('invalid-parent', invalidNodeData)).resolves.not.toThrow();
    });

    it('should handle deleteNode with non-existent node', async () => {
      await provider.setCurrentDocument(mockDocument);
      
      // deleteNodeは存在しないnodeIdでも例外を投げない（単に何もしない）
      await expect(provider.deleteNode('non-existent')).resolves.not.toThrow();
    });

    it('should handle JSON with circular references gracefully', async () => {
      // 循環参照を含む無効なJSONでエラーハンドリングをテスト
      const documentWithCircularRef = {
        ...mockDocument,
        getText: vi.fn().mockReturnValue('{"root": {"id": "root", "children": [{"id": "child", "parent": {}}]}}')
      };

      await provider.setCurrentDocument(documentWithCircularRef);
      
      // エラーがあってもsetCurrentDocumentは完了する（loadTreeDataでcatchされる）
      expect(documentWithCircularRef.getText).toHaveBeenCalled();
    });
  });
});