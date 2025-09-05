
// 外部ファイルからサンプルデータを読み込み
import comprehensiveRequirementsYAML from './samples/comprehensive-requirements.yaml?raw';
import projectRequirementsYAML from './samples/project-requirements.yaml?raw';
import projectStakeholdersYAML from './samples/project-stakeholders.yaml?raw';
import projectDesignYAML from './samples/project-design.yaml?raw';
import projectTasksYAML from './samples/project-tasks.yaml?raw';

export const sampleList = [
  {
    id: 'comprehensive-requirements',
    name: 'サンプル要件定義',
    description: '要求から要件への関係性を明確にした包括的な要件定義サンプル',
    format: 'yaml' as const,
    content: comprehensiveRequirementsYAML,
  },
  {
    id: 'project-requirements',
    name: 'プロジェクト: 要求/要件',
    description: 'このリポジトリ自身のユーザー要求とシステム要件',
    format: 'yaml' as const,
    content: projectRequirementsYAML,
  },
  {
    id: 'project-stakeholders',
    name: 'プロジェクト: ステークホルダー',
    description: '役割と責務の整理（PO/Dev/QA/User）',
    format: 'yaml' as const,
    content: projectStakeholdersYAML,
  },
  {
    id: 'project-design',
    name: 'プロジェクト: 設計',
    description: 'アーキテクチャ概要と主要コンポーネント',
    format: 'yaml' as const,
    content: projectDesignYAML,
  },
  {
    id: 'project-tasks',
    name: 'プロジェクト: タスク',
    description: 'エピック/タスク構造の例',
    format: 'yaml' as const,
    content: projectTasksYAML,
  },
] as const;

export type SampleData = typeof sampleList[number];
