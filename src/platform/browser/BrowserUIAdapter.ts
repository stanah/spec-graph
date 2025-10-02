import type { UIAdapter, ProgressReporter } from '../interfaces';

/**
 * ブラウザ環境用のUIアダプター
 * ブラウザネイティブのダイアログと通知を使用
 */
export class BrowserUIAdapter implements UIAdapter {
  private statusBarElement: HTMLElement | null = null;

  /**
   * 情報メッセージを表示
   */
  showInformationMessage(message: string): void {
    this.showNotification(message, 'info');
  }

  /**
   * 警告メッセージを表示
   */
  showWarningMessage(message: string): void {
    this.showNotification(message, 'warning');
  }

  /**
   * エラーメッセージを表示
   */
  showErrorMessage(message: string): void {
    this.showNotification(message, 'error');
  }

  /**
   * 確認ダイアログを表示
   */
  async showConfirmDialog(message: string, options: string[]): Promise<string | null> {
    // ブラウザのconfirmダイアログを使用
    const result = confirm(`${message}\n\n選択肢: ${options.join(', ')}`);
    return result ? options[0] : null;
  }

  /**
   * プログレスバーを表示
   */
  async withProgress<T>(title: string, task: (progress: ProgressReporter) => Promise<T>): Promise<T> {
    // 簡易的なプログレス表示
    const progressElement = this.createProgressElement(title);
    document.body.appendChild(progressElement);

    const reporter: ProgressReporter = {
      report: (value: { message?: string; increment?: number }) => {
        const messageElement = progressElement.querySelector('.progress-message');
        if (messageElement && value.message) {
          messageElement.textContent = value.message;
        }
      }
    };

    try {
      return await task(reporter);
    } finally {
      progressElement.remove();
    }
  }

  /**
   * ステータスバーにメッセージを表示
   */
  showStatusBarMessage(message: string, timeout?: number): void {
    if (!this.statusBarElement) {
      this.statusBarElement = this.createStatusBarElement();
      document.body.appendChild(this.statusBarElement);
    }

    this.statusBarElement.textContent = message;
    this.statusBarElement.style.display = 'block';

    if (timeout) {
      setTimeout(() => {
        if (this.statusBarElement) {
          this.statusBarElement.style.display = 'none';
        }
      }, timeout);
    }
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
    if (this.statusBarElement) {
      this.statusBarElement.remove();
      this.statusBarElement = null;
    }
  }

  /**
   * 通知を表示（内部メソッド）
   */
  private showNotification(message: string, type: 'info' | 'warning' | 'error'): void {
    // ブラウザのNotification APIを使用（許可されている場合）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(this.getNotificationTitle(type), {
        body: message,
        icon: this.getNotificationIcon(type)
      });
    } else {
      // フォールバック: alert/console
      switch (type) {
        case 'info':
          console.info(message);
          break;
        case 'warning':
          console.warn(message);
          break;
        case 'error':
          console.error(message);
          alert(`エラー: ${message}`);
          break;
      }
    }
  }

  /**
   * 通知タイトルを取得
   */
  private getNotificationTitle(type: 'info' | 'warning' | 'error'): string {
    switch (type) {
      case 'info': return '情報';
      case 'warning': return '警告';
      case 'error': return 'エラー';
    }
  }

  /**
   * 通知アイコンを取得
   */
  private getNotificationIcon(type: 'info' | 'warning' | 'error'): string {
    // デフォルトアイコン（必要に応じてカスタマイズ）
    return '';
  }

  /**
   * プログレス要素を作成
   */
  private createProgressElement(title: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'browser-progress-overlay';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const progressBox = document.createElement('div');
    progressBox.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
      text-align: center;
    `;

    const titleElement = document.createElement('div');
    titleElement.textContent = title;
    titleElement.style.cssText = 'font-weight: bold; margin-bottom: 10px;';

    const messageElement = document.createElement('div');
    messageElement.className = 'progress-message';
    messageElement.style.cssText = 'color: #666;';

    progressBox.appendChild(titleElement);
    progressBox.appendChild(messageElement);
    container.appendChild(progressBox);

    return container;
  }

  /**
   * ステータスバー要素を作成
   */
  private createStatusBarElement(): HTMLElement {
    const statusBar = document.createElement('div');
    statusBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #007acc;
      color: white;
      padding: 8px 16px;
      font-size: 14px;
      z-index: 9999;
      display: none;
    `;
    return statusBar;
  }
}
