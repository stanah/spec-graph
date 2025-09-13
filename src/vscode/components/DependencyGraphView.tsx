import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../stores/appStore';

/**
 * 依存関係グラフビュー（最小実装）
 * - 将来的に Cytoscape.js を統合
 */
export const DependencyGraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parsed = useAppStore((s) => s.parse.parsedData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

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

