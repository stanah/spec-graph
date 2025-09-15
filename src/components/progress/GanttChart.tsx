import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ProgressSystem } from '../../services/progressSystem';
import type { MindmapNode } from '../../schemas/mindmap.zod';

/**
 * ガントチャート用のタスクデータ
 */
export interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies: string[];
  level: number;
  isExpanded?: boolean;
  children?: GanttTask[];
  parentId?: string;
}

/**
 * ガントチャートのプロパティ
 */
export interface GanttChartProps {
  /** マインドマップノード配列 */
  nodes: MindmapNode[];
  /** 進捗システムインスタンス */
  progressSystem: ProgressSystem;
  /** 表示開始日 */
  startDate?: Date;
  /** 表示終了日 */
  endDate?: Date;
  /** タイムスケール（day | week | month） */
  timeScale?: 'day' | 'week' | 'month';
  /** 表示モード（compact | full） */
  displayMode?: 'compact' | 'full';
  /** カスタムクラス名 */
  className?: string;
  /** タスククリック時のコールバック */
  onTaskClick?: (taskId: string) => void;
  /** 日付変更時のコールバック */
  onDateChange?: (taskId: string, startDate: Date, endDate: Date) => void;
}

/**
 * ガントチャートのタイムライン生成
 */
const generateTimeline = (
  startDate: Date,
  endDate: Date,
  timeScale: 'day' | 'week' | 'month'
): Date[] => {
  const timeline: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    timeline.push(new Date(current));
    
    switch (timeScale) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  return timeline;
};

/**
 * マインドマップノードをガントタスクに変換
 */
const convertNodesToGanttTasks = (
  nodes: MindmapNode[],
  progressSystem: ProgressSystem,
  parentId?: string,
  level: number = 0
): GanttTask[] => {
  return nodes.map(node => {
    // ノードから日付情報を取得（カスタムフィールドまたはメタデータから）
    const getDateFromNode = (field: string): Date => {
      const dateStr = node.customFields?.[field] || 
                     node.metadata?.[field] || 
                     node[field as keyof MindmapNode];
      
      if (typeof dateStr === 'string' && dateStr) {
        return new Date(dateStr);
      }
      
      // デフォルト値を生成
      const now = new Date();
      if (field === 'startDate') {
        return now;
      } else {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7); // デフォルトで1週間後
        return endDate;
      }
    };

    const startDate = getDateFromNode('startDate');
    const endDate = getDateFromNode('endDate');
    const progress = progressSystem.getProgress(node.id);
    
    // 依存関係を取得（カスタムフィールドまたはメタデータから）
    const dependencies: string[] = 
      node.customFields?.dependencies || 
      node.metadata?.dependencies || 
      [];

    const ganttTask: GanttTask = {
      id: node.id,
      title: node.title,
      startDate,
      endDate,
      progress,
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      level,
      parentId,
      isExpanded: true
    };

    // 子ノードを再帰的に処理
    if (node.children && node.children.length > 0) {
      ganttTask.children = convertNodesToGanttTasks(
        node.children,
        progressSystem,
        node.id,
        level + 1
      );
    }

    return ganttTask;
  });
};

/**
 * タスクバーコンポーネント
 */
interface TaskBarProps {
  task: GanttTask;
  startDate: Date;
  endDate: Date;
  timelineWidth: number;
  onClick?: (taskId: string) => void;
}

