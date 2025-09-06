import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * ドキュメントツリーアイテム
 */
export class DocumentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly nodeId: string,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly nodeData?: {
            title: string;
            description?: string;
            children?: Array<{ id: string; title: string; children?: unknown[] }>;
        }
    ) {
        super(label, collapsibleState);
        
        this.id = nodeId;
        this.tooltip = nodeData?.description || label;
        this.contextValue = contextValue;
        
        // ノードを選択するコマンドを設定
        this.command = {
            command: 'documentViewer.selectNode',
            title: 'Select Node',
            arguments: [nodeId, nodeData]
        };
    }
}

/**
 * ドキュメントツリーデータプロバイダー
 */
export class DocumentTreeDataProvider implements vscode.TreeDataProvider<DocumentTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DocumentTreeItem | undefined | null | void> = new vscode.EventEmitter<DocumentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DocumentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private treeData: DocumentTreeItem[] = [];
    private currentDocument: vscode.TextDocument | undefined;

    constructor() {}

    /**
     * ツリーデータを更新
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 現在のドキュメントを設定してツリーを更新
     */
    async setCurrentDocument(document: vscode.TextDocument): Promise<void> {
        this.currentDocument = document;
        await this.loadTreeData();
    }

    /**
     * ドキュメントからツリーデータを読み込み
     */
    private async loadTreeData(): Promise<void> {
        if (!this.currentDocument) {
            this.treeData = [];
            this.refresh();
            return;
        }

        try {
            const content = this.currentDocument.getText();
            let data: unknown;

            // ファイル拡張子に基づいて解析
            const ext = path.extname(this.currentDocument.fileName).toLowerCase();
            if (ext === '.yaml' || ext === '.yml') {
                data = yaml.load(content);
            } else {
                data = JSON.parse(content);
            }

            // マインドマップデータを解析
            this.treeData = this.parseNodeData(data as Record<string, unknown>);
            this.refresh();

        } catch (error) {
            console.error('マインドマップデータの解析に失敗:', error);
            this.treeData = [];
            this.refresh();
        }
    }

    /**
     * ノードデータを解析してツリーアイテムを生成
     */
    private parseNodeData(data: Record<string, unknown>): DocumentTreeItem[] {
        const items: DocumentTreeItem[] = [];

        if (data.root && typeof data.root === 'object') {
            const rootNode = data.root as {
                id: string;
                title: string;
                description?: string;
                children?: Array<{ id: string; title: string; children?: unknown[] }>;
            };

            const rootItem = new DocumentTreeItem(
                rootNode.id,
                rootNode.title,
                rootNode.children && rootNode.children.length > 0 
                    ? vscode.TreeItemCollapsibleState.Expanded 
                    : vscode.TreeItemCollapsibleState.None,
                'mindmapRoot',
                rootNode
            );

            items.push(rootItem);
        }

        return items;
    }

    /**
     * ツリーアイテムを取得
     */
    getTreeItem(element: DocumentTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 子要素を取得
     */
    getChildren(element?: DocumentTreeItem): DocumentTreeItem[] {
        if (!element) {
            // ルート要素を返す
            return this.treeData;
        }

        // 子ノードを返す
        if (element.nodeData?.children) {
            return element.nodeData.children.map(child => {
                const hasChildren = Array.isArray(child.children) && child.children.length > 0;
                return new DocumentTreeItem(
                    child.id,
                    child.title,
                    hasChildren 
                        ? vscode.TreeItemCollapsibleState.Collapsed 
                        : vscode.TreeItemCollapsibleState.None,
                    'mindmapNode',
                    child as {
                        title: string;
                        description?: string;
                        children?: Array<{ id: string; title: string; children?: unknown[] }>;
                    }
                );
            });
        }

        return [];
    }

    /**
     * 指定されたノードIDのツリーアイテムを検索
     */
    findTreeItem(nodeId: string): DocumentTreeItem | undefined {
        const findInItems = (items: DocumentTreeItem[]): DocumentTreeItem | undefined => {
            for (const item of items) {
                if (item.nodeId === nodeId) {
                    return item;
                }
                const children = this.getChildren(item);
                if (children.length > 0) {
                    const found = findInItems(children);
                    if (found) return found;
                }
            }
            return undefined;
        };

        return findInItems(this.treeData);
    }

    /**
     * ノードを追加
     */
    async addNode(parentId: string, nodeData: { id: string; title: string; description?: string }): Promise<void> {
        if (!this.currentDocument) return;

        try {
            const content = this.currentDocument.getText();
            let data: Record<string, unknown>;

            // ファイル拡張子に基づいて解析
            const ext = path.extname(this.currentDocument.fileName).toLowerCase();
            if (ext === '.yaml' || ext === '.yml') {
                data = yaml.load(content) as Record<string, unknown>;
            } else {
                data = JSON.parse(content);
            }

            // ノードを追加
            this.addNodeToData(data, parentId, nodeData);

            // ファイルを更新
            let updatedContent: string;
            if (ext === '.yaml' || ext === '.yml') {
                updatedContent = yaml.dump(data, { 
                    indent: 2,
                    lineWidth: 120,
                    noRefs: true
                });
            } else {
                updatedContent = JSON.stringify(data, null, 2);
            }

            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                this.currentDocument.positionAt(0),
                this.currentDocument.positionAt(this.currentDocument.getText().length)
            );
            edit.replace(this.currentDocument.uri, fullRange, updatedContent);
            await vscode.workspace.applyEdit(edit);

            // ドキュメントを保存
            await this.currentDocument.save();

            // ツリーを更新
            await this.loadTreeData();

        } catch (error) {
            vscode.window.showErrorMessage(`ノードの追加に失敗しました: ${error}`);
        }
    }

    /**
     * データ構造にノードを追加
     */
    private addNodeToData(data: Record<string, unknown>, parentId: string, nodeData: { id: string; title: string; description?: string }): boolean {
        const addToNode = (node: unknown): boolean => {
            if (typeof node === 'object' && node !== null) {
                const nodeObj = node as Record<string, unknown>;
                
                if (nodeObj.id === parentId) {
                    if (!nodeObj.children) {
                        nodeObj.children = [];
                    }
                    const children = nodeObj.children as unknown[];
                    children.push({
                        id: nodeData.id,
                        title: nodeData.title,
                        description: nodeData.description || '',
                        children: []
                    });
                    return true;
                }

                if (Array.isArray(nodeObj.children)) {
                    for (const child of nodeObj.children) {
                        if (addToNode(child)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (data.root) {
            return addToNode(data.root);
        }

        return false;
    }

    /**
     * ノードを削除
     */
    async deleteNode(nodeId: string): Promise<void> {
        if (!this.currentDocument) return;

        try {
            const content = this.currentDocument.getText();
            let data: Record<string, unknown>;

            // ファイル拡張子に基づいて解析
            const ext = path.extname(this.currentDocument.fileName).toLowerCase();
            if (ext === '.yaml' || ext === '.yml') {
                data = yaml.load(content) as Record<string, unknown>;
            } else {
                data = JSON.parse(content);
            }

            // ノードを削除
            this.deleteNodeFromData(data, nodeId);

            // ファイルを更新
            let updatedContent: string;
            if (ext === '.yaml' || ext === '.yml') {
                updatedContent = yaml.dump(data, { 
                    indent: 2,
                    lineWidth: 120,
                    noRefs: true
                });
            } else {
                updatedContent = JSON.stringify(data, null, 2);
            }

            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                this.currentDocument.positionAt(0),
                this.currentDocument.positionAt(this.currentDocument.getText().length)
            );
            edit.replace(this.currentDocument.uri, fullRange, updatedContent);
            await vscode.workspace.applyEdit(edit);

            // ドキュメントを保存
            await this.currentDocument.save();

            // ツリーを更新
            await this.loadTreeData();

        } catch (error) {
            vscode.window.showErrorMessage(`ノードの削除に失敗しました: ${error}`);
        }
    }

    /**
     * データ構造からノードを削除
     */
    private deleteNodeFromData(data: Record<string, unknown>, nodeId: string): boolean {
        const deleteFromNode = (node: unknown): boolean => {
            if (typeof node === 'object' && node !== null) {
                const nodeObj = node as Record<string, unknown>;
                
                if (Array.isArray(nodeObj.children)) {
                    const children = nodeObj.children as unknown[];
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i] as Record<string, unknown>;
                        if (child.id === nodeId) {
                            children.splice(i, 1);
                            return true;
                        }
                        if (deleteFromNode(child)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (data.root) {
            return deleteFromNode(data.root);
        }

        return false;
    }

    /**
     * すべてのノードを展開
     */
    expandAll(): void {
        // TreeView の展開状態は VSCode 内部で管理されるため、
        // ここでは refresh を呼ぶだけで十分
        this.refresh();
    }

    /**
     * すべてのノードを折りたたみ
     */
    collapseAll(): void {
        // TreeView の折りたたみ状態は VSCode 内部で管理されるため、
        // ここでは refresh を呼ぶだけで十分
        this.refresh();
    }
}