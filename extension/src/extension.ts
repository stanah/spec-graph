import * as vscode from 'vscode';
import * as path from 'path';
import { MindmapEditorProvider } from './MindmapEditorProvider';
import { MindmapWebviewProvider } from './MindmapWebviewProvider';
import { MindmapTreeDataProvider, MindmapTreeItem } from './MindmapTreeDataProvider';

// アクティブなプレビューパネルを管理
const previewPanels = new Map<string, vscode.WebviewPanel>();
let diagnosticCollection: vscode.DiagnosticCollection | null = null;
// Webviewプロバイダーの参照（パネル再初期化用）
let webviewProviderSingleton: MindmapWebviewProvider | null = null;

function ensureDiagnosticCollection(context: vscode.ExtensionContext): vscode.DiagnosticCollection | null {
    try {
        if (!diagnosticCollection) {
            // モック環境では languages 自体が未定義の場合があるため try/catch で保護
            diagnosticCollection = vscode.languages.createDiagnosticCollection('mindmap');
            context.subscriptions.push(diagnosticCollection);
        }
    } catch {
        // テスト環境などで languages が無い場合は無視
        diagnosticCollection = null;
    }
    return diagnosticCollection;
}

function makeRange(document: vscode.TextDocument, line: number, startCol = 0, endCol?: number) {
    const l = Math.max(0, Math.min(line, document.lineCount - 1));
    const textLine = document.lineAt(l);
    const start = new vscode.Position(l, Math.max(0, Math.min(startCol, textLine.text.length)));
    const end = new vscode.Position(l, endCol != null ? Math.max(0, Math.min(endCol, textLine.text.length)) : textLine.text.length);
    return new vscode.Range(start, end);
}

async function validateDocumentToDiagnostics(document: vscode.TextDocument): Promise<{ errors: number; warnings: number }> {
    // VSCodeの定数がモック環境で未定義のことがあるためフォールバックを用意
    const Sev = (vscode.DiagnosticSeverity ?? { Error: 0, Warning: 1, Information: 2, Hint: 3 }) as {
        Error: number; Warning: number; Information: number; Hint: number;
    };

    const diags: vscode.Diagnostic[] = [];
    let errorCount = 0;
    let warningCount = 0;

    const isJSON = document.languageId === 'json' || document.fileName.toLowerCase().endsWith('.json');
    const isYAML = document.languageId === 'yaml' || /\.(ya?ml)$/i.test(document.fileName);

    const add = (msg: string, severity: number, line = 0) => {
        // 件数をカウント（Diagnostic生成に失敗しても数は返す）
        if (severity === Sev.Error) errorCount += 1;
        if (severity === Sev.Warning) warningCount += 1;

        try {
            // テスト環境では Diagnostic が未定義の可能性がある
            // 実行時に利用可能な場合のみ生成
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (typeof (vscode as unknown as { Diagnostic?: unknown }).Diagnostic !== 'undefined') {
                diags.push(new vscode.Diagnostic(makeRange(document, line), msg, severity as vscode.DiagnosticSeverity));
            }
        } catch {
            // 生成失敗は無視（件数のみ反映）
        }
    };

    const text = document.getText();
    let data: unknown = null;
    if (isJSON) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            add(`JSON構文エラー: ${(e as Error).message}`, Sev.Error, 0);
        }
    } else if (isYAML) {
        // 依存を増やさないため、ここではYAML構文検証は行わない
        add('YAMLの詳細検証は未対応です（JSON対象の検証のみ）', Sev.Information, 0);
    }

    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        const req: Array<[string, (v: unknown) => boolean, string]> = [
            ['version', (v) => typeof v === 'string', 'version は文字列が必要です'],
            ['title', (v) => typeof v === 'string', 'title は文字列が必要です'],
            ['root', (v) => !!v && typeof v === 'object', 'root はオブジェクトが必要です'],
        ];
        for (const [k, pred, msg] of req) {
            if (!(k in obj) || !pred(obj[k])) {
                add(`必須フィールド '${k}' が不正です: ${msg}`, Sev.Error, 0);
            }
        }
        const root = obj.root as Record<string, unknown> | undefined;
        if (root && typeof root === 'object') {
            if (typeof root.id !== 'string') add('root.id は文字列が必要です', Sev.Error, 0);
            if (typeof root.title !== 'string') add('root.title は文字列が必要です', Sev.Error, 0);
        }
    }

    // DiagnosticCollection が利用可能な場合のみVSCodeに反映
    if (diagnosticCollection) {
        try {
            diagnosticCollection.set(document.uri, diags);
        } catch {
            // テスト環境等では無視
        }
    }

    return { errors: errorCount, warnings: warningCount };
}

