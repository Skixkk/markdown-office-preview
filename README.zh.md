<!--
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-04 23:28:29
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-04 23:54:55
 * @FilePath: \markdown-office-preview\README.zh.md
 * @Description: Chinese README
-->

# Markdown Office Preview

> **VS Code 插件：专业 Markdown 办公文档预览工具**
> 基于 Pandoc + LibreOffice，一键将 Markdown 转换为标准 Word（docx）与 PDF 文档。
> 支持防抖实时预览、公文模板样式，非常适合撰写公文、论文以及日常办公文档写作。

## ✨ 功能特性

- **一键办公预览**：自动执行 MD → DOCX(Pandoc) → PDF(LibreOffice)，在 VS Code Webview 面板直接预览 PDF
- **实时自动刷新**：编辑 Markdown 文件后，防抖自动重转换并更新预览面板
- **自定义 Word 模板**：可指定参考 DOCX 模板，固定公文、论文格式样式
- **灵活参数配置**：自定义程序路径、Pandoc 扩展参数、文件覆写规则、防抖时间
- **友好提示与日志**：完整错误提示，内置输出日志面板，方便排查转换异常
- **安全覆写确认**：提供文件覆盖保护机制，防止误操作覆盖已有文档
- **编辑器工具栏按钮**：Markdown 编辑器标题栏增加预览图标，点击快速唤起PDF预览面板

## 📋 系统依赖

插件依赖两款第三方工具，请提前安装：

1. **Pandoc**
    - [下载地址](https://pandoc.org/installing.html)
    - 作用：将 Markdown 转换为 Word DOCX 文档
2. **LibreOffice**
    - [下载地址](https://www.libreoffice.org/download/download/)
    - 作用：把 DOCX 导出为标准 PDF 文件
      可以将程序加入系统环境变量 PATH，也可以直接在 VS Code 设置里手动指定可执行文件路径。

## 🚀 使用方法

1. 在 VS Code 打开任意 `.md` 文件
2. 方式一：直接点击编辑器标题栏预览图标，打开PDF预览
3. 方式二：调出命令面板 `Ctrl+Shift+P`（Mac：`Cmd+Shift+P`）
4. 搜索并执行命令：**Open Pandoc Word Preview(PDF)**
5. 右侧打开预览面板，自动生成并展示 PDF
6. 修改 Markdown 内容，等待防抖延时后预览自动刷新

## ⚙️ 插件配置项

配置项命名空间：`markdown‑office‑preview`

- `mdPandocWordPreview.pandocPath`：Pandoc 程序路径，留空自动读取系统 PATH
- `mdPandocWordPreview.sofficePath`：LibreOffice soffice.exe 路径；Windows示例：
  `C:\\Program Files\\LibreOffice\\program\\soffice.exe`
- `mdPandocWordPreview.referenceDocPath`：自定义 Word 模板 DOCX 路径，用于固定公文样式
- `mdPandocWordPreview.pandocExtraArgs`：Pandoc 额外命令参数，用于控制版式、引用格式等
- `mdPandocWordPreview.debounceMs`：编辑防抖延时，默认 800ms，避免频繁执行转换
- `mdPandocWordPreview.autoOverwrite`：是否自动覆写已存在的 DOCX/PDF，默认关闭（弹出确认框）

## 📝 工作流程

Markdown源文件 → **Pandoc**（生成带样式DOCX） → **LibreOffice**（导出PDF） → **VS Code Webview**（实时预览）

## 🐛 常见问题与排查

- **提示命令找不到**：确认 Pandoc、LibreOffice 已安装，路径配置正确
- **转换失败**：查看输出面板 `Markdown‑Office‑Preview`，阅读详细错误日志
- **预览不更新**：确认预览面板未关闭，可适当调整防抖延时参数

## 📌 更新日志

### 0.0.1

- 插件首次发布
- 完整实现 MD → DOCX → PDF 转换链路
- 支持自定义模板、扩展参数、文件覆写确认
- 编辑防抖自动刷新，独立日志输出面板
- 全部配置项支持个性化调整
- 新增编辑器标题栏工具栏图标，点击快速打开PDF预览面板

## 📄 许可证

MIT License
> 使用 Markdown，轻松写出符合办公规范的文档 ✍️
