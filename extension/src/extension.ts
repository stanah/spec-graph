import * as vscode from 'vscode';
import * as path from 'path';
import { DocumentEditorProvider } from './DocumentEditorProvider';
import { DocumentWebviewProvider } from './DocumentWebviewProvider';
import { DocumentTreeDataProvider, DocumentTreeItem } from './DocumentTreeDataProvider';

/**
 * サイドバープレビュー用のWebviewViewプロバイダー
 */
class DocumentSidebarViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        const webview = webviewView.webview;

        // Webviewの設定
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'webview')
            ]
        };

        // HTMLコンテンツを設定
        webview.html = this.getWebviewContent(webview);

        // WebviewViewの参照を保持（サイドバープロバイダーのシングルトンで管理）
        if (sidebarViewProviderSingleton) {
            sidebarViewProviderSingleton.setWebviewView(webviewView);
        }

        // メッセージハンドラーを設定
        webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'ready':
                    console.log('サイドバープレビューが準備完了');
                    this.updateContent(webview);
                    break;
                default:
                    console.log('未処理のメッセージ:', message.command);
                    break;
            }
        });
    }

    private getWebviewContent(webview: vscode.Webview): string {
        // Webviewリソースのベースパス
        const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');
        
        // JSファイルのパス
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(webviewPath, 'assets', 'index.vscode.js')
        );

        // CSPの設定
        const csp = [
            "default-src 'none'",
            `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `img-src ${webview.cspSource} data: https:`,
            `font-src ${webview.cspSource}`,
            `connect-src ${webview.cspSource} https:`
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <title>Document Preview</title>
    
    <style>
        body {
            margin: 0;
            padding: 8px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            width: 100%;
            height: 100vh;
            overflow: auto;
        }
        
        #root {
            width: 100%;
            height: calc(100vh - 16px);
            overflow: auto;
        }
        
        .placeholder {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="placeholder">
            ドキュメントを開くとここにプレビューが表示されます
        </div>
    </div>
    
    <script>
        // VSCode APIの初期化
        const vscode = acquireVsCodeApi();
        
        // 初期データの設定
        window.initialData = {
            content: '',
            fileName: '',
            language: '',
            isSidebar: true
        };
        
        // 準備完了を通知
        vscode.postMessage({ command: 'ready' });
        
        // グローバル変数の設定
        window.vscode = vscode;
        window.vscodeApiInstance = vscode;
    </script>
    
    <script src="${jsUri}"></script>
</body>
</html>`;
    }

    private updateContent(webview: vscode.Webview): void {
        // アクティブなエディターの内容を取得してプレビューを更新
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const content = activeEditor.document.getText();
            const fileName = activeEditor.document.fileName;
            const language = activeEditor.document.languageId;

            webview.postMessage({
                command: 'updateContent',
                content,
                fileName,
                language
            });
        } else {
            // アクティブなエディターがない場合はプレースホルダーを表示
            webview.postMessage({
                command: 'updateContent',
                content: '',
                fileName: '',
                language: ''
            });
        }
    }

    // WebviewViewの参照を保持
    private webviewView: vscode.WebviewView | null = null;

    // WebviewViewインスタンスを設定
    public setWebviewView(webviewView: vscode.WebviewView): void {
        this.webviewView = webviewView;
    }

    // アクティブドキュメント用の更新メソッド
    public updateForDocument(document: vscode.TextDocument): void {
        if (this.webviewView) {
            this.updatePreview(this.webviewView, document);
        }
    }

    // 外部からコンテンツを更新するためのメソッド
    public updatePreview(webviewView: vscode.WebviewView, document: vscode.TextDocument): void {
        const content = document.getText();
        const fileName = document.fileName;
        const language = document.languageId;

        webviewView.webview.postMessage({
            command: 'updateContent',
            content,
            fileName,
            language
        });
    }

}

let diagnosticCollection: vscode.DiagnosticCollection | null = null;
// Webviewプロバイダーの参照（パネル再初期化用）
const _webviewProviderSingleton: DocumentWebviewProvider | null = null;
// サイドバープレビュープロバイダーの参照
let sidebarViewProviderSingleton: DocumentSidebarViewProvider | null = null;

