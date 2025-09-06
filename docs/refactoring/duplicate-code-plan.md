# 重複コード リファクタリング計画

この文書は similarity-ts による意味的類似分析の結果を受け、重複コードの解消方針を TDD（レッド→グリーン→リファクタリング）で進めるための計画をまとめたものです。

## スキャン結果（要約）
- 関数の重複: 2 組
  - `src/utils/nodeMapping.ts`: `mapJsonNode` ↔ `mapYamlNode`（類似度: 98.1%）
  - `src/hooks/useStoreSync.ts`: `useUISync` ↔ `useSettingsSync`（類似度: 87.7%）
- 型の重複: 5 組（主にテスト内の重複）
  - `Row` 型が複数のテストで重複
  - `MockVSCodeApi` インターフェースが 2 ファイルで重複
  - `VSCodeMessage` ↔ `WebviewMessage` が構造類似（96.6%）
- クラスの重複: なし（継承/implements 由来の除外対象多数）

---

## リファクタリング方針（優先度順）

### 1) nodeMapping.ts の JSON/YAML ノード走査の二重実装解消（最優先）
- 対象: `mapJsonNode` / `mapYamlNode`、`findJsonNodeLines` / `findYamlNodeLines`
- 問題: 再帰走査・行マッピング・子ノード処理等のロジックがほぼ同一で二重管理
- 方針:
  - 共通化コア関数 `mapNode` を新設（戦略注入で差分を吸収）
    - パラメータ: `findNodeLines: (node, lines) => number[]`, `childPathBuilder: (parentPath, index) => string`, `pathLabel: 'json' | 'yaml'`
    - `NodePosition.jsonPath` のキー名は現状維持（フィールド名は `jsonPath` のまま）
  - フォーマット依存の差分は以下に集約
    - 行抽出: `findNodeLines` のみ分岐（正規表現化/共通化も検討）
    - 子パス表記: `childPathBuilder`（`root.children[i]` は共通運用でOK）
  - 既存 API は薄いラッパとして残す（後方互換/差分最小）

- TDD 手順:
  1. レッド: 既存挙動（ノード位置、lineToNodeId、子ノードのパス）が変わらないことを固定化する表現テストを追加
  2. グリーン: `mapNode` 抽出 + `mapJsonNode`/`mapYamlNode` を置換
  3. リファクタ: `find*NodeLines` の重複も寄せる（可能なら正規表現/共通ロジック化）

- 影響範囲/リスク:
  - 位置推定の境界（開始/終了行、列計算）
  - `jsonPath` の表記揺れ（既存テストで担保）
  - YAML パースの挙動違い（`js-yaml` 起因）

- ロールバック:
  - `mapNode` 抽出を戻し、旧実装へリネーム復帰（コミットにタグを残す）

---

### 2) useStoreSync.ts の類似フック統合（高）
- 対象: `useUISync` / `useSettingsSync`
- 問題: ストア値取得・`useEffect` 内タイマー/Ref 監視などのパターンが重複
- 方針（段階的）:
  - ステップA: タイマー管理の共通化
    - `useTimeoutManager()`（複数タイマーの登録・自動 cleanup）を抽出し両フックで利用
  - ステップB: 「ストア状態の監視→副作用」の共通化
    - `useWatchedValue(value, onChange)` の小粒ユーティリティで `settingsRef`/通知クリーンアップの定形処理を DRY 化
  - ステップC（任意）: 汎用的な「ストア同期フック」ファクトリ化
    - `createStoreSyncHook({selectors, effects})` の形でボイラープレート削減

- TDD 手順:
  1. レッド: 現行の通知自動削除/設定変更ログ/クリーンアップ動作を固定化する振る舞いテスト追加
  2. グリーン: `useTimeoutManager` 導入 → 既存テストグリーン
  3. リファクタ: `useWatchedValue` 導入 → グリーン確認

- リスク/回避:
  - フックの依存配列の取り扱いミス → ESLint ルールで監視
  - 返却 API 破壊回避のため既存フックのシグネチャ維持

---

### 3) テスト型の重複解消（中）
- 対象:
  - `Row` 型（`src/components/table/__tests__/*`）
  - `MockVSCodeApi`（`src/__tests__/integration/*`）
  - `VSCodeMessage` ↔ `WebviewMessage` の構造類似
- 方針:
  - `tests/shared/types.ts` を新設し共通型を集約
    - 既存の各テストから import するよう置換
  - `VSCodeMessage` と `WebviewMessage` は用途が異なるなら別名維持、共通基底型を導入

- TDD 手順:
  1. レッド: 既存テストをそのまま実行（型定義の移動で挙動が変わらないこと）
  2. グリーン: 集約後も型エラー/テスト失敗がないこと

---

## コミット方針
- 作業の区切りごとに小さくコミット
- 既存テストが通ることを確認してからコミット（コード変更時）
- ドキュメント/設定のみの変更は単独コミット
- `git add .` は使用せず、対象ファイルを明示的に add

## 実施順と目安
1. `nodeMapping.ts` 共通化（0.5〜1.0日）
2. `useStoreSync.ts` ヘルパ抽出（0.5日）
3. テスト型集約（0.5日）

## 実行メモ
- 先に `pnpm test` でベースライン確認（依存が未導入なら `pnpm i`）
- 以降は TDD サイクルで進行（レッド→グリーン→リファクタ）

