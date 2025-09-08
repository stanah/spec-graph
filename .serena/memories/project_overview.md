# spec-graph - プロジェクト概要

## プロジェクトの目的
要求定義・要件定義を効率的に進めるためのマインドマップツール。JSON/YAML形式でのテキストベース管理と、リアルタイムでの視覚的なマインドマップ表示を提供する。

## 主な特徴
- 左側エディタでJSON/YAML編集、右側でリアルタイムマインドマップ表示
- ローカル環境での実行（インターネット接続不要）
- 将来的にVSCode拡張としての公開も想定
- ノードの折りたたみ/展開機能
- ズーム・パン機能で大規模なマインドマップにも対応

## テクノロジースタック
- **フレームワーク**: React 19.1.0
- **言語**: TypeScript 5.8.3
- **ビルドツール**: Vite 7.0.4
- **パッケージマネージャー**: pnpm 10.13.1
- **状態管理**: Zustand 5.0.7
- **エディタ**: Monaco Editor (VSCodeエディタ)
- **データ可視化**: D3.js 7.9.0
- **データ解析**: js-yaml, ajv (JSONスキーマ検証)
- **テスト**: Vitest, React Testing Library

## プロジェクト構造
- `/src/components` - UIコンポーネント（Layout, EditorPane, MindmapPane, NodeDetailsPanel）
- `/src/types` - TypeScript型定義
- `/src/stores` - Zustand状態管理
- `/src/services` - ビジネスロジック（パーサー、ファイル管理、レンダリング）
- `/src/hooks` - カスタムReactフック
- `/src/schemas` - JSONスキーマ定義
- `/.kiro` - プロジェクト仕様書・設計書