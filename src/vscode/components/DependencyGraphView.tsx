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
  const selectedNodeId = useAppStore((s) => s.ui.selectedNodeId);
  const [ready, setReady] = useState(false);
  const cyRef = useRef<any>(null);
  const [layout, setLayout] = useState<'cose' | 'grid' | 'circle' | 'concentric' | 'breadthfirst' | 'dagre' | 'cola' | 'fcose'>('cose');
  const [zoom, setZoom] = useState(1);
  const [stats, setStats] = useState<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 });
  const [exportInfo, setExportInfo] = useState<{ type: 'png' | 'svg' | null; bytes: number } | null>(null);
  const [perfMode, setPerfMode] = useState(false);

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
        } catch {
          // プラグインが利用できない場合は無視
        }
        try {
          const cola = await import('cytoscape-cola').catch(() => null);
          if (cola && (cola as any).default) cytoscape.use((cola as any).default);
        } catch {
          // プラグインが利用できない場合は無視
        }
        try {
          const fcose = await import('cytoscape-fcose').catch(() => null);
          if (fcose && (fcose as any).default) cytoscape.use((fcose as any).default);
        } catch {
          // プラグインが利用できない場合は無視
        }

        const { elements, counts } = buildElementsFromMindmap(parsed);
        setStats(counts);
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            { selector: 'node', style: { 'label': 'data(label)', 'font-size': 10, 'background-color': '#5B8FF9', 'color': '#fff' } },
            { selector: 'edge', style: { 'width': 1, 'line-color': '#A0A0A0', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#A0A0A0', 'curve-style': 'bezier' } },
            { selector: 'node:selected', style: { 'background-color': '#FA8C16' } },
            { selector: '.highlight', style: { 'background-color': '#FA8C16' } },
          ],
          layout: { name: layout, animate: false },
          wheelSensitivity: 0.2,
          pixelRatio: perfMode ? 1 : undefined,
          textureOnViewport: perfMode ? true : undefined,
          motionBlur: perfMode ? true : undefined,
          hideEdgesOnViewport: perfMode ? true : undefined,
        });
        try {
          cyRef.current.zoom(zoom);
        } catch {
          // プラグインが利用できない場合は無視
        }
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
      } catch {
        // Cytoscape操作エラーは無視
      }
      cyRef.current = null;
    };
  }, [parsed, layout, perfMode]);

  // ズームの反映（Cytoscapeが無い場合はCSS transformで代替）
  useEffect(() => {
    if (cyRef.current) {
      try { cyRef.current.zoom(zoom); } catch {
        // Cytoscape zoom操作エラーは無視
      }
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
      try { cyRef.current.fit(); } catch {
        // Cytoscape fit操作エラーは無視
      }
    } else {
      setZoom(1);
    }
  };

  // エクスポート処理（Cytoscapeが無い場合はフォールバックSVG）
  const exportSVG = async () => {
    let dataUrl = '';
    if (cyRef.current && typeof cyRef.current.svg === 'function') {
      try {
        const svgTxt = cyRef.current.svg({ scale: 1, full: true });
        dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgTxt);
      } catch {
        // Cytoscape操作エラーは無視
      }
    }
    if (!dataUrl) {
      const svgTxt = buildFallbackSVG(parsed);
      dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgTxt);
    }
    setExportInfo({ type: 'svg', bytes: dataUrl.length });
    triggerDownload(dataUrl, 'dependency-graph.svg');
  };

  const exportPNG = async () => {
    let dataUrl = '';
    if (cyRef.current && typeof cyRef.current.png === 'function') {
      try {
        dataUrl = cyRef.current.png({ full: true, scale: 2, bg: '#fff' });
      } catch {
        // Cytoscape操作エラーは無視
      }
    }
    if (!dataUrl) {
      // フォールバック: SVGを生成してそのままデータURLを返す（PNG等価ではないが最低限）
      const svgTxt = buildFallbackSVG(parsed);
      dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgTxt);
    }
    setExportInfo({ type: 'png', bytes: dataUrl.length });
    triggerDownload(dataUrl, 'dependency-graph.png');
  };

  function triggerDownload(href: string, filename: string) {
    try {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ダウンロード処理エラーは無視
    }
  }

  function buildFallbackSVG(data: MindmapData | null): string {
    if (!data) return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>';
    const { elements } = buildElementsFromMindmap(data);
    const nodes = elements.filter(e => e.data && e.data.id && e.data.label);
    const edges = elements.filter(e => e.data && e.data.source && e.data.target);
    const W = 800, H = 600, margin = 40;
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const cellW = (W - margin * 2) / cols;
    const cellH = (H - margin * 2) / cols;
    const pos: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      pos[n.data.id] = { x: margin + c * cellW + cellW / 2, y: margin + r * cellH + cellH / 2 };
    });
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const edgeSvg = edges.map((e: any) => {
      const s = pos[e.data.source];
      const t = pos[e.data.target];
      if (!s || !t) return '';
      return `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="#A0A0A0" stroke-width="1" marker-end="url(#arrow)"/>`;
    }).join('');
    const nodeSvg = nodes.map((n: any) => {
      const p = pos[n.data.id];
      const r = 12;
      return `<g><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#5B8FF9" /><text x="${p.x + r + 4}" y="${p.y + 4}" font-size="10" fill="#333">${esc(n.data.label)}</text></g>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#A0A0A0"/></marker></defs>${edgeSvg}${nodeSvg}</svg>`;
  }

  function buildElementsFromMindmap(data: MindmapData): { elements: any[]; counts: { nodes: number; edges: number } } {
    const nodeSet = new Map<string, string>();
    const edges: Array<{ id: string; source: string; target: string }> = [];

    const collect = (n: MindmapNode) => {
      nodeSet.set(n.id, n.title ?? n.id);
      const cf: any = n.customFields || {};
      if (Array.isArray(cf.dependsOn)) {
        for (const dep of cf.dependsOn as string[]) {
          if (typeof dep === 'string' && dep.trim()) {
            nodeSet.set(dep, dep);
            edges.push({ id: `${dep}->${n.id}`, source: dep, target: n.id });
          }
        }
      }
      if (Array.isArray(n.children)) {
        for (const c of n.children) collect(c);
      }
    };
    if (data.root) collect(data.root);
    const nodes = [...nodeSet.entries()].map(([id, label]) => ({ data: { id, label } }));
    const edgeElems = edges.map(e => ({ data: e }));
    return { elements: [...nodes, ...edgeElems], counts: { nodes: nodes.length, edges: edgeElems.length } };
  }

  // 選択中ノードのハイライト（簡易）
  useEffect(() => {
    if (!selectedNodeId) return;
    if (cyRef.current) {
      try {
        cyRef.current.nodes().removeClass('highlight');
        const node = cyRef.current.getElementById(selectedNodeId);
        if (node) node.addClass('highlight');
      } catch {
        // Cytoscape操作エラーは無視
      }
    }
  }, [selectedNodeId]);

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
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 12, opacity: 0.85, display: 'flex', gap: 12 }}>
          <div>依存関係ビュー（ベータ）</div>
          <div data-testid="graph-stats">nodes: {stats.nodes} / edges: {stats.edges}</div>
          {selectedNodeId && (
            <div data-testid="selected-node">選択中: {selectedNodeId}</div>
          )}
        </div>
      )}

      {/* エクスポートツールバー */}
      <div data-testid="export-toolbar" style={{ position: 'absolute', top: 48, right: 8, zIndex: 2, background: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: 6, padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button data-testid="export-png" onClick={exportPNG} style={{ fontSize: 12 }}>PNG</button>
        <button data-testid="export-svg" onClick={exportSVG} style={{ fontSize: 12 }}>SVG</button>
        <div data-testid="export-info" style={{ fontSize: 11, opacity: 0.8 }}>
          {exportInfo ? `type: ${exportInfo.type} bytes: ${exportInfo.bytes}` : 'not exported'}
        </div>
      </div>

      {/* パフォーマンスモード切替 */}
      <div style={{ position: 'absolute', top: 80, right: 8, zIndex: 2, background: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)', borderRadius: 6, padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12 }}>
          <input data-testid="perf-toggle" type="checkbox" checked={perfMode} onChange={(e) => setPerfMode(e.target.checked)} /> 高パフォーマンス
        </label>
        <span data-testid="perf-indicator" style={{ fontSize: 12, opacity: 0.8 }}>perf: {perfMode ? 'on' : 'off'}</span>
      </div>

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
