import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * 正規表現用文字列エスケープ
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * マインドマップWebviewプロバイダー
 */
export class MindmapWebviewProvider {
    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Webviewを作成
     */
    public createWebview(
        panel: vscode.WebviewPanel,
        document: vscode.TextDocument
    ): void {
        const webview = panel.webview;

        // Webviewの設定
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'webview')
            ]
        };

        // HTMLコンテンツを設定
        webview.html = this.getWebviewContent(webview, document);

        // メッセージハンドラーを設定
        // 注意: MindmapEditorProviderでメッセージハンドラーを設定するため、
        // ここでは設定しない（重複を避けるため）
        // this.setupMessageHandlers(webview, document);
    }

    /**
     * WebviewのHTMLコンテンツを生成
     */
    private getWebviewContent(webview: vscode.Webview, document: vscode.TextDocument): string {
        // Webviewリソースのベースパス
        const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');

        // JSファイルのパス（CSSはインライン化されている）
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
    <title>Mindmap Tool - ${path.basename(document.fileName)}</title>
    
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }
        
        #root {
            width: 100%;
            height: 100vh;
            min-height: 100vh;
            overflow: hidden;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        
        /* VSCodeテーマとの統合 */
        .vscode-light {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-panel-border);
        }
        
        .vscode-dark {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-panel-border);
        }
        
        .vscode-high-contrast {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-contrastBorder);
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
        // VSCode APIの初期化
        const vscode = acquireVsCodeApi();
        
        // Reactアプリ用にグローバル変数として保存（重複取得エラーを防ぐため）
        window.vscodeApiInstance = vscode;
        
        // 初期データの設定
        window.initialData = {
            content: ${JSON.stringify(document.getText())},
            fileName: ${JSON.stringify(path.basename(document.fileName))},
            language: ${JSON.stringify(document.languageId)}
        };
        
        // VSCodeテーマの検出と適用
        function applyVSCodeTheme() {
            const body = document.body;
            const computedStyle = getComputedStyle(body);
            const backgroundColor = computedStyle.getPropertyValue('--vscode-editor-background');
            
            // 既存のテーマクラスを削除
            body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast');
            
            // テーマの判定
            if (backgroundColor && backgroundColor.includes('rgb')) {
                const rgb = backgroundColor.match(/\\d+/g);
                if (rgb) {
                    const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                    if (brightness > 128) {
                        body.classList.add('vscode-light');
                    } else {
                        body.classList.add('vscode-dark');
                    }
                }
            }
            
            // ハイコントラストテーマの検出
            const contrastBorder = computedStyle.getPropertyValue('--vscode-contrastBorder');
            if (contrastBorder && contrastBorder !== 'transparent') {
                body.classList.add('vscode-high-contrast');
            }
        }
        
        // 初期テーマ適用
        applyVSCodeTheme();
        
        // テーマ変更の監視
        const observer = new MutationObserver(applyVSCodeTheme);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // 注記: Reactアプリケーション（index.vscode.js）でメッセージハンドリングを行うため、
        // ここでは重複するメッセージハンドラーを設定しない
        
        // アプリケーション準備完了の通知
        window.addEventListener('load', () => {
            vscode.postMessage({
                command: 'webviewReady',
                timestamp: new Date().toISOString()
            });
        });
        
        // グローバル関数の設定
        window.vscode = vscode;
    </script>
    
    <script src="${jsUri}"></script>
