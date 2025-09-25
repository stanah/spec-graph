/**
 * マインドマップコア機能のエントリポイント
 * プラットフォーム非依存の機能を提供
 */

// タイプ定義をエクスポート
export * from './types';

// 統合コア機能をエクスポート
export { MindmapCore } from './MindmapCore';
export { MindmapParser } from './parser/MindmapParser';
export { ViewSwitcher, type ViewType, type FileUri } from './ViewSwitcher';

// 分離されたコンポーネントもエクスポート（上級者向け）
export { MindmapCoreLogic } from './logic/MindmapCoreLogic';
export { MindmapRenderer } from './renderer/MindmapRenderer';
export type { ICoreLogic } from './logic/ICoreLogic';

// 従来の描画専用クラス（後方互換性のため）
export { MindmapCore as MindmapCoreRenderer } from './renderer/MindmapCore';

// ユーティリティ（今後追加）
// export * from './utils';