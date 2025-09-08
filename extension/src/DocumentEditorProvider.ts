import * as vscode from 'vscode';
import { DocumentWebviewProvider } from './DocumentWebviewProvider';

/**
 * 構造化ドキュメントカスタムエディタープロバイダー
 */
export class DocumentEditorProvider implements vscode.CustomTextEditorProvider {
    private webviewProvider: DocumentWebviewProvider;
    private activeDocuments = new Map<string, vscode.TextDocument>();
    private webviewPanels = new Map<string, vscode.WebviewPanel>();

    constructor(private readonly context: vscode.ExtensionContext) {
        this.webviewProvider = new DocumentWebviewProvider(context.extensionUri);
    }

    /**
     * カスタムエディターを解決
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        const documentUri = document.uri.toString();
        
        // ドキュメントとWebviewパネルを登録
        this.activeDocuments.set(documentUri, document);
        this.webviewPanels.set(documentUri, webviewPanel);

        // Webviewパネルの設定（optionsは読み取り専用なので、webview.optionsを設定）
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri,
                vscode.Uri.joinPath(this.context.extensionUri, 'webview')
            ]
        };

        // Webviewを作成
        this.webviewProvider.createWebview(webviewPanel, document);

        // Webviewからのメッセージハンドリングを設定
        this.setupWebviewMessageHandling(webviewPanel, document);

        // ドキュメント変更の監視
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // ドキュメントが変更された場合、Webviewに通知
                webviewPanel.webview.postMessage({
                    command: 'updateContent',
                    content: e.document.getText()
                });
            }
        });

        // 設定変更の監視
        const changeConfigurationSubscription = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mindmapTool')) {
                // 設定が変更された場合、Webviewに通知
                webviewPanel.webview.postMessage({
                    command: 'configurationChanged',
                    configuration: this.getConfiguration()
                });
            }
        });

        // テーマ変更の監視
        const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
            // テーマが変更された場合、Webviewに通知
            webviewPanel.webview.postMessage({
                command: 'themeChanged'
            });
        });

        // パネルが破棄される際のクリーンアップ
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            changeConfigurationSubscription.dispose();
            changeColorThemeSubscription.dispose();
        });

        // 初期化完了後にコンテンツと設定を送信
        setTimeout(() => {
            this.updateWebviewContent(webviewPanel, document);
            this.updateWebviewConfiguration(webviewPanel);
        }, 100);

        console.log(`マインドマップエディターが初期化されました: ${document.fileName}`);
    }

    /**
     * Webviewからのメッセージを処理
     */
    private async handleWebviewMessage(
        message: { command: string; content?: string; message?: string; [key: string]: unknown },
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        try {
            switch (message.command) {
                case 'webviewReady':
                    // Webviewの準備完了
                    console.log('Webviewの準備が完了しました');
                    this.updateWebviewContent(webviewPanel, document);
                    this.updateWebviewConfiguration(webviewPanel);
                    break;

                case 'getInitialConfiguration':
                    // 初期設定要求
                    console.log('初期設定要求を受信');
                    this.updateWebviewConfiguration(webviewPanel);
                    break;

                case 'updateDocument':
                    // Webview側からドキュメント更新要求
                    if (message.content && typeof message.content === 'string') {
                        await this.updateDocument(document, message.content);
                    }
                    break;

                case 'showError':
                    // エラー表示
                    vscode.window.showErrorMessage(message.message || 'エラーが発生しました');
                    break;

                case 'showWarning':
                    // 警告表示
                    vscode.window.showWarningMessage(message.message || '警告');
                    break;

                case 'showInformation':
                    // 情報表示
                    vscode.window.showInformationMessage(message.message || '情報');
                    break;

                case 'saveDocument':
                    // ドキュメント保存
                    await document.save();
                    break;

                case 'exportMindmap':
                    // マインドマップのエクスポート
                    await this.handleExportRequest(message);
                    break;

                default:
                    console.log('未知のWebviewメッセージ:', message);
            }
        } catch (error) {
            console.error('Webviewメッセージの処理でエラーが発生:', error);
            vscode.window.showErrorMessage(`メッセージ処理エラー: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * ドキュメントの内容を更新
     */
    private async updateDocument(document: vscode.TextDocument, content: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        
        edit.replace(document.uri, fullRange, content);
        await vscode.workspace.applyEdit(edit);
    }

    /**
     * Webviewのコンテンツを更新
     */
    private updateWebviewContent(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        webviewPanel.webview.postMessage({
            command: 'updateContent',
            content: document.getText(),
            fileName: document.fileName,
            uri: document.uri.toString()
        });
    }

    /**
     * Webviewの設定を更新
     */
    private updateWebviewConfiguration(webviewPanel: vscode.WebviewPanel): void {
        webviewPanel.webview.postMessage({
            command: 'configurationChanged',
            configuration: this.getConfiguration()
        });
    }

    /**
     * エクスポート要求を処理
     */
    private async handleExportRequest(message: { format?: string; [key: string]: unknown }): Promise<void> {
        try {
            // エクスポート機能の実装
            console.log('エクスポート要求を処理:', message);
            vscode.window.showInformationMessage('エクスポート機能は準備中です');
        } catch (error) {
            console.error('エクスポート処理でエラーが発生:', error);
            vscode.window.showErrorMessage(`エクスポートエラー: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Webviewからのメッセージハンドリングを設定
     */
    private setupWebviewMessageHandling(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('[MindmapEditorProvider] メッセージ受信:', message?.command || 'unknown command', message);
                try {
                    // 既存のメッセージハンドリング
                    await this.handleWebviewMessage(message, document, webviewPanel);
                    
                    // 新しいアダプターからのメッセージハンドリング
                    await this.handleAdapterMessages(message, document, webviewPanel);
                } catch (error) {
                    console.error('Webviewメッセージの処理中にエラーが発生:', error);
                    webviewPanel.webview.postMessage({
                        requestId: message.requestId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            },
            undefined
        );
    }

    /**
     * アダプターからのメッセージを処理
     */
    private async handleAdapterMessages(
        message: { command: string; requestId?: string; [key: string]: unknown },
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        const { command, requestId } = message;

        try {
            let result: unknown = undefined;

            switch (command) {
                // エディターアダプター関連
                case 'editorAdapterReady':
                    console.log('EditorAdapter初期化完了');
                    break;

                case 'updateDocument':
                    if (typeof message.content === 'string') {
                        await this.updateDocument(document, message.content);
                        result = { success: true };
                    }
                    break;

                case 'setLanguageMode':
                    // 言語モード変更（実際のVSCodeでは自動検出される）
                    console.log('言語モード変更要求:', message.language);
                    result = { success: true };
                    break;

                case 'setCursorPosition':
                    // カーソル位置設定
                    if (typeof message.line === 'number') {
                        const editor = vscode.window.visibleTextEditors.find(
                            e => e.document.uri.toString() === document.uri.toString()
                        );
                        if (editor) {
                            const position = new vscode.Position(message.line, message.column as number || 0);
                            editor.selection = new vscode.Selection(position, position);
                            editor.revealRange(new vscode.Range(position, position));
                        }
                        result = { success: true };
                    }
                    break;

                case 'highlightRange':
                    // 範囲ハイライト
                    if (typeof message.startLine === 'number' && typeof message.endLine === 'number') {
                        const editor = vscode.window.visibleTextEditors.find(
                            e => e.document.uri.toString() === document.uri.toString()
                        );
                        if (editor) {
                            const startPos = new vscode.Position(message.startLine, message.startColumn as number || 0);
                            const endPos = new vscode.Position(message.endLine, message.endColumn as number || 0);
                            editor.selection = new vscode.Selection(startPos, endPos);
                            editor.revealRange(new vscode.Range(startPos, endPos));
                        }
                        result = { success: true };
                    }
                    break;

                case 'getCurrentCursorPosition': {
                    // 現在のカーソル位置取得
                    const editor = vscode.window.visibleTextEditors.find(
                        e => e.document.uri.toString() === document.uri.toString()
                    );
                    if (editor) {
                        const position = editor.selection.active;
                        result = { line: position.line, column: position.character };
                    } else {
                        result = { line: 0, column: 0 };
                    }
                    break;
                }

                case 'saveFile':
                    // ファイル保存 - MindmapWebviewProviderの処理を使用
                    console.log('saveFile要求を受信 (MindmapEditorProvider):', message);
                    result = await this.webviewProvider.handleSaveFile(webviewPanel.webview, document, message);
                    break;

                // ファイルシステムアダプター関連
                case 'fileSystemAdapterReady':
                    console.log('FileSystemAdapter初期化完了');
                    break;

                case 'readFile':
                    if (typeof message.path === 'string') {
                        try {
                            const uri = vscode.Uri.file(message.path);
                            const content = await vscode.workspace.fs.readFile(uri);
                            result = new TextDecoder().decode(content);
                        } catch (error) {
                            throw new Error(`ファイル読み込みエラー: ${error}`);
                        }
                    }
                    break;

                case 'writeFile':
                    if (typeof message.path === 'string' && typeof message.content === 'string') {
                        try {
                            const uri = vscode.Uri.file(message.path);
                            const content = new TextEncoder().encode(message.content);
                            await vscode.workspace.fs.writeFile(uri, content);
                            result = { success: true };
                        } catch (error) {
                            throw new Error(`ファイル書き込みエラー: ${error}`);
                        }
                    }
                    break;

                case 'exists':
                    if (typeof message.path === 'string') {
                        try {
                            const uri = vscode.Uri.file(message.path);
                            await vscode.workspace.fs.stat(uri);
                            result = true;
                        } catch {
                            result = false;
                        }
                    }
                    break;

                // UIアダプター関連
                case 'uiAdapterReady':
                    console.log('UIAdapter初期化完了');
                    break;

                case 'showInformationMessage':
                    if (typeof message.message === 'string') {
                        vscode.window.showInformationMessage(message.message);
                    }
                    break;

                case 'showWarningMessage':
                    if (typeof message.message === 'string') {
                        vscode.window.showWarningMessage(message.message);
                    }
                    break;

                case 'showErrorMessage':
                    if (typeof message.message === 'string') {
                        vscode.window.showErrorMessage(message.message);
                    }
                    break;

                case 'showConfirmDialog':
                    if (typeof message.message === 'string' && Array.isArray(message.options)) {
                        result = await vscode.window.showQuickPick(message.options as string[], {
                            placeHolder: message.message
                        });
                    }
                    break;

                case 'showStatusBarMessage':
                    if (typeof message.message === 'string') {
                        vscode.window.setStatusBarMessage(
                            message.message,
                            message.timeout as number || 3000
                        );
                    }
                    break;

                // 設定アダプター関連
                case 'settingsAdapterReady':
                    console.log('SettingsAdapter初期化完了');
                    // 初期設定を送信
                    webviewPanel.webview.postMessage({
                        command: 'initialConfiguration',
                        settings: this.getConfiguration()
                    });
                    break;

                case 'updateConfiguration':
                    if (typeof message.key === 'string') {
                        const config = vscode.workspace.getConfiguration('mindmapTool');
                        await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
                        result = { success: true };
                    }
                    break;

                // ツリーデータプロバイダー関連
                case 'treeDataProviderReady':
                    console.log('TreeDataProvider初期化完了');
                    break;

                case 'updateTreeData':
                    // ツリーデータ更新（実際のTreeDataProviderとの連携は将来実装）
                    console.log('ツリーデータ更新:', message.data);
                    result = { success: true };
                    break;

                default:
                    // 未知のコマンドは無視
                    break;
            }

            // レスポンスを送信
            if (requestId) {
                webviewPanel.webview.postMessage({
                    requestId,
                    result
                });
            }

        } catch (error) {
            console.error(`アダプターメッセージ処理エラー (${command}):`, error);
            
            if (requestId) {
                webviewPanel.webview.postMessage({
                    requestId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }

    /**
     * 現在の設定を取得
     */
    private getConfiguration(): Record<string, unknown> {
        const config = vscode.workspace.getConfiguration('mindmapTool');
        
        return {
            editor: {
                theme: config.get('editor.theme', 'vs-dark'),
                fontSize: config.get('editor.fontSize', 14)
            },
            mindmap: {
                layout: config.get('mindmap.layout', 'tree'),
                theme: config.get('mindmap.theme', 'auto')
            },
            validation: {
                enabled: config.get('validation.enabled', true),
                showWarnings: config.get('validation.showWarnings', true)
            },
            autoSave: {
                enabled: config.get('autoSave.enabled', true),
                delay: config.get('autoSave.delay', 1000)
            }
        };
    }
}