const TaskBar: React.FC<TaskBarProps> = ({
  task,
  startDate,
  endDate,
  timelineWidth,
  onClick
}) => {
  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const taskStartDays = Math.max(0, (task.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const taskDurationDays = Math.max(1, (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const leftPosition = (taskStartDays / totalDays) * 100;
  const width = (taskDurationDays / totalDays) * 100;
  
  const getTaskColor = (progress: number): string => {
    if (progress === 100) return '#4CAF50'; // 緑：完了
    if (progress > 0) return '#FF9800';     // オレンジ：進行中
    return '#9E9E9E';                       // グレー：未着手
  };

  return (
    <div className="gantt-chart__task-row">
      <div 
        className="gantt-chart__task-info"
        style={{ paddingLeft: `${task.level * 20}px` }}
      >
        <span className="gantt-chart__task-title" onClick={() => onClick?.(task.id)}>
          {task.title}
        </span>
        <span className="gantt-chart__task-progress">
          {task.progress}%
        </span>
      </div>
      <div className="gantt-chart__timeline-cell">
        <div
          className="gantt-chart__task-bar"
          style={{
            left: `${Math.max(0, Math.min(100, leftPosition))}%`,
            width: `${Math.max(0, Math.min(100, width))}%`,
            backgroundColor: getTaskColor(task.progress)
          }}
          title={`${task.title} (${task.progress}%) - ${task.startDate.toLocaleDateString()} ~ ${task.endDate.toLocaleDateString()}`}
          onClick={() => onClick?.(task.id)}
        >
          <div 
            className="gantt-chart__task-bar-progress"
            style={{ 
              width: `${task.progress}%`,
              backgroundColor: `${getTaskColor(task.progress)}dd`
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * ガントチャートメインコンポーネント
 */
export const GanttChart: React.FC<GanttChartProps> = ({
  nodes,
  progressSystem,
  startDate: propStartDate,
  endDate: propEndDate,
  timeScale = 'day',
  displayMode = 'full',
  className = '',
  onTaskClick,
  onDateChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // ガントタスクを生成
  const ganttTasks = useMemo(() => {
    return convertNodesToGanttTasks(nodes, progressSystem);
  }, [nodes, progressSystem]);

  // 日付範囲を計算
  const dateRange = useMemo(() => {
    if (propStartDate && propEndDate) {
      return { startDate: propStartDate, endDate: propEndDate };
    }

    // ノードから日付範囲を自動計算
    let minDate = new Date();
    let maxDate = new Date();
    
    const collectDates = (tasks: GanttTask[]) => {
      tasks.forEach(task => {
        if (task.startDate < minDate) minDate = task.startDate;
        if (task.endDate > maxDate) maxDate = task.endDate;
        if (task.children) collectDates(task.children);
      });
    };

    if (ganttTasks.length > 0) {
      minDate = ganttTasks[0].startDate;
      maxDate = ganttTasks[0].endDate;
      collectDates(ganttTasks);
      
      // 範囲を少し拡大
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 7);
    }

    return { startDate: minDate, endDate: maxDate };
  }, [ganttTasks, propStartDate, propEndDate]);

  // タイムラインを生成
  const timeline = useMemo(() => {
    return generateTimeline(dateRange.startDate, dateRange.endDate, timeScale);
  }, [dateRange.startDate, dateRange.endDate, timeScale]);

  // フラット化されたタスクリスト
  const flatTasks = useMemo(() => {
    const flatten = (tasks: GanttTask[]): GanttTask[] => {
      const result: GanttTask[] = [];
      
      tasks.forEach(task => {
        result.push(task);
        if (task.children && task.isExpanded) {
          result.push(...flatten(task.children));
        }
      });
      
      return result;
    };
    
    return flatten(ganttTasks);
  }, [ganttTasks]);

  // スクロール処理
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
  };

  // 日付フォーマット
  const formatTimelineDate = (date: Date): string => {
    switch (timeScale) {
      case 'day':
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'week':
        return `${date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}週`;
      case 'month':
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
      default:
        return date.toLocaleDateString();
    }
  };

  if (displayMode === 'compact') {
    return (
      <div className={`gantt-chart gantt-chart--compact ${className}`}>
        <div className="gantt-chart__header">
          <h3 className="gantt-chart__title">スケジュール概要</h3>
        </div>
        <div className="gantt-chart__compact-summary">
          <div className="gantt-chart__compact-stat">
            <span>総タスク数</span>
            <span>{flatTasks.length}</span>
          </div>
          <div className="gantt-chart__compact-stat">
            <span>期間</span>
            <span>
              {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
            </span>
          </div>
          <div className="gantt-chart__compact-stat">
            <span>完了率</span>
            <span>
              {flatTasks.length > 0 
                ? Math.round(flatTasks.reduce((sum, task) => sum + task.progress, 0) / flatTasks.length)
                : 0
              }%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`gantt-chart gantt-chart--full ${className}`} ref={containerRef}>
      <div className="gantt-chart__header">
        <h3 className="gantt-chart__title">ガントチャート</h3>
        <div className="gantt-chart__controls">
          <select 
            value={timeScale} 
            onChange={(e) => {
              // timeScale変更の処理（プロパティなので実際の変更は親コンポーネントで行う）
            }}
            className="gantt-chart__time-scale-selector"
          >
            <option value="day">日単位</option>
            <option value="week">週単位</option>
            <option value="month">月単位</option>
          </select>
          <button 
            className="gantt-chart__today-button"
            onClick={() => {
              // 今日の位置にスクロール
              const today = new Date();
              const todayPosition = ((today.getTime() - dateRange.startDate.getTime()) / 
                                   (dateRange.endDate.getTime() - dateRange.startDate.getTime())) * 
                                   (timeline.length * 100);
              if (containerRef.current) {
                const timelineContainer = containerRef.current.querySelector('.gantt-chart__timeline');
                if (timelineContainer) {
                  timelineContainer.scrollLeft = Math.max(0, todayPosition - 200);
                }
              }
            }}
          >
            今日
          </button>
        </div>
      </div>

      <div className="gantt-chart__content">
        <div className="gantt-chart__timeline-header">
          <div className="gantt-chart__task-column-header">タスク</div>
          <div className="gantt-chart__timeline-dates">
            {timeline.map((date, index) => (
              <div key={index} className="gantt-chart__timeline-date">
                {formatTimelineDate(date)}
              </div>
            ))}
          </div>
        </div>

        <div 
          className="gantt-chart__timeline" 
          onScroll={handleScroll}
        >
          <div className="gantt-chart__tasks">
            {flatTasks.map(task => (
              <TaskBar
                key={task.id}
                task={task}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                timelineWidth={timeline.length * 100}
                onClick={onTaskClick}
              />
            ))}
          </div>
          
          {/* 今日の縦線 */}
          <div 
            className="gantt-chart__today-line"
            style={{
              left: `${((new Date().getTime() - dateRange.startDate.getTime()) / 
                       (dateRange.endDate.getTime() - dateRange.startDate.getTime())) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="gantt-chart__footer">
        <div className="gantt-chart__legend">
          <div className="gantt-chart__legend-item">
            <div className="gantt-chart__legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
            完了
          </div>
          <div className="gantt-chart__legend-item">
            <div className="gantt-chart__legend-color" style={{ backgroundColor: '#FF9800' }}></div>
            進行中
          </div>
          <div className="gantt-chart__legend-item">
            <div className="gantt-chart__legend-color" style={{ backgroundColor: '#9E9E9E' }}></div>
            未着手
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;