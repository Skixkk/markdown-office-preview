<!--
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-07 01:05:10
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-07 01:27:12
 * @FilePath: \markdown-office-preview\markdown-office-preview-extension-dev-quickstart.md
 * @Description: markdown-office-preview-extension-dev-quickstart
-->

# markdown\-office\-preview\-extension\-dev\-quickstart\.md

Welcome to your Markdown Office Preview VS Code Extension

## What's in the folder

This folder contains all source files for the `markdown‑office‑preview` extension.

- **`package.json`** — Extension manifest file, declares commands, contribution configurations, activation events, editor toolbar icons and marketplace metadata.
  - Defines extension commands, configuration properties, and UI contributions. VS‑Code reads this manifest before the extension gets activated.

- **`src/extension.ts`** — Extension entry‑point source file.
  - Exports `activate()` function, invoked by VS Code when this extension gets activated.
  - Registers commands, editor toolbar icons, preview provider and all business logic.
  - `deactivate()` will run on extension unload / VS Code shutdown.

- **`src/mdOfficeProvider.ts`** — PDF preview webview provider implementation, contains pdf.js rendering, mouse‑wheel zoom and third‑party‑viewer fallback logic.

- **`esbuild.js`** — Esbuild bundler script, compiles TypeScript and copies pdf.js static assets into `dist/`.

- **`dist/`** — Build output directory, contains bundled extension javascript and static pdf.js resources.

- **`README.md` / `README.zh.md`** — English and Chinese project documentation.

## Setup development environment

1. Run `npm install` to install all npm dependencies.
2. Install recommended VS Code extensions for development:
   - `amodio.tsl‑problem‑matcher`
   - `ms‑vscode.extension‑test‑runner`
   - `dbaeumer.vscode‑eslint`

## Get up and running straight away

1. Press `F5` to launch **Extension Development Host** new VS Code window, extension will be loaded.
2. Open a markdown `.md` file inside the debug window.
3. Trigger preview:
   - Click editor title‑bar preview icon;
   - Or open command palette `Ctrl+Shift+P` / `Cmd+Shift+P` and run command `Open Pandoc Word Preview(PDF)`.
4. Set breakpoints inside source `.ts` files for debugging.
5. Check runtime logs from Debug Console and `Markdown‑Office‑Preview` output panel.

## Make code changes

1. After modifying TypeScript source files, trigger rebuild:
   - Run build task `npm run build`; or keep watch task `npm run watch` running for incremental build.
2. Reload debug extension host window: press `Ctrl+R` / `Cmd+R` inside debug VS‑Code window to apply updated bundle.

## Explore VS Code API

Full VS Code API type definitions:
`node_modules/@types/vscode/index.d.ts`

## Run unit & e2e tests

1. Install extension: `ms‑vscode.extension‑test‑runner` from marketplace.
2. Start watch background task via `Tasks: Run Task`. Tests will not be discovered without this watch process.
3. Switch to Testing sidebar view, click `Run Test` button or shortcut `Ctrl/Cmd + ; A`.
4. View test outputs inside `Test Results` panel.
5. Test files naming convention: `**/*.test.ts` under `src/test/`. You can organize test files with sub‑folders.

## Go further

- [Bundle & optimize extension](https://code.visualstudio.com/api/working‑with‑extensions/bundling‑extension)
- [Publish to VS Code Marketplace](https://code.visualstudio.com/api/working‑with‑extensions/publishing‑extension)
- [Setup CI/CD automated build workflow](https://code.visualstudio.com/api/working‑with‑extensions/continuous‑integration)

> Notice: This extension depends on external binary tools: **Pandoc** and **LibreOffice**, they are NOT bundled inside extension package. End‑users need to install them separately.
