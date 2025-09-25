import type {
  ConflictResolver as IConflictResolver,
  ConflictData,
  SyncResult,
  MergeResult,
  UIAdapter
} from '../interfaces';

/**
 * ファイル競合の検出と解決を行うクラス
 * 3-wayマージアルゴリズムとユーザー選択による競合解決を提供
 */
export class ConflictResolver implements IConflictResolver {
  private ui: UIAdapter;

  constructor(ui: UIAdapter) {
    this.ui = ui;
  }

  /**
   * 競合を解決する
   * @param conflictData 競合データ
   * @returns 解決結果
   */
  async resolve(conflictData: ConflictData): Promise<SyncResult> {
    try {
      // まずは自動マージを試行
      if (conflictData.baseContent) {
        const mergeResult = await this.threeWayMerge(
          conflictData.baseContent,
          conflictData.localContent,
          conflictData.remoteContent
        );

        if (mergeResult.success && mergeResult.content) {
          return {
            success: true,
            hasConflict: false,
            finalState: {
              ...conflictData.remoteState,
              version: Math.max(conflictData.localState.version, conflictData.remoteState.version) + 1,
              lastModified: new Date()
            },
            conflictResolution: 'merged'
          };
        }
      }

      // 自動マージが失敗した場合、ユーザーに選択を求める
      const userChoice = await this.promptUserChoice(conflictData);

      switch (userChoice) {
        case 'local':
          return {
            success: true,
            hasConflict: false,
            finalState: {
              ...conflictData.localState,
              version: conflictData.localState.version + 1,
              lastModified: new Date()
            },
            conflictResolution: 'local'
          };

        case 'remote':
          return {
            success: true,
            hasConflict: false,
            finalState: {
              ...conflictData.remoteState,
              version: conflictData.remoteState.version + 1,
              lastModified: new Date()
            },
            conflictResolution: 'remote'
          };

        case 'merge':
          // 手動マージのために競合情報を含んだ結果を返す
          return {
            success: false,
            hasConflict: true,
            finalState: conflictData.localState,
            conflictResolution: 'user_choice',
            error: 'ユーザーによる手動マージが必要です'
          };

        default:
          return {
            success: false,
            hasConflict: true,
            error: 'ユーザーによる解決がキャンセルされました'
          };
      }
    } catch (error) {
      return {
        success: false,
        hasConflict: true,
        error: `競合解決に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 3-wayマージを実行
   * @param baseContent ベース内容
   * @param localContent ローカル内容
   * @param remoteContent リモート内容
   * @returns マージ結果
   */
  async threeWayMerge(baseContent: string, localContent: string, remoteContent: string): Promise<MergeResult> {
    try {
      const baseIsJson = this.isJsonContent(baseContent);
      const localIsJson = this.isJsonContent(localContent);
      const remoteIsJson = this.isJsonContent(remoteContent);

      // いずれかのファイルが不正なJSONの場合はエラーとして扱う
      if ((baseIsJson && !localIsJson) || (baseIsJson && !remoteIsJson) ||
          (!baseIsJson && localIsJson) || (!baseIsJson && remoteIsJson) ||
          (localIsJson && !remoteIsJson) || (!localIsJson && remoteIsJson)) {
        return {
          success: false,
          error: 'ファイル形式の不整合: すべてのファイルが同じ形式である必要があります'
        };
      }

      // JSON形式のファイルの場合は構造的マージを試行
      if (baseIsJson && localIsJson && remoteIsJson) {
        return this.mergeJsonContent(baseContent, localContent, remoteContent);
      }

      // テキストファイルの場合は行ベースのマージを実行
      return this.mergeTextContent(baseContent, localContent, remoteContent);
    } catch (error) {
      return {
        success: false,
        error: `3-wayマージに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * ユーザーに競合解決の選択肢を提示
   * @param conflictData 競合データ
   * @returns ユーザーの選択結果
   */
  async promptUserChoice(conflictData: ConflictData): Promise<'local' | 'remote' | 'merge'> {
    const message = `ファイル "${conflictData.localState.path}" で競合が発生しました。\n\nローカル版: ${conflictData.localState.lastModified.toLocaleString()}\nリモート版: ${conflictData.remoteState.lastModified.toLocaleString()}\n\nどのように解決しますか？`;

    const options = ['ローカル版を使用', 'リモート版を使用', '手動でマージ'];
    const choice = await this.ui.showConfirmDialog(message, options);

    switch (choice) {
      case 'ローカル版を使用':
        return 'local';
      case 'リモート版を使用':
        return 'remote';
      case '手動でマージ':
        return 'merge';
      default:
        throw new Error('解決がキャンセルされました');
    }
  }

  /**
   * JSON構造の差分を検出
   * @param base ベース内容
   * @param local ローカル内容
   * @param remote リモート内容
   * @returns 差分情報
   */
  detectJsonDiff(base: unknown, local: unknown, remote: unknown): Array<{
    path: string;
    type: 'added' | 'removed' | 'modified';
    baseValue?: unknown;
    localValue?: unknown;
    remoteValue?: unknown;
  }> {
    const differences: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      baseValue?: unknown;
      localValue?: unknown;
      remoteValue?: unknown;
    }> = [];

    this.compareObjects(base, local, remote, '', differences);
    return differences;
  }

  /**
   * JSON内容かどうかを判定
   * @param content 内容
   * @returns JSON形式かどうか
   */
  private isJsonContent(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * JSON内容をマージ
   * @param baseContent ベース内容
   * @param localContent ローカル内容
   * @param remoteContent リモート内容
   * @returns マージ結果
   */
  private mergeJsonContent(baseContent: string, localContent: string, remoteContent: string): MergeResult {
    try {
      const baseObj = JSON.parse(baseContent);
      const localObj = JSON.parse(localContent);
      const remoteObj = JSON.parse(remoteContent);

      const differences = this.detectJsonDiff(baseObj, localObj, remoteObj);
      const conflicts = differences.filter(diff =>
        diff.localValue !== undefined &&
        diff.remoteValue !== undefined &&
        diff.localValue !== diff.remoteValue
      );

      if (conflicts.length === 0) {
        // 競合がない場合は自動マージ
        const merged = this.mergeJsonObjects(baseObj, localObj, remoteObj);
        return {
          success: true,
          content: JSON.stringify(merged, null, 2)
        };
      }

      // 競合がある場合
      return {
        success: false,
        conflicts: conflicts.map((conflict, index) => ({
          startLine: index,
          endLine: index,
          localContent: JSON.stringify(conflict.localValue, null, 2),
          remoteContent: JSON.stringify(conflict.remoteValue, null, 2)
        })),
        error: `JSON構造で${conflicts.length}個の競合が検出されました`
      };
    } catch (error) {
      return {
        success: false,
        error: `JSONマージに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * テキスト内容をマージ
   * @param baseContent ベース内容
   * @param localContent ローカル内容
   * @param remoteContent リモート内容
   * @returns マージ結果
   */
  private mergeTextContent(baseContent: string, localContent: string, remoteContent: string): MergeResult {
    try {
      const baseLines = baseContent.split('\n');
      const localLines = localContent.split('\n');
      const remoteLines = remoteContent.split('\n');

      // 簡単な行ベースのマージ実装
      const mergedLines: string[] = [];
      const conflicts: Array<{
        startLine: number;
        endLine: number;
        localContent: string;
        remoteContent: string;
      }> = [];

      const maxLength = Math.max(baseLines.length, localLines.length, remoteLines.length);

      for (let i = 0; i < maxLength; i++) {
        const baseLine = baseLines[i] || '';
        const localLine = localLines[i] || '';
        const remoteLine = remoteLines[i] || '';

        if (localLine === remoteLine) {
          // 両方が同じ変更をした場合
          mergedLines.push(localLine);
        } else if (localLine === baseLine) {
          // ローカルが変更せず、リモートが変更した場合
          mergedLines.push(remoteLine);
        } else if (remoteLine === baseLine) {
          // リモートが変更せず、ローカルが変更した場合
          mergedLines.push(localLine);
        } else {
          // 両方が異なる変更をした場合（競合）
          conflicts.push({
            startLine: i,
            endLine: i,
            localContent: localLine,
            remoteContent: remoteLine
          });
          // 競合マーカーを挿入
          mergedLines.push(`<<<<<<< LOCAL`);
          mergedLines.push(localLine);
          mergedLines.push('=======');
          mergedLines.push(remoteLine);
          mergedLines.push('>>>>>>> REMOTE');
        }
      }

      return {
        success: conflicts.length === 0,
        content: conflicts.length === 0 ? mergedLines.join('\n') : undefined,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        error: conflicts.length > 0 ? `${conflicts.length}個の行で競合が発生しました` : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `テキストマージに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * JSONオブジェクトをマージ
   * @param base ベースオブジェクト
   * @param local ローカルオブジェクト
   * @param remote リモートオブジェクト
   * @returns マージされたオブジェクト
   */
  private mergeJsonObjects(base: unknown, local: unknown, remote: unknown): unknown {
    if (typeof base !== 'object' || base === null) {
      return remote !== undefined ? remote : local;
    }

    const result: Record<string, unknown> | unknown[] = Array.isArray(base) ? [] : {};

    // すべてのキーを収集
    const allKeys = new Set([
      ...Object.keys((base as Record<string, unknown>) || {}),
      ...Object.keys((local as Record<string, unknown>) || {}),
      ...Object.keys((remote as Record<string, unknown>) || {})
    ]);

    for (const key of allKeys) {
      const baseValue = (base as Record<string, unknown>)?.[key];
      const localValue = (local as Record<string, unknown>)?.[key];
      const remoteValue = (remote as Record<string, unknown>)?.[key];

      if (localValue === remoteValue) {
        (result as Record<string, unknown>)[key] = localValue;
      } else if (localValue === baseValue) {
        (result as Record<string, unknown>)[key] = remoteValue;
      } else if (remoteValue === baseValue) {
        (result as Record<string, unknown>)[key] = localValue;
      } else {
        // 再帰的にマージ
        (result as Record<string, unknown>)[key] = this.mergeJsonObjects(baseValue, localValue, remoteValue);
      }
    }

    return result;
  }

  /**
   * オブジェクトを再帰的に比較
   * @param base ベースオブジェクト
   * @param local ローカルオブジェクト
   * @param remote リモートオブジェクト
   * @param path 現在のパス
   * @param differences 差分配列
   */
  private compareObjects(base: unknown, local: unknown, remote: unknown, path: string, differences: Array<{
    path: string;
    type: 'added' | 'removed' | 'modified';
    baseValue?: unknown;
    localValue?: unknown;
    remoteValue?: unknown;
  }>): void {
    const allKeys = new Set([
      ...Object.keys((base as Record<string, unknown>) || {}),
      ...Object.keys((local as Record<string, unknown>) || {}),
      ...Object.keys((remote as Record<string, unknown>) || {})
    ]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const baseValue = (base as Record<string, unknown>)?.[key];
      const localValue = (local as Record<string, unknown>)?.[key];
      const remoteValue = (remote as Record<string, unknown>)?.[key];

      // ベースに存在しないキーが追加された場合
      if (baseValue === undefined && (localValue !== undefined || remoteValue !== undefined)) {
        differences.push({
          path: currentPath,
          type: 'added',
          localValue,
          remoteValue
        });
      }
      // ベースに存在したキーが削除された場合
      else if ((localValue === undefined && remoteValue === undefined) && baseValue !== undefined) {
        differences.push({
          path: currentPath,
          type: 'removed',
          baseValue
        });
      }
      // ベースから値が変更された場合
      else if (baseValue !== undefined && (localValue !== baseValue || remoteValue !== baseValue)) {
        if (typeof baseValue === 'object' && baseValue !== null &&
            typeof localValue === 'object' && localValue !== null &&
            typeof remoteValue === 'object' && remoteValue !== null) {
          // オブジェクトの場合は再帰的に比較
          this.compareObjects(baseValue, localValue, remoteValue, currentPath, differences);
        } else {
          differences.push({
            path: currentPath,
            type: 'modified',
            baseValue,
            localValue,
            remoteValue
          });
        }
      }
    }
  }
}