/**
 * テストセットアップファイル
 */

import '@testing-library/jest-dom';

// Vitest用のjest-dom型定義を手動で拡張
declare global {
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeInTheDocument(): T;
      toHaveValue(value: unknown): T;
      toBeDisabled(): T;
      toHaveBeenCalled(): T;
      toHaveBeenCalledWith(...args: unknown[]): T;
      toHaveBeenCalledTimes(times: number): T;
    }
  }
}

// DOM環境の基本的な設定
if (typeof document === 'undefined') {
  global.document = {
    createElement: vi.fn(() => ({} as HTMLElement)),
    documentElement: {} as HTMLElement,
    body: {} as HTMLElement,
  } as unknown as Document;
}

if (typeof window === 'undefined') {
  global.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
    } as Location,
    navigator: {
      userAgent: 'test',
    } as Navigator,
    showOpenFilePicker: vi.fn(),
    showSaveFilePicker: vi.fn(),
  } as unknown as Window & typeof globalThis;
} else {
  // jsdom環境でwindowが既に存在する場合、欠落しているプロパティを追加
  if (!(window as any).showOpenFilePicker) {
    (window as any).showOpenFilePicker = vi.fn();
  }
  if (!(window as any).showSaveFilePicker) {
    (window as any).showSaveFilePicker = vi.fn();
  }
}
import { vi, afterEach } from 'vitest';

// D3の個別モジュールモック
vi.mock('d3-selection', () => {
  const mockSelection = {
    selectAll: vi.fn(() => mockSelection),
    select: vi.fn(() => mockSelection),
    data: vi.fn(() => mockSelection),
    enter: vi.fn(() => mockSelection),
    exit: vi.fn(() => mockSelection),
    append: vi.fn(() => mockSelection),
    attr: vi.fn(() => mockSelection),
    style: vi.fn(() => mockSelection),
    text: vi.fn(() => mockSelection),
    on: vi.fn(() => mockSelection),
    remove: vi.fn(() => mockSelection),
    classed: vi.fn(() => mockSelection),
    call: vi.fn(() => mockSelection),
    filter: vi.fn(() => mockSelection),
    merge: vi.fn(() => mockSelection),
    transition: vi.fn(() => mockSelection),
    duration: vi.fn(() => mockSelection),
    each: vi.fn(() => {
      // 空のモック実装
      return mockSelection;
    }),
    node: vi.fn(() => ({ 
      getBBox: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50 })),
      getBoundingClientRect: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }))
    })),
    nodes: vi.fn(() => []),
  };

  return {
    select: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
  };
});

vi.mock('d3-zoom', () => ({
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn(),
    scaleBy: vi.fn(),
  })),
  zoomIdentity: {
    translate: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis(),
  },
}));

vi.mock('d3-hierarchy', () => {
  const mockTreeLayout: any = vi.fn(() => {
    // 空のモック実装（実際のD3では変換された階層データを返す）
  });
  mockTreeLayout.nodeSize = vi.fn().mockReturnValue(mockTreeLayout);
  mockTreeLayout.separation = vi.fn().mockReturnValue(mockTreeLayout);

  const mockClusterLayout: any = vi.fn(() => {
    // 空のモック実装
  });
  mockClusterLayout.size = vi.fn().mockReturnValue(mockClusterLayout);
  mockClusterLayout.separation = vi.fn().mockReturnValue(mockClusterLayout);

  return {
    tree: vi.fn(() => mockTreeLayout),
    cluster: vi.fn(() => mockClusterLayout),
    hierarchy: vi.fn(() => ({
      descendants: vi.fn(() => []),
      links: vi.fn(() => []),
      each: vi.fn(),
      x: 0,
      y: 0,
      data: { id: 'test', title: 'Test', children: [] },
      depth: 0,
    })),
  };
});

vi.mock('d3-shape', () => {
  const mockLinkHorizontal: any = vi.fn(() => "mock-path");
  mockLinkHorizontal.x = vi.fn().mockReturnValue(mockLinkHorizontal);
  mockLinkHorizontal.y = vi.fn().mockReturnValue(mockLinkHorizontal);

  const mockLinkRadial: any = vi.fn(() => "mock-path");
  mockLinkRadial.angle = vi.fn().mockReturnValue(mockLinkRadial);
  mockLinkRadial.radius = vi.fn().mockReturnValue(mockLinkRadial);

  return {
    linkHorizontal: vi.fn(() => mockLinkHorizontal),
    linkRadial: vi.fn(() => mockLinkRadial),
  };
});

