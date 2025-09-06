/**
 * ノードとエディタ位置のマッピング機能
 * 
 * JSON/YAMLの解析結果からノードIDとエディタ内の位置情報を対応付ける
 */

import type { MindmapData, MindmapNode } from '../types';
import type { EditorCursorPosition } from '../types/store';

/**
 * ノード位置情報
 */
export interface NodePosition {
  /** ノードID */
  nodeId: string;
  /** 開始行（1-based） */
  startLine: number;
  /** 開始列（1-based） */
  startColumn: number;
  /** 終了行（1-based） */
  endLine: number;
  /** 終了列（1-based） */
  endColumn: number;
  /** JSON path（例: "root.children[0].title"） */
  jsonPath: string;
}

/**
 * パース結果とノード位置のマッピング
 */
export interface NodeMappingResult {
  /** ノード位置のマップ */
  nodePositions: Map<string, NodePosition>;
  /** 行とノードIDのマップ */
  lineToNodeId: Map<number, string>;
  /** マインドマップデータ */
  mindmapData: MindmapData | null;
}

/**
 * JSON/YAMLコンテンツからノード位置マッピングを生成
 */
export async function createNodeMapping(content: string, format: 'json' | 'yaml'): Promise<NodeMappingResult> {
  const result: NodeMappingResult = {
    nodePositions: new Map(),
    lineToNodeId: new Map(),
    mindmapData: null,
  };

  try {
    // コンテンツの実際のフォーマットを自動判定
    const detectedFormat = detectFormat(content);
    const actualFormat = detectedFormat || format;
    
    if (actualFormat === 'json') {
      return createJsonNodeMapping(content);
    } else {
      return await createYamlNodeMapping(content);
    }
  } catch (error) {
    console.error('ノードマッピング作成エラー:', error);
    return result;
  }
}

/**
 * コンテンツのフォーマットを自動判定
 */
function detectFormat(content: string): 'json' | 'yaml' | null {
  const trimmed = content.trim();
  
  // JSONの場合は{}または[]で始まる
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // JSONパースに失敗した場合はYAMLとして扱う
      return 'yaml';
    }
  }
  
  // YAMLの特徴を確認（version:、title:などのキー）
  if (trimmed.includes('version:') || trimmed.includes('title:') || trimmed.includes('root:')) {
    return 'yaml';
  }
  
  // 判定できない場合はnullを返す
  return null;
}

/**
 * JSONコンテンツのノードマッピング作成
 */
function createJsonNodeMapping(content: string): NodeMappingResult {
  const result: NodeMappingResult = {
    nodePositions: new Map(),
    lineToNodeId: new Map(),
    mindmapData: null,
  };

  try {
    // JSONをパース
    const data = JSON.parse(content) as MindmapData;
    result.mindmapData = data;

    // 行ごとにコンテンツを分割
    const lines = content.split('\n');
    
    // ノードを再帰的に解析してマッピングを作成
    mapJsonNode(data.root, lines, 'root', result);

    return result;
  } catch (error) {
    console.error('JSON ノードマッピング作成エラー:', error);
    return result;
  }
}

/**
 * YAMLコンテンツのノードマッピング作成
 */
async function createYamlNodeMapping(content: string): Promise<NodeMappingResult> {
  const result: NodeMappingResult = {
    nodePositions: new Map(),
    lineToNodeId: new Map(),
    mindmapData: null,
  };

  try {
    // YAML解析（非同期インポート）
    const yaml = await import('js-yaml');
    const data = yaml.load(content) as MindmapData;
    result.mindmapData = data;

    // 行ごとにコンテンツを分割
    const lines = content.split('\n');
    
    // YAMLのノードマッピング（簡易実装）
    mapYamlNode(data.root, lines, 'root', result);

    return result;
  } catch (error) {
    console.error('YAML ノードマッピング作成エラー:', error);
    return result;
  }
}

/**
 * JSONノードの位置を再帰的にマッピング
 */
