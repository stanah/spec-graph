/**
 * パーサーサービス実装
 * 
 * JSON/YAMLファイルの解析、バリデーション、エラー検出を担当するサービスクラス
 */

import * as yaml from 'js-yaml';
// import Ajv from 'ajv'; // 削除: Zodに移行済み
// import addFormats from 'ajv-formats'; // 削除: Zodに移行済み
import type { 
  ParserService, 
  MindmapData, 
  ParseError, 
  ValidationResult, 
  CustomSchema,
  StyleSettings,
  DisplayRule
} from '../types';
import { ZodMindmapValidator } from '../types';


/**
 * パーサーサービスの実装クラス
 */
export class ParserServiceImpl implements ParserService {
  constructor() {
    // Zodベースのバリデーションを使用するためAJVは不要
  }
  
  /**
   * JSON文字列を解析してマインドマップデータに変換
   */
  async parseJSON(content: string): Promise<MindmapData> {
    try {
      // 空文字列チェック
      if (!content.trim()) {
        throw new Error('ファイル内容が空です');
      }

      console.log('JSONパース中...');
      // JSON解析
      const data = JSON.parse(content);
      console.log('JSON.parse成功、データキー:', Object.keys(data));
      
      // Zodスキーマによるバリデーション
      console.log('Zodスキーマバリデーション開始...');
      const zodResult = ZodMindmapValidator.safeParse(data);
      console.log('バリデーション結果:', { success: zodResult.success, errorCount: zodResult.success ? 0 : zodResult.errors?.length || 0 });
      
      if (!zodResult.success) {
        const errorMessages = zodResult.errors?.map(e => e.message).join(', ') || '不明なエラー';
        console.log('バリデーションエラー詳細:', zodResult.errors);
        throw new Error(`データ構造が正しくありません: ${errorMessages}`);
      }

      console.log('parseJSON完了');
      return data as MindmapData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON構文エラー: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * YAML文字列を解析してマインドマップデータに変換
   */
  async parseYAML(content: string): Promise<MindmapData> {
    try {
      // 空文字列チェック
      if (!content.trim()) {
        throw new Error('ファイル内容が空です');
      }

      // YAML解析
      const data = yaml.load(content, {
        // セキュリティのため、安全なタイプのみ許可
        schema: yaml.JSON_SCHEMA,
        // 重複キーを許可しない
        json: true
      });

      if (data === null || data === undefined) {
        throw new Error('YAMLファイルが空または無効です');
      }

      // スキーマが含まれている場合は分離
      const processedData = this.extractAndApplySchema(data);

      // Zodスキーマによるバリデーション
      const zodResult = ZodMindmapValidator.safeParse(processedData);
      if (!zodResult.success) {
        const errorMessages = zodResult.errors?.map(e => e.message).join(', ') || '不明なエラー';
        throw new Error(`データ構造が正しくありません: ${errorMessages}`);
      }

      return processedData as MindmapData;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`YAML構文エラー: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * YAMLデータからスキーマを抽出し、適用する
   */
  private extractAndApplySchema(data: unknown): unknown {
    // スキーマが含まれているかチェック
    if (data && typeof data === 'object' && (data as { schema?: unknown }).schema) {
      const dataObj = data as { schema?: unknown; [key: string]: unknown };
      const schema = dataObj.schema;
      const mindmapData = { ...dataObj };
      
      // スキーマ部分を削除
      delete mindmapData.schema;
      
      // スキーマを適用
      mindmapData.schema = schema;
      
      return mindmapData;
    }
    
    return data;
  }

  /**
   * 汎用パース関数（JSON/YAMLを自動判定）
   */
  async parse(content: string): Promise<{ success: boolean; data?: MindmapData; errors?: ParseError[]; intermediateData?: any }> {
    console.log('ParserService.parse開始 - content length:', content.length);
    try {
      // 空文字列チェック
      if (!content.trim()) {
        return {
          success: false,
          errors: [{
            line: 1,
            column: 1,
            message: 'ファイル内容が空です',
            severity: 'error',
            code: 'EMPTY_CONTENT'
          }]
        };
      }

      // まずJSONとして解析を試行
      try {
        console.log('JSON解析を試行中...');
        const data = await this.parseJSON(content);
        console.log('JSON解析成功');
        return { success: true, data };
      } catch (jsonError) {
        console.log('JSON解析失敗:', jsonError);
        // JSONで失敗した場合、YAMLを試行
        try {
          console.log('YAML解析を試行中...');
          const data = await this.parseYAML(content);
          console.log('YAML解析成功');
          return { success: true, data };
        } catch (yamlError) {
          console.log('YAML解析失敗:', yamlError);
          
          // YAML構文自体は正しいが、Zodバリデーションで失敗している可能性を確認
          try {
            console.log('YAMLの基本的なパースを再試行...');
            const rawYamlData = yaml.load(content, {
              schema: yaml.JSON_SCHEMA,
              json: true
            });
            
            if (rawYamlData && typeof rawYamlData === 'object') {
              console.log('YAML構文は有効だが、構造バリデーションに失敗:', Object.keys(rawYamlData));
              // YAMLは正常だが、マインドマップ構造ではない場合
              const parseErrors = [{
                line: 1,
                column: 1,
                message: 'YAMLファイルですが、マインドマップ構造ではありません',
                severity: 'warning' as const,
                code: 'INVALID_MINDMAP_STRUCTURE'
              }];
              return {
                success: false,
                errors: parseErrors,
                intermediateData: rawYamlData
              };
            }
          } catch (rawYamlError) {
            console.log('YAML基本パースも失敗:', rawYamlError);
          }
          
          // 両方失敗した場合、パースエラーを返す
          const parseErrors = this.getParseErrors(content);
          return {
            success: false,
            errors: parseErrors.length > 0 ? parseErrors : [{
              line: 1,
              column: 1,
              message: 'JSONまたはYAML形式でのパースに失敗しました',
              severity: 'error',
              code: 'PARSE_FAILED'
            }]
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          line: 1,
          column: 1,
          message: error instanceof Error ? error.message : '不明なエラー',
          severity: 'error',
          code: 'UNKNOWN_ERROR'
        }]
      };
    }
  }

  /**
   * データの基本的なバリデーション
   */
  validateData(data: unknown): ValidationResult {
    // null/undefinedチェック
    if (data === null || data === undefined) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: 'データが存在しません',
          value: data,
          code: 'NULL_DATA'
        }]
      };
    }

    // オブジェクトチェック
    if (typeof data !== 'object') {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: 'データはオブジェクトである必要があります',
          value: data,
          expected: 'object',
          code: 'INVALID_TYPE'
        }]
      };
    }

    // 必須フィールドの存在チェック
    const requiredFields = ['version', 'title', 'root'];
    const errors = [];
    const dataObj = data as Record<string, unknown>;

    for (const field of requiredFields) {
      if (!(field in dataObj) || dataObj[field] === null || dataObj[field] === undefined) {
        errors.push({
          path: field,
          message: `必須フィールド '${field}' が存在しません`,
          value: dataObj[field],
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    }

    // rootノードの基本チェック
    if (dataObj.root && typeof dataObj.root === 'object') {
      const rootObj = dataObj.root as Record<string, unknown>;
      if (!rootObj.id || typeof rootObj.id !== 'string') {
        errors.push({
          path: 'root.id',
          message: 'ルートノードにはid（文字列）が必要です',
          value: rootObj.id,
          expected: 'string',
          code: 'INVALID_ROOT_ID'
        });
      }

      if (!rootObj.title || typeof rootObj.title !== 'string') {
        errors.push({
          path: 'root.title',
          message: 'ルートノードにはtitle（文字列）が必要です',
          value: rootObj.title,
          expected: 'string',
          code: 'INVALID_ROOT_TITLE'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Zodスキーマに基づくバリデーション
   */
  validateSchema(data: unknown): ValidationResult {
    const result = ZodMindmapValidator.safeParse(data);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: (result.errors || []).map(e => ({
        path: e.path || 'root',
        message: e.message,
        code: e.code || 'VALIDATION_ERROR',
        value: undefined
      }))
    };
  }



  /**
   * カスタムスキーマに基づくバリデーション
   */
  validateCustomSchema(data: MindmapData): ValidationResult {
    if (!data.schema) {
      // カスタムスキーマが定義されていない場合は基本バリデーションのみ
      return this.validateSchema(data);
    }

    // Zodでマインドマップデータ全体をバリデーション（カスタムスキーマ含む）
    const result = ZodMindmapValidator.safeParse(data);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: (result.errors || []).map(e => ({
        path: e.path || 'root',
        message: e.message,
        code: e.code || 'VALIDATION_ERROR',
        value: undefined
      }))
    };
  }

  /**
   * パースエラーを取得
   */
  getParseErrors(content: string): ParseError[] {
    const errors: ParseError[] = [];

    if (!content.trim()) {
      errors.push({
        line: 1,
        column: 1,
        message: 'ファイル内容が空です',
        severity: 'error',
        code: 'EMPTY_CONTENT'
      });
      return errors;
    }

    // まずJSONとして解析を試行
    try {
      JSON.parse(content);
      return errors; // 成功した場合はエラーなし
    } catch (jsonError) {
      if (jsonError instanceof SyntaxError) {
        // JSON構文エラーの場合、YAMLも試行する前にJSONエラーを記録
        const match = jsonError.message.match(/at position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const { line, column } = this.getLineColumnFromPosition(content, position);
          errors.push({
            line,
            column,
            message: `JSON構文エラー: ${jsonError.message}`,
            severity: 'error',
            code: 'JSON_SYNTAX_ERROR',
            details: jsonError.message
          });
        } else {
          errors.push({
            line: 1,
            column: 1,
            message: `JSON構文エラー: ${jsonError.message}`,
            severity: 'error',
            code: 'JSON_SYNTAX_ERROR',
            details: jsonError.message
          });
        }
      }
    }

    // 次にYAMLとして解析を試行
    try {
      yaml.load(content, { schema: yaml.JSON_SCHEMA });
      // YAMLとして成功した場合、JSONエラーをクリアしてYAMLとして扱う
      return [];
    } catch (yamlError) {
      if (yamlError instanceof yaml.YAMLException) {
        // JSONもYAMLも失敗した場合、より具体的なエラーを返す
        return [{
          line: yamlError.mark?.line ? yamlError.mark.line + 1 : 1,
          column: yamlError.mark?.column ? yamlError.mark.column + 1 : 1,
          message: `YAML構文エラー: ${yamlError.reason || yamlError.message}`,
          severity: 'error',
          code: 'YAML_SYNTAX_ERROR',
          details: yamlError.message
        }];
      }
    }

    // JSONエラーが既に記録されている場合はそれを返す
    if (errors.length > 0) {
      return errors;
    }

    // どちらの形式でも解析できない場合
    return [{
      line: 1,
      column: 1,
      message: 'サポートされていないファイル形式です（JSON/YAMLのみサポート）',
      severity: 'error',
      code: 'UNSUPPORTED_FORMAT'
    }];
  }

  /**
   * 既存データからスキーマを自動生成
   */
  async generateSchema(data: MindmapData): Promise<CustomSchema> {
    const fields = new Map<string, unknown[]>();
    const fieldTypes = new Map<string, Set<string>>();
    const fieldStats = new Map<string, { count: number; nullCount: number }>();

    // ノードを再帰的に解析してカスタムフィールドを収集
    this.collectCustomFields(data.root, fields, fieldTypes, fieldStats);

    // フィールド定義を生成
    const fieldDefinitions = Array.from(fields.entries()).map(([name, examples]) => {
      const types = fieldTypes.get(name) || new Set();
      const stats = fieldStats.get(name) || { count: 0, nullCount: 0 };
      const primaryType = this.determinePrimaryType(types, examples);
      
      const fieldDef = {
        name,
        type: primaryType as 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect',
        label: this.generateFieldLabel(name),
        description: `自動生成されたフィールド: ${name} (使用率: ${Math.round((stats.count - stats.nullCount) / stats.count * 100)}%)`,
        required: stats.nullCount === 0 && stats.count > 1, // 全てのノードで値が設定されている場合は必須
        ...(primaryType === 'select' && this.generateSelectOptions(examples)),
        ...(primaryType === 'date' && { validation: [{ type: 'required' as const }] }),
        ...(primaryType === 'number' && this.generateNumberValidation(examples))
      };

      return fieldDef;
    });

    // 表示ルールを生成
    const displayRules: DisplayRule[] = fieldDefinitions.map(field => {
      const baseRule: DisplayRule = {
        field: field.name,
        displayType: this.getDefaultDisplayType(field.type),
        position: 'inline' as const
      };

      if (field.type === 'select' && field.options) {
        baseRule.style = this.generateSelectDisplayStyle(field.options);
      }

      return baseRule;
    });

    return {
      version: '1.0',
      description: `${data.title}から自動生成されたスキーマ`,
      customFields: fieldDefinitions,
      displayRules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * スキーマの拡張とマイグレーション
   */
  async migrateSchema(
    oldSchema: CustomSchema, 
    newSchema: CustomSchema
  ): Promise<{ migratedSchema: CustomSchema; migrationLog: string[] }> {
    const migrationLog: string[] = [];
    
    // 旧フィールドを統合
    const oldAllFields = [
      ...(oldSchema.baseFields || []),
      ...(oldSchema.customFields || [])
    ];
    
    // 新フィールドを統合 
    const newAllFields = [
      ...(newSchema.baseFields || []),
      ...(newSchema.customFields || [])
    ];
    
    const migratedBaseFields = [...(oldSchema.baseFields || [])];
    const migratedCustomFields = [...(oldSchema.customFields || [])];
    const migratedDisplayRules = [...(oldSchema.displayRules || [])];

    // 新しいフィールドを追加
    for (const newField of newAllFields) {
      const existingField = oldAllFields.find(f => f.name === newField.name);
      
      if (!existingField) {
        // location に基づいて適切な配列に追加
        if (newField.location === 'node') {
          migratedBaseFields.push(newField);
        } else {
          migratedCustomFields.push(newField);
        }
        migrationLog.push(`新しいフィールドを追加: ${newField.name} (${newField.type})`);
      } else if (existingField.type !== newField.type) {
        // 型が変更された場合の処理
        const compatibleMigration = this.isCompatibleTypeMigration(existingField.type, newField.type);
        if (compatibleMigration) {
          existingField.type = newField.type;
          migrationLog.push(`フィールド型を更新: ${newField.name} (${existingField.type} → ${newField.type})`);
        } else {
          migrationLog.push(`警告: フィールド ${newField.name} の型変更は互換性がありません (${existingField.type} → ${newField.type})`);
        }
      }
    }

    // 新しい表示ルールを追加
    for (const newRule of newSchema.displayRules || []) {
      const existingRule = migratedDisplayRules.find(r => r.field === newRule.field);
      
      if (!existingRule) {
        migratedDisplayRules.push(newRule);
        migrationLog.push(`新しい表示ルールを追加: ${newRule.field}`);
      }
    }

    const migratedSchema: CustomSchema = {
      ...oldSchema,
      version: newSchema.version || oldSchema.version,
      baseFields: migratedBaseFields,
      customFields: migratedCustomFields,
      displayRules: migratedDisplayRules,
      updatedAt: new Date().toISOString()
    };

    return { migratedSchema, migrationLog };
  }

  /**
   * スキーマの差分を取得
   */
  getSchemaChanges(oldSchema: CustomSchema, newSchema: CustomSchema): {
    addedFields: string[];
    removedFields: string[];
    modifiedFields: string[];
    addedRules: string[];
    removedRules: string[];
  } {
    // 統合フィールドリスト
    const oldAllFields = [
      ...(oldSchema.baseFields || []),
      ...(oldSchema.customFields || [])
    ];
    const newAllFields = [
      ...(newSchema.baseFields || []),
      ...(newSchema.customFields || [])
    ];
    
    const oldFieldNames = new Set(oldAllFields.map(f => f.name));
    const newFieldNames = new Set(newAllFields.map(f => f.name));
    const oldRuleFields = new Set((oldSchema.displayRules || []).map(r => r.field));
    const newRuleFields = new Set((newSchema.displayRules || []).map(r => r.field));

    const addedFields = newAllFields
      .filter(f => !oldFieldNames.has(f.name))
      .map(f => f.name);

    const removedFields = oldAllFields
      .filter(f => !newFieldNames.has(f.name))
      .map(f => f.name);

    const modifiedFields = newAllFields
      .filter(newField => {
        const oldField = oldAllFields.find(f => f.name === newField.name);
        return oldField && !this.areFieldsEqual(oldField, newField);
      })
      .map(f => f.name);

    const addedRules = (newSchema.displayRules || [])
      .filter(r => !oldRuleFields.has(r.field))
      .map(r => r.field);

    const removedRules = (oldSchema.displayRules || [])
      .filter(r => !newRuleFields.has(r.field))
      .map(r => r.field);

    return {
      addedFields,
      removedFields,
      modifiedFields,
      addedRules,
      removedRules
    };
  }

  /**
   * ファイル形式を自動判定
   */
  detectFormat(content: string): 'json' | 'yaml' | 'unknown' {
    const trimmed = content.trim();
    
    if (!trimmed) {
      return 'unknown';
    }

    // JSONの判定（{ または [ で始まる）
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // JSON解析に失敗した場合はYAMLかもしれない
      }
    }

    // YAMLの判定を試行
    try {
      const parsed = yaml.load(trimmed, { schema: yaml.JSON_SCHEMA });
      if (parsed !== null && typeof parsed === 'object') {
        return 'yaml';
      }
    } catch {
      // YAML解析に失敗
    }

    // JSONの再試行（厳密でない形式の場合）
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // 最終的に判定できない
    }

    return 'unknown';
  }

  /**
   * データを指定形式にシリアライズ
   */
  async serialize(data: MindmapData, format: 'json' | 'yaml'): Promise<string> {
    try {
      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'yaml') {
        return yaml.dump(data, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
          sortKeys: false,
          quotingType: '"',
          forceQuotes: false
        });
      } else {
        throw new Error(`サポートされていない形式: ${format}`);
      }
    } catch (err) {
      throw new Error(`シリアライズエラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // プライベートヘルパーメソッド

  /**
   * 文字列内の位置から行・列番号を取得
   */
  private getLineColumnFromPosition(content: string, position: number): { line: number; column: number } {
    const lines = content.substring(0, position).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * ノードからカスタムフィールドを再帰的に収集
   */
  private collectCustomFields(
    node: import('../types').MindmapNode, 
    fields: Map<string, unknown[]>, 
    fieldTypes: Map<string, Set<string>>,
    fieldStats?: Map<string, { count: number; nullCount: number }>
  ): void {
    if (node.customFields && typeof node.customFields === 'object') {
      for (const [key, value] of Object.entries(node.customFields)) {
        if (!fields.has(key)) {
          fields.set(key, []);
          fieldTypes.set(key, new Set());
          if (fieldStats) {
            fieldStats.set(key, { count: 0, nullCount: 0 });
          }
        }
        
        fields.get(key)!.push(value);
        fieldTypes.get(key)!.add(typeof value);
        
        if (fieldStats) {
          const stats = fieldStats.get(key)!;
          stats.count++;
          if (value === null || value === undefined || value === '') {
            stats.nullCount++;
          }
        }
      }
    }

    // 子ノードを再帰的に処理
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.collectCustomFields(child, fields, fieldTypes, fieldStats);
      }
    }
  }

  /**
   * 主要な型を決定
   */
  private determinePrimaryType(types: Set<string>, examples: unknown[]): string {
    if (types.has('boolean')) return 'boolean';
    if (types.has('number')) return 'number';
    
    // 文字列の場合、値の種類を分析
    if (types.has('string')) {
      const uniqueValues = new Set(examples.filter(v => typeof v === 'string'));
      
      // 選択肢が少ない場合はselect型
      if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
        return 'select';
      }
      
      // 日付形式の判定
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (examples.some(v => typeof v === 'string' && datePattern.test(v))) {
        return 'date';
      }
    }
    
    return 'string';
  }

  /**
   * フィールドラベルを生成
   */
  private generateFieldLabel(name: string): string {
    // キャメルケースやスネークケースを読みやすい形に変換
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  /**
   * select型のオプションを生成
   */
  private generateSelectOptions(examples: unknown[]): { options: string[] } {
    const uniqueValues = new Set(
      examples
        .filter(v => typeof v === 'string')
        .map(v => String(v))
    );
    
    return {
      options: Array.from(uniqueValues).sort()
    };
  }

  /**
   * デフォルトの表示タイプを取得
   */
  private getDefaultDisplayType(fieldType: string): DisplayRule['displayType'] {
    switch (fieldType) {
      case 'boolean':
        return 'icon';
      case 'select':
        return 'badge';
      case 'number':
        return 'text';
      default:
        return 'text';
    }
  }

  /**
   * 数値フィールドのバリデーションを生成
   */
  private generateNumberValidation(examples: unknown[]): { validation: Array<{ type: 'min' | 'max'; value?: number }> } {
    const numbers = examples.filter(v => typeof v === 'number');
    if (numbers.length === 0) return { validation: [] };

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const validation: Array<{ type: 'min' | 'max'; value?: number }> = [];

    if (min >= 0) {
      validation.push({ type: 'min', value: 0 });
    }
    
    if (max <= 100 && min >= 0) {
      validation.push({ type: 'max', value: 100 });
    }

    return { validation };
  }

  /**
   * select型の表示スタイルを生成
   */
  private generateSelectDisplayStyle(options: string[]): Record<string, StyleSettings> {
    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#ffebee'];
    const style: Record<string, StyleSettings> = {};

    options.forEach((option, index) => {
      style[option] = {
        backgroundColor: colors[index % colors.length],
        color: '#333333',
        borderColor: 'transparent'
      };
    });

    return style;
  }

  /**
   * 型の互換性をチェック
   */
  private isCompatibleTypeMigration(oldType: string, newType: string): boolean {
    const compatibleMigrations = [
      ['string', 'select'],
      ['number', 'string'],
      ['boolean', 'string'],
      ['date', 'string']
    ];

    return compatibleMigrations.some(([from, to]) => 
      oldType === from && newType === to
    );
  }

  /**
   * フィールドの等価性をチェック
   */
  private areFieldsEqual(field1: import('../types').FieldDefinition, field2: import('../types').FieldDefinition): boolean {
    return (
      field1.type === field2.type &&
      field1.label === field2.label &&
      field1.required === field2.required &&
      JSON.stringify(field1.options || []) === JSON.stringify(field2.options || []) &&
      JSON.stringify(field1.validation || []) === JSON.stringify(field2.validation || [])
    );
  }
}

// シングルトンインスタンス
export const parserService = new ParserServiceImpl();

// デフォルトエクスポート
export default parserService;
