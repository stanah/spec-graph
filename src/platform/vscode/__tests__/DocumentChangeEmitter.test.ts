import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { DocumentChangeEmitter, DocumentChangeEmitterFactory, type DocumentChangeListener } from '../DocumentChangeEmitter';
import type { FileUri } from '../../../core/ViewSwitcher';

// VSCode APIのモック
const mockVSCodeApi = {
  postMessage: vi.fn(),
  setState: vi.fn(),
  getState: vi.fn()
};

// VSCodePlatformAdapterのモック
vi.mock('../VSCodePlatformAdapter', () => ({
  VSCodePlatformAdapter: {
    getVSCodeApi: () => mockVSCodeApi
  }
}));

describe('DocumentChangeEmitter', () => {
  let emitter: DocumentChangeEmitter;
  let testUri: FileUri;

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new DocumentChangeEmitter();
    testUri = { fsPath: '/test/sample.mindmap' };
  });

  afterEach(() => {
    if (emitter && !emitter.getState().disposed) {
      emitter.dispose();
    }
  });

  describe('constructor and initialization', () => {
    it('should initialize with VSCode integration', () => {
      // Assert
      const state = emitter.getState();
      expect(state.hasVSCodeIntegration).toBe(true);
      expect(state.disposed).toBe(false);
      expect(state.listenerCount).toBe(0);
      expect(state.emitterId).toMatch(/^docChangeEmitter_\d+_[a-z0-9]+$/);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'createDocumentChangeEmitter',
        emitterId: state.emitterId
      });
    });

    it('should initialize without VSCode integration', () => {
      // Arrange - Mock VSCodePlatformAdapter to return null
      vi.doMock('../VSCodePlatformAdapter', () => ({
        VSCodePlatformAdapter: {
          getVSCodeApi: () => null
        }
      }));

      // Act
      const browserEmitter = new DocumentChangeEmitter();
      const state = browserEmitter.getState();

      // Assert
      expect(state.hasVSCodeIntegration).toBe(false);

      browserEmitter.dispose();
    });

    it('should generate unique emitter IDs', () => {
      // Act
      const emitter2 = new DocumentChangeEmitter();
      const emitter3 = new DocumentChangeEmitter();

      // Assert
      const id1 = emitter.getEmitterId();
      const id2 = emitter2.getEmitterId();
      const id3 = emitter3.getEmitterId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      emitter2.dispose();
      emitter3.dispose();
    });
  });

  describe('fire method', () => {
    it('should fire event to VSCode and local listeners', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      // Act
      emitter.fire(testUri);

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'fireDocumentChange',
        emitterId: emitter.getEmitterId(),
        uri: testUri.fsPath
      });

      expect(mockListener).toHaveBeenCalledWith(testUri);
    });

    it('should not fire when disposed', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);
      emitter.dispose();

      // Act
      emitter.fire(testUri);

      // Assert
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      // Arrange
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const successListener = vi.fn();

      emitter.onDidChange(errorListener);
      emitter.onDidChange(successListener);

      // Act & Assert - Should not throw
      expect(() => {
        emitter.fire(testUri);
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalledWith(testUri);
      expect(successListener).toHaveBeenCalledWith(testUri);
    });

    it('should handle VSCode API errors gracefully', () => {
      // Arrange
      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation(() => {
        throw new Error('VSCode API error');
      });

      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      // Act & Assert - Should not throw
      expect(() => {
        emitter.fire(testUri);
      }).not.toThrow();

      expect(mockListener).toHaveBeenCalledWith(testUri);
    });
  });

  describe('onDidChange method', () => {
    it('should add and remove listeners correctly', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Act
      const disposable1 = emitter.onDidChange(listener1);
      const disposable2 = emitter.onDidChange(listener2);

      // Assert
      expect(emitter.getListenerCount()).toBe(2);

      emitter.fire(testUri);
      expect(listener1).toHaveBeenCalledWith(testUri);
      expect(listener2).toHaveBeenCalledWith(testUri);

      // Act - Remove one listener
      disposable1.dispose();

      // Assert
      expect(emitter.getListenerCount()).toBe(1);

      vi.clearAllMocks();
      emitter.fire(testUri);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(testUri);

      // Cleanup
      disposable2.dispose();
    });

    it('should not add listeners when disposed', () => {
      // Arrange
      emitter.dispose();
      const listener = vi.fn();

      // Act
      const disposable = emitter.onDidChange(listener);

      // Assert
      expect(emitter.getListenerCount()).toBe(0);

      // Disposable should be safe to call
      expect(() => disposable.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls safely', () => {
      // Arrange
      const listener = vi.fn();
      const disposable = emitter.onDidChange(listener);

      // Act & Assert - Multiple dispose calls should not throw
      expect(() => {
        disposable.dispose();
        disposable.dispose();
        disposable.dispose();
      }).not.toThrow();

      expect(emitter.getListenerCount()).toBe(0);
    });
  });

  describe('fireMultiple method', () => {
    it('should fire multiple events', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      const uris: FileUri[] = [
        { fsPath: '/test/file1.mindmap' },
        { fsPath: '/test/file2.json' },
        { fsPath: '/test/file3.md' }
      ];

      // Act
      emitter.fireMultiple(uris);

      // Assert
      expect(mockListener).toHaveBeenCalledTimes(3);
      expect(mockListener).toHaveBeenNthCalledWith(1, uris[0]);
      expect(mockListener).toHaveBeenNthCalledWith(2, uris[1]);
      expect(mockListener).toHaveBeenNthCalledWith(3, uris[2]);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(3);
    });

    it('should not fire when disposed', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);
      emitter.dispose();

      const uris: FileUri[] = [{ fsPath: '/test/file.mindmap' }];

      // Act
      emitter.fireMultiple(uris);

      // Assert
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('fireDebounced method', () => {
    it('should debounce repeated events', async () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      // Act
      emitter.fireDebounced(testUri, 50);
      emitter.fireDebounced(testUri, 50);
      emitter.fireDebounced(testUri, 50);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(testUri);
    });

    it('should handle different URIs separately', async () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      const uri1 = { fsPath: '/test/file1.mindmap' };
      const uri2 = { fsPath: '/test/file2.mindmap' };

      // Act
      emitter.fireDebounced(uri1, 50);
      emitter.fireDebounced(uri2, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(mockListener).toHaveBeenCalledTimes(2);
      expect(mockListener).toHaveBeenCalledWith(uri1);
      expect(mockListener).toHaveBeenCalledWith(uri2);
    });

    it('should not fire when disposed during debounce', async () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      // Act
      emitter.fireDebounced(testUri, 50);
      emitter.dispose();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('fireConditional method', () => {
    it('should fire when condition returns true', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      const condition = vi.fn().mockReturnValue(true);

      // Act
      emitter.fireConditional(testUri, condition);

      // Assert
      expect(condition).toHaveBeenCalledWith(testUri);
      expect(mockListener).toHaveBeenCalledWith(testUri);
    });

    it('should not fire when condition returns false', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      const condition = vi.fn().mockReturnValue(false);

      // Act
      emitter.fireConditional(testUri, condition);

      // Assert
      expect(condition).toHaveBeenCalledWith(testUri);
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle condition errors gracefully', () => {
      // Arrange
      const mockListener = vi.fn();
      emitter.onDidChange(mockListener);

      const errorCondition = vi.fn().mockImplementation(() => {
        throw new Error('Condition error');
      });

      // Act & Assert - Should not throw
      expect(() => {
        emitter.fireConditional(testUri, errorCondition);
      }).not.toThrow();

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should clear all listeners', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.onDidChange(listener1);
      emitter.onDidChange(listener2);

      expect(emitter.getListenerCount()).toBe(2);

      // Act
      emitter.clearListeners();

      // Assert
      expect(emitter.getListenerCount()).toBe(0);

      emitter.fire(testUri);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should return availability status', () => {
      // Assert
      expect(emitter.isAvailable()).toBe(true);

      // Act
      emitter.dispose();

      // Assert
      expect(emitter.isAvailable()).toBe(false);
    });

    it('should clone emitter with listeners', () => {
      // Arrange
      const listener = vi.fn();
      emitter.onDidChange(listener);

      // Act
      const clone = emitter.clone();

      // Assert
      expect(clone.getListenerCount()).toBe(1);
      expect(clone.getEmitterId()).not.toBe(emitter.getEmitterId());

      clone.fire(testUri);
      expect(listener).toHaveBeenCalledWith(testUri);

      clone.dispose();
    });

    it('should provide state information', () => {
      // Arrange
      emitter.onDidChange(() => {});

      // Act
      const state = emitter.getState();

      // Assert
      expect(state).toEqual({
        emitterId: expect.stringMatching(/^docChangeEmitter_\d+_[a-z0-9]+$/),
        listenerCount: 1,
        disposed: false,
        hasVSCodeIntegration: true
      });
    });
  });

  describe('dispose method', () => {
    it('should dispose all resources', () => {
      // Arrange
      const listener = vi.fn();
      emitter.onDidChange(listener);

      const emitterId = emitter.getEmitterId();

      // Act
      emitter.dispose();

      // Assert
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'disposeDocumentChangeEmitter',
        emitterId: emitterId
      });

      expect(emitter.getState().disposed).toBe(true);
      expect(emitter.getListenerCount()).toBe(0);
    });

    it('should handle multiple dispose calls safely', () => {
      // Act & Assert - Should not throw
      expect(() => {
        emitter.dispose();
        emitter.dispose();
        emitter.dispose();
      }).not.toThrow();

      expect(emitter.getState().disposed).toBe(true);
    });

    it('should clean up debounce timers', () => {
      // Arrange
      emitter.fireDebounced(testUri, 1000);

      // Act
      emitter.dispose();

      // Assert - Should not throw and timers should be cleared
      expect(() => {
        emitter.dispose();
      }).not.toThrow();
    });

    it('should handle VSCode disposal errors gracefully', () => {
      // Arrange
      (mockVSCodeApi.postMessage as MockedFunction<any>).mockImplementation(() => {
        throw new Error('VSCode disposal error');
      });

      // Act & Assert - Should not throw
      expect(() => {
        emitter.dispose();
      }).not.toThrow();
    });
  });
});

