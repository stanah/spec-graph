/**
 * ViewSwitcherのテスト
 * ファイル形式検出とビュー切り替えロジックをテストする
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewSwitcher, type ViewType, type FileUri } from '../ViewSwitcher';

describe('ViewSwitcher', () => {
  let viewSwitcher: ViewSwitcher;

  beforeEach(() => {
    viewSwitcher = new ViewSwitcher();
  });

  describe('ファイル拡張子による判定', () => {
    it('マインドマップファイルを正しく判定する', () => {
      const testCases: Array<{ path: string; expected: ViewType }> = [
        { path: '/test/file.mindmap', expected: 'mindmap' },
        { path: '/test/file.mm', expected: 'mindmap' },
        { path: '/test/file.xmind', expected: 'mindmap' },
        { path: '/test/file.opml', expected: 'mindmap' }
      ];

      testCases.forEach(({ path, expected }) => {
        const uri: FileUri = { fsPath: path };
        expect(viewSwitcher.detectViewType(uri)).toBe(expected);
      });
    });

    it('テーブルファイルを正しく判定する', () => {
      const testCases: Array<{ path: string; expected: ViewType }> = [
        { path: '/test/data.csv', expected: 'table' },
        { path: '/test/data.tsv', expected: 'table' },
        { path: '/test/data.xlsx', expected: 'table' },
        { path: '/test/data.xls', expected: 'table' }
      ];

      testCases.forEach(({ path, expected }) => {
        const uri: FileUri = { fsPath: path };
        expect(viewSwitcher.detectViewType(uri)).toBe(expected);
      });
    });

    it('ドキュメントファイルを正しく判定する', () => {
      const testCases: Array<{ path: string; expected: ViewType }> = [
        { path: '/test/doc.md', expected: 'document' },
        { path: '/test/doc.markdown', expected: 'document' },
        { path: '/test/doc.txt', expected: 'document' },
        { path: '/test/doc.html', expected: 'document' },
        { path: '/test/doc.htm', expected: 'document' },
        { path: '/test/doc.pdf', expected: 'document' }
      ];

      testCases.forEach(({ path, expected }) => {
        const uri: FileUri = { fsPath: path };
        expect(viewSwitcher.detectViewType(uri)).toBe(expected);
      });
    });

    it('不明な拡張子の場合はマインドマップをデフォルトとする', () => {
      const uri: FileUri = { fsPath: '/test/unknown.xyz' };
      expect(viewSwitcher.detectViewType(uri)).toBe('mindmap');
    });

    it('拡張子がない場合はマインドマップをデフォルトとする', () => {
      const uri: FileUri = { fsPath: '/test/filename' };
      expect(viewSwitcher.detectViewType(uri)).toBe('mindmap');
    });
  });

  describe('JSON構造解析', () => {
    describe('マインドマップ構造の検出', () => {
      it('ルートノード形式のマインドマップを検出する', () => {
        const content = JSON.stringify({
          root: {
            text: 'Root Node',
            children: [
              { text: 'Child 1', children: [] },
              { text: 'Child 2', children: [] }
            ]
          }
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
      });

      it('直接階層構造のマインドマップを検出する', () => {
        const content = JSON.stringify({
          text: 'Root',
          children: [
            {
              text: 'Branch 1',
              children: [
                { text: 'Leaf 1.1' },
                { text: 'Leaf 1.2' }
              ]
            }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
      });

      it('nodes配列形式のマインドマップを検出する', () => {
        const content = JSON.stringify({
          nodes: [
            { id: '1', text: 'Node 1', parent: null },
            { id: '2', text: 'Node 2', parent: '1' },
            { id: '3', text: 'Node 3', parent: '1' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
      });

      it('title属性を持つ階層構造を検出する', () => {
        const content = JSON.stringify({
          title: 'Main Topic',
          items: [
            { title: 'Subtopic 1' },
            { title: 'Subtopic 2', items: [{ title: 'Detail' }] }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
      });
    });

    describe('テーブル構造の検出', () => {
      it('オブジェクト配列形式のテーブルを検出する', () => {
        const content = JSON.stringify([
          { name: 'Alice', age: 30, city: 'Tokyo' },
          { name: 'Bob', age: 25, city: 'Osaka' },
          { name: 'Carol', age: 35, city: 'Kyoto' }
        ]);

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('table');
      });

      it('プリミティブ配列形式のテーブルを検出する', () => {
        const content = JSON.stringify(['item1', 'item2', 'item3']);

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('table');
      });

      it('rows形式のテーブルを検出する', () => {
        const content = JSON.stringify({
          columns: ['Name', 'Age', 'City'],
          rows: [
            ['Alice', 30, 'Tokyo'],
            ['Bob', 25, 'Osaka']
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('table');
      });

      it('data形式のテーブルを検出する', () => {
        const content = JSON.stringify({
          data: [
            { id: 1, value: 'A' },
            { id: 2, value: 'B' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('table');
      });

      it('空配列はテーブルとして扱わない', () => {
        const content = JSON.stringify([]);

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
      });
    });

    describe('ドキュメント構造の検出', () => {
      it('sections形式のドキュメントを検出する', () => {
        const content = JSON.stringify({
          title: 'Document Title',
          sections: [
            { title: 'Section 1', content: 'Content 1' },
            { title: 'Section 2', content: 'Content 2' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('document');
      });

      it('単一ドキュメント形式を検出する', () => {
        const content = JSON.stringify({
          title: 'Article Title',
          content: 'Article content here...'
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('document');
      });

      it('pages形式のドキュメントを検出する', () => {
        const content = JSON.stringify({
          pages: [
            { content: 'Page 1 content' },
            { content: 'Page 2 content' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('document');
      });

      it('Markdown形式のドキュメントを検出する', () => {
        const content = JSON.stringify({
          markdown: '# Title\n\nContent here...',
          frontmatter: {
            author: 'Test Author',
            date: '2024-01-01'
          }
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('document');
      });
    });

    describe('依存関係構造の検出', () => {
      it('グラフ形式の依存関係を検出する', () => {
        const content = JSON.stringify({
          nodes: [
            { id: 'A', name: 'Module A' },
            { id: 'B', name: 'Module B' }
          ],
          edges: [
            { source: 'A', target: 'B', type: 'dependency' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('deps');
      });

      it('dependencies形式の依存関係を検出する', () => {
        const content = JSON.stringify({
          name: 'my-package',
          dependencies: {
            'react': '^18.0.0',
            'typescript': '^5.0.0'
          }
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('deps');
      });

      it('devDependencies形式の依存関係を検出する', () => {
        const content = JSON.stringify({
          name: 'my-package',
          devDependencies: {
            'vitest': '^1.0.0',
            'eslint': '^8.0.0'
          }
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('deps');
      });

      it('from/to形式のエッジを検出する', () => {
        const content = JSON.stringify({
          nodes: [
            { id: 'X', label: 'Component X' },
            { id: 'Y', label: 'Component Y' }
          ],
          edges: [
            { from: 'X', to: 'Y', relation: 'uses' }
          ]
        });

        const uri: FileUri = { fsPath: '/test/file.json' };
        expect(viewSwitcher.detectViewType(uri, content)).toBe('deps');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なJSONの場合はドキュメントビューにフォールバックする', () => {
      const invalidJson = '{ invalid json content';
      const uri: FileUri = { fsPath: '/test/file.json' };

      expect(viewSwitcher.detectViewType(uri, invalidJson)).toBe('document');
    });

    it('空文字列の場合はマインドマップをデフォルトとする', () => {
      const uri: FileUri = { fsPath: '/test/file.json' };

      expect(viewSwitcher.detectViewType(uri, '')).toBe('mindmap');
    });

    it('null値の場合はマインドマップをデフォルトとする', () => {
      const content = JSON.stringify(null);
      const uri: FileUri = { fsPath: '/test/file.json' };

      expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
    });

    it('プリミティブ値の場合はマインドマップをデフォルトとする', () => {
      const content = JSON.stringify('simple string');
      const uri: FileUri = { fsPath: '/test/file.json' };

      expect(viewSwitcher.detectViewType(uri, content)).toBe('mindmap');
    });
  });

  describe('静的メソッド', () => {
    it('getSupportedExtensions()が正しい拡張子リストを返す', () => {
      const extensions = ViewSwitcher.getSupportedExtensions();

      expect(extensions).toContain('.mindmap');
      expect(extensions).toContain('.csv');
      expect(extensions).toContain('.md');
      expect(extensions).toContain('.json');
      expect(extensions.length).toBeGreaterThan(10);
    });

    it('getViewTypeByExtension()が正しいマッピングを返す', () => {
      expect(ViewSwitcher.getViewTypeByExtension('.mindmap')).toBe('mindmap');
      expect(ViewSwitcher.getViewTypeByExtension('.csv')).toBe('table');
      expect(ViewSwitcher.getViewTypeByExtension('.md')).toBe('document');
      expect(ViewSwitcher.getViewTypeByExtension('.json')).toBe('auto');
      expect(ViewSwitcher.getViewTypeByExtension('.unknown')).toBeUndefined();
    });

    it('getViewTypeByExtension()が大文字小文字を正しく処理する', () => {
      expect(ViewSwitcher.getViewTypeByExtension('.MINDMAP')).toBe('mindmap');
      expect(ViewSwitcher.getViewTypeByExtension('.CSV')).toBe('table');
      expect(ViewSwitcher.getViewTypeByExtension('.Md')).toBe('document');
    });
  });

  describe('デバッグ機能', () => {
    it('analyzeJsonStructureDebug()が詳細情報を返す', () => {
      const content = JSON.stringify({
        text: 'Root',
        children: [{ text: 'Child' }]
      });

      const result = viewSwitcher.analyzeJsonStructureDebug(content);

      expect(result.type).toBe('mindmap');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reason).toBeTruthy();
      expect(typeof result.reason).toBe('string');
    });

    it('analyzeJsonStructureDebug()が無効なJSONでもエラーを投げない', () => {
      const invalidJson = '{ invalid';

      expect(() => {
        const result = viewSwitcher.analyzeJsonStructureDebug(invalidJson);
        expect(result.type).toBe('document');
        expect(result.confidence).toBeLessThan(0.5);
      }).not.toThrow();
    });
  });

  describe('実際のファイルケースでの統合テスト', () => {
    it('package.jsonファイルを依存関係ビューとして検出する', () => {
      const packageJson = JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'typescript': '^5.0.0'
        },
        devDependencies: {
          'vite': '^5.0.0'
        }
      });

      const uri: FileUri = { fsPath: '/project/package.json' };
      expect(viewSwitcher.detectViewType(uri, packageJson)).toBe('deps');
    });

    it('CSVデータのJSONファイルをテーブルビューとして検出する', () => {
      const csvData = JSON.stringify([
        { '名前': '田中太郎', '年齢': 30, '職業': 'エンジニア' },
        { '名前': '佐藤花子', '年齢': 28, '職業': 'デザイナー' },
        { '名前': '鈴木次郎', '年齢': 35, '職業': 'マネージャー' }
      ]);

      const uri: FileUri = { fsPath: '/data/employees.json' };
      expect(viewSwitcher.detectViewType(uri, csvData)).toBe('table');
    });

    it('要求仕様書のJSONファイルをマインドマップビューとして検出する', () => {
      const reqSpec = JSON.stringify({
        title: '要求仕様書',
        root: {
          text: 'システム要件',
          children: [
            {
              text: '機能要件',
              children: [
                { text: 'ユーザー管理' },
                { text: 'データ管理' }
              ]
            },
            {
              text: '非機能要件',
              children: [
                { text: 'パフォーマンス' },
                { text: 'セキュリティ' }
              ]
            }
          ]
        }
      });

      const uri: FileUri = { fsPath: '/docs/requirements.json' };
      expect(viewSwitcher.detectViewType(uri, reqSpec)).toBe('mindmap');
    });
  });
});