vi.mock('d3-interpolate', () => ({
  interpolate: vi.fn(() => (t: number) => `interpolated-${t}`),
}));

vi.mock('d3-scale', () => ({
  scaleOrdinal: vi.fn(() => vi.fn()),
}));

vi.mock('d3-scale-chromatic', () => ({
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c'],
}));

// D3.jsのモック（最小限）
vi.mock('d3', () => {
  const mockSelection = {
    selectAll: vi.fn(() => mockSelection),
    select: vi.fn(() => mockSelection),
    data: vi.fn(() => mockSelection),
    enter: vi.fn(() => mockSelection),
    exit: vi.fn(() => mockSelection),
    append: vi.fn(() => mockSelection),
    attr: vi.fn(() => mockSelection),
    style: vi.fn(() => mockSelection),
    text: vi.fn(() => mockSelection),
    on: vi.fn(() => mockSelection),
    remove: vi.fn(() => mockSelection),
    classed: vi.fn(() => mockSelection),
    call: vi.fn(() => mockSelection),
    node: vi.fn(() => ({ getBBox: vi.fn(() => ({ width: 100, height: 50 })) })),
  };

  return {
    select: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
    zoom: vi.fn(() => ({ scaleExtent: vi.fn().mockReturnValue({ on: vi.fn() }) })),
    tree: vi.fn(() => ({ size: vi.fn().mockReturnValue({ separation: vi.fn() }) })),
    hierarchy: vi.fn(() => ({ descendants: vi.fn(() => []), links: vi.fn(() => []) })),
    linkHorizontal: vi.fn(() => vi.fn()),
  };
});

// 必要最小限のブラウザAPIモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.confirm = vi.fn(() => true);
global.alert = vi.fn();

// File System Access APIのモック（テスト互換性のため残存）
global.showOpenFilePicker = vi.fn();
global.showSaveFilePicker = vi.fn();

// localStorageは削除済み（settingsServiceで直接デフォルト値を使用）

// テスト中のコンソールログを制御（成功テストでは非表示にする）
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: console.warn, // 警告は表示
  error: console.error, // エラーは表示
};

// テスト失敗時のみコンソールログを復元
global.addEventListener?.('error', () => {
  global.console = originalConsole;
});

// vitest の afterEach で失敗時のログ復元
afterEach(() => {
    // テスト失敗時はコンソールログを復元
    if (global.expect?.getState?.()?.testPath) {
      global.console = originalConsole;
    }
});

// React act() 警告を抑制 - より包括的に対応
const originalError = console.error;
const originalWarn = console.warn;

// console.error の置き換え
console.error = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (
    message.includes('Warning: An update to') ||
    message.includes('act(...)') ||
    message.includes('Warning: You called act(') ||
    message.includes('was not wrapped in act') ||
    message.includes('When testing, code that causes React state updates should be wrapped into act') ||
    message.includes('This ensures that you\'re testing the behavior the user would see in the browser')
  ) {
    return; // React act 警告は無視
  }
  originalError.apply(console, args);
};

// console.warn の置き換え（念のため）
console.warn = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (
    message.includes('Warning: An update to') ||
    message.includes('act(...)') ||
    message.includes('was not wrapped in act')
  ) {
    return; // React act 警告は無視
  }
  originalWarn.apply(console, args);
};

// React Testing Library の act 警告も抑制
global.IS_REACT_ACT_ENVIRONMENT = true;

// React DevTools のメッセージも抑制
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
    value: {
      isDisabled: true,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    },
    writable: false,
    configurable: false,
  });
}

// SVGのモック
Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
});

// SVGとHTMLElementの属性取得をモック
Object.defineProperty(global.SVGElement.prototype, 'getBoundingClientRect', {
  value: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 }),
});

// SVG transform 属性モック
Object.defineProperty(global.SVGElement.prototype, 'transform', {
  value: {
    baseVal: {
      numberOfItems: 0,
      getItem: vi.fn(),
      createSVGTransformFromMatrix: vi.fn(),
      appendItem: vi.fn(),
      replaceItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    animVal: {
      numberOfItems: 0,
    }
  },
  writable: true,
});

// D3のtransformパースエラー対策
global.SVGAnimatedTransformList = global.SVGAnimatedTransformList || class {
  baseVal = {
    numberOfItems: 0,
    getItem: vi.fn(),
    createSVGTransformFromMatrix: vi.fn(),
    appendItem: vi.fn(),
    replaceItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  animVal = { numberOfItems: 0 };
};

// HTMLElementのモック
global.HTMLElement.prototype.scrollIntoView = vi.fn();

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});