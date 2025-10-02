//@ts-check

'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode拡張はNode.js環境で動作

  entry: './src/extension.ts', // エントリポイント
  output: {
    // バンドルをextension.jsに出力
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode' // vscode-moduleは外部化
  },
  resolve: {
    // TypeScriptとJavaScriptファイルを解決
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                skipLibCheck: true
              }
            }
          }
        ]
      }
    ]
  }
};

module.exports = config;