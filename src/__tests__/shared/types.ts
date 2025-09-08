import type { Mock } from 'vitest';

// 共通で使うテーブル行の型
export type Row = { id: string; name: string; status: string };
export type RowMinimal = { id: string; name: string };

// VSCode API のモック型
export interface MockVSCodeApi {
  postMessage: Mock;
  setState: Mock;
  getState: Mock;
}

