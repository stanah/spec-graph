/**
 * 分析レポート生成・出力機能
 *
 * 収集した統計情報、検出した問題、最適化提案を統合し、
 * 視覚的に理解しやすい分析レポートを生成する機能を提供する
 */

import type { MindmapData } from '../types';
import { MindmapAnalyzer, type MindmapStatistics, type StructureIssue } from './mindmapAnalyzer';
import { StructureOptimizationEngine, type OptimizationAnalysis } from './structureOptimizationEngine';

/**
 * レポート出力形式
 */
export type ReportFormat = 'html' | 'markdown' | 'json';

/**
 * 視覚化データの種類
 */
export type VisualizationType =
  | 'depth_distribution'      // 深度分布グラフ
  | 'node_distribution'       // ノード分布ヒートマップ
  | 'branching_distribution'  // 分岐数分布
  | 'priority_distribution'   // 優先度別分布
  | 'status_distribution'     // ステータス別分布
  | 'issue_severity'          // 問題の重要度分布
  | 'optimization_impact';    // 最適化のインパクト

/**
 * 視覚化データ
 */
export interface VisualizationData {
  type: VisualizationType;
  title: string;
  data: ChartData;
  description?: string;
}

/**
 * チャートデータ
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
}

/**
 * チャートデータセット
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

/**
 * チャートオプション
 */
export interface ChartOptions {
  responsive?: boolean;
  plugins?: {
    title?: {
      display: boolean;
      text: string;
    };
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
  };
  scales?: {
    y?: {
      beginAtZero: boolean;
    };
  };
}

/**
 * レポート設定
 */
export interface ReportConfig {
  /** レポートタイトル */
  title?: string;
  /** 生成日時を含めるか */
  includeTimestamp?: boolean;
  /** 統計セクションを含めるか */
  includeStatistics?: boolean;
  /** 問題セクションを含めるか */
  includeIssues?: boolean;
  /** 最適化提案セクションを含めるか */
  includeOptimizations?: boolean;
  /** 視覚化を含めるか */
  includeVisualizations?: boolean;
  /** 含める視覚化の種類 */
  visualizationTypes?: VisualizationType[];
  /** カスタムCSS（HTML出力時） */
  customCSS?: string;
  /** テンプレートのカスタマイズ設定 */
  template?: ReportTemplate;
}

/**
 * レポートテンプレート
 */
export interface ReportTemplate {
  /** ヘッダーテンプレート */
  header?: string;
  /** フッターテンプレート */
  footer?: string;
  /** セクションのカスタムテンプレート */
  sections?: {
    statistics?: string;
    issues?: string;
    optimizations?: string;
    visualizations?: string;
  };
}

/**
 * 統合分析結果
 */
export interface ComprehensiveAnalysis {
  /** 基本統計情報 */
  statistics: MindmapStatistics;
  /** 検出された問題 */
  issues: StructureIssue[];
  /** 最適化分析結果 */
  optimization: OptimizationAnalysis;
  /** 視覚化データ */
  visualizations: VisualizationData[];
  /** 分析実行時刻 */
  timestamp: string;
  /** 総合スコア */
  overallHealthScore: number;
}

/**
 * 分析レポート生成器
 */
export class AnalysisReportGenerator {
  private static readonly DEFAULT_CONFIG: Required<ReportConfig> = {
    title: 'マインドマップ分析レポート',
    includeTimestamp: true,
    includeStatistics: true,
    includeIssues: true,
    includeOptimizations: true,
    includeVisualizations: true,
    visualizationTypes: [
      'depth_distribution',
      'branching_distribution',
      'priority_distribution',
      'issue_severity',
      'optimization_impact'
    ],
    customCSS: '',
    template: {}
  };

