# spec-graph

> Requirements specification graph toolkit with multi-view UI (mindmap is one feature)

[![Progress](https://img.shields.io/badge/Progress-37%25-red)](https://github.com/stanah/spec-graph)
[![Tasks](https://img.shields.io/badge/Tasks-35-blue)](https://github.com/stanah/spec-graph)
[![Subtasks](https://img.shields.io/badge/Subtasks-162-lightgray)](https://github.com/stanah/spec-graph)

📋 **Last Updated**: 2025-08-14

## 🎯 Project Overview

spec-graph は、JSON/YAML で記述された要件仕様をグラフ構造として扱い、複数のビューで可視化・編集するツールキットです。マインドマップはそのうちの1機能（ビュー）であり、他に表形式（Table）やリッチドキュメント（Document）などのビューを提供します。VSCode拡張と連携し、開発ワークフローに自然に統合されます。

## 📊 Task Progress

### Summary
- **Total Tasks**: 35
- **Completed**: 13 (37%)
- **In Progress**: 0 (0%)
- **Pending**: 15 (43%)
- **Deferred**: 1 (3%) - *VSCode拡張には不要*
- **Total Subtasks**: 162 (91 completed, 0 in progress, 70 pending)

### Status Distribution

```
✅ Completed:     37%
🔄 In Progress:   0%
⏳ Pending:       43%
⏸️ Deferred:      3%
```

---

## 🚀 Current Sprint - In Progress Tasks

### 🔄 Task 3: エディタコンポーネントの実装
**Priority**: High | **Progress**: 0/5 subtasks completed
- JSON/YAML編集用のコードエディタを実装
- リアルタイム構文チェックと自動補完機能を提供
- **Dependencies**: Tasks 1, 2 ✅

### 🔄 Task 4: マインドマップレンダリングエンジンの実装  
**Priority**: High | **Progress**: 0/5 subtasks completed
- D3.jsを使用してインタラクティブなマインドマップの描画エンジンを実装
- **Dependencies**: Task 2 ✅

### 🔄 Task 5: リアルタイム同期システムの構築
**Priority**: High | **Progress**: 1/5 subtasks completed  
- エディタとマインドマップ間のリアルタイム同期機能
- **Dependencies**: Tasks 3, 4

### 🔄 Task 7: UIテーマとカスタマイズ機能の実装 ⚡ *縮小済み*
**Priority**: Medium | **Progress**: 0/3 subtasks completed
- **シンプルなダークモード対応のみ**に範囲を縮小
- CSS変数ベース、システム設定連携、手動切り替えUI
- **Dependencies**: Task 5

### 🔄 Task 10: VSCode拡張対応とパフォーマンス最適化 ⚡ *依存関係調整済み*
**Priority**: Medium | **Progress**: 0/10 subtasks completed
- VSCode拡張として動作するための準備
- **Dependencies**: Tasks 1-5, 7-9 (Task 6を除外)

### 🔄 Task 22: ノード状態インジケーター表示機能の実装
**Priority**: High | **Progress**: 2/5 subtasks completed ⭐
- マインドマップノードの状態情報を視覚的に表示
- **Dependencies**: Tasks 15, 16

---

## ✅ Completed Tasks

### ✅ Task 1: プロジェクト基盤のセットアップと開発環境構築
**Priority**: High | **Progress**: 5/5 subtasks completed  
- TypeScriptプロジェクトの初期化
- 開発用依存関係のインストール
- ESLintとPrettierの設定

### ✅ Task 2: データモデルとスキーマ定義の実装  
**Priority**: High | **Progress**: 5/5 subtasks completed
- マインドマップのデータ構造を定義
- JSON/YAMLのスキーマバリデーション実装

### ✅ Task 11: プロジェクトセットアップとMCP基盤構築
**Priority**: High | **Progress**: 5/5 subtasks completed
- MCPサーバーの基本構造を構築
- マインドマップ操作のための基盤整備

---

## ⏸️ Deferred Tasks (VSCode拡張には不要)

### ⏸️ Task 6: ローカルストレージとファイル操作の実装
**Priority**: Medium | **Status**: Deferred
- File System Access APIを使用したファイル読み書き機能
- VSCode拡張では不要なため延期

---

## ⏳ High Priority Pending Tasks

### Task 12: マインドマップスキーマ定義と検証システム
- マインドマップのJSONスキーマを定義
- データ構造の検証システムを実装
- **Complexity**: 5/10

### Task 13: マインドマップ読み取り機能の実装  
- マインドマップファイルの読み取りとデータ取得機能
- **Complexity**: 4/10

### Task 14: ノード追加機能の実装
- マインドマップに新しいノードを追加する機能
- **Complexity**: 5/10

### Task 21: JSON/YAML相互変換機能の実装
- ユーザーがJSON/YAMLフォーマットを選択
- ファイル読み込み時に自動変換する機能
- **Priority**: High

---

## 🛠️ Development Commands

### VSCode Extension
```bash
# VSCode拡張ビルド（webview含む）
pnpm build:vscode

# VSCode拡張パッケージビルド
pnpm build:vscode-package
```

### Testing & Quality
```bash
# ESLint実行
pnpm lint

# 全テスト実行（ライブラリ + VSCode拡張）
pnpm test

# ライブラリテスト一回実行  
pnpm test:run

# テストカバレッジレポート生成
pnpm test:coverage

# VSCode拡張テスト実行
pnpm test:vscode
```

---

## 🏗️ Architecture Overview

### Core Components
- **Editor Component**: Monaco Editor with JSON/YAML support
- **Mindmap Renderer**: D3.js-based interactive visualization
- **State Management**: Zustand for real-time synchronization
- **Schema Validation**: ajv with JSON Schema
- **File System**: File System Access API integration

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Visualization**: D3.js
- **Editor**: Monaco Editor
- **State**: Zustand
- **Validation**: ajv + JSON Schema
- **Styling**: CSS Variables + Theme System
- **Testing**: Vitest
- **VSCode**: Extension API

---

## 📦 Project Structure

```
src/
├── components/          # React components
├── core/               # Core business logic
│   ├── data/           # Data models & schemas
│   ├── renderer/       # Mindmap rendering engine  
│   └── utils/          # Utility functions
├── hooks/              # Custom React hooks
├── stores/             # Zustand state management
├── styles/             # CSS and theme files
└── types/              # TypeScript type definitions

vscode-extension/       # VSCode extension code
docs/                   # Documentation
tests/                  # Test files
```

---

## 🎯 Next Steps

1. **Complete Editor Component** - Implement Monaco Editor with JSON/YAML validation
2. **Build Mindmap Renderer** - Create D3.js-based visualization engine  
3. **Establish Real-time Sync** - Connect editor and mindmap with bidirectional updates
4. **Add File Operations** - Implement local file read/write capabilities
5. **Theme System** - Build customizable UI themes with dark mode

---

## 📈 Development Metrics

- **Lines of Code**: ~15,000+ (estimated)
- **Components**: 25+ React components
- **Test Coverage**: Target 80%+
- **Performance**: <100ms render time for 1000+ nodes
- **Browser Support**: Modern browsers with File System Access API

---

**Generated with Task Master AI** | **Last Sync**: 2025-08-14 10:30 JST

<!-- TASKMASTER_EXPORT_START -->
> 🎯 **Taskmaster Export** - 2025-09-06 18:20:18 UTC
> 📋 Export: with subtasks • Status filter: all
> 🔗 Powered by [Task Master](https://task-master.dev?utm_source=github-readme&utm_medium=readme-export&utm_campaign=req-mindmap&utm_content=task-export-link)

| Project Dashboard |  |
| :-                |:-|
| Task Progress     | ███████░░░░░░░░░░░░░ 37% |
| Done | 13 |
| In Progress | 0 |
| Pending | 15 |
| Deferred | 1 |
| Cancelled | 6 |
|-|-|
| Subtask Progress | ███████████░░░░░░░░░ 56% |
| Completed | 91 |
| In Progress | 0 |
| Pending | 70 |


| ID | Title | Status | Priority | Dependencies | Complexity |
| :- | :-    | :-     | :-       | :-           | :-         |
| 1 | プロジェクト基盤のセットアップと開発環境構築 | ✓&nbsp;done | high | None | N/A |
| 1.1 | TypeScriptプロジェクトの初期化とpnpm設定 | ✓&nbsp;done | -            | None | N/A |
| 1.2 | 開発用依存関係のインストールと設定 | ✓&nbsp;done | -            | 1.1 | N/A |
| 1.3 | プロジェクトディレクトリ構造の作成 | ✓&nbsp;done | -            | 1.1 | N/A |
| 1.4 | ESLintとPrettierの設定 | ✓&nbsp;done | -            | 1.1, 1.2 | N/A |
| 1.5 | Git hooksとVSCode設定の構成 | ✓&nbsp;done | -            | 1.4 | N/A |
| 2 | データモデルとスキーマ定義の実装 | ✓&nbsp;done | high | 1 | N/A |
| 2.1 | TypeScript型定義とインターフェースの実装 | ✓&nbsp;done | -            | None | N/A |
| 2.2 | JSON Schema定義とバリデーション実装 | ✓&nbsp;done | -            | 2.1 | N/A |
| 2.3 | YAML/JSONパーサーとシリアライザーの実装 | ✓&nbsp;done | -            | 2.1, 2.2 | N/A |
| 2.4 | スキーマバージョニングとマイグレーション機能 | ✓&nbsp;done | -            | 2.2, 2.3 | N/A |
| 2.5 | データ検証ユーティリティとヘルパー関数の実装 | ✓&nbsp;done | -            | 2.1, 2.2, 2.3 | N/A |
| 3 | エディタコンポーネントの実装 | x&nbsp;deferred | high | 1, 2 | ● 4 |
| 3.1 | Monaco Editorの基本統合 | ✓&nbsp;done | -            | None | N/A |
| 3.2 | リアルタイムバリデーション機能 | ✓&nbsp;done | -            | 1 | N/A |
| 3.3 | スキーマベース自動補完の実装 | x&nbsp;deferred | -            | None | N/A |
| 3.4 | 完全な双方向同期の実装 | ✓&nbsp;done | -            | 3 | N/A |
| 3.5 | エディタUI拡張機能の実装 | ○&nbsp;pending | -            | 1, 3 | N/A |
| 4 | マインドマップレンダリングエンジンの実装 | ✓&nbsp;done | high | 2 | N/A |
| 4.1 | D3.js力指向グラフレイアウトエンジンの実装 | ✓&nbsp;done | -            | None | N/A |
| 4.2 | SVGベースのノードレンダリングシステム | ✓&nbsp;done | -            | 4.1 | N/A |
| 4.3 | インタラクティブ操作コントローラーの実装 | ✓&nbsp;done | -            | 4.2 | N/A |
| 4.4 | アニメーションエンジンの開発 | ✓&nbsp;done | -            | 4.3 | N/A |
| 4.5 | レンダリングパフォーマンス最適化システム | ✓&nbsp;done | -            | 4.4 | N/A |
| 5 | リアルタイム同期システムの構築 | ○&nbsp;pending | high | 3, 4 | N/A |
| 5.1 | Zustand状態管理システムの実装 | ✓&nbsp;done | -            | None | N/A |
| 5.2 | エディタからマインドマップへの同期機能 | ✓&nbsp;done | -            | 5.1 | N/A |
| 5.3 | マインドマップからエディタへの同期機能 | ✓&nbsp;done | -            | 5.1 | N/A |
| 5.4 | エラーリカバリーとコンフリクト解決 | ✓&nbsp;done | -            | 5.2, 5.3 | N/A |
| 5.5 | パフォーマンス最適化と監視 | ✓&nbsp;done | -            | 5.2, 5.3, 5.4 | N/A |
| 6 | ローカルストレージとファイル操作の実装 | x&nbsp;cancelled | medium | 5 | N/A |
| 6.1 | File System Access APIの実装とファイルハンドリング | ○&nbsp;pending | -            | None | N/A |
| 6.2 | ローカルストレージ管理システムの構築 | ○&nbsp;pending | -            | 6.1 | N/A |
| 6.3 | 自動保存機能の実装 | ○&nbsp;pending | -            | 6.1, 6.2 | N/A |
| 6.4 | ファイル監視システムの実装 | ○&nbsp;pending | -            | 6.1 | N/A |
| 6.5 | ファイル操作の状態管理とエラーハンドリング | ○&nbsp;pending | -            | 6.1, 6.2, 6.3, 6.4 | N/A |
| 7 | UIテーマとカスタマイズ機能の実装 | ○&nbsp;pending | medium | 5 | N/A |
| 7.1 | CSS変数ベースのテーマシステムの実装 | ✓&nbsp;done | -            | None | N/A |
| 7.2 | テーマ切り替え機能とシステム設定連携 | ✓&nbsp;done | -            | 1 | N/A |
| 7.3 | 基本的なアクセシビリティ対応 | ✓&nbsp;done | -            | 1, 2 | N/A |
| 8 | 高度な機能群の実装（タグ、進捗管理） | ○&nbsp;pending | medium | 5, 6 | ● 5 |
| 8.1 | タグシステムの基本実装 | ○&nbsp;pending | -            | None | N/A |
| 8.2 | 進捗管理システムの実装 | ○&nbsp;pending | -            | None | N/A |
| 8.3 | 進捗ダッシュボードとガントチャートの実装 | ○&nbsp;pending | -            | 2 | N/A |
| 10 | VSCode拡張対応とパフォーマンス最適化 | ○&nbsp;pending | medium | 1, 2, 3, 4, 5, 7, 8 | N/A |
| 10.1 | コアロジックの分離とプラットフォーム非依存アーキテクチャの設計 | ✓&nbsp;done | -            | None | N/A |
| 10.2 | VSCode拡張アダプターとAPI統合の実装 | ✓&nbsp;done | -            | 10.1 | N/A |
| 10.6 | VSCode拡張用ノード詳細パネルコンポーネントの実装 | ✓&nbsp;done | -            | None | N/A |
| 10.7 | VSCode拡張用ノード編集機能（詳細パネル内）の実装 | ✓&nbsp;done | -            | 10.6 | N/A |
| 10.8 | VSCode拡張用ノード追加機能（子・兄弟追加）の実装 | ✓&nbsp;done | -            | None | N/A |
| 10.9 | VSCode拡張用ノード削除機能の実装 | ✓&nbsp;done | -            | None | N/A |
| 10.10 | VSCode拡張用ツールバーUIの実装 | ✓&nbsp;done | -            | None | N/A |
| 11 | プロジェクトセットアップとMCP基盤構築 | ✓&nbsp;done | high | None | N/A |
| 11.1 | TypeScriptプロジェクトの初期化と基本設定 | ✓&nbsp;done | -            | None | N/A |
| 11.2 | MCP SDK依存関係のインストールと設定 | ✓&nbsp;done | -            | 11.1 | N/A |
| 11.3 | MCPサーバーの基本構造実装 | ✓&nbsp;done | -            | 11.2 | N/A |
| 11.4 | ツール定義インターフェースとスキーマの作成 | ✓&nbsp;done | -            | 11.3 | N/A |
| 11.5 | エラーハンドリングとロギング基盤の実装 | ✓&nbsp;done | -            | 11.4 | N/A |
| 12 | マインドマップスキーマ定義と検証システム | ✓&nbsp;done | high | 11 | N/A |
| 12.1 | Zodスキーマの基本定義と型構造の実装 | ✓&nbsp;done | -            | None | N/A |
| 12.2 | カスタム属性とスキーマ拡張システムの実装 | ✓&nbsp;done | -            | 12.1 | N/A |
| 12.3 | バリデーション関数とエラーハンドリングの実装 | ✓&nbsp;done | -            | 12.1, 12.2 | N/A |
| 12.4 | スキーマバージョニングとマイグレーションシステム | ✓&nbsp;done | -            | 12.3 | N/A |
| 12.5 | MCPツール実装とスキーマ情報API | ✓&nbsp;done | -            | 12.3, 12.4 | N/A |
| 13 | マインドマップ読み取り機能の実装 | x&nbsp;cancelled | high | 12 | N/A |
| 13.1 | ファイル読み取り基盤機能の実装 | ○&nbsp;pending | -            | None | N/A |
| 13.2 | JSON解析とスキーマ検証の統合 | ○&nbsp;pending | -            | 13.1 | N/A |
| 13.3 | 特定ノード検索機能の実装 | ○&nbsp;pending | -            | 13.2 | N/A |
| 13.4 | メタデータ取得機能の実装 | ○&nbsp;pending | -            | 13.3 | N/A |
| 13.5 | MCPツールとしての統合と公開 | ○&nbsp;pending | -            | 13.4 | N/A |
| 14 | ノード追加機能の実装 | ✓&nbsp;done | high | 13 | N/A |
| 14.1 | ユニークID生成機能の実装 | ✓&nbsp;done | -            | None | N/A |
| 14.2 | ノード検索とツリー走査機能の実装 | ✓&nbsp;done | -            | None | N/A |
| 14.3 | ノード追加のコアロジック実装 | ✓&nbsp;done | -            | 14.1, 14.2 | N/A |
| 14.4 | ファイル操作とトランザクション管理の実装 | ✓&nbsp;done | -            | 14.3 | N/A |
| 14.5 | バックアップと変更履歴の実装 | ✓&nbsp;done | -            | 14.4 | N/A |
| 15 | ノード更新・削除機能の実装 | ✓&nbsp;done | medium | 14 | N/A |
| 15.1 | ノード更新機能の基本実装 | ✓&nbsp;done | -            | None | N/A |
| 15.2 | ノード移動機能の実装 | ✓&nbsp;done | -            | 15.1 | N/A |
| 15.3 | ノード削除機能の実装 | ✓&nbsp;done | -            | 15.1 | N/A |
| 15.4 | 削除確認と警告機能の実装 | ✓&nbsp;done | -            | 15.3 | N/A |
| 15.5 | ルートノード保護とエラーハンドリングの実装 | ✓&nbsp;done | -            | 15.2, 15.3, 15.4 | N/A |
| 16 | 検索・フィルタリング機能の実装 | ○&nbsp;pending | medium | 15 | ● 7 |
| 16.1 | 基本的なキーワード検索エンジンの実装 | ○&nbsp;pending | -            | None | N/A |
| 16.2 | 高度な属性ベースフィルタリング機能の実装 | ○&nbsp;pending | -            | None | N/A |
| 16.3 | 階層レベルによる絞り込みと正規表現サポートの実装 | ○&nbsp;pending | -            | 16.1 | N/A |
| 16.4 | 検索結果のランキングとスコアリングシステムの実装 | ○&nbsp;pending | -            | 16.1, 16.2, 16.3 | N/A |
| 16.5 | 統合検索インターフェースとパフォーマンス最適化の実装 | ○&nbsp;pending | -            | 16.1, 16.2, 16.3, 16.4 | N/A |
| 17 | 構造分析とバリデーション機能 | ○&nbsp;pending | medium | 16 | ● 6 |
| 17.1 | ノード統計情報集計機能の実装 | ○&nbsp;pending | -            | None | N/A |
| 17.2 | 循環参照検出アルゴリズムの実装 | ○&nbsp;pending | -            | 17.1 | N/A |
| 17.3 | 孤立ノード検出機能の開発 | ○&nbsp;pending | -            | 17.1 | N/A |
| 17.4 | 構造最適化提案エンジンの構築 | ○&nbsp;pending | -            | 17.1, 17.2, 17.3 | N/A |
| 17.5 | 分析レポート生成・出力機能の実装 | ○&nbsp;pending | -            | 17.1, 17.2, 17.3, 17.4 | N/A |
| 18 | バックアップとバージョン管理システム | x&nbsp;cancelled | high | 17 | N/A |
| 18.1 | バックアップシステムのコア実装 | ○&nbsp;pending | -            | None | N/A |
| 18.2 | バージョン履歴管理システムの構築 | ○&nbsp;pending | -            | 18.1 | N/A |
| 18.3 | 差分検出エンジンの開発 | ○&nbsp;pending | -            | 18.1, 18.2 | N/A |
| 18.4 | ロールバック機能の実装 | ○&nbsp;pending | -            | 18.2, 18.3 | N/A |
| 18.5 | バックアップの圧縮と最適化 | ○&nbsp;pending | -            | 18.1, 18.3 | N/A |
| 19 | セキュリティとアクセス制御の実装 | x&nbsp;cancelled | high | 18 | N/A |
| 19.1 | パストラバーサル攻撃防止機能の実装 | ○&nbsp;pending | -            | None | N/A |
| 19.2 | 入力データサニタイゼーションとXSS対策 | ○&nbsp;pending | -            | None | N/A |
| 19.3 | ロールベースアクセス制御（RBAC）システムの構築 | ○&nbsp;pending | -            | 19.1, 19.2 | N/A |
| 19.4 | セキュリティ監査ログシステムの実装 | ○&nbsp;pending | -            | 19.3 | N/A |
| 19.5 | 機密情報マスキングとデータ保護機能 | ○&nbsp;pending | -            | 19.3, 19.4 | N/A |
| 20 | パフォーマンス最適化とスケーラビリティ | x&nbsp;cancelled | medium | 19 | N/A |
| 20.1 | LRUキャッシュシステムの実装と最適化 | ○&nbsp;pending | -            | None | N/A |
| 20.2 | 遅延読み込みとバーチャルスクロールの実装 | ○&nbsp;pending | -            | 20.1 | N/A |
| 20.3 | バッチ処理とキューイングシステムの構築 | ○&nbsp;pending | -            | 20.1 | N/A |
| 20.4 | ストリーミング処理とチャンク分割の実装 | ○&nbsp;pending | -            | 20.3 | N/A |
| 20.5 | インデックス構造とクエリ最適化の実装 | ○&nbsp;pending | -            | 20.2, 20.4 | N/A |
| 21 | JSON/YAML相互変換機能の実装 | x&nbsp;cancelled | high | 15, 16 | N/A |
| 21.1 | フォーマット選択UIとステート管理の実装 | ○&nbsp;pending | -            | None | N/A |
| 21.2 | js-yamlライブラリの統合とFormatConverterクラスの実装 | ○&nbsp;pending | -            | None | N/A |
| 21.3 | ファイル読み込みと自動変換機能の実装 | ○&nbsp;pending | -            | 21.2 | N/A |
| 21.4 | エラーハンドリングと通知システムの実装 | ○&nbsp;pending | -            | 21.2, 21.3 | N/A |
| 21.5 | エディタ連携とリアルタイムプレビューの実装 | ○&nbsp;pending | -            | 21.1, 21.2, 21.3, 21.4 | N/A |
| 22 | ノード状態インジケーター表示機能の実装 | ○&nbsp;pending | high | 15, 16 | N/A |
| 22.1 | 優先度カラーインジケーターのReactコンポーネント実装 | ✓&nbsp;done | -            | None | N/A |
| 22.2 | ステータスアイコンインジケーターのSVGレンダリングシステム実装 | ✓&nbsp;done | -            | None | N/A |
| 22.3 | コンパクト状態表示バッジコンポーネントの実装 | ✓&nbsp;done | -            | 1, 2 | N/A |
| 22.4 | インジケーター凡例パネルコンポーネントの実装 | ✓&nbsp;done | -            | 1, 2 | N/A |
| 22.5 | インジケーターシステムの統合とパフォーマンス最適化 | ✓&nbsp;done | -            | 1, 2, 3, 4 | N/A |
| 23 | コアロジックの分離とプラットフォーム非依存アーキテクチャの設計 | ○&nbsp;pending | high | 15, 16, 17, 18, 19, 20, 21, 22 | ● 3 |
| 23.1 | Phase1-1: MindmapCore統合テスト作成 | ✓&nbsp;done | -            | None | N/A |
| 23.2 | Phase1-2: コアロジック振る舞いテスト作成 | ✓&nbsp;done | -            | 23.1 | N/A |
| 23.3 | Phase1-3: プラットフォーム統合テスト強化 | ○&nbsp;pending | -            | 23.2 | N/A |
| 23.4 | Phase1-4: E2Eテスト拡充とカバレッジ確認 | ○&nbsp;pending | -            | 23.3 | N/A |
| 23.5 | Phase2-1: ICoreLogicインターフェース定義 | ○&nbsp;pending | -            | 23.4 | N/A |
| 23.6 | Phase2-2: MindmapCoreLogicクラス新規作成 | ○&nbsp;pending | -            | 23.5 | N/A |
| 23.7 | Phase2-3: 既存コードとの段階的統合 | ○&nbsp;pending | -            | 23.6 | N/A |
| 23.8 | Phase2-4: MindmapCore→MindmapRenderer移行 | ○&nbsp;pending | -            | 23.7 | N/A |
| 24 | ビュー切り替えシステムの基盤実装 | ✓&nbsp;done | high | None | N/A |
| 24.1 | ViewMode型定義とストア統合 | ✓&nbsp;done | -            | None | N/A |
| 24.2 | ViewContextとuseViewModeフック実装 | ✓&nbsp;done | -            | 24.1 | N/A |
| 24.3 | ViewSwitcherコンポーネントの実装 | ✓&nbsp;done | -            | 24.2 | N/A |
| 24.4 | ViewContainerコンポーネントの実装 | ✓&nbsp;done | -            | 24.2, 24.3 | N/A |
| 24.5 | 既存コンポーネントとの統合と動作確認 | ✓&nbsp;done | -            | 24.4 | N/A |
| 25 | テーブルビューコンポーネントの実装 | ✓&nbsp;done | high | 24 | ● 4 |
| 25.1 | @tanstack/react-tableの導入と基本セットアップ | ✓&nbsp;done | -            | None | N/A |
| 25.2 | MindmapNode構造からのカラム定義自動生成 | ✓&nbsp;done | -            | 25.1 | N/A |
| 25.3 | ソート・フィルタリング機能の実装 | ✓&nbsp;done | -            | 25.2 | N/A |
| 25.4 | カスタムセルレンダラーとステータスバッジの実装 | ✓&nbsp;done | -            | 25.2 | N/A |
| 25.5 | 行選択機能とselectedNodeId同期の実装 | ✓&nbsp;done | -            | 25.1, 25.2 | N/A |
| 25.6 | カラムリサイズ・仮想スクロール・ページネーション実装 | ✓&nbsp;done | -            | 25.1, 25.3, 25.4, 25.5 | N/A |
| 26 | テーブルエクスポート機能の実装 | ○&nbsp;pending | medium | 25 | ● 6 |
| 26.1 | ExportServiceクラスとWorker環境の実装 | ○&nbsp;pending | -            | None | N/A |
| 26.2 | CSV形式エクスポート機能の実装 | ○&nbsp;pending | -            | 26.1 | N/A |
| 26.3 | Excel形式エクスポート機能の実装 | ○&nbsp;pending | -            | 26.1 | N/A |
| 26.4 | エクスポート設定ダイアログUIの実装 | ○&nbsp;pending | -            | 26.2, 26.3 | N/A |
| 26.5 | プログレスバー表示とVSCodeファイル保存統合 | ○&nbsp;pending | -            | 26.1, 26.4 | N/A |
| 27 | リッチドキュメントビューの実装 | ✓&nbsp;done | high | 24 | ● 8 |
| 27.1 | Lexicalフレームワークのセットアップとカスタムノードタイプの定義 | ✓&nbsp;done | -            | None | N/A |
| 27.2 | MindmapNodeからLexical EditorStateへの変換処理実装 | ✓&nbsp;done | -            | 27.1 | N/A |
| 27.3 | DocumentViewコンポーネントと折りたたみ可能セクションの実装 | ✓&nbsp;done | -            | 27.1, 27.2 | N/A |
| 27.4 | 目次（TOC）自動生成とナビゲーション機能の実装 | ✓&nbsp;done | -            | 27.3 | N/A |
| 27.5 | プリント用CSSとPDFエクスポート機能の実装 | ✓&nbsp;done | -            | 27.3, 27.4 | N/A |
| 28 | JSON Schema ベースのバリデーションシステム | ✓&nbsp;done | high | None | N/A |
| 28.1 | SchemaManager クラスの実装とコアバリデーション基盤の構築 | ✓&nbsp;done | -            | None | N/A |
| 28.2 | Ajv カスタムキーワードとバリデーションルールの実装 | ✓&nbsp;done | -            | 28.1 | N/A |
| 28.3 | Monaco Editor 統合とリアルタイムエラー表示の実装 | ✓&nbsp;done | -            | 28.1, 28.2 | N/A |
| 28.4 | エラーメッセージの i18n 対応とローカライゼーション | ✓&nbsp;done | -            | 28.2, 28.3 | N/A |
| 28.5 | スキーマバージョニングとテンプレートライブラリの実装 | ✓&nbsp;done | -            | 28.1, 28.2, 28.4 | N/A |
| 29 | ドキュメントタイプ管理システムの構築 | ✓&nbsp;done | medium | 28 | ● 7 |
| 29.1 | DocumentTypeRegistry クラスとBaseDocumentType抽象クラスの実装 | ✓&nbsp;done | -            | None | N/A |
| 29.2 | 組み込みドキュメントタイプ（Requirements、Stakeholders）の実装 | ✓&nbsp;done | -            | 29.1 | N/A |
| 29.3 | 組み込みドキュメントタイプ（Design、Tasks）の実装 | ✓&nbsp;done | -            | 29.1 | N/A |
| 29.4 | タイプ間関連性グラフとカスタムタイプ登録APIの実装 | ✓&nbsp;done | -            | 29.1, 29.2, 29.3 | N/A |
| 29.5 | DocumentTypeSelector UIコンポーネントの実装 | ✓&nbsp;done | -            | 29.1, 29.2, 29.3, 29.4 | N/A |
| 30 | ID ベースの依存関係管理システム | ✓&nbsp;done | high | None | N/A |
| 30.1 | IDManager クラスの実装と nanoid 統合 | ✓&nbsp;done | -            | None | N/A |
| 30.2 | DependencyGraph クラスの基本実装 | ✓&nbsp;done | -            | 30.1 | N/A |
| 30.3 | 循環参照検出アルゴリズムの実装 | ✓&nbsp;done | -            | 30.2 | N/A |
| 30.4 | トポロジカルソートと依存順序解決 | ✓&nbsp;done | -            | 30.2, 30.3 | N/A |
| 30.5 | 依存関係変更追跡とEvent Sourcingパターンの実装 | ✓&nbsp;done | -            | 30.2, 30.3, 30.4 | N/A |
| 31 | 依存関係ビジュアライザーの実装 | ○&nbsp;pending | medium | 30 | ● 7 |
| 31.1 | Cytoscape.jsの統合とDependencyGraphViewコンポーネントの基盤実装 | ○&nbsp;pending | -            | None | N/A |
| 31.2 | グラフスタイルとレイアウトアルゴリズムの実装 | ○&nbsp;pending | -            | 31.1 | N/A |
| 31.3 | インタラクティブ機能とナビゲーション実装 | ○&nbsp;pending | -            | 31.2 | N/A |
| 31.4 | グラフデータ連携とリアルタイム更新機能 | ○&nbsp;pending | -            | 31.3 | N/A |
| 31.5 | エクスポート機能とパフォーマンス最適化 | ○&nbsp;pending | -            | 31.4 | N/A |
| 32 | リンク・ジャンプ機能の実装 | ○&nbsp;pending | medium | 30 | ● 6 |
| 32.1 | LinkResolverクラスとマークダウンパーサーの実装 | ○&nbsp;pending | -            | None | N/A |
| 32.2 | NavigationHistoryクラスとブラウザHistory API統合 | ○&nbsp;pending | -            | 32.1 | N/A |
| 32.3 | BreadcrumbNavigationコンポーネントの実装 | ○&nbsp;pending | -            | 32.1, 32.2 | N/A |
| 32.4 | リンククリックハンドラーとスムーズスクロール機能 | ○&nbsp;pending | -            | 32.1, 32.2 | N/A |
| 32.5 | リンクプレビュー機能とツールチップ実装 | ○&nbsp;pending | -            | 32.1, 32.4 | N/A |
| 33 | データ整合性チェックシステム | ○&nbsp;pending | medium | 30, 31 | ● 5 |
| 34 | 高度なテーブル編集機能 | ○&nbsp;pending | low | 25 | ● 5 |
| 35 | パフォーマンス最適化とコード分割 | ○&nbsp;pending | low | 24, 25, 27, 31 | ● 4 |
| 36 | VSCode統合ファイル管理とビュー自動切り替え機能 | ○&nbsp;pending | high | 10, 23, 30, 31, 35 | ● 5 |
| 36.1 | VSCodeファイルシステムAPIアダプターの実装 | ○&nbsp;pending | -            | None | N/A |
| 36.2 | ファイル形式検出とビュー切り替えロジックの実装 | ○&nbsp;pending | -            | None | N/A |
| 36.3 | 自動保存とデバウンス機構の実装 | ○&nbsp;pending | -            | 36.1 | N/A |
| 36.4 | ファイル状態同期とコンフリクト解決の実装 | ○&nbsp;pending | -            | 36.1, 36.3 | N/A |
| 36.5 | VSCode TextDocumentProviderとコマンドの統合 | ○&nbsp;pending | -            | 36.1, 36.2 | N/A |

> 📋 **End of Taskmaster Export** - Tasks are synced from your project using the `sync-readme` command.
<!-- TASKMASTER_EXPORT_END -->