function ensureDiagnosticCollection(context: vscode.ExtensionContext): vscode.DiagnosticCollection | null {
    try {
        if (!diagnosticCollection) {
            // モック環境では languages 自体が未定義の場合があるため try/catch で保護
            diagnosticCollection = vscode.languages.createDiagnosticCollection('document');
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
    console.log('Document Viewer拡張が有効化されました');

    // Webviewプロバイダーの登録
    const _webviewProvider = new DocumentWebviewProvider(context.extensionUri);
    // Note: _webviewProviderSingleton は使用されていないため、削除予定
    
    // カスタムエディタープロバイダーの登録
    const editorProvider = new DocumentEditorProvider(context);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'documentViewer.documentEditor',
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
    const treeDataProvider = new DocumentTreeDataProvider();
    const treeView = vscode.window.createTreeView('documentTree', {
        treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // サイドバープレビュープロバイダーの登録
    const sidebarViewProvider = new DocumentSidebarViewProvider(context.extensionUri);
    sidebarViewProviderSingleton = sidebarViewProvider;
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('documentPreview', sidebarViewProvider)
    );

    // アクティブエディタの変更を監視してツリーとサイドバープレビューを更新
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor) {
                const fileName = editor.document.fileName;
                const ext = path.extname(fileName).toLowerCase();
                
                // 構造化ドキュメントファイルの場合のみツリーとプレビューを更新
                if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
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
                        
                        // 構造化ドキュメントファイルかどうかを柔軟にチェック
                        const isLikelyStructuredFile = data && typeof data === 'object' && (
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
                        
                        if (isLikelyStructuredFile) {
                            // ツリーを更新（rootプロパティがある場合のみ）
                            if ('root' in (data as object)) {
                                await treeDataProvider.setCurrentDocument(editor.document);
                            }
                            
                            // サイドバープレビューを更新
                            updateSidebarPreview(editor.document);
                        }
                    } catch {
                        // 入力途中などは無視
                    }
                }
            }
        })
    );


    // コマンドの登録
    const commands = [

        // マインドマップを開くコマンド
        vscode.commands.registerCommand('documentViewer.openDocument', async (uri?: vscode.Uri) => {
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
                await vscode.commands.executeCommand('vscode.openWith', targetUri, 'documentViewer.documentEditor');
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップを開けませんでした: ${error}`);
            }
        }),

        // 新しいマインドマップを作成するコマンド
        vscode.commands.registerCommand('documentViewer.createNewMindmap', async () => {
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
                await vscode.commands.executeCommand('vscode.openWith', saveUri, 'documentViewer.documentEditor');
                
                vscode.window.showInformationMessage(`新しいマインドマップを作成しました: ${saveUri.fsPath}`);
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップの作成に失敗しました: ${error}`);
            }
        }),

        // マインドマップをエクスポートするコマンド
        vscode.commands.registerCommand('documentViewer.exportDocument', async () => {
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
        vscode.commands.registerCommand('documentViewer.validateSchema', async () => {
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
        vscode.commands.registerCommand('documentViewer.refreshDocumentTree', () => {
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('マインドマップツリーを更新しました');
        }),

        vscode.commands.registerCommand('documentViewer.selectNode', async (nodeId: string, nodeData?: unknown) => {
            console.log('ノード選択:', nodeId, nodeData);
            
            // ノード選択時にエディタで該当箇所にジャンプ（将来実装）
            if (nodeData) {
                const nodeInfo = nodeData as { title: string; description?: string };
                vscode.window.showInformationMessage(`ノード "${nodeInfo.title}" を選択しました`);
            }
        }),

        vscode.commands.registerCommand('documentViewer.addChildNode', async (treeItem: DocumentTreeItem) => {
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

        vscode.commands.registerCommand('documentViewer.addSiblingNode', async (treeItem: DocumentTreeItem) => {
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

        vscode.commands.registerCommand('documentViewer.editNode', async (treeItem: DocumentTreeItem) => {
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

        vscode.commands.registerCommand('documentViewer.deleteNode', async (treeItem: DocumentTreeItem) => {
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

        vscode.commands.registerCommand('documentViewer.collapseAll', () => {
            treeDataProvider.collapseAll();
            if (treeView.visible) {
                // VSCode の TreeView の collapseAll は直接呼び出せない
                vscode.window.showInformationMessage('すべてのノードを折りたたみました');
            }
        }),

        vscode.commands.registerCommand('documentViewer.expandAll', () => {
            treeDataProvider.expandAll();
            if (treeView.visible) {
                vscode.window.showInformationMessage('すべてのノードを展開しました');
            }
        })
    ];

    // すべてのコマンドを登録
    context.subscriptions.push(...commands);

    // グローバルドキュメント変更監視（サイドバープレビューの自動更新）
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
                    
                    // 構造化ドキュメントファイルかどうかを柔軟にチェック
                    const isLikelyStructuredFile = data && typeof data === 'object' && (
                        'root' in data ||
                        'title' in data || 
                        'version' in data ||
                        'stakeholders' in data ||
                        'epics' in data ||
                        'requirements' in data ||
                        Array.isArray(data)
                    );
                    
                    if (isLikelyStructuredFile) {
                        // サイドバープレビューを更新
                        updateSidebarPreview(document);
                        
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
 * サイドバープレビューを更新する関数
 */
function updateSidebarPreview(document: vscode.TextDocument): void {
    if (sidebarViewProviderSingleton) {
        sidebarViewProviderSingleton.updateForDocument(document);
    }
}