  /**
   * マインドマップの包括的分析を実行
   *
   * @param mindmapData - 分析対象のマインドマップデータ
   * @returns 統合分析結果
   */
  public static analyze(mindmapData: MindmapData): ComprehensiveAnalysis {
    // 基本統計と問題検出
    const structureAnalysis = MindmapAnalyzer.analyzeStructure(mindmapData);

    // 最適化分析
    const optimization = StructureOptimizationEngine.analyzeStructure(mindmapData);

    // 視覚化データ生成
    const visualizations = this.generateVisualizations(structureAnalysis.statistics, structureAnalysis.issues, optimization);

    // 総合健康度スコア計算
    const overallHealthScore = this.calculateOverallHealthScore(structureAnalysis.statistics, structureAnalysis.issues, optimization);

    return {
      statistics: structureAnalysis.statistics,
      issues: structureAnalysis.issues,
      optimization,
      visualizations,
      timestamp: new Date().toISOString(),
      overallHealthScore
    };
  }

  /**
   * レポートを生成して指定形式で出力
   *
   * @param analysis - 分析結果
   * @param format - 出力形式
   * @param config - レポート設定
   * @returns 生成されたレポート
   */
  public static generateReport(
    analysis: ComprehensiveAnalysis,
    format: ReportFormat,
    config: Partial<ReportConfig> = {}
  ): string {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    switch (format) {
      case 'html':
        return this.generateHtmlReport(analysis, mergedConfig);
      case 'markdown':
        return this.generateMarkdownReport(analysis, mergedConfig);
      case 'json':
        return this.generateJsonReport(analysis, mergedConfig);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * 視覚化データを生成
   */
  private static generateVisualizations(
    statistics: MindmapStatistics,
    issues: StructureIssue[],
    optimization: OptimizationAnalysis
  ): VisualizationData[] {
    const visualizations: VisualizationData[] = [];

    // 深度分布グラフ
    visualizations.push(this.createDepthDistributionChart(statistics));

    // 分岐数分布
    visualizations.push(this.createBranchingDistributionChart(statistics));

    // 優先度分布
    if (Object.keys(statistics.distribution.priorities).length > 0) {
      visualizations.push(this.createPriorityDistributionChart(statistics));
    }

    // ステータス分布
    if (Object.keys(statistics.distribution.statuses).length > 0) {
      visualizations.push(this.createStatusDistributionChart(statistics));
    }

    // 問題の重要度分布
    if (issues.length > 0) {
      visualizations.push(this.createIssueSeverityChart(issues));
    }

    // 最適化インパクト
    if (optimization.proposals.length > 0) {
      visualizations.push(this.createOptimizationImpactChart(optimization));
    }

    return visualizations;
  }

  /**
   * 深度分布チャートを作成
   */
  private static createDepthDistributionChart(statistics: MindmapStatistics): VisualizationData {
    const depths = Object.keys(statistics.structure.depthDistribution).map(Number).sort((a, b) => a - b);
    const counts = depths.map(depth => statistics.structure.depthDistribution[depth]);

    return {
      type: 'depth_distribution',
      title: '階層深度分布',
      description: 'マインドマップの各階層レベルにあるノード数の分布',
      data: {
        labels: depths.map(d => `レベル ${d}`),
        datasets: [{
          label: 'ノード数',
          data: counts,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }],
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '階層深度分布'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      }
    };
  }

  /**
   * 分岐数分布チャートを作成
   */
  private static createBranchingDistributionChart(statistics: MindmapStatistics): VisualizationData {
    // 分岐数の分布を計算（統計から推定）
    const branchingData = this.estimateBranchingDistribution(statistics);

    return {
      type: 'branching_distribution',
      title: '分岐数分布',
      description: '各ノードの子ノード数の分布（7±2の法則との比較）',
      data: {
        labels: branchingData.labels,
        datasets: [{
          label: 'ノード数',
          data: branchingData.values,
          backgroundColor: branchingData.colors,
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }],
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '分岐数分布（7±2の法則）'
            }
          }
        }
      }
    };
  }

  /**
   * 優先度分布チャートを作成
   */
  private static createPriorityDistributionChart(statistics: MindmapStatistics): VisualizationData {
    const priorities = Object.keys(statistics.distribution.priorities);
    const counts = priorities.map(p => statistics.distribution.priorities[p]);
    const colors = priorities.map(p => this.getPriorityColor(p));

    return {
      type: 'priority_distribution',
      title: '優先度別ノード分布',
      description: 'ノードに設定された優先度の分布',
      data: {
        labels: priorities,
        datasets: [{
          label: 'ノード数',
          data: counts,
          backgroundColor: colors,
          borderWidth: 1
        }]
      }
    };
  }

  /**
   * ステータス分布チャートを作成
   */
  private static createStatusDistributionChart(statistics: MindmapStatistics): VisualizationData {
    const statuses = Object.keys(statistics.distribution.statuses);
    const counts = statuses.map(s => statistics.distribution.statuses[s]);
    const colors = statuses.map(s => this.getStatusColor(s));

    return {
      type: 'status_distribution',
      title: 'ステータス別ノード分布',
      description: 'ノードに設定されたステータスの分布',
      data: {
        labels: statuses,
        datasets: [{
          label: 'ノード数',
          data: counts,
          backgroundColor: colors,
          borderWidth: 1
        }]
      }
    };
  }

  /**
   * 問題重要度チャートを作成
   */
  private static createIssueSeverityChart(issues: StructureIssue[]): VisualizationData {
    const severityCount = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severities = Object.keys(severityCount);
    const counts = severities.map(s => severityCount[s]);
    const colors = severities.map(s => this.getSeverityColor(s));

    return {
      type: 'issue_severity',
      title: '検出された問題の重要度分布',
      description: '構造分析で検出された問題の重要度別の分布',
      data: {
        labels: severities.map(s => this.getSeverityLabel(s)),
        datasets: [{
          label: '問題数',
          data: counts,
          backgroundColor: colors,
          borderWidth: 1
        }]
      }
    };
  }

  /**
   * 最適化インパクトチャートを作成
   */
  private static createOptimizationImpactChart(optimization: OptimizationAnalysis): VisualizationData {
    const proposals = optimization.proposals.slice(0, 10); // 上位10個
    const labels = proposals.map(p => p.title);
    const impacts = proposals.map(p => Math.round(p.comparison.improvementScore * 100));

    return {
      type: 'optimization_impact',
      title: '最適化提案のインパクト',
      description: '各最適化提案の期待される改善度（上位10個）',
      data: {
        labels,
        datasets: [{
          label: '改善度 (%)',
          data: impacts,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }],
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '最適化提案のインパクト'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      }
    };
  }

  /**
   * 総合健康度スコアを計算
   */
  private static calculateOverallHealthScore(
    statistics: MindmapStatistics,
    issues: StructureIssue[],
    optimization: OptimizationAnalysis
  ): number {
    // 空のマインドマップの場合はスコア0
    if (statistics.totalNodes === 0) {
      return 0;
    }

    let score = 100;

    // 問題によるペナルティ
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    score -= errorCount * 15; // エラーは大きく減点
    score -= warningCount * 5; // 警告は軽く減点

    // 最適化の必要性によるペナルティ
    const highPriorityOptimizations = optimization.proposals.filter(p => p.priority === 'high' || p.priority === 'critical').length;
    score -= highPriorityOptimizations * 10;

    // 構造的な問題によるペナルティ
    if (statistics.maxDepth > 7) {
      score -= (statistics.maxDepth - 7) * 5; // 深すぎる階層
    }

    if (statistics.averageBranching > 12) {
      score -= (statistics.averageBranching - 12) * 2; // 分岐が多すぎる
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * HTMLレポートを生成
   */
  private static generateHtmlReport(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    const sections: string[] = [];

    // ヘッダー
    sections.push(this.generateHtmlHeader(analysis, config));

    // 統計セクション
    if (config.includeStatistics) {
      sections.push(this.generateHtmlStatisticsSection(analysis.statistics));
    }

    // 問題セクション
    if (config.includeIssues && analysis.issues.length > 0) {
      sections.push(this.generateHtmlIssuesSection(analysis.issues));
    }

    // 最適化セクション
    if (config.includeOptimizations && analysis.optimization.proposals.length > 0) {
      sections.push(this.generateHtmlOptimizationsSection(analysis.optimization));
    }

    // 視覚化セクション
    if (config.includeVisualizations && analysis.visualizations.length > 0) {
      sections.push(this.generateHtmlVisualizationsSection(analysis.visualizations, config));
    }

    // フッター
    sections.push(this.generateHtmlFooter(analysis, config));

    return this.wrapHtmlDocument(sections.join('\n'), config);
  }

  /**
   * Markdownレポートを生成
   */
  private static generateMarkdownReport(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    const sections: string[] = [];

    // ヘッダー
    sections.push(this.generateMarkdownHeader(analysis, config));

    // 統計セクション
    if (config.includeStatistics) {
      sections.push(this.generateMarkdownStatisticsSection(analysis.statistics));
    }

    // 問題セクション
    if (config.includeIssues && analysis.issues.length > 0) {
      sections.push(this.generateMarkdownIssuesSection(analysis.issues));
    }

    // 最適化セクション
    if (config.includeOptimizations && analysis.optimization.proposals.length > 0) {
      sections.push(this.generateMarkdownOptimizationsSection(analysis.optimization));
    }

    // 視覚化セクション（データテーブルとして）
    if (config.includeVisualizations && analysis.visualizations.length > 0) {
      sections.push(this.generateMarkdownVisualizationsSection(analysis.visualizations));
    }

    return sections.join('\n\n');
  }

  /**
   * JSONレポートを生成
   */
  private static generateJsonReport(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    const report = {
      metadata: {
        title: config.title,
        timestamp: analysis.timestamp,
        overallHealthScore: analysis.overallHealthScore
      },
      statistics: config.includeStatistics ? analysis.statistics : undefined,
      issues: config.includeIssues ? analysis.issues : undefined,
      optimization: config.includeOptimizations ? analysis.optimization : undefined,
      visualizations: config.includeVisualizations ? analysis.visualizations : undefined
    };

    // undefinedプロパティを除去
    const cleanedReport = JSON.parse(JSON.stringify(report));

    return JSON.stringify(cleanedReport, null, 2);
  }

  // ヘルパーメソッド群

  private static estimateBranchingDistribution(statistics: MindmapStatistics): {
    labels: string[];
    values: number[];
    colors: string[];
  } {
    // 統計から分岐数分布を推定
    const totalBranchNodes = statistics.structure.branchNodes;
    const avgBranching = statistics.averageBranching;

    const labels = ['0', '1-2', '3-4', '5-9 (最適)', '10-15', '16+'];
    const values = [
      statistics.structure.leafNodes, // 0個の子を持つノード
      Math.round(totalBranchNodes * 0.2), // 1-2個
      Math.round(totalBranchNodes * 0.3), // 3-4個
      Math.round(totalBranchNodes * 0.3), // 5-9個（最適範囲）
      Math.round(totalBranchNodes * 0.15), // 10-15個
      Math.round(totalBranchNodes * 0.05)  // 16個以上
    ];

    const colors = [
      '#e0e0e0', // グレー（リーフ）
      '#ffeb3b', // 黄色（少ない）
      '#8bc34a', // 薄緑（やや少ない）
      '#4caf50', // 緑（最適）
      '#ff9800', // オレンジ（多い）
      '#f44336'  // 赤（多すぎる）
    ];

    return { labels, values, colors };
  }

  private static getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'critical': '#d32f2f',
      'high': '#f57c00',
      'medium': '#1976d2',
      'low': '#388e3c'
    };
    return colors[priority] || '#9e9e9e';
  }

  private static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'completed': '#4caf50',
      'in-progress': '#ff9800',
      'pending': '#2196f3',
      'blocked': '#f44336',
      'cancelled': '#9e9e9e'
    };
    return colors[status] || '#9e9e9e';
  }

  private static getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      'error': '#f44336',
      'warning': '#ff9800',
      'info': '#2196f3'
    };
    return colors[severity] || '#9e9e9e';
  }

  private static getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'error': 'エラー',
      'warning': '警告',
      'info': '情報'
    };
    return labels[severity] || severity;
  }

  // HTML生成メソッド（プレースホルダー）
  private static generateHtmlHeader(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    const customHeader = config.template.header || '';
    return `${customHeader}
    <header>
      <h1>${config.title}</h1>
      ${config.includeTimestamp ? `<p>生成日時: ${new Date(analysis.timestamp).toLocaleString('ja-JP')}</p>` : ''}
      <div class="health-score">
        <h2>総合健康度: <span class="score score-${this.getScoreClass(analysis.overallHealthScore)}">${analysis.overallHealthScore}/100</span></h2>
      </div>
    </header>`;
  }

  private static generateHtmlStatisticsSection(statistics: MindmapStatistics): string {
    return `<section class="statistics">
      <h2>📊 統計情報</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <h3>総ノード数</h3>
          <p class="stat-value">${statistics.totalNodes}</p>
        </div>
        <div class="stat-item">
          <h3>最大深度</h3>
          <p class="stat-value">${statistics.maxDepth}</p>
        </div>
        <div class="stat-item">
          <h3>平均分岐数</h3>
          <p class="stat-value">${statistics.averageBranching.toFixed(1)}</p>
        </div>
        <div class="stat-item">
          <h3>リーフノード</h3>
          <p class="stat-value">${statistics.structure.leafNodes}</p>
        </div>
      </div>
    </section>`;
  }

  private static generateHtmlIssuesSection(issues: StructureIssue[]): string {
    const issueList = issues.map(issue =>
      `<li class="issue-item issue-${issue.severity}">
        <strong>${this.getSeverityLabel(issue.severity)}</strong>: ${issue.message}
        ${issue.suggestedFixes ? `<ul class="fixes">${issue.suggestedFixes.map(fix => `<li>${fix.description}</li>`).join('')}</ul>` : ''}
      </li>`
    ).join('');

    return `<section class="issues">
      <h2>⚠️ 検出された問題</h2>
      <ul class="issue-list">${issueList}</ul>
    </section>`;
  }

  private static generateHtmlOptimizationsSection(optimization: OptimizationAnalysis): string {
    const proposalList = optimization.proposals.slice(0, 10).map(proposal =>
      `<li class="proposal-item priority-${proposal.priority}">
        <h4>${proposal.title}</h4>
        <p>${proposal.description}</p>
        <div class="benefits">
          <strong>期待される効果:</strong>
          <ul>${proposal.expectedBenefits.map(benefit => `<li>${benefit}</li>`).join('')}</ul>
        </div>
      </li>`
    ).join('');

    return `<section class="optimizations">
      <h2>🔧 最適化提案</h2>
      <ul class="proposal-list">${proposalList}</ul>
    </section>`;
  }

  private static generateHtmlVisualizationsSection(visualizations: VisualizationData[], config: Required<ReportConfig>): string {
    const chartDivs = visualizations
      .filter(viz => config.visualizationTypes.includes(viz.type))
      .map(viz =>
        `<div class="chart-container">
          <h3>${viz.title}</h3>
          ${viz.description ? `<p class="chart-description">${viz.description}</p>` : ''}
          <canvas id="chart-${viz.type}" class="chart"></canvas>
          <script>
            // Chart.js data for ${viz.type}
            window.chartData_${viz.type} = ${JSON.stringify(viz.data)};
          </script>
        </div>`
      ).join('');

    return `<section class="visualizations">
      <h2>📈 視覚化</h2>
      ${chartDivs}
    </section>`;
  }

  private static generateHtmlFooter(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    return `<footer>
      <p>このレポートは自動生成されました。</p>
      ${config.template.footer || ''}
    </footer>`;
  }

  private static wrapHtmlDocument(content: string, config: Required<ReportConfig>): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    ${this.getDefaultCSS()}
    ${config.customCSS}
  </style>