describe('DocumentChangeEmitterFactory', () => {
  afterEach(() => {
    DocumentChangeEmitterFactory.disposeAll();
  });

  describe('getOrCreate', () => {
    it('should create and return named emitters', () => {
      // Act
      const emitter1 = DocumentChangeEmitterFactory.getOrCreate('test1');
      const emitter2 = DocumentChangeEmitterFactory.getOrCreate('test2');
      const emitter1Again = DocumentChangeEmitterFactory.getOrCreate('test1');

      // Assert
      expect(emitter1).toBe(emitter1Again); // Same instance
      expect(emitter1).not.toBe(emitter2); // Different instances
    });

    it('should track instance names', () => {
      // Act
      DocumentChangeEmitterFactory.getOrCreate('emitter1');
      DocumentChangeEmitterFactory.getOrCreate('emitter2');

      // Assert
      const names = DocumentChangeEmitterFactory.getInstanceNames();
      expect(names).toContain('emitter1');
      expect(names).toContain('emitter2');
    });
  });

  describe('dispose', () => {
    it('should dispose specific named emitters', () => {
      // Arrange
      const emitter1 = DocumentChangeEmitterFactory.getOrCreate('test1');
      const emitter2 = DocumentChangeEmitterFactory.getOrCreate('test2');

      // Act
      DocumentChangeEmitterFactory.dispose('test1');

      // Assert
      expect(emitter1.getState().disposed).toBe(true);
      expect(emitter2.getState().disposed).toBe(false);

      const names = DocumentChangeEmitterFactory.getInstanceNames();
      expect(names).not.toContain('test1');
      expect(names).toContain('test2');
    });

    it('should handle disposing non-existent emitters safely', () => {
      // Act & Assert - Should not throw
      expect(() => {
        DocumentChangeEmitterFactory.dispose('non-existent');
      }).not.toThrow();
    });
  });

  describe('disposeAll', () => {
    it('should dispose all emitters', () => {
      // Arrange
      const emitter1 = DocumentChangeEmitterFactory.getOrCreate('test1');
      const emitter2 = DocumentChangeEmitterFactory.getOrCreate('test2');

      // Act
      DocumentChangeEmitterFactory.disposeAll();

      // Assert
      expect(emitter1.getState().disposed).toBe(true);
      expect(emitter2.getState().disposed).toBe(true);
      expect(DocumentChangeEmitterFactory.getInstanceNames()).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return factory statistics', () => {
      // Arrange
      DocumentChangeEmitterFactory.getOrCreate('active1');
      const emitter2 = DocumentChangeEmitterFactory.getOrCreate('active2');
      emitter2.dispose(); // Make one inactive

      // Act
      const stats = DocumentChangeEmitterFactory.getStatistics();

      // Assert
      expect(stats.totalInstances).toBe(2);
      expect(stats.activeInstances).toBe(1);
      expect(stats.instanceNames).toEqual(['active1', 'active2']);
    });
  });
});