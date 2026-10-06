<!--
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-07 01:05:10
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-07 01:08:42
 * @FilePath: \markdown-office-preview\README.md
 * @Description: markdown-office-preview README
-->

# Markdown Office Preview

> **A VS Code extension for professional Markdown office document preview**

[中文文档](./README.zh.md)

Convert Markdown files to standardized Word (.docx) and PDF documents in one click, powered by **Pandoc** and **LibreOffice**.
Provides real‑time debounced preview and official document style template support, perfectly adapted for thesis, official documents and daily office writing.

## ✨ Features

- **One‑click Office Preview**: Auto convert MD → DOCX (Pandoc) → PDF (LibreOffice) and render in VS Code webview panel
- **Real‑time Auto Refresh**: Debounced automatic re‑conversion and preview update when editing Markdown files
- **Custom Office Template**: Support custom reference DOCX templates to fix official document / thesis styles
- **Flexible Configuration**: Customize binary paths, Pandoc extra parameters, auto‑overwrite rules and debounce delay
- **User‑friendly Prompt**: Complete error prompts and output log records for quick troubleshooting
- **File Overwrite Confirmation**: Safe file coverage mechanism to prevent accidental file overwriting
- **Editor Toolbar Button**: Add preview icon on markdown editor title bar for one‑click preview launch
- **Third‑party PDF Viewer Fallback**: Auto‑detect installed PDF viewer extensions. Prefer using LaTeX‑Workshop or vscode‑pdf viewer if available; use built‑in pdf.js viewer as fallback
- **Mouse‑wheel Zoom**: Native pdf.js preview supports mouse‑wheel zoom, zoom range limited from 0.3x to 3.0x

## 📋 System Requirements

This extension relies on two third‑party tools, please install them first:

1. **Pandoc**
   - [Download](https://pandoc.org/installing.html)
   - Used for converting Markdown to standard Word DOCX files
2. **LibreOffice**
   - [Download](https://www.libreoffice.org/download/download/)
   - Used for converting DOCX files to standard PDF preview files
     You can either add the above tools to system `PATH` or manually configure their executable paths in VS Code
     settings.

## 🚀 How to Use

1. Open any `.md` file in VS Code
2. Method 1: Click the preview icon on editor title bar to open PDF preview
3. Method 2: Open command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. Search and run command: **Open Pandoc Word Preview(PDF)**
5. A preview panel will open on the right side:
   - If `LaTeX‑Workshop` or `vscode‑pdf` extension is detected, reuse its PDF viewer
   - If no third‑party PDF viewer available, open built‑in pdf.js webview preview, scroll mouse‑wheel to zoom in/out
6. Edit your Markdown content, the preview will auto‑refresh after debounce delay

## ⚙️ Extension Settings

This extension contributes the following settings under `markdown-office-preview`:

- `mdPandocWordPreview.pandocPath`: Custom Pandoc executable file path. Auto uses system PATH if empty.
- `mdPandocWordPreview.sofficePath`: Custom LibreOffice soffice.exe path. Windows example:
  `C:\\Program Files\\LibreOffice\\program\\soffice.exe`
- `mdPandocWordPreview.referenceDocPath`: Custom Word template DOCX path, used for fixed official document styles.
- `mdPandocWordPreview.pandocExtraArgs`: Extra Pandoc command parameters, e.g. reference format, layout rules.
- `mdPandocWordPreview.debounceMs`: Edit debounce delay (default: 800ms), avoid frequent conversion.
- `mdPandocWordPreview.autoOverwrite`: Auto overwrite existing DOCX/PDF files (default: false, pop confirm dialog).

## 📝 Workflow Principle

Markdown File → **Pandoc** (Render to styled DOCX) → **LibreOffice** (Export to PDF) → PDF Viewer (Third‑party extension or built‑in pdf.js Webview)

## 🐛 Known Issues & Solutions

- **Command not found**: Confirm Pandoc & LibreOffice are installed and correctly configured in settings.
- **Conversion failed**: Check output panel `Markdown‑Office‑Preview` for detailed error logs.
- **Preview not updated**: Ensure the preview panel is not closed, modify debounce time if needed.
- **Built‑in pdf.js performance**: Large multi‑page documents may lag on zoom operations, caused by full‑page re‑rendering.

## 📌 Release Notes

### 0.0.1

- Initial release of Markdown Office Preview extension
- Implement MD → DOCX → PDF full conversion workflow
- Support custom template, extra command parameters and file overwrite confirmation
- Add debounce auto‑refresh and dedicated output log panel
- Complete configuration items for personalized customization
- Add editor title toolbar icon, click icon to quickly open PDF preview panel
- Add third‑party PDF viewer fallback logic (LaTeX‑Workshop / vscode‑pdf detection)
- Implement mouse‑wheel zoom for built‑in pdf.js preview (0.3x‑3.0x zoom range)

## 📄 License

MIT License
Enjoy writing with Markdown & Office standard preview!
