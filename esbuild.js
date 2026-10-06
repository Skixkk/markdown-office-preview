/*
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-09-27 01:19:45
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-06 23:59:35
 * @FilePath: \markdown-office-preview\esbuild.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const esbuild = require("esbuild");
const fsExtra = require("fs-extra");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * filter: skip *.d.ts / *.d.mts type‑declaration files
 */
function skipTypeDeclarations(src) {
    return !(src.endsWith('.d.ts') || src.endsWith('.d.mts'));
}

/**
 * copy pdfjs‑dist static assets to dist/pdfjs
 */
async function copyPdfjsAssets() {
  try {
    await fsExtra.ensureDir("./dist/pdfjs");
    await fsExtra.copy(
      "./node_modules/pdfjs-dist/build",
      "./dist/pdfjs/build",
      { overwrite: true, filter: skipTypeDeclarations },
    );
    await fsExtra.copy("./node_modules/pdfjs-dist/web", "./dist/pdfjs/web", {
      overwrite: true,
      filter: skipTypeDeclarations
    });
    await fsExtra.copy(
      "./node_modules/pdfjs-dist/cmaps",
      "./dist/pdfjs/cmaps",
      { overwrite: true, filter: skipTypeDeclarations },
    );
  } catch (copyErr) {
    console.warn("[warning] pdfjs assets copy skipped:", copyErr.message);
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd(async (result) => {
      await copyPdfjsAssets();
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  // 开发F5(watch)模式：执行初始化拷贝，保证首次启动dist/pdfjs存在
  await copyPdfjsAssets();
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    // ✅ 增加 execa，标记为外部模块，不打包进扩展js
    external: ["vscode", "execa"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
