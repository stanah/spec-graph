
// 外部ファイルからサンプルデータを読み込み
import comprehensiveRequirementsYAML from './samples/comprehensive-requirements.yaml?raw';

export const sampleList = [
  {
    id: 'comprehensive-requirements',
    name: 'サンプル要件定義',
    description: '要求から要件への関係性を明確にした包括的な要件定義サンプル',
    format: 'yaml' as const,
    content: comprehensiveRequirementsYAML,
  },
] as const;

export type SampleData = typeof sampleList[number];
