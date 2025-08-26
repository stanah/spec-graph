/**
 * SchemaManager
 *
 * Zodベースの既存スキーマを中核に、拡張用のJSON Schema/Ajv連携の土台を提供。
 * このファイルでは28.1の範囲として、コアとなるAPIの骨組みと
 * Zodバリデーション/任意のJSON Schema + Ajvバリデーションを実装する。
 */

import Ajv, { type ErrorObject, type Options as AjvOptions } from 'ajv';
import addFormats from 'ajv-formats';
import type { MindmapData, ValidationResult } from '../types';
import { ZodMindmapValidator } from '../types';

export type JsonSchema = Record<string, unknown>;

export interface SchemaConversionResult {
  success: boolean;
  schema?: JsonSchema;
  error?: string;
}

export class SchemaManager {
  private ajv: Ajv | null = null;

  /** 現行Zodスキーマによる検証 */
  validateWithZod(data: unknown): ValidationResult {
    const result = ZodMindmapValidator.safeParse(data);
    if (result.success) return { valid: true, errors: [] };

    return {
      valid: false,
      errors: (result.errors || []).map((e) => ({
        path: e.path || 'root',
        message: e.message,
        code: e.code || 'VALIDATION_ERROR',
        value: undefined,
      })),
    };
  }

  /**
   * Zod -> JSON Schema 変換（zod-to-json-schema を使用、未導入でも動作継続）
   */
  async convertZodToJsonSchema(): Promise<SchemaConversionResult> {
    try {
      // 動的ロード（依存が無い環境でも安全に実行可能）
      const mod = await import('zod-to-json-schema').catch(() => null as unknown as undefined);
      // 型の都合上 any 経由で呼び出す
      const converter: any = mod && (mod as any).zodToJsonSchema;
      if (!converter) {
        return { success: false, error: 'zod-to-json-schema が利用できません' };
      }
      const schema = converter(ZodMindmapValidator, 'MindmapData');
      return { success: true, schema };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Ajvインスタンスの生成（単一管理） */
  getAjv(options?: AjvOptions): Ajv {
    if (!this.ajv) {
      this.ajv = new Ajv({ allErrors: true, strict: false, ...options });
      addFormats(this.ajv);
    }
    return this.ajv;
  }

  /** 任意のJSON Schemaで Ajv 検証を行う */
  validateWithAjv(schema: JsonSchema, data: unknown): ValidationResult {
    const ajv = this.getAjv();
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) return { valid: true, errors: [] };

    const errors = (validate.errors || []).map((err: ErrorObject) => ({
      path: err.instancePath || err.schemaPath || 'root',
      message: err.message || 'validation error',
      value: err.data,
      expected: typeof err.params === 'object' ? JSON.stringify(err.params) : undefined,
      code: err.keyword,
    }));

    return { valid: false, errors };
  }

  /** 現在のスキーマ情報（簡易） */
  getCurrentSchemaInfo() {
    return {
      engine: 'zod',
      version: '1.0',
      supports: ['zod', 'json-schema+ajv'],
    } as const;
  }
}

export const schemaManager = new SchemaManager();