/**
 * VSCode拡張のメインエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Mindmap Tool拡張が有効化されました');

    // Webviewプロバイダーの登録
    const _webviewProvider = new MindmapWebviewProvider(context.extensionUri);
    webviewProviderSingleton = _webviewProvider;
    
    // カスタムエディタープロバイダーの登録
    const editorProvider = new MindmapEditorProvider(context);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'mindmapTool.mindmapEditor',
            editorProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );

    // ツリーデータプロバイダーの登録
    const treeDataProvider = new MindmapTreeDataProvider();
    const treeView = vscode.window.createTreeView('mindmapTree', {
        treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // アクティブエディタの変更を監視してツリーとプレビューを更新
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            console.log('[DEBUG] onDidChangeActiveTextEditor fired');
            console.log('[DEBUG] Editor:', editor ? editor.document.fileName : 'null');
            if (editor) {
                const fileName = editor.document.fileName;
                const ext = path.extname(fileName).toLowerCase();
                console.log(`[DEBUG] Active editor changed: ${fileName}, ext: ${ext}`);
                
                // マインドマップファイルの場合のみツリーとプレビューを更新
                if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
                    console.log('[DEBUG] File extension matches mindmap format');
                    try {
                        const content = editor.document.getText();
                        // マインドマップデータかどうかをチェック
                        let data: unknown;
                        if (ext === '.yaml' || ext === '.yml') {
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const yaml = require('js-yaml');
                            data = yaml.load(content);
                        } else {
                            data = JSON.parse(content);
                        }
                        
                        // マインドマップファイルかどうかを柔軟にチェック
                        const isLikelyMindmapFile = data && typeof data === 'object' && (
                            // 標準的なマインドマップファイル
                            'root' in data ||
                            // その他の構造化データファイルも対象とする
                            'title' in data || 
                            'version' in data ||
                            'stakeholders' in data ||
                            'epics' in data ||
                            'requirements' in data ||
                            Array.isArray(data) // 配列形式のデータも対象
                        );
                        
                        if (isLikelyMindmapFile) {
                            console.log('[DEBUG] ✅ Detected structured data file (potential mindmap)');
                            console.log('[DEBUG] Data keys:', Object.keys(data as object));
                            // ツリーを更新（rootプロパティがある場合のみ）
                            if ('root' in (data as object)) {
                                console.log('[DEBUG] Updating tree data provider...');
                                await treeDataProvider.setCurrentDocument(editor.document);
                            }
                            
                            // プレビューは常に更新（構造化データとして表示）
                            console.log('[DEBUG] 🚀 Calling updatePreviewForActiveEditor...');
                            await updatePreviewForActiveEditor(editor.document);
                            console.log('[DEBUG] ✅ updatePreviewForActiveEditor completed');

                            // フォロー設定に応じて、プレビューが開かれていなければ自動で開く
                            try {
                                const cfg = vscode.workspace.getConfiguration('mindmapTool');
                                const follow = cfg.get<boolean>('preview.followActiveEditor', true);
                                const autoOpen = cfg.get<boolean>('preview.autoOpenOnFileOpen', true);
                                const hasVisiblePreview = Array.from(previewPanels.values()).some(p => p.visible);
                                if (follow && autoOpen && !hasVisiblePreview) {
                                    console.log('[DEBUG] No visible preview panel. Auto opening beside.');
                                    await openMindmapPreview(editor.document.uri, vscode.ViewColumn.Beside, context);
                                }
                            } catch (e) {
                                console.log('[DEBUG] Auto-open preview skipped due to error or unsupported environment:', e);
                            }
                        } else {
                            console.log('[DEBUG] ❌ File does not contain recognizable structured data');
                            console.log('[DEBUG] Data:', data);
                        }
                    } catch (error) {
                        console.log('[DEBUG] Parse error (ignored):', error);
                    }
                }
            } else {
                console.log('[DEBUG] No active editor');
            }
        })
    );

    // コマンドの登録
    const commands = [
        // マインドマッププレビューを開くコマンド
        vscode.commands.registerCommand('mindmapTool.openPreview', async (uri?: vscode.Uri) => {
            await openMindmapPreview(uri, vscode.ViewColumn.Active, context);
        }),

        // マインドマッププレビューを横に開くコマンド  
        vscode.commands.registerCommand('mindmapTool.openPreviewToSide', async (uri?: vscode.Uri) => {
            await openMindmapPreview(uri, vscode.ViewColumn.Beside, context);
        }),

        // マインドマップを開くコマンド
        vscode.commands.registerCommand('mindmapTool.openMindmap', async (uri?: vscode.Uri) => {
            try {
                let targetUri = uri;
                
                if (!targetUri) {
                    // ファイル選択ダイアログを表示
                    const fileUris = await vscode.window.showOpenDialog({
                        canSelectFiles: true,
                        canSelectFolders: false,
                        canSelectMany: false,
                        filters: {
                            'マインドマップファイル': ['json', 'yaml', 'yml'],
                            'すべてのファイル': ['*']
                        },
                        title: 'マインドマップファイルを選択'
                    });
                    
                    if (!fileUris || fileUris.length === 0) {
                        return;
                    }
                    
                    targetUri = fileUris[0];
                }

                // カスタムエディターで開く
                await vscode.commands.executeCommand('vscode.openWith', targetUri, 'mindmapTool.mindmapEditor');
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップを開けませんでした: ${error}`);
            }
        }),

        // 新しいマインドマップを作成するコマンド
        vscode.commands.registerCommand('mindmapTool.createNewMindmap', async () => {
            try {
                // 新規ファイルの保存場所を選択
                const saveUri = await vscode.window.showSaveDialog({
                    filters: {
                        'JSONファイル': ['json'],
                        'YAMLファイル': ['yaml', 'yml']
                    },
                    defaultUri: vscode.Uri.file('mindmap.json'),
                    title: '新しいマインドマップを保存'
                });

                if (!saveUri) {
                    return;
                }

                // テンプレートの選択
                const templateType = await vscode.window.showQuickPick([
                    { label: '基本テンプレート', value: 'basic' },
                    { label: '高度なテンプレート', value: 'advanced' },
                    { label: 'プロジェクト管理テンプレート', value: 'project' }
                ], {
                    title: 'テンプレートを選択',
                    placeHolder: '使用するテンプレートを選択してください'
                });

                if (!templateType) {
                    return;
                }

                // テンプレート内容を生成
                const template = generateTemplate(templateType.value as 'basic' | 'advanced' | 'project', saveUri.fsPath);
                
                // ファイルを作成
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(template, 'utf8'));
                
                // 作成したファイルを開く
                await vscode.commands.executeCommand('vscode.openWith', saveUri, 'mindmapTool.mindmapEditor');
                
                vscode.window.showInformationMessage(`新しいマインドマップを作成しました: ${saveUri.fsPath}`);
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップの作成に失敗しました: ${error}`);
            }
        }),

        // マインドマップをエクスポートするコマンド
        vscode.commands.registerCommand('mindmapTool.exportMindmap', async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('アクティブなエディターがありません');
                    return;
                }

                // エクスポート形式を選択
                const exportFormat = await vscode.window.showQuickPick([
                    { label: 'PNG画像', value: 'png' },
                    { label: 'SVG画像', value: 'svg' },
                    { label: 'PDF', value: 'pdf' }
                ], {
                    title: 'エクスポート形式を選択',
                    placeHolder: 'エクスポートする形式を選択してください'
                });

                if (!exportFormat) {
                    return;
                }

                // 保存場所を選択
                const saveUri = await vscode.window.showSaveDialog({
                    filters: {
                        [exportFormat.label]: [exportFormat.value]
                    },
                    defaultUri: vscode.Uri.file(`mindmap.${exportFormat.value}`),
                    title: 'エクスポート先を選択'
                });

                if (!saveUri) {
                    return;
                }

                // エクスポート処理（実装は将来追加）
                vscode.window.showInformationMessage('エクスポート機能は開発中です');
                
            } catch (error) {
                vscode.window.showErrorMessage(`エクスポートに失敗しました: ${error}`);
            }
        }),

        // スキーマ検証コマンド（VSCode Diagnostics へ反映）
        vscode.commands.registerCommand('mindmapTool.validateSchema', async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('アクティブなエディターがありません');
                    return;
                }

                const document = activeEditor.document;
                ensureDiagnosticCollection(context);
                const { errors, warnings } = await validateDocumentToDiagnostics(document);
                vscode.window.showInformationMessage(`スキーマ検証: エラー ${errors} 件 / 警告 ${warnings} 件`);
            } catch {
                // テスト互換性のため、例外時も情報メッセージを表示
                vscode.window.showInformationMessage('スキーマ検証: 検証を実行できませんでした（開発中）');
            }
        }),

        // ツリービュー関連コマンド
        vscode.commands.registerCommand('mindmapTool.refreshMindmapTree', () => {
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('マインドマップツリーを更新しました');
        }),

        vscode.commands.registerCommand('mindmapTool.selectNode', async (nodeId: string, nodeData?: unknown) => {
            console.log('ノード選択:', nodeId, nodeData);
            
            // ノード選択時にエディタで該当箇所にジャンプ（将来実装）
            if (nodeData) {
                const nodeInfo = nodeData as { title: string; description?: string };
                vscode.window.showInformationMessage(`ノード "${nodeInfo.title}" を選択しました`);
            }
        }),

        vscode.commands.registerCommand('mindmapTool.addChildNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを入力してください',
                placeHolder: '新しいノード'
            });

            if (!nodeTitle) {
                return;
            }

            const nodeDescription = await vscode.window.showInputBox({
                prompt: 'ノードの説明を入力してください（オプション）',
                placeHolder: '説明'
            });

            const newNodeId = `node_${Date.now()}`;
            
            try {
                await treeDataProvider.addNode(treeItem.nodeId, {
                    id: newNodeId,
                    title: nodeTitle,
                    description: nodeDescription || ''
                });
                
                vscode.window.showInformationMessage(`子ノード "${nodeTitle}" を追加しました`);
            } catch (error) {
                vscode.window.showErrorMessage(`ノードの追加に失敗しました: ${error}`);
            }
        }),

        vscode.commands.registerCommand('mindmapTool.addSiblingNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを入力してください',
                placeHolder: '新しいノード'
            });

            if (!nodeTitle) {
                return;
            }

            const _nodeDescription = await vscode.window.showInputBox({
                prompt: 'ノードの説明を入力してください（オプション）',
                placeHolder: '説明'
            });

            const _newNodeId = `node_${Date.now()}`;
            
            // 兄弟ノード追加は親ノードに追加することと同じ
            // 実際の実装では親ノードのIDを取得する必要がある
            vscode.window.showInformationMessage('兄弟ノード追加機能は開発中です');
        }),

        vscode.commands.registerCommand('mindmapTool.editNode', async (treeItem: MindmapTreeItem) => {
            if (!treeItem.nodeData) {
                return;
            }

            const currentTitle = treeItem.nodeData.title;
            const newTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを編集してください',
                value: currentTitle
            });

            if (!newTitle || newTitle === currentTitle) {
                return;
            }

            // ノード編集の実装（将来追加）
            vscode.window.showInformationMessage('ノード編集機能は開発中です');
        }),

        vscode.commands.registerCommand('mindmapTool.deleteNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = treeItem.nodeData?.title || treeItem.label;
            const confirmed = await vscode.window.showWarningMessage(
                `ノード "${nodeTitle}" を削除しますか？`,
                { modal: true },
                '削除'
            );

            if (confirmed === '削除') {
                try {
                    await treeDataProvider.deleteNode(treeItem.nodeId);
                    vscode.window.showInformationMessage(`ノード "${nodeTitle}" を削除しました`);
                } catch (error) {
                    vscode.window.showErrorMessage(`ノードの削除に失敗しました: ${error}`);
                }
            }
        }),

        vscode.commands.registerCommand('mindmapTool.collapseAll', () => {
            treeDataProvider.collapseAll();
            if (treeView.visible) {
                // VSCode の TreeView の collapseAll は直接呼び出せない
                vscode.window.showInformationMessage('すべてのノードを折りたたみました');
            }
        }),

        vscode.commands.registerCommand('mindmapTool.expandAll', () => {
            treeDataProvider.expandAll();
            if (treeView.visible) {
                vscode.window.showInformationMessage('すべてのノードを展開しました');
            }
        })
    ];

    // すべてのコマンドを登録
    context.subscriptions.push(...commands);

    // グローバルドキュメント変更監視（全プレビューパネルの自動更新）
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            const document = event.document;
            const ext = path.extname(document.fileName).toLowerCase();
            
            // マインドマップファイルの場合のみ処理
            if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
                try {
                    const content = document.getText();
                    let data: unknown;
                    
                    if (ext === '.yaml' || ext === '.yml') {
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        const yaml = require('js-yaml');
                        data = yaml.load(content);
                    } else {
                        data = JSON.parse(content);
                    }
                    
                    // rootプロパティがある場合のみマインドマップとして扱い、プレビューを更新
                    if (data && typeof data === 'object' && 'root' in data) {
                        await updatePreviewForActiveEditor(document);
                        
                        // Diagnostics更新
                        ensureDiagnosticCollection(context);
                        await validateDocumentToDiagnostics(document);
                    }
                } catch {
                    // 解析エラーは無視（入力中の不正なJSONなど）
                }
            }
        })
    );

    // 設定変更の監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('mindmapTool')) {
                // 設定変更時の処理
                console.log('Mindmap Tool設定が変更されました');
            }
        })
    );

    console.log('Mindmap Tool拡張の初期化が完了しました');
}

/**
 * 拡張の非有効化時に呼ばれる関数
 */
