import React from 'react';
import { render, screen } from '@testing-library/react';
import { HierarchicalTableView } from '../HierarchicalTableView';
import { buildHierarchicalMindmapColumns } from '../buildHierarchicalMindmapColumns';
import type { MindmapNode } from '../../../types';
import type { HierarchicalNodeInfo } from '../hierarchyUtils';

// モックデータ
const mockHierarchicalData: MindmapNode[] = [
  {
    id: '1',
    title: 'Root Node 1',
    status: 'done',
    priority: 'high',
    children: [
      {
        id: '1-1',
        title: 'Child Node 1-1',
        status: 'in-progress',
        priority: 'medium',
        children: [
          {
            id: '1-1-1',
            title: 'Grandchild Node 1-1-1',
            status: 'pending',
            priority: 'low',
          }
        ]
      },
      {
        id: '1-2',
        title: 'Child Node 1-2',
        status: 'review',
        priority: 'high',
      }
    ]
  },
  {
    id: '2',
    title: 'Root Node 2',
    status: 'pending',
    priority: 'medium',
    children: [
      {
        id: '2-1',
        title: 'Child Node 2-1',
        status: 'done',
        priority: 'low',
      }
    ]
  }
];

// テスト用の階層カラム定義を生成
const generateTestColumns = (data: MindmapNode[]) => {
  // データを平坦化してHierarchicalNodeInfo形式のサンプルを作成
  const flattenForTest = (nodes: MindmapNode[], level = 0, parentId: string | null = null): HierarchicalNodeInfo[] => {
    const result: HierarchicalNodeInfo[] = [];
    nodes.forEach((node, index) => {
      const hierarchicalNode: HierarchicalNodeInfo = {
        ...node,
        _level: level,
        _parentId: parentId,
        _nodePath: parentId ? [parentId, node.id] : [node.id],
        _hasChildren: Boolean(node.children && node.children.length > 0),
        _siblingIndex: index,
        _groupKey: level === 0 ? node.id : (parentId || node.id),
      };
      result.push(hierarchicalNode);
      
      if (node.children) {
        result.push(...flattenForTest(node.children, level + 1, node.id));
      }
    });
    return result;
  };
  
  const samples = flattenForTest(data);
  return buildHierarchicalMindmapColumns(samples, { 
    showHierarchyInfo: true, 
    showParentInfo: true 
  });
};

describe('HierarchicalTableView', () => {
  it('階層データを正しくレンダリングする', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        enableHierarchicalGrouping={false}
      />
    );

    // ルートノードの存在確認
    expect(screen.getByText('Root Node 1')).toBeInTheDocument();
    expect(screen.getByText('Root Node 2')).toBeInTheDocument();

    // 子ノードの存在確認
    expect(screen.getByText('Child Node 1-1')).toBeInTheDocument();
    expect(screen.getByText('Child Node 1-2')).toBeInTheDocument();
    expect(screen.getByText('Child Node 2-1')).toBeInTheDocument();

    // 孫ノードの存在確認
    expect(screen.getByText('Grandchild Node 1-1-1')).toBeInTheDocument();
  });

  it('グループヘッダー付きで階層データを正しくレンダリングする', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        enableHierarchicalGrouping={true}
        showGroupHeaders={true}
      />
    );

    // グループヘッダーの存在確認
    expect(screen.getByText('Root Node 1')).toBeInTheDocument();
    expect(screen.getByText('Root Node 2')).toBeInTheDocument();

    // アイテム数の表示確認
    expect(screen.getByText('4 items')).toBeInTheDocument(); // Root Node 1グループ：4個
    expect(screen.getByText('2 items')).toBeInTheDocument(); // Root Node 2グループ：2個
  });

  it('階層レベルバッジが正しく表示される', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        enableHierarchicalGrouping={false}
      />
    );

    // 階層レベル表示の確認
    expect(screen.getAllByText('L0')).toHaveLength(2); // ルートノード2個
    expect(screen.getAllByText('L1')).toHaveLength(3); // 子ノード3個
    expect(screen.getAllByText('L2')).toHaveLength(1); // 孫ノード1個
  });

  it('階層インデントが適用される', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        hierarchyIndentPx={25}
        enableHierarchicalGrouping={false}
      />
    );

    // インデント用のCSSクラスが適用されているか確認
    const hierarchyCells = document.querySelectorAll('.hierarchy-cell');
    expect(hierarchyCells.length).toBeGreaterThan(0);

    // レベル1のインデントを確認
    const level1Cells = Array.from(hierarchyCells).filter(cell => 
      cell.getAttribute('style')?.includes('padding-left: 25px')
    );
    expect(level1Cells.length).toBeGreaterThan(0);

    // レベル2のインデントを確認
    const level2Cells = Array.from(hierarchyCells).filter(cell => 
      cell.getAttribute('style')?.includes('padding-left: 50px')
    );
    expect(level2Cells.length).toBeGreaterThan(0);
  });

  it('子ノードアイコンが正しく表示される', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        enableHierarchicalGrouping={false}
      />
    );

    // フォルダアイコンが表示されているか確認
    const folderIcons = document.querySelectorAll('.hierarchy-folder-icon');
    expect(folderIcons.length).toBeGreaterThan(0);

    // 子ノードを持つノードにフォルダアイコンが表示されているか確認
    const hasChildrenIcons = document.querySelectorAll('.hierarchy-folder-icon.has-children');
    expect(hasChildrenIcons.length).toBe(3); // Root Node 1, Child Node 1-1, Root Node 2
  });

  it('階層コネクターが適切に表示される', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        enableHierarchicalGrouping={false}
      />
    );

    // コネクターが表示されているか確認
    const connectors = document.querySelectorAll('.hierarchy-connector');
    expect(connectors.length).toBeGreaterThan(0);

    // レベル別のコネクターが存在するか確認
    const level1Connectors = document.querySelectorAll('.hierarchy-connector.level-1');
    const level2Connectors = document.querySelectorAll('.hierarchy-connector.level-2');
    
    expect(level1Connectors.length).toBeGreaterThan(0);
    expect(level2Connectors.length).toBeGreaterThan(0);
  });

  it('空のデータでもエラーが発生しない', () => {
    const columns = generateTestColumns([]);
    
    render(
      <HierarchicalTableView
        data={[]}
        columns={columns}
        enableHierarchicalGrouping={true}
      />
    );

    // エラーが発生しないことを確認
    expect(document.querySelector('.hierarchical-table')).toBeInTheDocument();
  });

  it('カスタム階層インデントが適用される', () => {
    const columns = generateTestColumns(mockHierarchicalData);
    const customIndent = 15;
    
    render(
      <HierarchicalTableView
        data={mockHierarchicalData}
        columns={columns}
        hierarchyIndentPx={customIndent}
        enableHierarchicalGrouping={false}
      />
    );

    // カスタムインデントが適用されているか確認
    const hierarchyCells = document.querySelectorAll('.hierarchy-cell');
    const level1Cell = Array.from(hierarchyCells).find(cell => 
      cell.getAttribute('style')?.includes(`padding-left: ${customIndent}px`)
    );
    
    expect(level1Cell).toBeDefined();
  });
});