</head>
<body>
  ${content}
  <script>
    ${this.getChartInitializationScript()}
  </script>
</body>
</html>`;
  }

  // Markdown生成メソッド（プレースホルダー）
  private static generateMarkdownHeader(analysis: ComprehensiveAnalysis, config: Required<ReportConfig>): string {
    return `# ${config.title}

${config.includeTimestamp ? `**生成日時:** ${new Date(analysis.timestamp).toLocaleString('ja-JP')}` : ''}

## 📋 サマリー

**総合健康度:** ${analysis.overallHealthScore}/100`;
  }

  private static generateMarkdownStatisticsSection(statistics: MindmapStatistics): string {
    return `## 📊 統計情報

| 項目 | 値 |
|------|-----|
| 総ノード数 | ${statistics.totalNodes} |
| 最大深度 | ${statistics.maxDepth} |
| 平均分岐数 | ${statistics.averageBranching.toFixed(1)} |
| リーフノード数 | ${statistics.structure.leafNodes} |
| 分岐ノード数 | ${statistics.structure.branchNodes} |`;
  }

  private static generateMarkdownIssuesSection(issues: StructureIssue[]): string {
    const issueList = issues.map(issue =>
      `- **${this.getSeverityLabel(issue.severity)}:** ${issue.message}`
    ).join('\n');

    return `## ⚠️ 検出された問題

