/**
 * VSCode拡張用ツールバーUI
 * ズーム、レイアウト切り替え、ノード操作ボタンなど
 */

import React from 'react';
import { 
  MdExpandMore, 
  MdExpandLess, 
  MdCenterFocusStrong, 
  MdZoomIn, 
  MdZoomOut, 
  MdFullscreen,
  MdInfo,
  MdAdd,
  MdDelete,
  MdKeyboardArrowRight,
  MdKeyboardArrowDown
} from 'react-icons/md';
import type { MindmapData } from '../../types';
import type { MindmapCore } from '../../core';
import './Toolbar.css';

interface ToolbarProps {
  selectedNodeId: string | null;
  data: MindmapData | null;
  rendererRef: React.RefObject<MindmapCore | null>;
  onAddChild: (nodeId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onTogglePanel: () => void;
  isPanelVisible: boolean;
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedNodeId,
  data,
  rendererRef,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onTogglePanel,
  isPanelVisible,
  zoomLevel = 100,
  onZoomChange
}) => {

  // ズームイン
  const handleZoomIn = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomIn();
      const newLevel = Math.min(zoomLevel + 25, 500);
      onZoomChange?.(newLevel);
    }
  };

  // ズームアウト
  const handleZoomOut = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomOut();
      const newLevel = Math.max(zoomLevel - 25, 25);
      onZoomChange?.(newLevel);
    }
  };

  // ズームリセット
  const handleZoomReset = () => {
    if (rendererRef.current) {
      rendererRef.current.resetView();
      onZoomChange?.(100);
    }
  };

  // 全体表示
  const handleFitToView = () => {
    if (rendererRef.current) {
      rendererRef.current.fitToView();
      onZoomChange?.(100);
    }
  };

  // 選択ノードにフォーカス
  const handleFocusSelected = () => {
    if (rendererRef.current && selectedNodeId) {
      rendererRef.current.focusNode(selectedNodeId);
    }
  };

  // 全ノード展開
  const handleExpandAll = () => {
    if (rendererRef.current) {
      rendererRef.current.expandAll();
    }
  };

  // 全ノード折りたたみ
  const handleCollapseAll = () => {
    if (rendererRef.current) {
      rendererRef.current.collapseAll();
    }
  };

  return (
    <div className="toolbar">
      {/* 左側: ノード操作 */}
      <div className="toolbar-section toolbar-left">
        {/* ノード操作ボタン */}
        <button
          className="toolbar-button"
          onClick={() => selectedNodeId && onAddChild(selectedNodeId)}
          disabled={!selectedNodeId}
          title="子ノードを追加 - 選択中のノードから右方向に新しいノードを作成します"
          aria-label="子ノードを追加"
        >
          <MdKeyboardArrowRight size={12} />
          <MdAdd size={12} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={() => selectedNodeId && onAddSibling(selectedNodeId)}
          disabled={!selectedNodeId || !data?.root}
          title="兄弟ノードを追加 - 選択中のノードと同じ階層の下方向に新しいノードを作成します"
          aria-label="兄弟ノードを追加"
        >
          <MdKeyboardArrowDown size={12} />
          <MdAdd size={12} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={() => selectedNodeId && onDeleteNode(selectedNodeId)}
          disabled={!selectedNodeId}
          title="ノードを削除"
          aria-label="ノードを削除"
        >
          <MdDelete size={16} />
        </button>
        
        <div className="toolbar-separator" />
        
        {/* レイアウト操作 */}
        <button 
          className="toolbar-button"
          onClick={handleExpandAll}
          title="全て展開 (Ctrl+E)"
          aria-label="全ノード展開"
        >
          <MdExpandMore size={16} />
        </button>
        
        <button 
          className="toolbar-button"
          onClick={handleCollapseAll}
          title="全て折りたたみ (Ctrl+Shift+E)"
          aria-label="全ノード折りたたみ"
        >
          <MdExpandLess size={16} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={handleFocusSelected}
          disabled={!selectedNodeId}
          title="選択ノードにフォーカス (F)"
          aria-label="選択ノードにフォーカス"
        >
          <MdCenterFocusStrong size={16} />
        </button>
      </div>

      {/* 中央: ズーム操作 */}
      <div className="toolbar-section toolbar-center">
        <button
          className="toolbar-button"
          onClick={handleZoomOut}
          title="ズームアウト (Ctrl+-)"
          aria-label="ズームアウト"
        >
          <MdZoomOut size={16} />
        </button>
        
        <button
          className="toolbar-button zoom-level"
          onClick={handleZoomReset}
          title="ズームリセット (Ctrl+0)"
          aria-label="ズームリセット"
        >
          {zoomLevel}%
        </button>
        
        <button
          className="toolbar-button"
          onClick={handleZoomIn}
          title="ズームイン (Ctrl++)"
          aria-label="ズームイン"
        >
          <MdZoomIn size={16} />
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          className="toolbar-button"
          onClick={handleFitToView}
          title="全体表示 (Ctrl+Shift+0)"
          aria-label="全体表示"
        >
          <MdFullscreen size={16} />
        </button>
      </div>

      {/* 右側: 表示切り替え */}
      <div className="toolbar-section toolbar-right">
        <button
          className={`toolbar-button ${isPanelVisible ? 'active' : ''}`}
          onClick={onTogglePanel}
          title="詳細パネル切り替え (Ctrl+I)"
          aria-label="詳細パネル切り替え"
        >
          <MdInfo size={16} />
        </button>
        
        <div className="toolbar-separator" />
        {/** カラーモード切り替えはグローバルバー(ViewSwitcher)に統合済みのため削除 */}
      </div>
    </div>
  );
};
