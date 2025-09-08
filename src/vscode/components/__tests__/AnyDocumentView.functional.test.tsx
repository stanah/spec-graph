import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnyDocumentView } from '../AnyDocumentView';
import { useAppStore } from '../../../stores/appStore';

describe('AnyDocumentView (functional-requirements fallback)', () => {
  it('functionalRequirements を含むYAMLでもスキーマ駆動で表示できる', () => {
    useAppStore.getState().reset();
    const yaml = `
title: FRだけのドキュメント
version: "1.0.0"
functionalRequirements:
  - id: FR-ABC-001
    title: 検索機能
    description: 全文検索
    priority: high
    status: in-progress
`;
    // Zustandの内部状態を直接設定（AnyDocumentViewはfile.fileContentを参照）
    useAppStore.setState((s) => ({ ...s, file: { ...s.file, fileContent: yaml } }));

    render(<AnyDocumentView />);

    expect(screen.getByText(/FRだけのドキュメント/)).toBeInTheDocument();
    expect(screen.getByText(/検索機能/)).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveTextContent('in-progress');
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('high');
  });
});

