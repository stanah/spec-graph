import type { EditorAdapter, EditorError } from '../interfaces';

/**
 * ブラウザ環境用のエディタアダプター
 * 表示専用（編集機能なし）
 */
export class BrowserEditorAdapter implements EditorAdapter {
  private content: string = '';
  private language: 'json' | 'yaml' = 'json';
  private changeCallbacks: ((content: string) => void)[] = [];

  /**
   * エディタの内容を取得
   */
  getValue(): string {
    return this.content;
  }

  /**
   * エディタの内容を設定
   */
  setValue(value: string): void {
    this.content = value;
    this.notifyChange();
  }

  /**
   * エディタの言語モードを設定
   */
  setLanguage(language: 'json' | 'yaml'): void {
    this.language = language;
  }

  /**
   * エディタのテーマを設定
   * ブラウザ版では未実装（no-op）
   */
  setTheme(_theme: string): void {
    // ブラウザ版では未実装
  }

  /**
   * 指定行にカーソルを移動
   * ブラウザ版では未実装（no-op）
   */
  setCursor(_line: number, _column?: number): void {
    // ブラウザ版では未実装
  }

  /**
   * 指定範囲をハイライト
   * ブラウザ版では未実装（no-op）
   */
  highlight(_startLine: number, _startColumn: number, _endLine: number, _endColumn: number): void {
    // ブラウザ版では未実装
  }

  /**
   * エラーマーカーを設定
   * ブラウザ版では未実装（no-op）
   */
  setErrorMarkers(_errors: EditorError[]): void {
    // ブラウザ版では未実装
  }

  /**
   * 内容変更時のコールバックを設定
   */
  onDidChangeContent(callback: (content: string) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * カーソル位置変更時のコールバックを設定
   * ブラウザ版では未実装（no-op）
   */
  onDidChangeCursorPosition(_callback: (line: number, column: number) => void): void {
    // ブラウザ版では未実装
  }

  /**
   * 初期化処理
   */
  async initialize(): Promise<void> {
    // 初期化は不要
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.changeCallbacks = [];
  }

  /**
   * 変更通知
   */
  private notifyChange(): void {
    this.changeCallbacks.forEach(callback => callback(this.content));
  }

  /**
   * 現在の言語モードを取得（補助メソッド）
   */
  getLanguage(): 'json' | 'yaml' {
    return this.language;
  }
}
