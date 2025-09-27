#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { collectFailedTestFiles } from '../src/utils/vitestFailureParser.js';

function runVitest(additionalArgs) {
  const vitestArgs = ['vitest', 'run', '--reporter=json', '--silent', ...additionalArgs];
  const result = spawnSync('pnpm', vitestArgs, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  return {
    json: result.stdout,
    status: typeof result.status === 'number' ? result.status : 1,
    stderr: result.stderr,
  };
}

function extractJsonPayload(output) {
  if (!output) return null;
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }
  return output.slice(firstBrace, lastBrace + 1);
}

function printResult(failedFiles) {
  if (failedFiles.length === 0) {
    console.log('失敗したテストファイルはありませんでした。');
    return;
  }
  console.log('失敗したテストファイル一覧:');
  for (const file of failedFiles) {
    console.log(`- ${file}`);
  }
}

function main() {
  const additionalArgs = process.argv.slice(2);
  const { json, status, stderr } = runVitest(additionalArgs);

  const payload = extractJsonPayload(json);
  if (!payload) {
    console.error('テスト結果のJSONを取得できませんでした。');
    if (stderr && stderr.trim()) {
      console.error(stderr.trim());
    }
    process.exitCode = status;
    return;
  }

  const failedFiles = collectFailedTestFiles(payload);
  printResult(failedFiles);

  process.exitCode = status;
}

main();