function mapNode(
  node: MindmapNode,
  lines: string[],
  path: string,
  result: NodeMappingResult,
  findNodeLines: (node: MindmapNode, lines: string[]) => number[],
  childPathBuilder: (parentPath: string, index: number) => string,
  level: number = 0
): void {
  if (!node.id) return;

  const nodeLines = findNodeLines(node, lines);
  if (nodeLines.length > 0) {
    const startLine = Math.min(...nodeLines) + 1; // 1-based
    const endLine = Math.max(...nodeLines) + 1; // 1-based

    const position: NodePosition = {
      nodeId: node.id,
      startLine,
      startColumn: 1,
      endLine,
      endColumn: lines[endLine - 1]?.length || 1,
      jsonPath: path,
    };
    result.nodePositions.set(node.id, position);

    for (let line = startLine; line <= endLine; line++) {
      result.lineToNodeId.set(line, node.id);
    }
  }

  if (node.children) {
    node.children.forEach((child, index) => {
      const childPath = childPathBuilder(path, index);
      mapNode(child, lines, childPath, result, findNodeLines, childPathBuilder, level + 1);
    });
  }
}

function mapJsonNode(
  node: MindmapNode,
  lines: string[],
  jsonPath: string,
  result: NodeMappingResult,
  level: number = 0
): void {
  return mapNode(
    node,
    lines,
    jsonPath,
    result,
    findJsonNodeLines,
    (parent, index) => `${parent}.children[${index}]`,
    level,
  );
}

/**
 * YAMLノードの位置を再帰的にマッピング
 */
function mapYamlNode(
  node: MindmapNode,
  lines: string[],
  yamlPath: string,
  result: NodeMappingResult,
  level: number = 0
): void {
  return mapNode(
    node,
    lines,
    yamlPath,
    result,
    findYamlNodeLines,
    (parent, index) => `${parent}.children[${index}]`,
    level,
  );
}

/**
 * JSONノードに関連する行番号を検索
 */
function findJsonNodeLines(node: MindmapNode, lines: string[]): number[] {
  const foundLines: number[] = [];
  
  // ノードIDを含む行を検索
  lines.forEach((line, index) => {
    // idフィールドを含む行
    if (line.includes(`"id": "${node.id}"`) || line.includes(`"id":"${node.id}"`)) {
      foundLines.push(index);
    }
    // titleフィールドを含む行（同じオブジェクト内）
    if (line.includes(`"title": "${node.title}"`) || line.includes(`"title":"${node.title}"`)) {
      foundLines.push(index);
    }
  });

  return foundLines;
}

/**
 * YAMLノードに関連する行番号を検索
 */
function findYamlNodeLines(node: MindmapNode, lines: string[]): number[] {
  const foundLines: number[] = [];
  
  // ノードIDを含む行を検索
  lines.forEach((line, index) => {
    // idフィールドを含む行
    if (line.includes(`id: ${node.id}`) || line.includes(`id: "${node.id}"`)) {
      foundLines.push(index);
    }
    // titleフィールドを含む行（同じオブジェクト内）
    if (line.includes(`title: ${node.title}`) || line.includes(`title: "${node.title}"`)) {
      foundLines.push(index);
    }
  });

  return foundLines;
}

/**
 * カーソル位置に対応するノードIDを取得
 */
export function getNodeIdAtCursor(
  cursor: EditorCursorPosition,
  nodeMapping: NodeMappingResult
): string | null {
  // 行番号からノードIDを直接取得
  return nodeMapping.lineToNodeId.get(cursor.line) || null;
}

/**
 * ノードIDに対応するエディタ位置を取得
 */
export function getEditorPositionForNode(
  nodeId: string,
  nodeMapping: NodeMappingResult
): NodePosition | null {
  return nodeMapping.nodePositions.get(nodeId) || null;
}

/**
 * 指定範囲内の全ノードIDを取得
 */
export function getNodesInRange(
  startLine: number,
  endLine: number,
  nodeMapping: NodeMappingResult
): string[] {
  const nodeIds: string[] = [];
  
  for (let line = startLine; line <= endLine; line++) {
    const nodeId = nodeMapping.lineToNodeId.get(line);
    if (nodeId && !nodeIds.includes(nodeId)) {
      nodeIds.push(nodeId);
    }
  }
  
  return nodeIds;
}

/**
 * ノードの階層レベルを取得
 */
export function getNodeLevel(nodeId: string, mindmapData: MindmapData | null): number {
  if (!mindmapData) return 0;
  
  function findLevel(node: MindmapNode, targetId: string, currentLevel: number): number {
    if (node.id === targetId) {
      return currentLevel;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const level = findLevel(child, targetId, currentLevel + 1);
        if (level !== -1) return level;
      }
    }
    
    return -1;
  }
  
  return findLevel(mindmapData.root, nodeId, 0);
}
