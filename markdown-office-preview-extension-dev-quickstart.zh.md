<!--
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-07 01:25:18
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-07 01:27:29
 * @FilePath: \markdown-office-preview\markdown-office-preview-extension-dev-quickstart.zh.md
 * @Description: markdown-office-preview-extension-dev-quickstart.zh
-->
# markdown\-office\-preview\-extension\-dev\-quickstart\.zh\.md

## 欢迎使用 VS Code 插件开发指南

本文档为 **markdown\-office\-preview** 插件的开发快速入门说明，介绍项目目录结构、开发调试方式、构建与测试流程。

## 项目目录说明

该目录包含 VS Code 插件运行所需的所有核心文件：

- **package\.json**：插件清单主配置文件

  - 声明插件命令、配置项、激活事件、工具栏图标、市场展示信息

  - VS Code 会优先读取该文件，无需加载代码即可注册 UI 和命令

- **src/extension\.ts**：插件入口文件

  - 包含 `activate` / `deactivate` 生命周期

  - 注册所有命令、预览服务、事件监听、初始化逻辑

- **src/mdOfficeProvider\.ts**：PDF 预览核心逻辑

  - 实现 webview 预览、pdf\.js 渲染、滚轮缩放、第三方预览器降级逻辑

- **esbuild\.js**：项目构建脚本

  - 编译 TS、打包插件代码、自动复制 pdfjs 静态资源至 dist

- **dist/**：最终编译输出目录

  - 包含打包后的 extension\.js 与 pdfjs 运行资源

## 开发环境准备

推荐安装以下开发插件，保证代码规范、错误检测与测试正常运行：

- `amodio.tsl-problem-matcher`

- `ms-vscode.extension-test-runner`

- `dbaeumer.vscode-eslint`

执行依赖安装：`npm install`

## 快速调试运行

1. 按 **F5** 启动「扩展开发窗口」

2. 打开任意 Markdown 文件

3. 通过顶部图标或命令面板 `Ctrl+Shift+P` 执行预览命令

4. 可在 TS 代码中打断点调试，日志输出在「调试控制台」

## 修改代码与热更新

- 修改源码后，运行 `npm run watch` 实时增量构建

- 调试窗口按 `Ctrl+R` 重载插件即可生效

## 查看 VS Code 完整 API

所有插件类型定义与 API 说明：

`node_modules/@types/vscode/index.d.ts`

## 运行测试

1. 安装官方测试插件：**Extension Test Runner**

2. 运行任务：`Tasks: Run Task > watch`

3. 打开左侧「测试」面板，点击运行测试或快捷键 `Ctrl/Cmd + ; A`

4. 测试文件规则：`**/*.test.ts`

## 进阶开发

- [插件打包优化](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)：减小体积、提升启动速度

- [发布插件至应用市场](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

- [配置 CI/CD 自动构建](https://code.visualstudio.com/api/working-with-extensions/continuous-integration)

## 重要说明

本插件依赖 **Pandoc**、**LibreOffice** 外部程序，不会随插件打包，使用者需要自行安装并配置路径。

> （注：部分内容由豆包工作 AI 生成）
