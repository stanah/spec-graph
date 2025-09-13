import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { MindmapData, MindmapNode } from '../../types';

/**
 * 依存関係グラフビュー（最小実装）
 * - 将来的に Cytoscape.js を統合
 */
export const DependencyGraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parsed = useAppStore((s) => s.parse.parsedData);
  const [ready, setReady] = useState(false);
  const cyRef = useRef<any>(null);

  // 最小統合: Cytoscapeを遅延ロードして階層を仮表示
  useEffect(() => {
    let canceled = false;
    setReady(true);
    const mount = async () => {
      if (!containerRef.current || !parsed) return;
      try {
        const mod = await import('cytoscape').catch(() => null);
        if (!mod || canceled) return;
        const cytoscape: any = (mod as any).default ?? mod;
        const elements = buildElementsFromMindmap(parsed);
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            { selector: 'node', style: { 'label': 'data(label)', 'font-size': 10, 'background-color': '#5B8FF9', 'color': '#fff' } },
            { selector: 'edge', style: { 'width': 1, 'line-color': '#A0A0A0', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#A0A0A0', 'curve-style': 'bezier' } },
          ],
          layout: { name: 'cose', animate: false },
          wheelSensitivity: 0.2,
        });
      } catch (e) {
        // ライブラリ未導入でも壊れないようにフォールバック
        console.warn('[DependencyGraphView] Cytoscape unavailable, showing placeholder.', e);
      }
    };
    mount();
    return () => {
      canceled = true;
      try {
        cyRef.current?.destroy?.();
      } catch {}
      cyRef.current = null;
    };
  }, [parsed]);

  function buildElementsFromMindmap(data: MindmapData): any[] {
    const nodes: any[] = [];
    const edges: any[] = [];
    const visit = (n: MindmapNode, parent?: MindmapNode) => {
      nodes.push({ data: { id: n.id, label: n.title ?? n.id } });
      if (parent) {
        edges.push({ data: { id: `${parent.id}->${n.id}`, source: parent.id, target: n.id } });
      }
      if (Array.isArray(n.children)) {
        for (const c of n.children) visit(c, n);
      }
    };
    if (data.root) visit(data.root);
    return [...nodes, ...edges];
  }

  return (
    <div
      data-testid="dependency-graph-view"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 320 }}
        aria-label="dependency-graph-canvas"
      />
      {!parsed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vscode-descriptionForeground)' }}>
          <span>ドキュメントを開くと依存関係グラフを表示します</span>
        </div>
      )}
      {ready && parsed && (
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 12, opacity: 0.7 }}>
          依存関係ビュー（ベータ）
        </div>
      )}
    </div>
  );
};
