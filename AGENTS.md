# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source (core logic, hooks, stores, utils, schemas, React components). Entry: `src/index.ts`; VSCode webview app: `src/main.vscode.tsx`.
- `extension/`: VSCode extension (compiled to `extension/out`, loads webview from `extension/webview`).
- `mcp-server/`: MCP server (Node 18+) for mindmap operations and tooling.
- `docs/`: Additional documentation; `dist/`: build outputs (library and webview).

## Build, Test, and Development Commands
- `pnpm build`: Builds VSCode webview and extension bundle.
- `pnpm build:lib`: Builds the library with Vite (outputs to `dist/`).
- `pnpm build:vscode`: Builds webview + compiles extension artifacts.
- `pnpm build:vscode-package`: Produces `.vsix` via `scripts/build-vscode.sh`.
- `pnpm lint`: Runs ESLint across workspace.
- `pnpm test`: Runs library tests and extension tests.
- Examples:
  - Extension only: `pnpm test:vscode` or `cd extension && pnpm test:run`
  - MCP server: `cd mcp-server && pnpm build && pnpm test`

## Coding Style & Naming Conventions
- TypeScript (strict mode), 2-space indentation.
- React components: PascalCase files (`VSCodeApp.tsx`); modules/utilities: camelCase (`nodeHelpers.ts`).
- Variables/functions: camelCase; exported types/interfaces: PascalCase.
- Linting: ESLint with TypeScript, React Hooks rules. Key rules: no unused vars (prefix `_` to ignore), avoid `any` (warn), exhaustive deps (warn).

## Testing Guidelines
- Framework: Vitest (`jsdom`), coverage via `@vitest/coverage-v8`.
- Test locations: co-locate in `src/**/*.{test,spec}.{ts,tsx}`; extension tests under `extension/` (Vitest + VSCode runner).
- Setup: `src/test/setup.ts` auto-loaded.
- Commands: `pnpm test`, `pnpm test:run`, `pnpm test:coverage`, `pnpm test:vscode`.
- Target coverage: aim for 80%+ on new/changed code.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `cleanup:`, optional scope (e.g., `feat(extension): ...`).
- Messages: imperative, concise, describe user-visible impact. Link issues (`Closes #123`).
- PRs: clear description, checklist of changes, screenshots/GIFs for UI or webview changes, linked issues, and notes on testing/impact.
- CI must pass: lint + tests (root and `extension/`). Do not commit generated files (`dist/`, `extension/out/`).

## Security & Config Tips
- Node.js ≥ 18; use `pnpm` workspace as configured.
- Never commit secrets; if using `mcp-server`, manage env via `.env` (git-ignored).
- Keep schema and validation changes synchronized across `src/schemas` and extension.
