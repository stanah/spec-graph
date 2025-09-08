import type { MindmapNode } from '../../types';

export interface HierarchicalNodeInfo extends MindmapNode {
  /** 階層レベル（0が最上位） */
  _level: number;
  /** 親ノードのID（ルートノードの場合はnull） */
  _parentId: string | null;
  /** このノードのパス（ルートから現在のノードまでの経路） */
  _nodePath: string[];
  /** 子ノードを持つかどうか */
  _hasChildren: boolean;
  /** 同一階層内での順序 */
  _siblingIndex: number;
  /** グループ化のためのキー */
  _groupKey: string;
}

/**
 * 階層構造のMindmapNodeを平坦化し、階層情報を付加します
 */
export function flattenWithHierarchy(
  nodes: MindmapNode[], 
  level: number = 0, 
  parentId: string | null = null,
  parentPath: string[] = []
): HierarchicalNodeInfo[] {
  const result: HierarchicalNodeInfo[] = [];

  nodes.forEach((node, siblingIndex) => {
    const nodePath = [...parentPath, node.id];
    const groupKey = level === 0 ? node.id : parentPath[0] || node.id;
    
    const hierarchicalNode: HierarchicalNodeInfo = {
      ...node,
      _level: level,
      _parentId: parentId,
      _nodePath: nodePath,
      _hasChildren: Boolean(node.children && node.children.length > 0),
      _siblingIndex: siblingIndex,
      _groupKey: groupKey,
    };

    result.push(hierarchicalNode);

    // 子ノードがある場合は再帰的に処理
    if (node.children && node.children.length > 0) {
      const childrenFlat = flattenWithHierarchy(
        node.children,
        level + 1,
        node.id,
        nodePath
      );
      result.push(...childrenFlat);
    }
  });

  return result;
}

/**
 * 階層レベルごとにノードをグループ化します
 */
export function groupByLevel(nodes: HierarchicalNodeInfo[]): Map<number, HierarchicalNodeInfo[]> {
  const groups = new Map<number, HierarchicalNodeInfo[]>();
  
  nodes.forEach(node => {
    const level = node._level;
    if (!groups.has(level)) {
      groups.set(level, []);
    }
    groups.get(level)!.push(node);
  });
  
  return groups;
}

/**
 * ルートノードごとにノードをグループ化します
 */
export function groupByRootNode(nodes: HierarchicalNodeInfo[]): Map<string, HierarchicalNodeInfo[]> {
  const groups = new Map<string, HierarchicalNodeInfo[]>();
  
  nodes.forEach(node => {
    const groupKey = node._groupKey;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(node);
  });
  
  return groups;
}

/**
 * 階層の深さを計算します
 */
export function getMaxDepth(nodes: HierarchicalNodeInfo[]): number {
  if (nodes.length === 0) return 0;
  return Math.max(...nodes.map(node => node._level)) + 1;
}

/**
 * 特定のレベルのノードのみを取得します
 */
export function getNodesByLevel(nodes: HierarchicalNodeInfo[], level: number): HierarchicalNodeInfo[] {
  return nodes.filter(node => node._level === level);
}

/**
 * 特定のノードの子ノードを取得します
 */
export function getChildNodes(nodes: HierarchicalNodeInfo[], parentId: string): HierarchicalNodeInfo[] {
  return nodes.filter(node => node._parentId === parentId);
}

/**
 * 特定のノードの祖先ノードを取得します
 */
export function getAncestors(nodes: HierarchicalNodeInfo[], nodeId: string): HierarchicalNodeInfo[] {
  const targetNode = nodes.find(node => node.id === nodeId);
  if (!targetNode) return [];
  
  const ancestors: HierarchicalNodeInfo[] = [];
  const path = targetNode._nodePath.slice(0, -1); // 現在のノードを除いた親パス
  
  path.forEach(ancestorId => {
    const ancestor = nodes.find(node => node.id === ancestorId);
    if (ancestor) {
      ancestors.push(ancestor);
    }
  });
  
  return ancestors;
}