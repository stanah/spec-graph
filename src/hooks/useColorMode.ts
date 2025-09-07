import { useState, useEffect } from 'react';

export type ColorMode = 'light' | 'dark' | 'auto';

/**
 * カラーモード管理フック
 * VSCode拡張用のカラーモードを管理する
 */
export const useColorMode = () => {
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    // VSCode環境では初期値をautoに設定
    return 'auto';
  });

  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // システムのカラーモード検知
  useEffect(() => {
    const updateResolvedMode = () => {
      if (colorMode === 'auto') {
        // VSCodeのテーマ情報を取得
        const vscodeTheme = document.body.getAttribute('data-vscode-theme-kind');
        const isVSCodeDark = vscodeTheme?.includes('dark') || vscodeTheme?.includes('high-contrast');
        
        if (isVSCodeDark) {
          setResolvedMode('dark');
        } else {
          // システムのprefers-color-schemeも確認
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setResolvedMode(prefersDark ? 'dark' : 'light');
        }
      } else {
        setResolvedMode(colorMode);
      }
    };

    updateResolvedMode();

    // VSCodeのテーマ変更を監視
    const observer = new MutationObserver(() => {
      updateResolvedMode();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind', 'class']
    });

    // システムのカラーモード変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (colorMode === 'auto') {
        updateResolvedMode();
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [colorMode]);

  // body要素にカラーモードのクラスを適用
  useEffect(() => {
    document.body.setAttribute('data-color-mode', resolvedMode);
    document.body.classList.toggle('light-mode', resolvedMode === 'light');
    document.body.classList.toggle('dark-mode', resolvedMode === 'dark');
  }, [resolvedMode]);

  return {
    colorMode,
    setColorMode,
    resolvedMode,
    isDark: resolvedMode === 'dark'
  };
};