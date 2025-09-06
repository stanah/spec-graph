# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0](https://github.com/stanah/spec-graph/compare/req-mindmap-v0.6.0...req-mindmap-v0.7.0) (2025-09-06)


### Features

* add task management agents and configuration files for enhanced workflow integration ([ba3aa21](https://github.com/stanah/spec-graph/commit/ba3aa21c4bd9f284adaabbb68ae80b302e071dee))
* **i18n:** localize validation messages for Zod/Ajv (task 28.4)\n\n- Add simple i18n catalog (ja/en)\n- SchemaManager supports setLocale/getLocale and translates messages\n- Tests for i18n on custom keywords and Zod codes ([125839f](https://github.com/stanah/spec-graph/commit/125839fb424244cf3e4b2afee3ed42adb0a6012f))
* **schema:** add Ajv custom keywords (nonEmptyString, uniqueNodeIds) and schema hooks (task 28.2)\n\n- register default keywords on Ajv init\n- expose registerKeyword/setJsonSchema/validateCurrentSchema\n- tests for keywords and Ajv validation ([e816c75](https://github.com/stanah/spec-graph/commit/e816c75043bda349ccad47d280261f2211b0ad96))
* **schema:** add SchemaManager core (task 28.1)\n\n- Zod validation wrapper\n- Optional Zod-&gt;JSON Schema conversion (dynamic)\n- Ajv instance + JSON Schema validation\n- Export via services/index\n\nTests: basic SchemaManager tests ([9e7694f](https://github.com/stanah/spec-graph/commit/9e7694fad260a8c24aeb0ad6a3e8d42bfdef49f2))
* **schema:** add versioning and template library (task 28.5)\n\n- SchemaManager: registry, active schema, migrate() diff log\n- Templates: basic/extended/project schemas with custom keywords\n- Tests: versioning + templates ([ae22a48](https://github.com/stanah/spec-graph/commit/ae22a48c42491a5b209ef8963dbf5c9e2c398b7b))
* **view:** implement view switching foundation (task 24) ([3ef492c](https://github.com/stanah/spec-graph/commit/3ef492cd2625397f41470113e286cda9aa6ac2ed))
* **vscode:** add schema validation to VSCode diagnostics; replace Monaco integration with diagnostics pipeline (task 28.3) ([e55ae8c](https://github.com/stanah/spec-graph/commit/e55ae8c974859e846e51d4f83bc094bdfe829b13))


### Bug Fixes

* **extension:** make validateSchema diagnostics robust in test env and always show info message; remove any casts and unused catch var to satisfy ESLint ([ec123a3](https://github.com/stanah/spec-graph/commit/ec123a36cc18cb74a5a3e7912634b17b551097b6))


### Documentation

* add multi-view enhancement PRD outlining new features and technical requirements ([377f154](https://github.com/stanah/spec-graph/commit/377f154eb4ca37ead88c3b5b86b0564cd4fcc517))
* add repository guidelines for project structure, coding style, and testing ([c16d26d](https://github.com/stanah/spec-graph/commit/c16d26d6655c507df9573fa5ebeeb5e969032408))


### Tests

* **ci:** avoid vite import-analysis by dynamic import shim for optional zod-to-json-schema ([0d93a1a](https://github.com/stanah/spec-graph/commit/0d93a1a3747457ce769a1ed366b71eb77a4ecb6c))
* **view:** add ViewMode store and UI tests (task 24) ([e005d77](https://github.com/stanah/spec-graph/commit/e005d777b805e125e905dc1a9763df4c2c0fd8fe))
* **vscode:** make diagnostics optional-safe in tests; always show validation summary ([920ff1e](https://github.com/stanah/spec-graph/commit/920ff1e4b4b2b18892a58b7b17409d6c93b4aeb1))


### Continuous Integration

* disable Claude Code automated PR review workflow (prevent running review) ([93d6832](https://github.com/stanah/spec-graph/commit/93d6832e6b17a12ce5f627f587bbeb7379b85413))

## [0.6.0](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.5.0...req-mindmap-v0.6.0) (2025-08-19)


### Features

* pnpm workspace統合でCI/CDを簡素化 ([9f30107](https://github.com/stanah/req-mindmap/commit/9f30107654719ebfa2c0353d9945f7083c35fe17))


### Bug Fixes

* GitHub Actions release workflow でのextension依存関係エラーを修正 ([45d463a](https://github.com/stanah/req-mindmap/commit/45d463a8e62f02eadd4c771f2b12dfc0b955a9a4))

## [0.5.0](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.4.0...req-mindmap-v0.5.0) (2025-08-19)


### Features

* add GitHub Actions CI workflow ([63f8899](https://github.com/stanah/req-mindmap/commit/63f8899e058dd55e658724187e0ec91645ef5f7b))


### Bug Fixes

* d3-shapeのインポートをd3に統合してエラーを修正 ([6bcf05d](https://github.com/stanah/req-mindmap/commit/6bcf05d3ba581dea65999994405681b7e8c66d2f))
* remove d3 mock files and keep existing setup ([e0ef94f](https://github.com/stanah/req-mindmap/commit/e0ef94f7f6f4b67af853cbae8b09296de48dd10a))
* remove pnpm version specification from GitHub Actions ([3a97d18](https://github.com/stanah/req-mindmap/commit/3a97d18f5a4a0bab610966dd591d51a98d9aa9bb))
* VSCode Webviewでd3モジュール未定義エラーを修正 ([8c6dfc2](https://github.com/stanah/req-mindmap/commit/8c6dfc22c140554c90658afd4f9577be79152c48))

## [0.4.0](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.3.0...req-mindmap-v0.4.0) (2025-08-19)


### Features

* GitHub Pages デプロイワークフローを削除 ([23cc486](https://github.com/stanah/req-mindmap/commit/23cc486199ce4a4e30633737b1b60022e012b564))


### Bug Fixes

* VSCode拡張ビルドエラーを修正 ([af384cd](https://github.com/stanah/req-mindmap/commit/af384cdbdeab71c9f007f4b9f60eecbe80aca42b))

## [0.3.0](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.2.1...req-mindmap-v0.3.0) (2025-08-19)


### Features

* add priority and status selection to NodeDetailsPanel and update tests ([aad6843](https://github.com/stanah/req-mindmap/commit/aad6843bb8f719d340e689e1fd2d89e898b3313d))
* add test improvement plan to address priority and status update issues in NodeDetailsPanel ([2530ded](https://github.com/stanah/req-mindmap/commit/2530ded4f1485967028c6927829748931df673f1))
* complete schema definition and validation system (task 12) ([b32c742](https://github.com/stanah/req-mindmap/commit/b32c742d7b94f363df2b7378ce429c221663b974))
* complete VSCode adapter integration (task 10.2) ([983cf32](https://github.com/stanah/req-mindmap/commit/983cf32a7526ca19839e4650c6f804dd7a38345a))
* enhance message handling and logging in MindmapEditorProvider and MindmapWebviewProvider ([e2dfcfc](https://github.com/stanah/req-mindmap/commit/e2dfcfcb7d2d54e99b7e62e23d89734def3640ad))
* improve VSCode API message handling and validation; add retry strategy in error handling ([a8b9236](https://github.com/stanah/req-mindmap/commit/a8b92365122f330cf710e6716cf93f28e4b4b0b5))
* localStorage機能を完全削除してメモリのみの状態管理に移行 ([5b31fb7](https://github.com/stanah/req-mindmap/commit/5b31fb7b18c755e432dbbf3129c94ae21b1a84c3))
* Monaco Editor関連の不要なテストファイルを削除してテストスイートをクリーン化 ([bcceb81](https://github.com/stanah/req-mindmap/commit/bcceb816b03b5fbb7c4eb120c9bb9b8141447c94))
* remove web app and focus on VSCode extension with component library ([5fa1525](https://github.com/stanah/req-mindmap/commit/5fa15254fd5cad971fd7346531844aacfcd214eb))
* update task status to 'done' for bidirectional sync implementation and enhance details ([75fd9a2](https://github.com/stanah/req-mindmap/commit/75fd9a24d190fe8daec225212c4f3604f0c7133b))
* update task statuses to 'done' and 'in-progress' in comprehensive requirements ([c0c5cc0](https://github.com/stanah/req-mindmap/commit/c0c5cc00b1d52304af3e7428e0134493f5c13442))
* VSCode拡張対応とパフォーマンス最適化の実装完了によりタスク10をdoneに更新 ([a43da42](https://github.com/stanah/req-mindmap/commit/a43da420678416bd445412111f575f3e31ac8fcb))
* VSCode版ノード操作機能の実装完了に基づきタスク14,15をdoneに更新 ([cb393cd](https://github.com/stanah/req-mindmap/commit/cb393cdd31c88c900597f1cebbe0a3b8928e1cab))
* ノード状態インジケーター表示機能の実装完了によりタスク22をdoneに更新 ([051f064](https://github.com/stanah/req-mindmap/commit/051f0641e5d2f336c67e118dad49a528e7c73e54))
* 高優先度PR対応完了 - ライブラリテスト、パフォーマンス最適化、VSCode通信、エラーハンドリング ([131362d](https://github.com/stanah/req-mindmap/commit/131362d7b4edbe49a2723b0e44a31173bf7a71e8))
* 高優先度問題の修正 - エラーバウンダリ、プラットフォームアダプター、メモリリーク対策 ([61fca73](https://github.com/stanah/req-mindmap/commit/61fca738ee9b91669836020cf30ac4888aae162e))


### Bug Fixes

* add window.showOpenFilePicker/showSaveFilePicker mocks for jsdom environments ([01839f6](https://github.com/stanah/req-mindmap/commit/01839f681255db8ec7c8233973204373a037616f))
* addRecentFileの呼び出しで余分なプロパティを削除してTypeScript型エラーを修正 ([3cfe454](https://github.com/stanah/req-mindmap/commit/3cfe454b49d08626c3bea8a57f8b08304daf941c))
* clean up remaining FileService imports and fix build errors ([1bc85ea](https://github.com/stanah/req-mindmap/commit/1bc85eaba71e12519b977cf960aeff3e0ca57807))
* CommonJS対応修正とprepublishOnly追加 ([2928029](https://github.com/stanah/req-mindmap/commit/2928029daf041707ec372731a72ee78766158d84))
* consoleスパイ復元不完全修正 - vi.restoreAllMocksを使用 ([02196af](https://github.com/stanah/req-mindmap/commit/02196aff304465f88af87c48dcb661e905e14e6e))
* deepEqual関数の循環参照脆弱性を修正 ([586de6c](https://github.com/stanah/req-mindmap/commit/586de6c8071a7d91b9e4e1888d0fd2c1d65483dc))
* Disposableメモリリーク修正 - webviewMsgSubscriptionの適切な解放 ([13889f4](https://github.com/stanah/req-mindmap/commit/13889f4da09e94e5e98ffebb01cbde8d788f3086))
* editorMindmapSyncテストのsettingsServiceメソッド不足エラーを修正 ([95679cc](https://github.com/stanah/req-mindmap/commit/95679cc1e5f07a5f227c4d27e68230c068cfe51f))
* errorHandling.tsのデコレーターで非同期エラーハンドリングを追加 ([7949bc0](https://github.com/stanah/req-mindmap/commit/7949bc074fde2976d47ff15e884112f41827dc83))
* ErrorTypeの名前衝突を解決するためenumをErrorCategoryにリネーム ([04382fb](https://github.com/stanah/req-mindmap/commit/04382fb588512926a28baab4859acb9dd1b8fe95))
* handleParseErrorでデータバックアップ機能を追加 ([f020229](https://github.com/stanah/req-mindmap/commit/f0202296e147fdc61b10a34d529ea43e246d7257))
* improve PlatformError type safety by adding 'unknown' to platform union type ([1743838](https://github.com/stanah/req-mindmap/commit/174383875950d087196ddafe09ff53bc8e967279))
* lintエラーとテストエラーの大幅修正 ([78554a1](https://github.com/stanah/req-mindmap/commit/78554a19447ef7176c4750d8e8e3afae9bad9fd6))
* NodeActionButtons.test.tsxの型エラーを修正 ([c3ec8c0](https://github.com/stanah/req-mindmap/commit/c3ec8c082105e7932a3837f28f78fbf16dd2225c))
* NotificationType型の使用でDRY原則に従うよう修正 ([76f87cb](https://github.com/stanah/req-mindmap/commit/76f87cb80f4fbd9d18b2e81f702299203e1ca2e1))
* package.jsonにsideEffectsフィールドを追加してtreeshake問題を解決 ([e05297e](https://github.com/stanah/req-mindmap/commit/e05297e846fbd9ec1b09ef62cbff3bb1f1e6fa01))
* saveFileの結果を正しく返すよう修正 ([54a02c7](https://github.com/stanah/req-mindmap/commit/54a02c7955fc54a88804ae732191c4a767c61d85))
* showOpenFilePicker未定義対応とリトライロジック実装 ([54c5645](https://github.com/stanah/req-mindmap/commit/54c56452ae733812cceae8ece3de293e4cbb9e08))
* strict-mode.test.tsのテストエラーを修正 ([fed07a0](https://github.com/stanah/req-mindmap/commit/fed07a05746fd9c507f363fd4fe57359f4903686))
* TypeScriptの型エラーを修正 - rest parameterをunknown[]に変更 ([ae11402](https://github.com/stanah/req-mindmap/commit/ae114023e37b697e4f3a11dc8ee6e4eca33faf6c))
* useStableSelector等価性関数の実装 ([80fc429](https://github.com/stanah/req-mindmap/commit/80fc429feffab9dd7e8f25027581fe266d171b09))
* vi.Mock型注釈修正 - vitestのMock型を使用 ([3a8c828](https://github.com/stanah/req-mindmap/commit/3a8c828f234f9ea88d78f39fdbea09f0a8806292))
* vite.config.vscode.tsのoptimizeDepsからd3-treeを削除 ([9335c0c](https://github.com/stanah/req-mindmap/commit/9335c0c029b9ced9d847215934ba442dcee8ce99))
* VSCode Communication テストのエラーを修正 ([ad686ed](https://github.com/stanah/req-mindmap/commit/ad686ed6b7f748f0937a397bb19f1e3a8f2b73e1))
* VSCodeメッセージバリデーションの修正 ([8406eb3](https://github.com/stanah/req-mindmap/commit/8406eb3fac5da21cb917fd5f93a0800966cd52cc))
* VSCodeメッセージハンドリングでfalsy値でも有効な値を保持するよう修正 ([670a223](https://github.com/stanah/req-mindmap/commit/670a223294b5e93578202cb3be54fbf25c0e8968))
* VSCode環境でのユーザー確認ダイアログの非同期処理を修正 ([51d23a4](https://github.com/stanah/req-mindmap/commit/51d23a4004276a87e6f4c121d262a3e2c7c3c432))
* Webviewメッセージリスナーのメモリリーク修正 ([6925232](https://github.com/stanah/req-mindmap/commit/69252321585f8fe0da486085357d804e67aa1ea5))
* エラーハンドリングでタイムアウト管理機能を追加してメモリリーク防止 ([96c99b8](https://github.com/stanah/req-mindmap/commit/96c99b8e4a0e5c8a94730c95d43a8ad4a99c7fb9))
* テストのインポートエラーとReact Testing Library警告を修正 ([4ced0be](https://github.com/stanah/req-mindmap/commit/4ced0be724ca3545f4bca165afcb9f49828c04af))
* テスト環境のDOMとモナコエディタの依存関係を修正 ([754fbd0](https://github.com/stanah/req-mindmap/commit/754fbd0f69cd80021bc127feeb7ab10c077939b7))
* 指数バックオフの計算を修正 ([b632b59](https://github.com/stanah/req-mindmap/commit/b632b59b9b4cba68c5793fa40cb943907799a549))
* 統合テストとライブラリテストのエラーを修正 ([57e63b9](https://github.com/stanah/req-mindmap/commit/57e63b9da841dec9a733a6c68c5b72cc185ecec9))


### Code Refactoring

* localStorage関連機能を削除してVSCode設定管理へ移行準備 ([d0e7256](https://github.com/stanah/req-mindmap/commit/d0e7256411a9a7dd25d72d0b672d342a1b227618))
* PlatformErrorのcause処理から冗長な条件チェックを削除 ([7439dbf](https://github.com/stanah/req-mindmap/commit/7439dbf239c83e461fdd9a4dd1b48dde2e1bebfd))
* ReactをpeerDependenciesに移動 ([8b142af](https://github.com/stanah/req-mindmap/commit/8b142aff830f18390a0835e921ff69283c84f302))
* remove FileService and replace with minimal file utilities ([98b8c6b](https://github.com/stanah/req-mindmap/commit/98b8c6beea719648dbcb0f8fa171f6ca6b4754cc))
* replace generic Error with PlatformError for unified error handling ([7e747e9](https://github.com/stanah/req-mindmap/commit/7e747e90005cf4d05e941781c7e59c94b20151aa))
* VSCode拡張メイン・Webアプリ読み取り専用方針に基づき不要タスクをcancelledに変更 ([29ea323](https://github.com/stanah/req-mindmap/commit/29ea3233af7fbeae62acf7b0abc80de1123b7aef))
* テストスクリプトを整理してWebアプリの残骸を削除 ([acaf9ad](https://github.com/stanah/req-mindmap/commit/acaf9ad987c6342120f96fdfac36accb67e77608))
* 外部依存関係をpeerDependenciesに移動してバンドル最適化 ([069d018](https://github.com/stanah/req-mindmap/commit/069d018b76383ef56e95006be823ab258486a4aa))

## [0.2.1](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.2.0...req-mindmap-v0.2.1) (2025-08-17)


### Bug Fixes

* update package.json to use pnpm for script commands ([587f74a](https://github.com/stanah/req-mindmap/commit/587f74a1e6f8ea20af11ac5c2072689077050bd7))
* VSCode拡張パッケージングエラーを修正 ([72d8533](https://github.com/stanah/req-mindmap/commit/72d8533e233af796c5841808f6d745416017a4a5))

## [0.2.0](https://github.com/stanah/req-mindmap/compare/req-mindmap-v0.1.0...req-mindmap-v0.2.0) (2025-08-17)


### Features

* Add detailed logging to ParserService for better debugging during JSON/YAML parsing ([bb92288](https://github.com/stanah/req-mindmap/commit/bb92288f68742d340e9a7b035cb8e8668890f2db))
* Add detailed rendering logs in MindmapViewer for enhanced debugging ([bb92288](https://github.com/stanah/req-mindmap/commit/bb92288f68742d340e9a7b035cb8e8668890f2db))
* add MIT License to resolve VSCode extension packaging warning ([4c767ea](https://github.com/stanah/req-mindmap/commit/4c767eaf1ed3b2935dda3b91d6b5a7f44d2b2c9f))
* add release workflow and configuration for VSCode extension ([7641389](https://github.com/stanah/req-mindmap/commit/7641389c9eba07110428387c10c28a029acdeee2))
* CI環境の整備とリントエラーの修正 ([aeb08d2](https://github.com/stanah/req-mindmap/commit/aeb08d20a206c29467983ebecec98ca959490f5c))
* CLAUDE.mdに実行可能コマンド一覧を追加 ([76723bf](https://github.com/stanah/req-mindmap/commit/76723bfc62d1e9b04e8782ab0f7b746461b0b4f2))
* comprehensive-requirements.yamlのスキーマ構造を完全化 ([1e59b54](https://github.com/stanah/req-mindmap/commit/1e59b549cdac3dbb06d1197b8afbb4be05c30fc0))
* D3.jsマインドマップレンダラーの統合とノード詳細パネルの実装 ([8ca6db2](https://github.com/stanah/req-mindmap/commit/8ca6db26b50722c86ea5d89c0264990afd20818c))
* Enhance NodeDetailsPanel with theme support and improve styling for dark mode ([bb92288](https://github.com/stanah/req-mindmap/commit/bb92288f68742d340e9a7b035cb8e8668890f2db))
* GitHub Pagesへのデプロイ設定を追加 ([6f7f504](https://github.com/stanah/req-mindmap/commit/6f7f50448b4ca283d26247571a6b9d7efea43551))
* implement performance optimization for large-scale mindmaps ([b7815ac](https://github.com/stanah/req-mindmap/commit/b7815ac73c4d28d26d4725933fb20f72a56ed0c4))
* Improve parseContent logging in appStore for better traceability ([bb92288](https://github.com/stanah/req-mindmap/commit/bb92288f68742d340e9a7b035cb8e8668890f2db))
* JSON SchemaからTypeScript型自動生成システムを追加 ([b17cd57](https://github.com/stanah/req-mindmap/commit/b17cd57bf147fb688dec82d115c0f7283e8b5482))
* JSON Schemaから自動生成されたTypeScript型定義 ([2567942](https://github.com/stanah/req-mindmap/commit/256794277f49050ad0d979329baedff20cbfc729))
* JSON SchemaによるYAMLバリデーション機能を追加 ([a4f3a4a](https://github.com/stanah/req-mindmap/commit/a4f3a4abb75ad8b7d0478b3f7b091ca24df3d85a))
* JSON/YAML相互変換機能とノード基本情報簡易表示機能のタスクを追加 ([457be5d](https://github.com/stanah/req-mindmap/commit/457be5df39ae90ff8cd3164b1892610adccab870))
* JSON/YAML相互変換機能とノード基本情報簡易表示機能の要件を追加 ([dac577d](https://github.com/stanah/req-mindmap/commit/dac577d6f7c89b2b268d0329232738219b04e49c))
* MCPサーバーの基盤実装を完了 ([7212cf3](https://github.com/stanah/req-mindmap/commit/7212cf3f1cf1640ae02050175b557c80a8d3bc65))
* MCPとZodを最新版にアップデート ([def5fbb](https://github.com/stanah/req-mindmap/commit/def5fbb5b7b2f8d30f47c73e38d99db0277d53de))
* MindmapCore統合テスト作成完了 (タスク23.1) ([021ae93](https://github.com/stanah/req-mindmap/commit/021ae93799e4a0fc255e770c2574ed956bcdcbb4))
* MindmapViewerにノード詳細パネル統合 (タスク10.6) ([7ec5a29](https://github.com/stanah/req-mindmap/commit/7ec5a2906ff218dc8985a19c9a2697e9fede5a60))
* Monaco Editorの統合とエラー表示機能を実装 ([e66f7ab](https://github.com/stanah/req-mindmap/commit/e66f7ab6e56978071b3fa15ef6d17673e96923f3))
* NodeDetailsPanelを常時編集可能に改良 ([83ac31d](https://github.com/stanah/req-mindmap/commit/83ac31d6fc4a06526da22660177b3e6b5dc055b5))
* priorityインジケータにcriticalレベルを追加しバッジ表示に変更 ([54192b9](https://github.com/stanah/req-mindmap/commit/54192b968e885e3c5041c2041bf5d1c685eba583))
* priorityとstatusをバッジ表示で実装 ([778af7e](https://github.com/stanah/req-mindmap/commit/778af7efe419af122afa80707e521be908597b02))
* React Iconsライブラリを追加 ([f5f0e2a](https://github.com/stanah/req-mindmap/commit/f5f0e2acde91d01ab04096876c99dfb9253aa729))
* SchemaValidatorクラスのデフォルトインスタンスをエクスポート ([e21e0e0](https://github.com/stanah/req-mindmap/commit/e21e0e00e428ac861eb7860dd39aff7793ec07b4))
* Simplify MindmapRenderer layout checks by removing unnecessary destruction condition ([bb92288](https://github.com/stanah/req-mindmap/commit/bb92288f68742d340e9a7b035cb8e8668890f2db))
* UIコンポーネントの追加とレイアウト改善 ([b9794b7](https://github.com/stanah/req-mindmap/commit/b9794b76378b0dfc0d0f79036b374f968ba16ccb))
* Update comprehensive requirements and mindmap schema by removing deprecated fields and restructuring metadata ([db34016](https://github.com/stanah/req-mindmap/commit/db34016feac86511f6291d1370c1dbf597cfc48b))
* update softprops/action-gh-release to v2.3.2 ([a5c6875](https://github.com/stanah/req-mindmap/commit/a5c68756978f6f082efc3a94610dd11f3fe3c8f8))
* VSCode拡張でbaseFields/customFieldsスキーマ対応完了 ([cd249dc](https://github.com/stanah/req-mindmap/commit/cd249dcd819b743d9b239acfd26a1e85d63ae651))
* VSCode拡張でノードクリック時にマインドマップファイル内の該当箇所にジャンプ機能を実装 ([d268286](https://github.com/stanah/req-mindmap/commit/d2682866d499a9a9fea071a78fb9890b20578e45))
* VSCode拡張とWebアプリの詳細パネル共通化完了 ([b2e0296](https://github.com/stanah/req-mindmap/commit/b2e02968074c4e4a67a8fbcc621dd0df1403c43d))
* VSCode拡張にテーマ切り替え機能を追加 ([33c216e](https://github.com/stanah/req-mindmap/commit/33c216e1f9bce849202e29e3144afb03b2a04f82))
* VSCode拡張のテストカバレッジを大幅改善 ([dd7820d](https://github.com/stanah/req-mindmap/commit/dd7820d66dc8362f746b1437876b056705d729b3))
* VSCode拡張のテストカバレッジを大幅改善 ([3b8b6a0](https://github.com/stanah/req-mindmap/commit/3b8b6a00bd51666c742ca590f064d48b161e5223))
* VSCode拡張のテストカバレッジを大幅改善 ([495162b](https://github.com/stanah/req-mindmap/commit/495162b8d4bcae839d473eafbbb8e294950ce82e))
* VSCode拡張の完全実装とプラットフォームアダプターの改善 ([8d84ca9](https://github.com/stanah/req-mindmap/commit/8d84ca9c32888901a0c36bb315bf99c48f4f45ef))
* VSCode拡張の実装 ([35987ab](https://github.com/stanah/req-mindmap/commit/35987abfab7b3a9a59d01ef6667cb267b5580908))
* VSCode拡張の表示画面を画面いっぱいに表示するよう修正 ([ecf19d9](https://github.com/stanah/req-mindmap/commit/ecf19d9139f34a200a5bc8298a359017d723ae7d))
* VSCode拡張用ツールバーUIの実装 ([cfa1acf](https://github.com/stanah/req-mindmap/commit/cfa1acfe1adda1b9424f5dc163d89f889878d12c))
* VSCode拡張用ノード削除機能を実装 ([062333c](https://github.com/stanah/req-mindmap/commit/062333c28694ce7b28e673427794c9dc99e05733))
* VSCode拡張用ノード編集機能（詳細パネル内）の実装完了 (タスク10.7) ([c9e42c7](https://github.com/stanah/req-mindmap/commit/c9e42c78686a1f714b06a05c76b31484ebf879c8))
* VSCode拡張用ノード詳細パネルコンポーネントの実装 (タスク10.6) ([5ee1ae8](https://github.com/stanah/req-mindmap/commit/5ee1ae86bc733eae30c6862589809fc91b0c2716))
* VSCode版の実装状況に合わせてタスクマスターを更新 ([be07fe6](https://github.com/stanah/req-mindmap/commit/be07fe64f7d52d27e228dacfb23e8865076acfba))
* Webアプリ版でもマインドマップノード編集機能を実装 ([ef52284](https://github.com/stanah/req-mindmap/commit/ef522847ee15136dcec1a129ecb1327cf5564fd0))
* Web版詳細パネルをマインドマップペイン内に制限し、パネル表示時のレンダリング問題を修正 ([9e21f95](https://github.com/stanah/req-mindmap/commit/9e21f95a9becee5d03757c302526d6b8ef1b6209))
* Zodスキーマの基本定義と型構造の実装 ([a6a3ec9](https://github.com/stanah/req-mindmap/commit/a6a3ec9953248b49384925b44ec0152a0c6298c8))
* Zustandを使用した状態管理システムの実装 ([46c745b](https://github.com/stanah/req-mindmap/commit/46c745bb63432ce96fa4fda078db44404d11489f))
* インポートパス統一とファイル削除の完了 ([463a197](https://github.com/stanah/req-mindmap/commit/463a197e2df787b5f2bf29497ffaaf6e655a0498))
* コアロジック分離とプラットフォーム非依存アーキテクチャの実装 (タスク10.1) ([6666241](https://github.com/stanah/req-mindmap/commit/6666241121f41001a7e990422804828550dc4171))
* コアロジック振る舞いテスト作成完了 (タスク23.2) ([77d0209](https://github.com/stanah/req-mindmap/commit/77d02091c6c402c39411a0ae2196a1407480d937))
* コンテンツ読み込みUIを改善 ([df19f19](https://github.com/stanah/req-mindmap/commit/df19f19e5a7fe5a6eca6400bca7b18550b517889))
* サンプルデータとタスクファイルを更新 ([be24f80](https://github.com/stanah/req-mindmap/commit/be24f80fd6a1855cca5603709496d5c8b9b84ecc))
* サンプル読み込みボタンをヘッダーに追加 ([c71437b](https://github.com/stanah/req-mindmap/commit/c71437b380d0b249ddc9f352760b03200bf55e63))
* スキーマベーステンプレート生成機能を追加 ([5142d17](https://github.com/stanah/req-mindmap/commit/5142d177890abae3f35694ada4d5d5b727a46ab8))
* タスクの複雑度解析とサブタスク展開を完了 ([674c86c](https://github.com/stanah/req-mindmap/commit/674c86c93921060f0cf47adff4752abf307d0db0))
* ツールバーにノード操作ボタンを直接統合 ([dbca7e9](https://github.com/stanah/req-mindmap/commit/dbca7e9e40f378ab508e6a9330ad9d40e4b9eae8))
* ツールバーのノード追加ボタンにアイコンを追加し、ツールチップを改善 ([3f52ded](https://github.com/stanah/req-mindmap/commit/3f52dedcdb0eb4efaed4e04a3dc39a08f1a8e218))
* テーマシステム（ライト/ダークモード）の実装 ([7d05743](https://github.com/stanah/req-mindmap/commit/7d057437c5d9c022fd567de72868b827c340f691))
* テーマシステムのアクセシビリティ強化 ([c7eeb30](https://github.com/stanah/req-mindmap/commit/c7eeb30a6b278eab8fa8a64eca540e1c6d934a78))
* テストスイートの実装 ([dafc3ec](https://github.com/stanah/req-mindmap/commit/dafc3ec8c01b51008de8e8095802fedb98a97878))
* テスト実行のための基本実装を追加 ([f9d6a91](https://github.com/stanah/req-mindmap/commit/f9d6a91712a8c44bd52ce8223de3b8b852f36b53))
* テスト実行時のログ出力を大幅に削減 ([5a51edf](https://github.com/stanah/req-mindmap/commit/5a51edfd70d4e25ead07e6526bebe3de12007043))
* テスト実行時のログ出力を大幅に削減 ([053c36a](https://github.com/stanah/req-mindmap/commit/053c36a6bde8cec2619c86fca22f5c5a5f05373a))
* テンプレート読み込み、スキーマベース生成、サンプル読み込みを統合 ([bd0354e](https://github.com/stanah/req-mindmap/commit/bd0354e3291c33cb15c823c72f18676701f8ea28))
* ノードダブルクリックで展開・折りたたみ機能を追加 ([58461fb](https://github.com/stanah/req-mindmap/commit/58461fb9829041bba62f1c30ed65bbbbff07c7e6))
* ノードテキストの改行と省略機能を実装 ([2fe9435](https://github.com/stanah/req-mindmap/commit/2fe94352071d9e45d43501793281264b6c1323e8))
* ノードの展開・折りたたみ機能を追加し、テーマ切り替えアイコンを改善 ([16c81d3](https://github.com/stanah/req-mindmap/commit/16c81d3646ad237c3190769a881850f23916d23d))
* ノード操作機能の追加とテストコード実装 ([04a3f07](https://github.com/stanah/req-mindmap/commit/04a3f0757a4b7c1b0d722bbeedb7bfc32009e835))
* ノード詳細パネルにタグと日時情報の表示機能を追加 ([86edaa0](https://github.com/stanah/req-mindmap/commit/86edaa06674999dd333480a9e6ba7b657c9e4157))
* ノード追加後の選択リトライ機能を実装 ([21ec9fc](https://github.com/stanah/req-mindmap/commit/21ec9fc2b32cb369e1442833120a40cecc242b6d))
* ノード追加時の自動保存機能と YAML エラー処理を改善 ([0bfa36a](https://github.com/stanah/req-mindmap/commit/0bfa36ad1e6ac672c4e4459cf2a06269c3220ca6))
* ノード間の動的間隔調整機能を実装 ([7f105db](https://github.com/stanah/req-mindmap/commit/7f105db9d8353f25b6235d00d0b18d3646048b35))
* パネルリサイザー機能を実装 ([b8cb01f](https://github.com/stanah/req-mindmap/commit/b8cb01f93c24cc492e9fe645e1a4263b7b4f4bf4))
* ファイル形式に応じてサンプルデータを自動切り替え ([87c27fd](https://github.com/stanah/req-mindmap/commit/87c27fd3f22ffdd95ae1ecd1432bc63db7a8bc15))
* ファイル操作UIコンポーネントを実装 ([701fe85](https://github.com/stanah/req-mindmap/commit/701fe8501ce98105e24dcef747ba5b21c47447ac))
* プラットフォーム抽象化レイヤーの実装 ([be29795](https://github.com/stanah/req-mindmap/commit/be29795a9045a60d90e0ee54d1c831d13bf5b49b))
* プレビューボタンのデフォルト動作をサイドに開くように変更 ([536ac1f](https://github.com/stanah/req-mindmap/commit/536ac1fa40b4e88a9a8d1fc1e49bddf084d96884))
* プロジェクト基盤の構築 ([a01bd50](https://github.com/stanah/req-mindmap/commit/a01bd508519aa84424315a068c757d755c114a1a))
* プロジェクト進捗状況の更新と実装状況の反映 ([3f1b510](https://github.com/stanah/req-mindmap/commit/3f1b5103ae60092c491b31087ed50519c989085d))
* マインドマップコア機能をプラットフォーム別に分離 ([2c8cb58](https://github.com/stanah/req-mindmap/commit/2c8cb585befcd2a94b43bb9ed07cecbb202f7656))
* マインドマップツールとMCPエージェントの要件定義に新機能を追加 ([b255992](https://github.com/stanah/req-mindmap/commit/b255992359828b02281b4e6cb5c7c1f2ed770cdf))
* マインドマップツールの仕様作成 ([de37c6f](https://github.com/stanah/req-mindmap/commit/de37c6f606999e0585dd38fb2bdc0d4152e5e213))
* マインドマップノードの改行表示対応を実装 ([d0c9390](https://github.com/stanah/req-mindmap/commit/d0c9390bdac619b77ec58ee4aee1a87d838c3154))
* マインドマップを横方向レイアウトに変更 ([43ab1fe](https://github.com/stanah/req-mindmap/commit/43ab1feee9f59367f42a74bf4b5921e1d655d59c))
* ルートディレクトリからVSCode拡張テストを実行できるコマンドを追加 ([978c060](https://github.com/stanah/req-mindmap/commit/978c060c2af8c8682ed4b9fb662b713846f8747b))
* 下位互換性を除去しマスタースキーマベースに統一 ([fc00074](https://github.com/stanah/req-mindmap/commit/fc00074e01297444ee553d68ff43ac1133da776f))
* 包括的な要件定義マインドマップファイルを作成 ([09bad58](https://github.com/stanah/req-mindmap/commit/09bad5843c7ed655ec9658eedb4f20e6420ced5b))
* 双方向連携機能の実装 ([0bc2cb2](https://github.com/stanah/req-mindmap/commit/0bc2cb257d67407d9d742dff6e4c5d71f1b77bdd))
* 型定義とデータモデルの実装 ([561a640](https://github.com/stanah/req-mindmap/commit/561a64037e65fb43ddfbbc7381640394082a32d8))
* 放射状マインドマップレイアウトの実装 ([e470e08](https://github.com/stanah/req-mindmap/commit/e470e08cc4bc9c758fccc3ce16fcb2301db5e351))
* 要件定義を統合マインドマップ形式で作成 ([470c8f0](https://github.com/stanah/req-mindmap/commit/470c8f03a150b6c8545a532bdcf72f7f98027c50))
* 設定管理機能とセッション復元機能を実装 ([28a8ef1](https://github.com/stanah/req-mindmap/commit/28a8ef1dda1df5a637800a9328503fc0326a7653))
* 選択中ノードのスタイルを大幅改善 ([f5245b2](https://github.com/stanah/req-mindmap/commit/f5245b21794c73999d627b32e9d0c07c9c5985ec))
* 部分的にZodスキーマに移行 ([ad841b0](https://github.com/stanah/req-mindmap/commit/ad841b0cf431a79fac47719b1f8023b59054ca67))
* 高度なリアルタイム同期システムの実装 ([ee51cc9](https://github.com/stanah/req-mindmap/commit/ee51cc9702a490453f8b0a847cd779432d4a5af2))


### Bug Fixes

* console.errorスパイの問題とnullポインタエラーを修正 ([b54ef6a](https://github.com/stanah/req-mindmap/commit/b54ef6aec4a77f3c5e859a1ae6841ddbd2a31293))
* console.errorスパイの問題とnullポインタエラーを修正 ([0e2bd48](https://github.com/stanah/req-mindmap/commit/0e2bd4804ce09f4e6d736ce072c9caa912a1cf98))
* ContentLoadModalの型インポートエラーを修正 ([f149c1b](https://github.com/stanah/req-mindmap/commit/f149c1b6b6c897fadcd57593d56ce0a567f02784))
* E2Eテストの修正と最適化 ([4bc538c](https://github.com/stanah/req-mindmap/commit/4bc538c378934f34fab034d5ef82b14662fc84bf))
* editorMindmapSync.test.tsxのテスト修正 ([0360871](https://github.com/stanah/req-mindmap/commit/0360871db9d3ecbdb94c1bad003adde14aff42ca))
* editorMindmapSync.test.tsxのテスト修正 ([34b47d5](https://github.com/stanah/req-mindmap/commit/34b47d55b5f662657222e022b1169363a3c93e58))
* ESLint @typescript-eslint/no-explicit-any警告の大幅修正 ([0a680c6](https://github.com/stanah/req-mindmap/commit/0a680c61dc3c24e35b1e19f11c1a53f860f8c2e3))
* ESLint設定修正と主要な警告・エラー解消 ([0bb0083](https://github.com/stanah/req-mindmap/commit/0bb0083ed4881e633aec7d318bb9635832125569))
* ESLint警告・エラーの大幅削減と型安全性の向上 ([19d0235](https://github.com/stanah/req-mindmap/commit/19d02352393844588fb44fc0d8dbf3f053797d35))
* ESLint警告の修正 - any型の適切な型定義とReact Hook依存関係の解決 ([11e9b8b](https://github.com/stanah/req-mindmap/commit/11e9b8b71a52753ab0605c284e59846bece6fb6b))
* ESLint警告を全て修正 ([16a1777](https://github.com/stanah/req-mindmap/commit/16a1777e4d5e384ffbef748806082d329535c75c))
* extension/tsconfig.jsonの設定を改善 ([c3d8b41](https://github.com/stanah/req-mindmap/commit/c3d8b41364f94f6f68deab802711d1bb9a92036c))
* fileToMindmap統合テストの修正 ([850860b](https://github.com/stanah/req-mindmap/commit/850860bf9f2d4e859905094d3660c516e1dec1d7))
* fileToMindmap統合テストの完全修正 ([290ffd3](https://github.com/stanah/req-mindmap/commit/290ffd38f0822c88e4db0d244bf502cfc89e8210))
* GitHub Pages用にViteのbuild inputをindex.htmlに修正 ([cefde1c](https://github.com/stanah/req-mindmap/commit/cefde1caebcdaf43ebff39fc58322455965a2926))
* lint warningを修正 ([7dd8809](https://github.com/stanah/req-mindmap/commit/7dd8809c8970f706079dfe5c429165dcb485cd98))
* lintエラーを修正 ([513dbc1](https://github.com/stanah/req-mindmap/commit/513dbc1974905f0d2c9621606e9465d7dcd70122))
* MindmapCoreテストのD3モック不具合を修正 ([35154b3](https://github.com/stanah/req-mindmap/commit/35154b30ecf617d3a7ee6a518ab1744cd84ff81b))
* NodeActionButtonsテストを実際のコンポーネント実装に合わせて修正 ([1a0e72e](https://github.com/stanah/req-mindmap/commit/1a0e72e7686a9773d7c5a929283df2e82d9aec07))
* parseメソッドをParserServiceに追加 ([4a4b836](https://github.com/stanah/req-mindmap/commit/4a4b836833477fa4d03063fbe788c0a26a7f2519))
* remove unused scripts from package.json ([874757d](https://github.com/stanah/req-mindmap/commit/874757dc427426e61828c5687c4628cad8fe1c70))
* replace 'any' types with proper TypeScript types in mindmapRenderer.ts ([3bff1ff](https://github.com/stanah/req-mindmap/commit/3bff1ffe886813777180afe56c2d3218838b6296))
* resolve all ESLint type errors and unused variables ([fbdc037](https://github.com/stanah/req-mindmap/commit/fbdc037ceaa15090b3181660106e0bfda44e4349))
* resolve all TypeScript build errors ([7dc11c3](https://github.com/stanah/req-mindmap/commit/7dc11c3ca1a0876ac7bf708053a447d41d809c6d))
* resolve E2E test failures for MindmapOperations ([f93932d](https://github.com/stanah/req-mindmap/commit/f93932d9f4278661096fa02a24a9a72d4ddb6035))
* resolve major build errors ([df176d5](https://github.com/stanah/req-mindmap/commit/df176d50809759cfb30e82fa3d74dce3baef82a4))
* resolve major TypeScript build errors (170→110 errors) ([958f1c8](https://github.com/stanah/req-mindmap/commit/958f1c8777381a590dd459a0e4274669f4a48b86))
* resolve remaining unused variable errors ([f5a4ff4](https://github.com/stanah/req-mindmap/commit/f5a4ff409dbc1ae68ee6d9d200e85b1a7fac0071))
* resolve test failures from 59 to 0 unit tests passing ([7990eb4](https://github.com/stanah/req-mindmap/commit/7990eb4c63e0eac6d2c16d1c45438aaefa0799f0))
* resolve TypeScript lint errors ([5712989](https://github.com/stanah/req-mindmap/commit/57129893d095777f38f92ef3d9da18b9f3f321d8))
* tsconfig.app.jsonにテストファイル除外設定を追加 ([d038a03](https://github.com/stanah/req-mindmap/commit/d038a0394f9c4630e187bfdf8243e9506ed8ecd0))
* TypeScript eslint errors for any types and unused variables ([9972efa](https://github.com/stanah/req-mindmap/commit/9972efac546ea28b0e546b1852145f196a83e6c3))
* TypeScriptインポートエラーを修正 ([91002a2](https://github.com/stanah/req-mindmap/commit/91002a250095c39ff49aaee45e9d9a1260ab4285))
* TypeScriptコンパイルエラーを修正とコンパイルコマンド追加 ([b3b4414](https://github.com/stanah/req-mindmap/commit/b3b44144068d6f7e25c505c1a10128ed3fcff2c9))
* TypeScriptビルドエラーを修正 ([1a1990d](https://github.com/stanah/req-mindmap/commit/1a1990d4b0e0d90fdbde35e26da39ed1cb8783ea))
* TypeScriptビルドエラーを修正 ([69b1de8](https://github.com/stanah/req-mindmap/commit/69b1de8de330116a8a97ee8b1452f9e0367eee3c))
* TypeScriptビルドエラーを段階的に修正 ([8aadee4](https://github.com/stanah/req-mindmap/commit/8aadee4ac6c9404eb871460926e9932141179052))
* TypeScript型インポートエラーを修正 ([a4efe21](https://github.com/stanah/req-mindmap/commit/a4efe21c74ef50805c83fedf345866de7810b9df))
* TypeScript型エラーの修正 ([deb2148](https://github.com/stanah/req-mindmap/commit/deb2148359ecbb4cbbdc06eb010a6b674086477a))
* TypeScript型エラーの修正と最適化 ([bc2bcdd](https://github.com/stanah/req-mindmap/commit/bc2bcdd72442798acdcc24cbd7289035f5d91f60))
* update icon for open preview command in Mindmap Tool ([9dce943](https://github.com/stanah/req-mindmap/commit/9dce94304538825d19e449b8b727e026d04bc0a9))
* VSCode API初期化の無限ループ問題を修正 ([c3078b5](https://github.com/stanah/req-mindmap/commit/c3078b5e9516c176f4b95f23991132881cc238e6))
* VSCodeApp.tsxのjsonContentエラーを修正し、build:vscodeコマンドを自動化 ([763c69b](https://github.com/stanah/req-mindmap/commit/763c69b7b4c2796e45b8a97261c9f3b72d1c1acb))
* VSCodeEditorAdapterの実装完了とエラー修正 ([8528948](https://github.com/stanah/req-mindmap/commit/8528948799666044261217be9e5df1c46151ea9a))
* VSCodeエディタとWebviewプレビュー間の双方向同期機能を修正 ([d86cec9](https://github.com/stanah/req-mindmap/commit/d86cec98cfea4b4f8bcd0bdd4fe1d821a6a09f38))
* VSCode拡張でnodeIdのundefinedチェックを追加 ([1565199](https://github.com/stanah/req-mindmap/commit/15651998425db7d10194a0ee6d4f7ddb83260d73))
* VSCode拡張テストの問題を修正し、全テストを通るように改善 ([9a26e82](https://github.com/stanah/req-mindmap/commit/9a26e82318972641d72aa83cfc1bf65b5f32f5ba))
* VSCode拡張でのYAMLファイル保存時の形式保持機能を修正 ([b9e8a6c](https://github.com/stanah/req-mindmap/commit/b9e8a6cd5f0431216eccf11e0879455e8e576d39))
* VSCode拡張のjs-yaml依存関係バンドル問題を修正 ([14332e4](https://github.com/stanah/req-mindmap/commit/14332e4345b97e85a6912764538751ee3c61d1bf))
* VSCode拡張のテーマToggle無限ループ問題の根本修正 ([0d061d8](https://github.com/stanah/req-mindmap/commit/0d061d8996b94579e63328fca2de5be623e21b17))
* VSCode拡張のテーマ切り替えとライトモード詳細パネルの表示を修正 ([899f388](https://github.com/stanah/req-mindmap/commit/899f388bc07f45d14318de445bda4732e5693e19))
* VSCode拡張のテーマ切り替え無限ループ問題を修正 ([bd8c8b2](https://github.com/stanah/req-mindmap/commit/bd8c8b2c681a4f229691306948ad2e8d3ccf34c3))
* VSCode拡張のノードクリックエラーとマインドマップ表示問題を修正 ([27684ae](https://github.com/stanah/req-mindmap/commit/27684aec7d20ddad3f8dabe427a56723c57dd77c))
* VSCode拡張のマインドマップで右クリック時の操作停止問題を修正 ([05c77b1](https://github.com/stanah/req-mindmap/commit/05c77b1aada47936d44be6522b1d44eca62152e5))
* VSCode拡張の重複エントリポイント問題を修正 ([546edf3](https://github.com/stanah/req-mindmap/commit/546edf364f7a7da4125b9748e45f5e564c5df751))
* VSCode拡張の重複する準備完了メッセージを修正 ([a767ce5](https://github.com/stanah/req-mindmap/commit/a767ce51a3004d29fe6cd90c04275d16ab4dcabc))
* VSCode拡張ビルドエラーを修正 ([7cbb754](https://github.com/stanah/req-mindmap/commit/7cbb754b83daa48be0370e608b26e081119dc80e))
* VSCode拡張ビルド時にテストファイルを除外するようtsconfig.jsonを修正 ([17f221b](https://github.com/stanah/req-mindmap/commit/17f221bc1fa4258cb56975a53cb285e9e16b73a8))
* VSCode拡張ビルド設定でHTMLインライン化 ([c5b6301](https://github.com/stanah/req-mindmap/commit/c5b6301ccb02cee84aab61d934e270b3d835267b))
* VSCode拡張初期化時のNo data loadedエラー修正 ([84211b0](https://github.com/stanah/req-mindmap/commit/84211b05ea3c35f97d4fec2f04e2368709101420))
* VSCode版でノードクリック時のマインドマップ表示消失問題を修正 ([737768a](https://github.com/stanah/req-mindmap/commit/737768a6953f44880adbfde6fb2328877be50948))
* VSCode環境でのマインドマップ横幅表示問題を修正 ([7e2fd39](https://github.com/stanah/req-mindmap/commit/7e2fd3973c8cac7f57d7d1fc1199c512704a3cf3))
* WebviewでのJSファイル参照を正しいパス(index.vscode.js)に修正 ([6d72eba](https://github.com/stanah/req-mindmap/commit/6d72ebad7436f276a0e7be22ad3c1dc8bd9c2b26))
* YAMLコンテンツのJSONパースエラー修正 ([c8d2f6c](https://github.com/stanah/req-mindmap/commit/c8d2f6ce7b579232506c54fad382d5a55fc18bb0))
* YAMLパース用スキーマにcreatedAt/updatedAt/deadlineプロパティを追加 ([68ff6e2](https://github.com/stanah/req-mindmap/commit/68ff6e25e522e86e9ba68e008bfa09a434babb20))
* Zod v4スキーマバリデーション修正 ([5915bc5](https://github.com/stanah/req-mindmap/commit/5915bc5441adc0e6d6afcafb1c9248041f6027da))
* Zod v4の z.record API対応 ([c713083](https://github.com/stanah/req-mindmap/commit/c713083131eb4530f6fed73f2e399fec259c83db))
* アプリ初期化時の重複メッセージ送信を修正 ([16a74e2](https://github.com/stanah/req-mindmap/commit/16a74e2c126d86c47c6b18a7390d6d1afe7e9a4a))
* エディター言語設定に基づいてサンプルデータを切り替え ([b486303](https://github.com/stanah/req-mindmap/commit/b4863033450c85a0b9657b1bdd437dae6e2eb04c))
* エラーハンドリング統合テストを修正 ([f466f42](https://github.com/stanah/req-mindmap/commit/f466f426b3c1506517e94f6708b1bd01339be7fa))
* コア機能の型安全性とAPI整合性を改善 ([a33521b](https://github.com/stanah/req-mindmap/commit/a33521b81b30d7b646d7d7a537b5d2c87fe4c9a3))
* サンプル読み込みボタンを復元 ([a360ac9](https://github.com/stanah/req-mindmap/commit/a360ac9e24b144f91759a2dfe24b679334b6d601))
* スキーマファイルアクセスエラーを修正とツールバーボタン統合 ([e23b103](https://github.com/stanah/req-mindmap/commit/e23b10328f5e1eb70df2f7c08fa6ff1d86405907))
* テーマ切り替えでReact Iconsを使用 ([67db527](https://github.com/stanah/req-mindmap/commit/67db52721796f8e4b18486208de27e45bdbf0a82))
* テストエラーを修正し、全テストが通るように整備 ([2c7ffe6](https://github.com/stanah/req-mindmap/commit/2c7ffe61f8d071ef16cf83c5761597ac6b59c7c3))
* テストエラーを修正してすべてのテストが通るように改善 ([062b56d](https://github.com/stanah/req-mindmap/commit/062b56d414279a3a3fdae656018e793872ab42ce))
* テストで発生していた主要な問題を修正 ([6c6687c](https://github.com/stanah/req-mindmap/commit/6c6687cf3f741edab7e722a8656702d81d564018))
* テストのReact actエラーを修正 ([afe9ba2](https://github.com/stanah/req-mindmap/commit/afe9ba2967bbc3f2029381ed5dcf537f7ae33fd0))
* テストのパフォーマンス大幅改善とモック問題の解決 ([ff37bb7](https://github.com/stanah/req-mindmap/commit/ff37bb76f980a9cb7919258afb10251dd5aebb4c))
* テストファイルのESLint any型警告を修正 ([4ab2af4](https://github.com/stanah/req-mindmap/commit/4ab2af422dc69c88e7f55d0d161cad0cd7fa4a51))
* テスト失敗の大幅改善 (59→8個に削減) ([562a804](https://github.com/stanah/req-mindmap/commit/562a8041a647af9c2a5661bbadf4ce0fc2865243))
* テスト環境でのmonaco-editorとD3.jsモック問題を解決 ([8e5aa63](https://github.com/stanah/req-mindmap/commit/8e5aa638873a10a9526fe52430754a53dcb6d465))
* テンプレート生成サービスのMindmapNode構造を修正 ([7dc39f2](https://github.com/stanah/req-mindmap/commit/7dc39f2c61c61a30d9f5316814b6dee73e87642c))
* ノードクリック時のマインドマップ表示消失問題を修正 ([bd26c55](https://github.com/stanah/req-mindmap/commit/bd26c55bac34da37de6b2855194f6505c66d09a0))
* ノードとリンクの表示順序が逆転する問題を修正 ([a977b9c](https://github.com/stanah/req-mindmap/commit/a977b9cd5d8f1e59d507736c987bd72ef056af7b))
* ノードのテキスト表示を改善し複数行対応を修正 ([d305dec](https://github.com/stanah/req-mindmap/commit/d305decd4ea8368fa411eca55004fca256227e20))
* ノード選択時のマインドマップ消失問題を修正 ([b6aca62](https://github.com/stanah/req-mindmap/commit/b6aca620df880c863c92cf3c36c7f6991a2d06b5))
* パーサーとバリデーターの型互換性を修正 ([a9c1e55](https://github.com/stanah/req-mindmap/commit/a9c1e55abaea7ba76cd228720a17ce83cbf57b78))
* ボタン名を「サンプル読み込み」に変更 ([bc12dea](https://github.com/stanah/req-mindmap/commit/bc12deaf7838cbe7598bfb024a124a60da326def))
* マインドマップノードの幅を固定化し、設定で調整可能にした ([3e19ba6](https://github.com/stanah/req-mindmap/commit/3e19ba6a489d3be8a0d541976d83641ee86508d0))
* マインドマップのレイアウトとバッジ表示を改善 ([c522b8e](https://github.com/stanah/req-mindmap/commit/c522b8ec7c09b5be615458f96f158f973c2c112e))
* リアルタイム同期統合テストを修正 ([5da7d24](https://github.com/stanah/req-mindmap/commit/5da7d249363b6f26a1eb3311d9029f728960b075))
* レイアウト切り替え時にマインドマップが消える問題を修正 ([2db701e](https://github.com/stanah/req-mindmap/commit/2db701e79b1944ea54c13c45c7eb2f82edf0cec4))
* レイアウト切り替え時の表示消失問題を修正 ([952c320](https://github.com/stanah/req-mindmap/commit/952c320462437974a70290adfbf35b96016a2353))
* ローカルストレージ保存・読み込み問題を修正 ([8102b76](https://github.com/stanah/req-mindmap/commit/8102b760d1831216ccacdf34cd4bf6fa52b7333b))
* 主要なTypeScriptビルドエラーを修正 ([8f5b9df](https://github.com/stanah/req-mindmap/commit/8f5b9df284e494e087a5a4619aae0c615716e5f8))
* 修正: テーマトグルでデフォルトテーマをライトに設定 ([1c451b9](https://github.com/stanah/req-mindmap/commit/1c451b95ee6c7c989c57a88515893b1f0ff36b9c))
* 全テストファイルの修正とテストスイート正常化 ([5ac1465](https://github.com/stanah/req-mindmap/commit/5ac1465172f6ae6adbd621ab418da77062cf42a4))
* 初回描画時のビューリセット処理を追加し、描画オプションを拡張 ([f379d1f](https://github.com/stanah/req-mindmap/commit/f379d1fe95f19c23869fd16b000a4a284feda46d))
* 初期化通知の重複表示を修正 ([6665f21](https://github.com/stanah/req-mindmap/commit/6665f214f91357bde385dc87fcdb83dba774eca6))
* 名前を付けて保存ボタンを削除し、保存機能を統一 ([138b88e](https://github.com/stanah/req-mindmap/commit/138b88e81c3a1d2a6a792f31995168893b0c4305))
* 大幅なテスト修正により65個から45個まで失敗を削減 ([b58cf9e](https://github.com/stanah/req-mindmap/commit/b58cf9e9fcdab849baf6469840aa060479c8b1c7))
* 子ノード追加時のisYAML未定義エラーを修正 ([c4afeb0](https://github.com/stanah/req-mindmap/commit/c4afeb00f253b6e45121d4528010f3468cf021e5))
* 放射状レイアウトのノード重なり問題を修正 ([69091e0](https://github.com/stanah/req-mindmap/commit/69091e0ee763cd7afc62d0eb66e81b2b5eeecdd6))
* 統合要件定義スキーマのレベル構造を修正 ([18a15f3](https://github.com/stanah/req-mindmap/commit/18a15f3f827696ec7e4205da27db8404437d8c38))
* 追加のTypeScriptビルドエラーを修正 ([a527c19](https://github.com/stanah/req-mindmap/commit/a527c193ab18914bddc2a31514e34f904925c7d7))


### Documentation

* add Unreleased section to CHANGELOG.md ([c959f35](https://github.com/stanah/req-mindmap/commit/c959f35542ddb5cd0cd69e15c9c95554511c9243))
* VSCode拡張のドキュメントを追加 ([4c97301](https://github.com/stanah/req-mindmap/commit/4c97301757ad2ff6b6ec3108a7b58161022435e1))


### Styles

* CSSでパネルの最大高さを調整し、グリッドの列幅を変更 ([86edaa0](https://github.com/stanah/req-mindmap/commit/86edaa06674999dd333480a9e6ba7b657c9e4157))
* remove trailing spaces in release workflow YAML ([56dc63f](https://github.com/stanah/req-mindmap/commit/56dc63fd2cbf857c33af455a5b0a20d8f75174da))


### Code Refactoring

* ESLint any型警告の大幅削減とTypeScript型安全性向上 ([5a3fdfb](https://github.com/stanah/req-mindmap/commit/5a3fdfbfaa3816f148d6ef1f99da73c81971c45d))
* Layout.tsxのサンプルデータをdata/samples.tsに移動 ([743e932](https://github.com/stanah/req-mindmap/commit/743e9329cc554a09aca39ee793320ac3448f1f7f))
* NodeActionButtonsコンポーネントの簡素化 ([b8c1706](https://github.com/stanah/req-mindmap/commit/b8c170600dc9afdf685bf3dd369b33da00c55e60))
* remove duplicate mock definitions from test files ([4900a46](https://github.com/stanah/req-mindmap/commit/4900a46cba2db998dcaa51ba70d913026bda5a77))
* VSCode拡張に焦点を当てたタスク整理とスコープ調整 ([1243957](https://github.com/stanah/req-mindmap/commit/12439570efe9e86e6aeeb159e963e9906ab7a88a))
* エディタ部分とマインドマップ表示部分の分離完了とファイル整理 ([4284721](https://github.com/stanah/req-mindmap/commit/428472161c173a0d4df2bd24e491404cacf90007))
* コードの品質向上とデバッグ機能強化 ([69c1e02](https://github.com/stanah/req-mindmap/commit/69c1e02345e80e10b796facf8a594ffec18b90b6))
* タスク10からパフォーマンス最適化・PWA関連サブタスク削除 ([d29d789](https://github.com/stanah/req-mindmap/commit/d29d7897dc19dd1bd5bf2e366663d740567377cc))
* タスク8のテンプレート機能削除、タスク9完全削除 ([00e9453](https://github.com/stanah/req-mindmap/commit/00e94536ef1a6abf2858528279c4c129ddae1735))
* ビルドコマンドを分かりやすく整理 ([c5ec540](https://github.com/stanah/req-mindmap/commit/c5ec540ab21ed814bc132a5d813969908e3211b5))
* 古いmindmapRenderer.tsを削除してMindmapCoreに統合 ([fe85eb3](https://github.com/stanah/req-mindmap/commit/fe85eb31bdef8f9a97301ea4b78d21dfba32f2ca))
* 型定義システムを統一し、下位互換性を確保 ([f0a5846](https://github.com/stanah/req-mindmap/commit/f0a58461d3f793f5ed1604b9f60f68065bc8e929))


### Tests

* VSCode拡張のテストカバレッジを大幅改善 ([45e84ee](https://github.com/stanah/req-mindmap/commit/45e84ee49e964c5935c703fe45440a42d22ac7c6))
* VSCode拡張のテストカバレッジを大幅改善 ([ef40b79](https://github.com/stanah/req-mindmap/commit/ef40b79c01d0ad2c56d136dc859788d7676d314e))


### Continuous Integration

* add bump-minor-pre-major to prevent automatic 1.0.0 release ([5ff82ae](https://github.com/stanah/req-mindmap/commit/5ff82aebd2d036bd0a685db318a101f16a1e8a2a))
* add concurrency control and fix YAML formatting ([f3781e4](https://github.com/stanah/req-mindmap/commit/f3781e4abe05560712585161e99f6dcc845b3795))
* add issues write permission to fix label creation error ([a65d40a](https://github.com/stanah/req-mindmap/commit/a65d40a321a81774d8c9f901a0f8c4745c7541f0))
* adjust release-please manifest to start from 0.1.0 ([6aa309a](https://github.com/stanah/req-mindmap/commit/6aa309a35b12c4c03b809d06de3a3fd0d780c962))
* specify jsonpath for extra-files in release-please config ([958796a](https://github.com/stanah/req-mindmap/commit/958796ae770341c3222e211586776b1ca763869d))
* task-master init ([f8babc5](https://github.com/stanah/req-mindmap/commit/f8babc5f2793f09033c162806703d1e40ea221f0))

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