export function deactivate() {
    console.log('Mindmap Tool拡張が非有効化されました');
}

/**
 * テンプレートを生成する関数
 */
function generateTemplate(type: 'basic' | 'advanced' | 'project', filePath: string): string {
    const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');
    
    const templates = {
        basic: {
            json: {
                version: '1.0',
                title: '新しいマインドマップ',
                root: {
                    id: 'root',
                    title: 'ルートノード',
                    description: 'このマインドマップのメインテーマです',
                    children: [
                        {
                            id: 'branch1',
                            title: 'ブランチ1',
                            description: '最初のアイデアまたはトピック',
                            children: []
                        },
                        {
                            id: 'branch2',
                            title: 'ブランチ2',
                            description: '2つ目のアイデアまたはトピック',
                            children: []
                        }
                    ]
                }
            },
            yaml: `version: "1.0"
title: "新しいマインドマップ"
root:
  id: "root"
  title: "ルートノード"
  description: "このマインドマップのメインテーマです"
  children:
    - id: "branch1"
      title: "ブランチ1"
      description: "最初のアイデアまたはトピック"
      children: []
    - id: "branch2"
      title: "ブランチ2"
      description: "2つ目のアイデアまたはトピック"
      children: []`
        },
        advanced: {
            json: {
                version: '1.0',
                title: '高度なマインドマップテンプレート',
                description: 'カスタムフィールドとメタデータを含むテンプレート',
                schema: {
                    version: '1.0',
                    fields: [
                        {
                            id: 'priority',
                            name: '優先度',
                            type: 'select',
                            options: ['高', '中', '低'],
                            required: false
                        },
                        {
                            id: 'status',
                            name: 'ステータス',
                            type: 'select',
                            options: ['未着手', '進行中', '完了'],
                            required: false
                        }
                    ]
                },
                root: {
                    id: 'root',
                    title: 'プロジェクトルート',
                    description: 'プロジェクトの全体像',
                    customFields: {
                        priority: '高',
                        status: '進行中'
                    },
                    children: []
                }
            },
            yaml: `version: "1.0"
title: "高度なマインドマップテンプレート"
description: "カスタムフィールドとメタデータを含むテンプレート"
schema:
  version: "1.0"
  fields:
    - id: "priority"
      name: "優先度"
      type: "select"
      options: ["高", "中", "低"]
      required: false
    - id: "status"
      name: "ステータス"
      type: "select"
      options: ["未着手", "進行中", "完了"]
      required: false
root:
  id: "root"
  title: "プロジェクトルート"
  description: "プロジェクトの全体像"
  customFields:
    priority: "高"
    status: "進行中"
  children: []`
        },
        project: {
            json: {
                version: '1.0',
                title: 'プロジェクト管理テンプレート',
                description: 'プロジェクト管理用の包括的なテンプレート',
                root: {
                    id: 'project-root',
                    title: 'プロジェクト名',
                    description: 'プロジェクトの目的と概要を記述してください',
                    children: [
                        {
                            id: 'objectives',
                            title: '目標・成果物',
                            description: 'プロジェクトの目標と期待される成果物',
                            children: []
                        },
                        {
                            id: 'stakeholders',
                            title: 'ステークホルダー',
                            description: 'プロジェクトに関わる人々',
                            children: []
                        }
                    ]
                }
            },
            yaml: `version: "1.0"
title: "プロジェクト管理テンプレート"
description: "プロジェクト管理用の包括的なテンプレート"
root:
  id: "project-root"
  title: "プロジェクト名"
  description: "プロジェクトの目的と概要を記述してください"
  children:
    - id: "objectives"
      title: "目標・成果物"
      description: "プロジェクトの目標と期待される成果物"
      children: []
    - id: "stakeholders"
      title: "ステークホルダー"
      description: "プロジェクトに関わる人々"
      children: []`
        }
    };

    if (isYaml) {
        return templates[type].yaml;
    } else {
        return JSON.stringify(templates[type].json, null, 2);
    }
}