</body>
</html>`;
    }

    /**
     * メッセージハンドラーを設定
     */
    private setupMessageHandlers(webview: vscode.Webview, document: vscode.TextDocument): void {
        webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'webviewReady':
                        console.log('Webview準備完了:', message.timestamp);
                        break;

                    case 'appInitialized':
                        console.log('アプリケーション初期化完了:', message.timestamp);
                        // 初期データは window.initialData で既に渡されているため送信しない
                        break;

                    case 'initializationError':
                        vscode.window.showErrorMessage(`アプリケーションの初期化に失敗しました: ${message.error}`);
                        break;

                    case 'contentChanged':
                        // エディタ内容の変更を通知
                        this.handleContentChanged(document, message);
                        break;

                    case 'exportRequest':
                        // エクスポート要求の処理
                        this.handleExportRequest(message.format, message.data);
                        break;

                    case 'error':
                        vscode.window.showErrorMessage(`エラーが発生しました: ${message.message}`);
                        break;

                    case 'info':
                        vscode.window.showInformationMessage(message.message);
                        break;

                    case 'warning':
                        vscode.window.showWarningMessage(message.message);
                        break;

                    case 'jumpToNodeInFile':
                        // マインドマップファイル内のノードジャンプ要求の処理
                        this.handleJumpToNodeInFile(webview, document, message);
                        break;

                    case 'saveFile':
                        // ファイル保存要求の処理
                        this.handleSaveFile(webview, document, message);
                        break;

                    case 'requestThemeChange':
                        // テーマ変更要求の処理
                        this.handleThemeChangeRequest(webview, message);
                        break;

                    default:
                        console.log('未知のメッセージ:', message);
                        break;
                }
            },
            undefined
        );
    }

    /**
     * ドキュメントを更新
     */
    private updateDocument(document: vscode.TextDocument, content: string): void {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, content);
        vscode.workspace.applyEdit(edit);
    }

    /**
     * コンテンツ変更の処理（データオブジェクトから適切な形式に変換）
     */
    private handleContentChanged(document: vscode.TextDocument, message: { content?: string; data?: Record<string, unknown>; [key: string]: unknown }): void {
        try {
            console.log('contentChanged要求を受信:', message);
            
            let content: string;
            
            if (message.content) {
                // 直接文字列が送られた場合
                content = message.content;
            } else if (message.data) {
                // データオブジェクトが送られた場合、ファイル拡張子に応じて変換
                const fileExtension = document.uri.fsPath.toLowerCase().split('.').pop();
                
                if (fileExtension === 'yaml' || fileExtension === 'yml') {
                    // YAML形式で変換
                    try {
                        // まず既存のYAMLをパースして構造を検証
                        const existingContent = document.getText();
                        if (existingContent.trim()) {
                            yaml.load(existingContent);
                        }
                        
                        content = yaml.dump(message.data, {
                            indent: 2,
                            lineWidth: 120,
                            noRefs: true,
                            sortKeys: false,
                            quotingType: '"',
                            skipInvalid: false, // エラーを隠さない
                            condenseFlow: false
                        });
                        
                        // 変換後のYAMLも検証
                        yaml.load(content);
                        console.log('YAML変換・検証完了');
                    } catch (yamlError) {
                        console.error('YAML変換エラー:', yamlError);
                        vscode.window.showErrorMessage(`YAML変換に失敗しました: ${yamlError}`);
                        return;
                    }
                } else {
                    // JSON形式で変換
                    content = JSON.stringify(message.data, null, 2);
                }
            } else {
                console.warn('contentChanged要求にcontentまたはdataが含まれていません');
                return;
            }
            
            console.log('変換後のコンテンツ長:', content.length);
            console.log('ドキュメント更新実行中...');
            
            this.updateDocument(document, content);
            console.log('ドキュメント更新完了');
            
        } catch (error) {
            console.error('コンテンツ変更に失敗:', error);
        }
    }

    /**
     * ファイル保存要求の処理
     */
    public async handleSaveFile(webview: vscode.Webview, document: vscode.TextDocument, message: { data?: string | Record<string, unknown>; [key: string]: unknown }): Promise<void> {
        try {
            console.log('saveFile要求を受信:', message);
            
            // Webviewから更新されたデータを取得
            if (message.data) {
                console.log('受信したデータタイプ:', typeof message.data);
                console.log('受信したデータ内容:', message.data);
                
                // ファイルの拡張子を取得して元の形式を維持
                const fileExtension = document.uri.fsPath.toLowerCase().split('.').pop();
                let content: string;
                
                if (typeof message.data === 'string') {
                    content = message.data;
                } else {
                    // ファイル形式に応じて変換
                    if (fileExtension === 'yaml' || fileExtension === 'yml') {
                        // YAMLファイルの場合はYAML形式で保存
                        try {
                            content = yaml.dump(message.data, {
                                indent: 2,
                                lineWidth: 120,
                                noRefs: true,
                                sortKeys: false,
                                quotingType: '"',
                                skipInvalid: false, // エラーを隠さない
                                condenseFlow: false
                            });
                            
                            // 変換後のYAMLを検証
                            yaml.load(content);
                            console.log('YAML保存時変換・検証完了');
                        } catch (yamlError) {
                            console.error('YAML保存時変換エラー:', yamlError);
                            throw new Error(`YAML変換に失敗しました: ${yamlError}`);
                        }
                    } else {
                        // JSONファイルまたはその他の場合はJSON形式で保存
                        content = JSON.stringify(message.data, null, 2);
                    }
                }
                
                console.log('変換後のコンテンツ長:', content.length);
                console.log('変換後のコンテンツ（最初の200文字）:', content.substring(0, 200));
                
                this.updateDocument(document, content);
                console.log('ドキュメント更新完了');
            } else {
                console.warn('saveFile要求にデータが含まれていません');
            }
            
            // ドキュメントを保存
            console.log('ドキュメント保存を実行中...');
            await document.save();
            console.log('ドキュメント保存完了');
            
            // 保存完了をWebviewに通知
            webview.postMessage({
                command: 'saveComplete',
                success: true
            });
            
            console.log('ファイル保存完了:', document.uri.fsPath);
            
        } catch (error) {
            console.error('ファイル保存に失敗:', error);
            
            // エラーをWebviewに通知
            webview.postMessage({
                command: 'saveComplete',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // ユーザーにエラーを表示
            vscode.window.showErrorMessage(`ファイル保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * エクスポート要求を処理
     */
    private async handleExportRequest(format: string, data: unknown): Promise<void> {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                filters: {
                    [format.toUpperCase()]: [format]
                },
                defaultUri: vscode.Uri.file(`mindmap.${format}`),
                title: `${format.toUpperCase()}としてエクスポート`
            });

            if (!saveUri) {
                return;
            }

            // エクスポート処理（実装は将来追加）
            vscode.window.showInformationMessage('エクスポート機能は開発中です');

        } catch (error) {
            vscode.window.showErrorMessage(`エクスポートに失敗しました: ${error}`);
        }
    }

    /**
     * マインドマップファイル内のノードジャンプ要求を処理
     */
    private async handleJumpToNodeInFile(webview: vscode.Webview, document: vscode.TextDocument, message: { nodeId?: string; line?: number; [key: string]: unknown }): Promise<void> {
        try {
            const { nodeId, requestId } = message;
            
            // nodeIdが未定義の場合はエラーレスポンスを送信
            if (!nodeId) {
                webview.postMessage({
                    command: 'jumpToNodeInFileResponse',
                    success: false,
                    requestId,
                    error: 'ノードIDが指定されていません'
                });
                return;
            }
            
            const content = document.getText();
            
            // ノードIDを検索するパターン
            const patterns = [
                // JSON: "id": "nodeId"
                new RegExp(`"id"\\s*:\\s*"${escapeRegExp(nodeId)}"`, 'i'),
                // YAML: id: nodeId
                new RegExp(`^\\s*id\\s*:\\s*"?${escapeRegExp(nodeId)}"?`, 'gmi'),
                // 単純な文字列検索（フォールバック）
                new RegExp(escapeRegExp(nodeId), 'i')
            ];

            let line = 0;
            let column = 0;
            let found = false;

            // 各パターンでマッチを試行
            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match.index !== undefined) {
                    // マッチした位置を行・列番号に変換
                    const position = document.positionAt(match.index);
                    line = position.line;
                    column = position.character;
                    found = true;
                    break;
                }
            }

            if (!found) {
                throw new Error(`ノード "${nodeId}" が見つかりませんでした`);
            }

            // 既存の開いているエディタを探す（左側を優先）
            const matchingEditors = vscode.window.visibleTextEditors.filter(
                editor => editor.document.uri.toString() === document.uri.toString()
            );

            let targetEditor: vscode.TextEditor;
            
            if (matchingEditors.length > 0) {
                // 複数ある場合は左側（ViewColumn.One）を優先
                targetEditor = matchingEditors.find(editor => editor.viewColumn === vscode.ViewColumn.One) 
                    || matchingEditors[0];
                
                // そのエディタにフォーカスを移す（新しいタブを開かない）
                await vscode.window.showTextDocument(document, targetEditor.viewColumn, false);
            } else {
                // 既存のエディタがない場合は左側に開く
                targetEditor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
            }

            // カーソル位置を設定
            const position = new vscode.Position(line, column);
            targetEditor.selection = new vscode.Selection(position, position);
            targetEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);

            console.log(`ノードジャンプ成功: ${nodeId} -> ${line + 1}:${column + 1}`);

            // レスポンスを送信
            if (requestId) {
                webview.postMessage({
                    requestId,
                    result: { success: true, nodeId, line: line + 1, column: column + 1 }
                });
            }

        } catch (error) {
            const errorMessage = `ノードジャンプに失敗しました: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);

            // エラーレスポンスを送信
            if (message.requestId) {
                webview.postMessage({
                    requestId: message.requestId,
                    error: errorMessage
                });
            }
        }
    }

    /**
     * テーマ変更要求を処理
     */
    private handleThemeChangeRequest(webview: vscode.Webview, message: { theme?: string }): void {
        try {
            console.log(`テーマ変更要求を受信`);

            // VSCodeのテーマ選択コマンドを実行
            vscode.commands.executeCommand('workbench.action.selectTheme');
            
            // 追加の情報をユーザーに表示
            vscode.window.showInformationMessage(
                'テーマ変更: 選択画面が開きました。お好みのテーマを選択してください。',
                'OK'
            );

        } catch (error) {
            console.error('テーマ変更コマンドの実行に失敗:', error);
            vscode.window.showErrorMessage(`テーマ変更画面を開けませんでした: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}