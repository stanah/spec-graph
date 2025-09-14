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
  const [layout, setLayout] = useState<'cose' | 'grid' | 'circle' | 'concentric' | 'breadthfirst' | 'dagre' | 'cola' | 'fcose'>('cose');
  const [zoom, setZoom] = useState(1);

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

        // プラグインは存在すればuseで登録（無ければ無視）
        try {
          const dagre = await import('cytoscape-dagre').catch(() => null);
          if (dagre && (dagre as any).default) cytoscape.use((dagre as any).default);
        } catch {}
        try {
          const cola = await import('cytoscape-cola').catch(() => null);
          if (cola && (cola as any).default) cytoscape.use((cola as any).default);
        } catch {}
        try {
          const fcose = await import('cytoscape-fcose').catch(() => null);
          if (fcose && (fcose as any).default) cytoscape.use((fcose as any).default);
        } catch {}

        const elements = buildElementsFromMindmap(parsed);
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            { selector: 'node', style: { 'label': 'data(label)', 'font-size': 10, 'background-color': '#5B8FF9', 'color': '#fff' } },
            { selector: 'edge', style: { 'width': 1, 'line-color': '#A0A0A0', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#A0A0A0', 'curve-style': 'bezier' } },
          ],
          layout: { name: layout, animate: false },
          wheelSensitivity: 0.2,
        });
        try {
          cyRef.current.zoom(zoom);
        } catch {}
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
  }, [parsed, layout]);

  // ズームの反映（Cytoscapeが無い場合はCSS transformで代替）
  useEffect(() => {
    if (cyRef.current) {
      try { cyRef.current.zoom(zoom); } catch {}
    } else if (containerRef.current) {
      const el = containerRef.current;
      el.style.transformOrigin = '0 0';
      el.style.transform = `scale(${zoom})`;
    }
  }, [zoom]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)));
  const handleZoomReset = () => setZoom(1);
  const handleFit = () => {
    if (cyRef.current) {
      try { cyRef.current.fit(); } catch {}
    } else {
      setZoom(1);
    }
  };

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
      {/* ツールバー: レイアウト選択 */}
      <div
        data-testid="layout-toolbar"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: 6, padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <label htmlFor="layout-select" style={{ fontSize: 12, opacity: 0.8 }}>レイアウト</label>
        <select
          id="layout-select"
          data-testid="layout-select"
          value={layout}
          onChange={(e) => setLayout(e.target.value as any)}
          style={{ fontSize: 12, background: 'var(--vscode-input-background)', color: 'var(--vscode-foreground)', border: '1px solid var(--vscode-input-border)', borderRadius: 4, padding: '2px 6px' }}
        >
          <option value="cose">cose</option>
          <option value="grid">grid</option>
          <option value="circle">circle</option>
          <option value="concentric">concentric</option>
          <option value="breadthfirst">breadthfirst</option>
          <option value="dagre">dagre</option>
          <option value="cola">cola</option>
          <option value="fcose">fcose</option>
        </select>
      </div>

      {/* ツールバー: ズーム操作 */}
      <div
        style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 2, background: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: 6, padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <button data-testid="zoom-out" onClick={handleZoomOut} aria-label="zoom-out" style={{ fontSize: 14 }}>－</button>
        <span data-testid="zoom-indicator" style={{ fontSize: 12 }}>{`Zoom: ${zoom.toFixed(2)}`}</span>
        <button data-testid="zoom-in" onClick={handleZoomIn} aria-label="zoom-in" style={{ fontSize: 14 }}>＋</button>
        <button data-testid="zoom-reset" onClick={handleZoomReset} aria-label="zoom-reset" style={{ fontSize: 12 }}>Reset</button>
        <button data-testid="zoom-fit" onClick={handleFit} aria-label="zoom-fit" style={{ fontSize: 12 }}>Fit</button>
      </div>
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

      {/* ミニマップ（最小プレースホルダー、Cytoscapeがあれば将来プラグイン統合） */}
      <div
        data-testid="mini-map"
        style={{ position: 'absolute', bottom: 12, left: 12, width: 140, height: 90, border: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', opacity: 0.8, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
      >
        ミニマップ
      </div>
    </div>
  );
};
