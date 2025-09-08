# プロジェクト構造の詳細

## ルートディレクトリ
```
spec-graph/
├── .kiro/                # プロジェクト仕様・設計ドキュメント
│   ├── specs/           # 仕様書
│   │   └── mindmap-tool/
│   │       ├── requirements.md  # 要件定義書
│   │       ├── tasks.md        # タスク管理
│   │       └── design.md       # 設計書
│   └── steering/        # プロジェクト指針
│       ├── language.md  # 言語・表現ガイド
│       ├── product.md   # プロダクト方針
│       ├── structure.md # 構造設計
│       └── tech.md      # 技術選定
├── src/                 # ソースコード
│   ├── components/      # Reactコンポーネント
│   ├── hooks/          # カスタムフック
│   ├── services/       # ビジネスロジック層
│   ├── stores/         # Zustand状態管理
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   ├── schemas/        # JSONスキーマ
│   └── data/           # サンプルデータ
├── public/             # 静的ファイル
├── .vscode/            # VSCode設定
└── 設定ファイル群
```

## 主要なファイル
- `package.json` - 依存関係とスクリプト定義
- `tsconfig.json` - TypeScript設定（参照型）
- `vite.config.ts` - Vite設定
- `eslint.config.js` - ESLint設定

## アーキテクチャ
- **View層**: React Components
- **状態管理**: Zustand Store
- **ビジネスロジック**: Services層
- **型安全性**: TypeScriptインターフェース
- **検証**: JSONスキーマ + ajv

## データフロー
1. ユーザーがEditorPaneでJSON/YAMLを編集
2. parserServiceがデータを解析
3. appStoreが状態を更新
4. MindmapPaneがD3.jsでマインドマップを描画
5. エラーはUIで適切に表示