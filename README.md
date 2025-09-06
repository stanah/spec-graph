# spec-graph

> Requirements specification graph toolkit with multi-view UI (mindmap is one feature)

[![Progress](https://img.shields.io/badge/Progress-14%25-red)](https://github.com/stanah/spec-graph)
[![Tasks](https://img.shields.io/badge/Tasks-22-blue)](https://github.com/stanah/spec-graph)
[![Subtasks](https://img.shields.io/badge/Subtasks-115-lightgray)](https://github.com/stanah/spec-graph)

📋 **Last Updated**: 2025-08-14

## 🎯 Project Overview

spec-graph は、JSON/YAML で記述された要件仕様をグラフ構造として扱い、複数のビューで可視化・編集するツールキットです。マインドマップはそのうちの1機能（ビュー）であり、他に表形式（Table）やリッチドキュメント（Document）などのビューを提供します。VSCode拡張と連携し、開発ワークフローに自然に統合されます。

## 📊 Task Progress

### Summary
- **Total Tasks**: 22
- **Completed**: 3 (14%)
- **In Progress**: 6 (27%)
- **Pending**: 12 (54%)
- **Deferred**: 1 (5%) - *VSCode拡張には不要*
- **Total Subtasks**: 113 (16 completed, 10 in progress, 87 pending)

### Status Distribution

```
✅ Completed:     ████▌           13.6%
🔄 In Progress:   ███████         27.3%
⏳ Pending:      ████████████▌   54.5%
⏸️ Deferred:     █               4.6%
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
