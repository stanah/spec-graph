import type {
  FileSyncManager as IFileSyncManager,
  FileState,
  SyncResult,
  ConflictData,
  ConflictResolver,
  FileSystemAdapter
} from '../interfaces';
import { createHash } from 'crypto';

/**
 * ファイル状態の同期とコンフリクト検出を管理するクラス
 * ローカルとリモートのファイル状態を比較し、変更の競合を検出・解決する
 */
export class FileSyncManager implements IFileSyncManager {
  private fileStates = new Map<string, FileState>();
  private conflictResolver: ConflictResolver;
  private fileSystem: FileSystemAdapter;

  constructor(fileSystem: FileSystemAdapter, conflictResolver: ConflictResolver) {
    this.fileSystem = fileSystem;
    this.conflictResolver = conflictResolver;
  }

  /**
   * ファイルの状態を同期する
   * @param uri ファイルURI
   * @returns 同期結果
   */
  async syncFileState(uri: string): Promise<SyncResult> {
    try {
      const localState = this.getFileState(uri);
      const remoteState = await this.fetchRemoteState(uri);

      if (this.hasConflict(localState, remoteState)) {
        // 競合が発生している場合、ConflictResolverに解決を委譲
        const conflictData: ConflictData = {
          localState: localState!,
          remoteState,
          localContent: await this.fileSystem.readFile(uri),
          remoteContent: await this.fetchRemoteContent(uri)
        };

        return this.conflictResolver.resolve(conflictData);
      }

      // 競合がない場合、状態をマージ
      return this.mergeStates(localState, remoteState);
    } catch (error) {
      return {
        success: false,
        hasConflict: false,
        error: `同期に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * ローカルとリモートで競合があるかチェック
   * @param localState ローカルファイルの状態
   * @param remoteState リモートファイルの状態
   * @returns 競合があるかどうか
   */
  hasConflict(localState: FileState | undefined, remoteState: FileState | undefined): boolean {
    if (!localState || !remoteState) {
      return false; // どちらか一方が存在しない場合は競合なし
    }

    // バージョンと最終更新時刻が異なる場合に競合とみなす
    const versionConflict = localState.version !== remoteState.version;
    const timeConflict = localState.lastModified.getTime() !== remoteState.lastModified.getTime();
    const hashConflict = localState.hash !== remoteState.hash;

    return versionConflict && timeConflict && hashConflict;
  }

  /**
   * ファイル状態をマップに保存
   * @param uri ファイルURI
   * @param state ファイル状態
   */
  setFileState(uri: string, state: FileState): void {
    this.fileStates.set(uri, state);
  }

  /**
   * ファイル状態をマップから取得
   * @param uri ファイルURI
   * @returns ファイル状態
   */
  getFileState(uri: string): FileState | undefined {
    return this.fileStates.get(uri);
  }

  /**
   * リモートファイル状態を取得
   * 実際のプロジェクトでは、サーバーAPIから取得するが、
   * 今回はローカルファイルの情報をベースにシミュレート
   * @param uri ファイルURI
   * @returns リモートファイル状態
   */
  async fetchRemoteState(uri: string): Promise<FileState> {
    try {
      // 実際の実装では、リモートサーバーからファイル情報を取得
      const exists = await this.fileSystem.exists(uri);
      if (!exists) {
        throw new Error(`ファイルが存在しません: ${uri}`);
      }

      const fileInfo = await this.fileSystem.getFileInfo(uri);
      const content = await this.fileSystem.readFile(uri);
      const hash = this.calculateHash(content);

      // リモート側のバージョンは現在時刻をベースに生成（模擬的）
      const version = Math.floor(fileInfo.lastModified.getTime() / 1000);

      return {
        version,
        lastModified: fileInfo.lastModified,
        size: fileInfo.size,
        hash,
        path: uri
      };
    } catch (error) {
      throw new Error(`リモート状態の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ローカルとリモートの状態をマージ
   * @param localState ローカル状態
   * @param remoteState リモート状態
   * @returns マージ結果
   */
  mergeStates(localState: FileState | undefined, remoteState: FileState): SyncResult {
    if (!localState) {
      // ローカル状態が存在しない場合、リモート状態を採用
      this.setFileState(remoteState.path, remoteState);
      return {
        success: true,
        hasConflict: false,
        finalState: remoteState,
        conflictResolution: 'remote'
      };
    }

    // バージョンを比較してより新しい状態を採用
    const useRemote = remoteState.version > localState.version ||
                     remoteState.lastModified > localState.lastModified;

    const finalState = useRemote ? remoteState : localState;
    this.setFileState(finalState.path, finalState);

    return {
      success: true,
      hasConflict: false,
      finalState,
      conflictResolution: useRemote ? 'remote' : 'local'
    };
  }

  /**
   * リモートファイルの内容を取得
   * 実際の実装では、サーバーAPIから取得するが、
   * 今回はローカルファイルの内容を返す
   * @param uri ファイルURI
   * @returns ファイル内容
   */
  private async fetchRemoteContent(uri: string): Promise<string> {
    return this.fileSystem.readFile(uri);
  }

  /**
   * ファイル内容からハッシュ値を計算
   * @param content ファイル内容
   * @returns ハッシュ値
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 現在のファイル状態を作成
   * @param uri ファイルURI
   * @param content ファイル内容
   * @returns ファイル状態
   */
  async createFileState(uri: string, content?: string): Promise<FileState> {
    const fileInfo = await this.fileSystem.getFileInfo(uri);
    const actualContent = content || await this.fileSystem.readFile(uri);
    const hash = this.calculateHash(actualContent);
    const version = Math.floor(fileInfo.lastModified.getTime() / 1000);

    return {
      version,
      lastModified: fileInfo.lastModified,
      size: fileInfo.size,
      hash,
      path: uri
    };
  }

  /**
   * ファイル変更時にローカル状態を更新
   * @param uri ファイルURI
   * @param content 新しいファイル内容
   */
  async updateLocalState(uri: string, content: string): Promise<void> {
    const newState = await this.createFileState(uri, content);
    this.setFileState(uri, newState);
  }

  /**
   * すべてのファイル状態をクリア
   */
  clearAllStates(): void {
    this.fileStates.clear();
  }

  /**
   * 管理中のファイル状態一覧を取得
   * @returns ファイル状態のマップ
   */
  getAllFileStates(): Map<string, FileState> {
    return new Map(this.fileStates);
  }
}