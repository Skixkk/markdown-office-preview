/*
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-02 22:42:03
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-06 17:53:37
 * @FilePath: \markdown-office-preview\src\extension.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as vscode from 'vscode';
import { MdOfficePreviewProvider } from './mdOfficeProvider';
import { buildMdToPdf } from './converter';
import { tryOpenThirdPartyPdfViewer } from './thirdPartyViewer';
let outputChannel: vscode.OutputChannel;
let previewProvider: MdOfficePreviewProvider;
let debounceTimer: NodeJS.Timeout | null = null;
export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('Markdown‑Office‑Preview');
    context.subscriptions.push(outputChannel);
    const extensionRoot = vscode.Uri.file(context.extensionPath);
    previewProvider = new MdOfficePreviewProvider(extensionRoot);
    // 注册预览命令
    const openPreviewCmd = vscode.commands.registerCommand(
        'md-pandoc-word-preview.openPreview',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'markdown') {
                vscode.window.showWarningMessage('请先打开markdown文档');
                return;
            }
            const mdUri = editor.document.uri;
            // 调用buildMdToPdf生成同名pdf，并等待生成完成
            const pdfUri = await buildMdToPdf(mdUri, outputChannel);
            // 生成成功后再进入预览流程，避免打开未生成或旧pdf
            if (!pdfUri) {
                return;
            }
            // 调用vscode-pdf或LaTeX Workshop等第三方预览
            const useThird = await tryOpenThirdPartyPdfViewer(pdfUri);
            if (useThird) {
                return;
            }
            // 第三方不可用时降级到内置webview预览
            let preview = previewProvider.getPreviewByMdUri(mdUri);
            if (preview) {
                // 调用公开封装方法，禁止直接访问private webviewPanel
                preview.revealPanel();
                preview.updatePdfUri(pdfUri);
            } else {
                preview = previewProvider.createPreview(mdUri, pdfUri, vscode.ViewColumn.Two);
            }
        }
    );
    context.subscriptions.push(openPreviewCmd);
    // 文本编辑防抖更新
    vscode.workspace.onDidChangeTextDocument((docEvent) => {
        if (docEvent.document.languageId !== 'markdown') {return;}
        const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
        const debounceMs = config.get<number>('debounceMs', 800);
        if (debounceTimer) {clearTimeout(debounceTimer);}
        debounceTimer = setTimeout(async () => {
            const mdUri = docEvent.document.uri;
            const preview = previewProvider.getPreviewByMdUri(mdUri);
            if (!preview) {return;}
            const newPdfUri = await buildMdToPdf(mdUri, outputChannel);
            if (newPdfUri) {
                preview.updatePdfUri(newPdfUri);
            }
        }, debounceMs);
    }, undefined, context.subscriptions);
}
export function deactivate(): void {
    if (debounceTimer) {clearTimeout(debounceTimer);}
    previewProvider?.disposeAll();
}