/**
 * アクティブエディタに対応するプレビューパネルを更新する関数
 */
async function updatePreviewForActiveEditor(document: vscode.TextDocument): Promise<void> {
    try {
        console.log(`[DEBUG] updatePreviewForActiveEditor called for: ${path.basename(document.fileName)}`);
        console.log(`[DEBUG] previewPanels size=${previewPanels.size}, keys=`, Array.from(previewPanels.keys()));
        
        // 開いているすべてのプレビューパネルに新しいコンテンツを送信
        let updated = false;
        const currentKey = document.uri.toString();
        for (const [panelKey, panel] of previewPanels) {
            console.log(`[DEBUG] Checking panel ${panelKey}, visible: ${panel?.visible}, active: ${panel?.active}`);
            if (panel) {
                // パネルが別ファイル用に作られている場合は、再初期化して追従させる
                if (panelKey !== currentKey) {
                    try {
                        console.log(`[DEBUG] 🔁 Re-initializing webview for new document. oldKey=${panelKey} newKey=${currentKey}`);
                        if (webviewProviderSingleton) {
                            webviewProviderSingleton.createWebview(panel, document);
                            panel.title = `Mindmap Preview: ${path.basename(document.fileName)}`;
                            previewPanels.delete(panelKey);
                            previewPanels.set(currentKey, panel);
                            updated = true;
                            // このループではメッセージ送信をスキップ（初期データで最新化される）
                            continue;
                        }
                    } catch (e) {
                        console.error('[DEBUG] ❌ Failed to re-initialize webview panel:', e);
                    }
                }
                const content = document.getText();
                const ext = path.extname(document.fileName).toLowerCase();
                const language = (ext === '.yaml' || ext === '.yml') ? 'yaml' : 'json';
                const updateDocMessage = {
                    command: 'updateDocument',
                    content: content,
                    fileName: document.fileName,
                    uri: document.uri.toString(),
                    data: {
                        content: content,
                        fileName: document.fileName,
                        uri: document.uri.toString()
                    }
                } as const;
                const updateContentMessage = {
                    command: 'updateContent',
                    content: content,
                    fileName: document.fileName,
                    language
                } as const;
                const documentChangedMessage = {
                    command: 'documentChanged',
                    content: content,
                    fileName: document.fileName,
                    uri: document.uri.toString(),
                    language
                } as const;
                console.log(`[DEBUG] 📤 Sending messages to panel ${panelKey}:`, {
                    commands: [updateDocMessage.command, updateContentMessage.command, documentChangedMessage.command],
                    fileName: document.fileName,
                    contentLength: content.length,
                    contentPreview: content.substring(0, 100)
                });
                
                try {
                    // アクティブドキュメントに合わせてパネルタイトルも更新
                    panel.title = `Mindmap Preview: ${path.basename(document.fileName)}`;
                    await Promise.all([
                        panel.webview.postMessage(updateDocMessage),
                        panel.webview.postMessage(updateContentMessage),
                        panel.webview.postMessage(documentChangedMessage)
                    ]);
                    console.log(`[DEBUG] ✅ Messages posted successfully to panel ${panelKey}`);
                } catch (error) {
                    console.error(`[DEBUG] ❌ Failed to post messages to panel ${panelKey}:`, error);
                }
                updated = true;
            } else {
                console.log(`[DEBUG] ❌ Panel ${panelKey} is not available or visible`);
            }
        }
        
        if (updated) {
            console.log(`プレビューパネルを更新しました: ${path.basename(document.fileName)}`);
        } else {
            console.log('[DEBUG] 更新可能なプレビューパネルが見つかりませんでした');
        }
    } catch (error) {
        console.error('プレビューパネルの更新に失敗しました:', error);
    }
}

