/**
 * 統合されたコンテンツ読み込みサービス
 * テンプレート生成、サンプル読み込み、カスタムテンプレート読み込みを統合
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MindmapData } from '../types';
import { templateGeneratorService } from './templateGeneratorService';
import type { TemplateGeneratorOptions } from './templateGeneratorService';
import { sampleList } from '../data/samples';
import type { SampleData } from '../data/samples';

/**
 * コンテンツソースの種類
 */
export type ContentSource = 'schema' | 'sample' | 'custom' | 'file';

/**
 * 読み込みオプション
 */
export interface ContentLoadOptions {
  source: ContentSource;
  // スキーマベース生成用
  schemaPath?: string;
  templateOptions?: TemplateGeneratorOptions;
  // サンプル読み込み用
  sampleId?: string;
  // カスタムテンプレート用
  templatePath?: string;
  // ファイル読み込み用
  fileContent?: string;
  fileName?: string;
  // 共通オプション
  format?: 'json' | 'yaml';
  locale?: 'ja' | 'en';
}

/**
 * 読み込み結果
 */
export interface ContentLoadResult {
  content: string;
  metadata: {
    source: ContentSource;
    originalFormat: 'json' | 'yaml';
    loadedAt: string;
    title?: string;
    description?: string;
  };
}

/**
 * 統合コンテンツローダーサービス
 */
export class ContentLoaderService {
  private static instance: ContentLoaderService;

  private constructor() {}

  static getInstance(): ContentLoaderService {
    if (!ContentLoaderService.instance) {
      ContentLoaderService.instance = new ContentLoaderService();
    }
    return ContentLoaderService.instance;
  }

  /**
   * コンテンツを読み込む（統一エントリーポイント）
   */
  async loadContent(options: ContentLoadOptions): Promise<ContentLoadResult> {
    switch (options.source) {
      case 'schema':
        return this.loadFromSchema(options);
      case 'sample':
        return this.loadFromSample(options);
      case 'custom':
        return this.loadFromCustomTemplate(options);
      case 'file':
        return this.loadFromFile(options);
      default:
        throw new Error(`Unsupported content source: ${options.source}`);
    }
  }

  /**
   * スキーマからテンプレートを生成
   */
  private async loadFromSchema(options: ContentLoadOptions): Promise<ContentLoadResult> {
    if (!options.schemaPath) {
      throw new Error('Schema path is required for schema-based generation');
    }

    try {
      const result = await templateGeneratorService.generateFromSchemaFile(
        options.schemaPath,
        options.templateOptions || {}
      );

      const content = JSON.stringify(result.data, null, 2);

      return {
        content,
        metadata: {
          source: 'schema',
          originalFormat: 'json',
          loadedAt: new Date().toISOString(),
          title: `${result.metadata.templateType} テンプレート`,
          description: `スキーマファイル ${options.schemaPath} から生成されたテンプレート`
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate template from schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * サンプルデータを読み込む
   */
  private async loadFromSample(options: ContentLoadOptions): Promise<ContentLoadResult> {
    if (!options.sampleId) {
      throw new Error('Sample ID is required for sample loading');
    }

    const sample = sampleList.find(s => s.id === options.sampleId);
    if (!sample) {
      throw new Error(`Sample not found: ${options.sampleId}`);
    }

    // フォーマットに応じてコンテンツを処理
    let content: string;
    if (options.format === 'yaml' && (sample as { format?: string }).format === 'json') {
      // JSONをYAMLに変換（必要に応じて）
      content = this.convertJsonToYaml(sample.content);
    } else if (options.format === 'json' && (sample as { format?: string }).format === 'yaml') {
      // YAMLをJSONに変換（必要に応じて）
      content = this.convertYamlToJson(sample.content as string);
    } else {
      content = typeof sample.content === 'string' 
        ? sample.content 
        : JSON.stringify((sample as { content: unknown }).content, null, 2);
    }

    return {
      content,
      metadata: {
        source: 'sample',
        originalFormat: sample.format,
        loadedAt: new Date().toISOString(),
        title: sample.name,
        description: sample.description
      }
    };
  }

  /**
   * カスタムテンプレートを読み込む
   */
  private async loadFromCustomTemplate(options: ContentLoadOptions): Promise<ContentLoadResult> {
    if (!options.templatePath) {
      throw new Error('Template path is required for custom template loading');
    }

    try {
      const response = await fetch(options.templatePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const content = await response.text();
      const format = this.detectFormat(content, options.templatePath);

      return {
        content,
        metadata: {
          source: 'custom',
          originalFormat: format,
          loadedAt: new Date().toISOString(),
          title: `カスタムテンプレート`,
          description: `${options.templatePath} から読み込まれたカスタムテンプレート`
        }
      };
    } catch (error) {
      throw new Error(`Failed to load custom template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ファイルコンテンツから読み込む
   */
  private async loadFromFile(options: ContentLoadOptions): Promise<ContentLoadResult> {
    if (!options.fileContent) {
      throw new Error('File content is required for file loading');
    }

    const format = this.detectFormat(options.fileContent, options.fileName);

    return {
      content: options.fileContent,
      metadata: {
        source: 'file',
        originalFormat: format,
        loadedAt: new Date().toISOString(),
        title: options.fileName || 'アップロードされたファイル',
        description: `ユーザーがアップロードしたファイル (${format.toUpperCase()}形式)`
      }
    };
  }

  /**
   * 利用可能なサンプル一覧を取得
   */
  getAvailableSamples(): SampleData[] {
    return [...sampleList];
  }

  /**
   * 利用可能なスキーマテンプレート一覧を取得
   */
  getAvailableSchemaTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    schemaPath: string;
    templateType: 'starter' | 'standard' | 'enterprise';
  }> {
    return [
      {
        id: 'starter-template',
        name: 'スターター版',
        description: '基本的な要件定義（ビジネス目標 + ユーザー要件）',
        schemaPath: '/spec-graph/schemas/simplified-requirements-schema.json',
        templateType: 'starter'
      },
      {
        id: 'standard-template',
        name: 'スタンダード版',
        description: '標準的な要件定義（システム要件・ステークホルダー含む）',
        schemaPath: '/spec-graph/schemas/unified-requirements-schema.json',
        templateType: 'standard'
      },
      {
        id: 'enterprise-template',
        name: 'エンタープライズ版',
        description: '包括的な要件定義（トレーサビリティ・コンプライアンス含む）',
        schemaPath: '/spec-graph/schemas/unified-requirements-schema.json',
        templateType: 'enterprise'
      }
    ];
  }

  /**
   * ファイル形式を検出
   */
  private detectFormat(content: string, fileName?: string): 'json' | 'yaml' {
    // ファイル名拡張子から判定
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext === 'yaml' || ext === 'yml') return 'yaml';
      if (ext === 'json') return 'json';
    }

    // コンテンツから判定
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    return 'yaml';
  }

  /**
   * JSONをYAMLに変換（簡易実装）
   */
  private convertJsonToYaml(jsonContent: unknown): string {
    // 実際の実装では、yamlライブラリを使用することを推奨
    // ここでは簡易的にJSON文字列を返す
    return JSON.stringify(jsonContent, null, 2);
  }

  /**
   * YAMLをJSONに変換（簡易実装）
   */
  private convertYamlToJson(yamlContent: string): string {
    // 実際の実装では、yamlライブラリを使用してパースすることを推奨
    // ここでは元のコンテンツをそのまま返す
    return yamlContent;
  }
}

/**
 * デフォルトエクスポート
 */
export const contentLoaderService = ContentLoaderService.getInstance();
export default contentLoaderService;
