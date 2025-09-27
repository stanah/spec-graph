import React, { useMemo } from 'react';
import { ProgressSystem, type ProgressSummary } from '../../services/progressSystem';
import type { MindmapNode } from '../../schemas/mindmap.zod';

/**
 * 進捗ダッシュボードのプロパティ
 */
export interface ProgressDashboardProps {
  /** マインドマップノード配列 */
  nodes: MindmapNode[];
  /** 進捗システムインスタンス */
  progressSystem: ProgressSystem;
  /** 表示モード（compact | full） */
  displayMode?: 'compact' | 'full';
  /** カスタムクラス名 */
  className?: string;
  /** ノードクリック時のコールバック */
  onNodeClick?: (nodeId: string) => void;
}

/**
 * 進捗統計カードコンポーネント
 */
interface ProgressStatsCardProps {
  title: string;
  value: number;
  total?: number;
  percentage?: number;
  color: string;
  icon: string;
}

const ProgressStatsCard: React.FC<ProgressStatsCardProps> = ({
  title,
  value,
  total,
  percentage,
  color,
  icon
}) => (
  <div className="progress-stats-card">
    <div className="progress-stats-card__header">
      <span className={`progress-stats-card__icon ${icon}`} style={{ color }}></span>
      <h3 className="progress-stats-card__title">{title}</h3>
    </div>
    <div className="progress-stats-card__content">
      <div className="progress-stats-card__value">
        {total !== undefined ? `${value}/${total}` : value}
      </div>
      {percentage !== undefined && (
        <div className="progress-stats-card__percentage">
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
    <div 
      className="progress-stats-card__progress-bar"
      style={{
        '--progress-width': `${percentage || 0}%`,
        '--progress-color': color
      } as React.CSSProperties}
    >
      <div className="progress-stats-card__progress-fill"></div>
    </div>
  </div>
);

/**
 * 進捗分布チャートコンポーネント
 */
interface ProgressDistributionChartProps {
  summary: ProgressSummary;
}

const ProgressDistributionChart: React.FC<ProgressDistributionChartProps> = ({ summary }) => {
  const { completedNodes, inProgressNodes, notStartedNodes, totalNodes } = summary;
  
  const completedPercentage = (completedNodes / totalNodes) * 100;
  const inProgressPercentage = (inProgressNodes / totalNodes) * 100;
  const notStartedPercentage = (notStartedNodes / totalNodes) * 100;

  return (
    <div className="progress-distribution-chart">
      <h3 className="progress-distribution-chart__title">進捗分布</h3>
      <div className="progress-distribution-chart__bar">
        <div 
          className="progress-distribution-chart__segment progress-distribution-chart__segment--completed"
          style={{ width: `${completedPercentage}%` }}
          title={`完了: ${completedNodes}件 (${completedPercentage.toFixed(1)}%)`}
        ></div>
        <div 
          className="progress-distribution-chart__segment progress-distribution-chart__segment--in-progress"
          style={{ width: `${inProgressPercentage}%` }}
          title={`進行中: ${inProgressNodes}件 (${inProgressPercentage.toFixed(1)}%)`}
        ></div>
        <div 
          className="progress-distribution-chart__segment progress-distribution-chart__segment--not-started"
          style={{ width: `${notStartedPercentage}%` }}
          title={`未着手: ${notStartedNodes}件 (${notStartedPercentage.toFixed(1)}%)`}
        ></div>
      </div>
      <div className="progress-distribution-chart__legend">
        <div className="progress-distribution-chart__legend-item">
          <span className="progress-distribution-chart__legend-color progress-distribution-chart__legend-color--completed"></span>
          完了 ({completedNodes})
        </div>
        <div className="progress-distribution-chart__legend-item">
          <span className="progress-distribution-chart__legend-color progress-distribution-chart__legend-color--in-progress"></span>
          進行中 ({inProgressNodes})
        </div>
        <div className="progress-distribution-chart__legend-item">
          <span className="progress-distribution-chart__legend-color progress-distribution-chart__legend-color--not-started"></span>
          未着手 ({notStartedNodes})
        </div>
      </div>
    </div>
  );
};

/**
 * ノード別進捗リストコンポーネント
 */
interface NodeProgressListProps {
  nodes: MindmapNode[];
  progressSystem: ProgressSystem;
  maxItems?: number;
  sortBy?: 'progress' | 'name' | 'updated';
  onNodeClick?: (nodeId: string) => void;
}

const NodeProgressList: React.FC<NodeProgressListProps> = ({
  nodes,
  progressSystem,
  maxItems = 10,
  sortBy = 'progress',
  onNodeClick
}) => {
  const sortedNodes = useMemo(() => {
    const nodeWithProgress = nodes.map(node => ({
      node,
      progress: progressSystem.getProgress(node.id),
      progressInfo: progressSystem.getProgressInfo(node.id)
    }));

    nodeWithProgress.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return b.progress - a.progress;
        case 'name':
          return a.node.title.localeCompare(b.node.title);
        case 'updated': {
          const aTime = a.progressInfo?.updatedAt ? new Date(a.progressInfo.updatedAt).getTime() : 0;
          const bTime = b.progressInfo?.updatedAt ? new Date(b.progressInfo.updatedAt).getTime() : 0;
          return bTime - aTime;
        }
        default:
          return 0;
      }
    });

    return nodeWithProgress.slice(0, maxItems);
  }, [nodes, progressSystem, maxItems, sortBy]);

  return (
    <div className="node-progress-list">
      <h3 className="node-progress-list__title">ノード別進捗</h3>
      <div className="node-progress-list__items">
        {sortedNodes.map(({ node, progress, progressInfo }) => (
          <div 
            key={node.id} 
            className="node-progress-list__item"
            onClick={() => onNodeClick?.(node.id)}
            style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
          >
            <div className="node-progress-list__item-info">
              <div className="node-progress-list__item-title">{node.title}</div>
              <div className="node-progress-list__item-meta">
                {progressInfo?.isManuallySet ? '手動設定' : '自動計算'}
                {progressInfo?.updatedAt && (
                  <span className="node-progress-list__item-time">
                    {new Date(progressInfo.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="node-progress-list__item-progress">
              <div className="node-progress-list__item-progress-text">
                {progress}%
              </div>
              <div 
                className="node-progress-list__item-progress-bar"
                style={{
                  '--progress-width': `${progress}%`
                } as React.CSSProperties}
              >
                <div className="node-progress-list__item-progress-fill"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 進捗ダッシュボードメインコンポーネント
 */
export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  nodes,
  progressSystem,
  displayMode = 'full',
  className = '',
  onNodeClick
}) => {
  const summary = useMemo(() => {
    return progressSystem.getProgressSummary();
  }, [progressSystem]);

  const completionRate = summary.totalNodes > 0 
    ? (summary.completedNodes / summary.totalNodes) * 100 
    : 0;

  if (displayMode === 'compact') {
    return (
      <div className={`progress-dashboard progress-dashboard--compact ${className}`}>
        <div className="progress-dashboard__header">
          <h2 className="progress-dashboard__title">進捗概要</h2>
        </div>
        <div className="progress-dashboard__compact-stats">
          <div className="progress-dashboard__compact-stat">
            <span className="progress-dashboard__compact-stat-label">全体進捗</span>
            <span className="progress-dashboard__compact-stat-value">
              {summary.overallProgress.toFixed(1)}%
            </span>
          </div>
          <div className="progress-dashboard__compact-stat">
            <span className="progress-dashboard__compact-stat-label">完了率</span>
            <span className="progress-dashboard__compact-stat-value">
              {completionRate.toFixed(1)}%
            </span>
          </div>
          <div className="progress-dashboard__compact-stat">
            <span className="progress-dashboard__compact-stat-label">進行中</span>
            <span className="progress-dashboard__compact-stat-value">
              {summary.inProgressNodes}
            </span>
          </div>
        </div>
        <ProgressDistributionChart summary={summary} />
      </div>
    );
  }

  return (
    <div className={`progress-dashboard progress-dashboard--full ${className}`}>
      <div className="progress-dashboard__header">
        <h2 className="progress-dashboard__title">進捗ダッシュボード</h2>
        <div className="progress-dashboard__actions">
          <button 
            className="progress-dashboard__action-button"
            onClick={() => progressSystem.recalculateAllProgress()}
            title="全進捗を再計算"
          >
            🔄 再計算
          </button>
          <button 
            className="progress-dashboard__action-button"
            onClick={() => {
              const data = progressSystem.exportProgressData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'progress-data.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            title="進捗データをエクスポート"
          >
            💾 エクスポート
          </button>
        </div>
      </div>

      <div className="progress-dashboard__stats-grid">
        <ProgressStatsCard
          title="全体進捗"
          value={summary.overallProgress}
          percentage={summary.overallProgress}
          color="#4CAF50"
          icon="📊"
        />
        <ProgressStatsCard
          title="完了タスク"
          value={summary.completedNodes}
          total={summary.totalNodes}
          percentage={completionRate}
          color="#2196F3"
          icon="✅"
        />
        <ProgressStatsCard
          title="進行中タスク"
          value={summary.inProgressNodes}
          total={summary.totalNodes}
          percentage={(summary.inProgressNodes / summary.totalNodes) * 100}
          color="#FF9800"
          icon="⚡"
        />
        <ProgressStatsCard
          title="未着手タスク"
          value={summary.notStartedNodes}
          total={summary.totalNodes}
          percentage={(summary.notStartedNodes / summary.totalNodes) * 100}
          color="#9E9E9E"
          icon="⏳"
        />
      </div>

      <div className="progress-dashboard__content">
        <div className="progress-dashboard__content-left">
          <ProgressDistributionChart summary={summary} />
        </div>
        <div className="progress-dashboard__content-right">
          <NodeProgressList
            nodes={nodes}
            progressSystem={progressSystem}
            maxItems={15}
            sortBy="progress"
            onNodeClick={onNodeClick}
          />
        </div>
      </div>

      <div className="progress-dashboard__footer">
        <div className="progress-dashboard__summary-text">
          総ノード数: {summary.totalNodes}件 |
          平均進捗率: {summary.averageProgress.toFixed(1)}% |
          最終更新: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;