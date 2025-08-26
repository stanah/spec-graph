/**
 * SchemaManager
 *
 * Zodベースの既存スキーマを中核に、拡張用のJSON Schema/Ajv連携の土台を提供。
 * このファイルでは28.1の範囲として、コアとなるAPIの骨組みと
 * Zodバリデーション/任意のJSON Schema + Ajvバリデーションを実装する。
 */

import Ajv, { type ErrorObject, type Options as AjvOptions, type KeywordDefinition } from 'ajv';
import addFormats from 'ajv-formats';
import type { MindmapData, ValidationResult } from '../types';
import { t, type Locale } from '../i18n';
import { ZodMindmapValidator } from '../types';

export type JsonSchema = Record<string, unknown>;

export interface SchemaConversionResult {
  success: boolean;
  schema?: JsonSchema;
  error?: string;
}

export interface RegisteredSchemaMeta {
  name: string;
  version: string;
  description?: string;
  createdAt?: string;
}

type SchemaRecord = { schema: JsonSchema; meta: RegisteredSchemaMeta };

export class SchemaManager {
  private ajv: Ajv | null = null;
  private currentSchema: JsonSchema | null = null;
  private locale: Locale = 'ja';
  private registry: Map<string, Map<string, SchemaRecord>> = new Map(); // name -> version -> record
  private active: { name: string; version: string } | null = null;