/**
 * マインドマッププレビューを開く関数
 */
async function openMindmapPreview(uri: vscode.Uri | undefined, viewColumn: vscode.ViewColumn, context: vscode.ExtensionContext): Promise<void> {
    try {
        let targetUri = uri;
        if (!targetUri && vscode.window.activeTextEditor) {
            targetUri = vscode.window.activeTextEditor.document.uri;
        }
        
        if (!targetUri) {
            vscode.window.showWarningMessage('プレビューするファイルが見つかりません');
            return;
        }

        const document = await vscode.workspace.openTextDocument(targetUri);
        const panelKey = targetUri.toString();

        // 既存のプレビューパネルがあるかチェック
        let panel = previewPanels.get(panelKey);
        
        if (panel) {
            // 既存パネルがある場合は表示（フォーカスは移さない）
            panel.reveal(viewColumn, true); // preserveFocus: true でエディタのフォーカスを維持
            return;
        }

        // 新しいWebviewパネルを作成
        panel = vscode.window.createWebviewPanel(
            'mindmapPreview',
            `Mindmap Preview: ${path.basename(document.fileName)}`,
            { viewColumn: viewColumn, preserveFocus: true }, // フォーカスを維持
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    context.extensionUri,
                    vscode.Uri.joinPath(context.extensionUri, 'webview')
                ]
            }
        );

        // パネルを管理マップに追加
        previewPanels.set(panelKey, panel);

        // パネルが閉じられた時の処理
        panel.onDidDispose(() => {
            previewPanels.delete(panelKey);
        });

        // Webviewプロバイダーを使ってコンテンツを設定
        const webviewProvider = new MindmapWebviewProvider(context.extensionUri);
        webviewProvider.createWebview(panel, document);
        
        // Webviewからのメッセージハンドリングを設定
        const webviewMsgSubscription = panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('[WebviewPreview] メッセージ受信:', message?.command || 'unknown command', message);
                try {
                    switch (message.command) {
                        case 'saveFile':
                            // ファイル保存 - MindmapWebviewProviderの処理を使用
                            console.log('saveFile要求を受信 (WebviewPreview):', message);
                            await webviewProvider.handleSaveFile(panel!.webview, document, message);
                            break;
                        case 'webviewReady':
                            console.log('Webviewの準備が完了しました');
                            break;
                        default:
                            console.log('未処理のメッセージ:', message.command);
                            break;
                    }
                } catch (error) {
                    console.error('Webviewメッセージの処理中にエラーが発生:', error);
                }
            }
        );

        // 注記: ドキュメント変更の監視は、グローバル監視で処理されるため、
        // 個別のプレビューパネルでは不要（重複監視を避ける）

        // パネルが閉じられた時にリスナーを削除
        panel.onDidDispose(() => {
            webviewMsgSubscription?.dispose();
        });

    } catch (error) {
        vscode.window.showErrorMessage(`マインドマッププレビューを開けませんでした: ${error}`);
    }
}
