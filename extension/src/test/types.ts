import * as vscode from 'vscode';

// テスト用のMock型定義
export interface MockExtensionContext extends vscode.ExtensionContext {
  extensionUri: vscode.Uri;
  subscriptions: { dispose(): any }[];
  workspaceState: vscode.Memento;
  globalState: vscode.Memento;
  secrets: vscode.SecretStorage;
  extensionPath: string;
  globalStorageUri: vscode.Uri;
  logUri: vscode.Uri;
  storagePath?: string;
  globalStoragePath: string;
  logPath: string;
  extensionMode: vscode.ExtensionMode;
  extension: vscode.Extension<any>;
  storageUri?: vscode.Uri;
  environmentVariableCollection: vscode.EnvironmentVariableCollection;
  asAbsolutePath(relativePath: string): string;
}

export interface MockTextDocument extends vscode.TextDocument {
  uri: vscode.Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save(): Thenable<boolean>;
  eol: vscode.EndOfLine;
  lineCount: number;
  encoding: string;
  getText(range?: vscode.Range): string;
  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined;
  validateRange(range: vscode.Range): vscode.Range;
  validatePosition(position: vscode.Position): vscode.Position;
  lineAt(line: number): vscode.TextLine;
  lineAt(position: vscode.Position): vscode.TextLine;
  offsetAt(position: vscode.Position): number;
  positionAt(offset: number): vscode.Position;
}

export interface MockWebview extends vscode.Webview {
  html: string;
  options: vscode.WebviewOptions;
  cspSource: string;
  asWebviewUri(localResource: vscode.Uri): vscode.Uri;
  postMessage(message: any): Thenable<boolean>;
  onDidReceiveMessage: vscode.Event<any>;
}

export interface MockWebviewPanel extends vscode.WebviewPanel {
  webview: MockWebview;
  viewType: string;
  title: string;
  iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
  options: vscode.WebviewPanelOptions;
  viewColumn: vscode.ViewColumn;
  active: boolean;
  visible: boolean;
  onDidChangeViewState: vscode.Event<vscode.WebviewPanelOnDidChangeViewStateEvent>;
  onDidDispose: vscode.Event<void>;
  reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
}

export interface MockTreeItem {
  label?: string | vscode.TreeItemLabel;
  id?: string;
  iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;
  description?: string | boolean;
  tooltip?: string | vscode.MarkdownString;
  command?: vscode.Command;
  collapsibleState?: vscode.TreeItemCollapsibleState;
  contextValue?: string;
  resourceUri?: vscode.Uri;
  accessibilityInformation?: vscode.AccessibilityInformation;
}

export interface MockUri extends vscode.Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
  toString(): string;
  toJSON(): any;
  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): vscode.Uri;
}

export interface MockWorkspaceFolder {
  uri: vscode.Uri;
  name: string;
  index: number;
}

export interface MockTextEditor {
  document: MockTextDocument;
  selection: vscode.Selection;
  selections: readonly vscode.Selection[];
  visibleRanges: readonly vscode.Range[];
  options: vscode.TextEditorOptions;
  viewColumn?: vscode.ViewColumn;
  edit(callback: (editBuilder: vscode.TextEditorEdit) => void): Thenable<boolean>;
  insertSnippet(snippet: vscode.SnippetString, location?: vscode.Position | vscode.Range | readonly vscode.Position[] | readonly vscode.Range[]): Thenable<boolean>;
  setDecorations(decorationType: vscode.TextEditorDecorationType, rangesOrOptions: readonly vscode.Range[] | readonly vscode.DecorationOptions[]): void;
  revealRange(range: vscode.Range, revealType?: vscode.TextEditorRevealType): void;
  show(column?: vscode.ViewColumn): void;
  hide(): void;
}