/*
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-06 16:26:12
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-06 16:27:03
 * @FilePath: \markdown-office-preview\src\thirdPartyViewer.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as vscode from 'vscode';

/**
 * 优先顺序 LaTeX‑Workshop > tomoki1207.pdf
 * @returns true 成功唤起第三方预览；false 使用内置预览
 */
export async function tryOpenThirdPartyPdfViewer(pdfUri: vscode.Uri): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
    const preferThirdParty = config.get<boolean>('preferThirdPartyViewer', true);
    if (!preferThirdParty) {return false;}

    const extLatex = vscode.extensions.getExtension('james-yu.latex-workshop');
    const extTomoki = vscode.extensions.getExtension('tomoki1207.pdf');

    // 两个插件同时激活，冲突
    if (extLatex?.isActive && extTomoki?.isActive) {
        await vscode.window.showWarningMessage(
            'LaTeX‑Workshop 与 tomoki1207.pdf 存在PDF编辑器冲突，使用插件内置预览'
        );
        return false;
    }

    if (extLatex) {
        if (!extLatex.isActive) {await extLatex.activate();}
        try {
            await vscode.commands.executeCommand('latex-workshop.viewer.viewPdf', pdfUri);
            return true;
        } catch { /* noop */ }
    }

    if (extTomoki) {
        if (!extTomoki.isActive) {await extTomoki.activate();}
        try {
            await vscode.commands.executeCommand('pdf.openPdf', pdfUri);
            return true;
        } catch { /* noop */ }
    }
    return false;
}