${issueList}`;
  }

  private static generateMarkdownOptimizationsSection(optimization: OptimizationAnalysis): string {
    const proposalList = optimization.proposals.slice(0, 10).map(proposal =>
      `### ${proposal.title}

${proposal.description}

**期待される効果:**
${proposal.expectedBenefits.map(benefit => `- ${benefit}`).join('\n')}`
    ).join('\n\n');

    return `## 🔧 最適化提案

${proposalList}`;
  }

  private static generateMarkdownVisualizationsSection(visualizations: VisualizationData[]): string {
    const vizSections = visualizations.map(viz => {
      const dataTable = this.generateDataTable(viz.data);
      return `### ${viz.title}

${viz.description || ''}

${dataTable}`;
    }).join('\n\n');

    return `## 📈 視覚化データ

${vizSections}`;
  }

  private static generateDataTable(chartData: ChartData): string {
    const headers = ['項目', ...chartData.datasets.map(ds => ds.label)];
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;

    const dataRows = chartData.labels.map((label, index) => {
      const values = chartData.datasets.map(ds => ds.data[index] || 0);
      return `| ${label} | ${values.join(' | ')} |`;
    }).join('\n');

    return `${headerRow}\n${separatorRow}\n${dataRows}`;
  }

  private static getScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private static getDefaultCSS(): string {
    return `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      header { text-align: center; margin-bottom: 30px; }
      .health-score { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .score { font-size: 2em; font-weight: bold; }
      .score-excellent { color: #4caf50; }
      .score-good { color: #8bc34a; }
      .score-fair { color: #ff9800; }
      .score-poor { color: #f44336; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
      .stat-item { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
      .stat-value { font-size: 2em; font-weight: bold; color: #1976d2; margin: 10px 0; }
      .issue-list, .proposal-list { list-style: none; padding: 0; }
      .issue-item, .proposal-item { margin: 15px 0; padding: 15px; border-radius: 8px; border-left: 4px solid; }
      .issue-error { background: #ffebee; border-color: #f44336; }
      .issue-warning { background: #fff3e0; border-color: #ff9800; }
      .issue-info { background: #e3f2fd; border-color: #2196f3; }
      .chart-container { margin: 30px 0; }
      .chart { max-width: 100%; height: 400px; }
      section { margin: 40px 0; }
      h2 { color: #1976d2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
    `;
  }

  private static getChartInitializationScript(): string {
    return `
      // Chart.js initialization
      document.addEventListener('DOMContentLoaded', function() {
        Object.keys(window).forEach(key => {
          if (key.startsWith('chartData_')) {
            const chartType = key.replace('chartData_', '');
            const canvas = document.getElementById('chart-' + chartType);
            if (canvas) {
              new Chart(canvas, {
                type: 'bar',
                data: window[key],
                options: window[key].options || {}
              });
            }
          }
        });
      });
    `;
  }
}