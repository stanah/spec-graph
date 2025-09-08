import React, { useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { parseAny, detectDocType } from '../../services/docTypes';
import { RequirementsDocView } from './docs/RequirementsDoc';
import { StakeholdersDocView } from './docs/StakeholdersDoc';
import { DesignDocView } from './docs/DesignDoc';
import { TasksDocView } from './docs/TasksDoc';
import { SchemaDocumentView } from './schema/SchemaDocumentView';
// スキーマ駆動レンダリング用に、代表的なスキーマを同梱
// 既存の要件スキーマ（拡張x-uiは任意）
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import with bundler
import requirementsSchema from '../../../docs/schemas/requirements.v1.json';
// @ts-ignore - JSON import
import functionalRequirementsSchema from '../../../docs/schemas/functional-requirements.v1.json';

export const AnyDocumentView: React.FC = () => {
  const content = useAppStore(s => s.file.fileContent);

  const { data, type, error } = useMemo(() => {
    try {
      const d = parseAny(content || '');
      const t = detectDocType(d);
      return { data: d as any, type: t as string, error: null as string | null };
    } catch (e) {
      return { data: null, type: 'unknown', error: e instanceof Error ? e.message : String(e) };
    }
  }, [content]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h3>ドキュメント解析エラー</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </div>
    );
  }

  switch (type) {
    case 'requirements':
      // 固定ビューで扱わない拡張プロパティ（functionalRequirements/functionalRequirementsFiles）が
      // 存在する場合はスキーマ駆動ビューで表示
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.functionalRequirements) || Array.isArray(obj.functionalRequirementsFiles)) {
          return <SchemaDocumentView data={data} schema={requirementsSchema as any} />;
        }
      }
      return <RequirementsDocView doc={data} />;
    case 'stakeholders':
      return <StakeholdersDocView doc={data} />;
    case 'design':
      return <DesignDocView doc={data} />;
    case 'tasks':
      return <TasksDocView doc={data} />;
    default:
      // フォールバック: 要件スキーマや機能要件スキーマに近い形ならスキーマ駆動表示
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.systemRequirements) || Array.isArray(obj.userRequirements) || Array.isArray(obj.nonFunctionalRequirements) || Array.isArray(obj.glossary)) {
          return <SchemaDocumentView data={data} schema={requirementsSchema as any} />;
        }
        if (Array.isArray(obj.functionalRequirements)) {
          return <SchemaDocumentView data={data} schema={functionalRequirementsSchema as any} />;
        }
      }
      return (
        <div style={{ padding: 16 }}>
          <h3>サポート外のドキュメント形式</h3>
          <p>利用可能: Requirements / Stakeholders / Design / Tasks</p>
          <details>
            <summary>生データ</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{content?.slice(0, 4000)}</pre>
          </details>
        </div>
      );
  }
};