  /** 現行Zodスキーマによる検証 */
  validateWithZod(data: unknown): ValidationResult {
    const result = ZodMindmapValidator.safeParse(data);
    if (result.success) return { valid: true, errors: [] };

    return {
      valid: false,
      errors: (result.errors || []).map((e) => ({
        path: e.path || 'root',
        message: this.translateZodMessage(e.code, e.message),
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
      this.registerDefaultKeywords(this.ajv);
    }
    return this.ajv;
  }

  /** 既定のカスタムキーワード登録 */
  private registerDefaultKeywords(ajv: Ajv) {
    // 非空文字列
    const nonEmptyString: KeywordDefinition = {
      keyword: 'nonEmptyString',
      type: 'string',
      errors: true,
      validate: function (_schema: true, data: unknown) {
        const ok = typeof data === 'string' && data.trim().length > 0;
        // @ts-expect-error Ajv error typing at runtime
        (nonEmptyString.validate as any).errors = ok
          ? null
          : [{ keyword: 'nonEmptyString', message: 'string must be non-empty' }];
        return ok;
      },
    };

    // ノードIDのユニーク性チェック（MindmapData向け）
    const uniqueNodeIds: KeywordDefinition = {
      keyword: 'uniqueNodeIds',
      type: 'object',
      errors: true,
      validate: function (_schema: true, data: unknown) {
        const seen = new Set<string>();
        let ok = true;
        function walk(node: any) {
          if (!ok || !node) return;
          const id = node.id;
          if (typeof id === 'string') {
            if (seen.has(id)) {
              ok = false;
              return;
            }
            seen.add(id);
          }
          const children = Array.isArray(node.children) ? node.children : [];
          for (const c of children) walk(c);
        }
        if (data && typeof data === 'object' && (data as any).root) {
          walk((data as any).root);
        }
        // @ts-expect-error Ajv error typing at runtime
        (uniqueNodeIds.validate as any).errors = ok
          ? null
          : [{ keyword: 'uniqueNodeIds', message: 'node ids must be unique' }];
        return ok;
      },
    };

    ajv.addKeyword(nonEmptyString);
    ajv.addKeyword(uniqueNodeIds);
  }

  /** カスタムキーワードを登録 */
  registerKeyword(def: KeywordDefinition) {
    const ajv = this.getAjv();
    ajv.addKeyword(def);
  }

  /** 既定/現在のJSON Schemaを設定 */
  setJsonSchema(schema: JsonSchema) {
    this.currentSchema = schema;
  }

  /** 現在スキーマで検証 */
  validateCurrentSchema(data: unknown): ValidationResult {
    if (!this.currentSchema) return { valid: true, errors: [] };
    return this.validateWithAjv(this.currentSchema, data);
  }

  /**
   * バージョニング: スキーマ登録
   */
  registerSchema(name: string, version: string, schema: JsonSchema, meta?: Partial<RegisteredSchemaMeta>) {
    const versions = this.registry.get(name) || new Map<string, SchemaRecord>();
    versions.set(version, {
      schema,
      meta: {
        name,
        version,
        createdAt: new Date().toISOString(),
        ...meta,
      },
    });
    this.registry.set(name, versions);
  }

  /** スキーマ取得 */
  getSchema(name: string, version: string): JsonSchema | null {
    const versions = this.registry.get(name);
    return versions?.get(version)?.schema || null;
  }

  /** メタ情報取得 */
  getSchemaMeta(name: string, version: string): RegisteredSchemaMeta | null {
    const versions = this.registry.get(name);
    return versions?.get(version)?.meta || null;
  }

  /** バージョン一覧 */
  listSchemaVersions(name: string): RegisteredSchemaMeta[] {
    const versions = this.registry.get(name);
    if (!versions) return [];
    return Array.from(versions.values()).map(r => r.meta);
  }

  /** アクティブスキーマ設定 */
  setActiveSchema(name: string, version: string) {
    const s = this.getSchema(name, version);
    if (!s) throw new Error(`Schema not found: ${name}@${version}`);
    this.active = { name, version };
    this.currentSchema = s;
  }

  /** アクティブスキーマ情報取得 */
  getActiveSchemaInfo(): { name: string; version: string } | null {
    return this.active;
  }

  /**
   * 単純マイグレーション: 新版に存在しない必須プロパティのチェックのみ記録
   * 実データ変換はプロジェクト要件に応じて拡張する。
   */
  migrate(name: string, fromVersion: string, toVersion: string): { ok: boolean; log: string[] } {
    const from = this.getSchema(name, fromVersion);
    const to = this.getSchema(name, toVersion);
    const log: string[] = [];
    if (!from || !to) {
      log.push('source or target schema not found');
      return { ok: false, log };
    }
    // 例: required の差分だけログに残す簡易実装
    const fromReq = Array.isArray((from as any).required) ? (from as any).required as string[] : [];
    const toReq = Array.isArray((to as any).required) ? (to as any).required as string[] : [];
    for (const r of fromReq) {
      if (!toReq.includes(r)) log.push(`required dropped in target: ${r}`);
    }
    for (const r of toReq) {
      if (!fromReq.includes(r)) log.push(`new required in target: ${r}`);
    }
    return { ok: true, log };
  }

  /** 任意のJSON Schemaで Ajv 検証を行う */
  validateWithAjv(schema: JsonSchema, data: unknown): ValidationResult {
    const ajv = this.getAjv();
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) return { valid: true, errors: [] };

    const errors = (validate.errors || []).map((err: ErrorObject) => ({
      path: err.instancePath || err.schemaPath || 'root',
      message: this.translateAjvMessage(err.keyword, err.message || 'validation error'),
      value: err.data,
      expected: typeof err.params === 'object' ? JSON.stringify(err.params) : undefined,
      code: err.keyword,
    }));

    return { valid: false, errors };
  }

  setLocale(locale: Locale) {
    this.locale = locale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  private translateAjvMessage(keyword: string, fallback: string): string {
    switch (keyword) {
      case 'nonEmptyString':
        return t('errors.nonEmptyString', this.locale, fallback);
      case 'uniqueNodeIds':
        return t('errors.uniqueNodeIds', this.locale, fallback);
      default:
        return fallback;
    }
  }

  private translateZodMessage(code?: string, fallback?: string): string {
    switch (code) {
      case 'invalid_type':
        return t('errors.invalid_type', this.locale, fallback);
      default:
        return fallback || 'validation error';
    }
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
