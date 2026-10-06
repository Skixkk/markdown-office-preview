<!--
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-09-27 01:19:45
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-06 13:16:36
 * @FilePath: \markdown-office-preview\CHANGELOG.md
 * @Description: changed && TODO
-->

# Change Log

All notable changes to the "markdown-office-preview" extension will be documented in this file.
Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.2]

### ✨ Features

- 支持优先复用第三方PDF预览插件，优先级：`LaTeX‑Workshop` > `tomoki1207/pdfviewer` > 插件内置Webview预览
- 新增配置项 `mdPandocWordPreview.preferThirdPartyViewer`，可关闭第三方复用，强制使用内置预览面板
- 调用第三方插件公开命令，内部异常自动降级回退至自身预览逻辑，保证健壮性
- 第三方预览接管渲染时，仍然完整保留 MD → DOCX → PDF 转换与文件监听实时更新能力

### 📝 Configurations

- `mdPandocWordPreview.preferThirdPartyViewer`: `boolean`，默认 `true`，优先使用已安装第三方PDF查看器

## [0.0.1]

- 完整实现 MD → DOCX → PDF 转换链路
- 支持自定义模板、扩展参数、文件覆写确认
- 编辑防抖自动刷新，独立日志输出面板
- 全部配置项支持个性化调整
- 新增编辑器标题栏工具栏图标，点击快速打开PDF预览面板

## [0.0.1‑TODO]

> Reserved for future planning items

- Initial release backlog

1. 优先检测是否安装 `tomoki1207/vscode-pdf`
2. 其次检测是否安装 `James-Yu/LaTeX-Workshop`
3. 都没有，则使用我们自己 webview 预览

### 打包优化

VS Code 扩展打包 `vsce package` 时，`node_modules` 体积很大，`pdfjs-dist` 会增大插件包。
`tomoki1207/vscode-pdfviewer` 有另一种方案：**把 pdfjs 的静态 js 文件放到项目 `resources/pdfjs/`，不通过 pnpm 安装依赖**。
如果你后续想切换这个无依赖方案，我可以给你对应的 webview html 代码。
