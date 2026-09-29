import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';

let previewPanel: vscode.WebviewPanel | undefined;
let debounceTimer: NodeJS.Timeout | null = null;
let outputChannel: vscode.OutputChannel;

/**
 * Type guard for execa runtime error
 */
function isExecaError(err: unknown): err is { stderr?: string; message: string; failed: boolean } {
    return typeof err === 'object' && err !== null && 'failed' in err;
}

/**
 * Resolve executable path: user config path first, fallback to PATH lookup
 */
async function resolveExecutable(configPath: string, binName: string): Promise<string> {
    if (configPath && fs.existsSync(configPath)) {
        outputChannel.appendLine(`[resolveExecutable] use configured path: ${configPath}`);
        return configPath;
    }
    try {
        const { execa } = await import('execa');
        await execa(binName, ['--version']);
        outputChannel.appendLine(`[resolveExecutable] found in PATH: ${binName}`);
        return binName;
    } catch {
        outputChannel.appendLine(`[resolveExecutable] not found: ${binName}`);
        return '';
    }
}

async function buildPdfPreview(mdUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');

    const pandocConfigPath = config.get<string>('pandocPath', '');
    const sofficeConfigPath = config.get<string>('sofficePath', '');
    const referenceDocPath = config.get<string>('referenceDocPath', '');
    const pandocExtraArgsRaw = config.get<string>('pandocExtraArgs', '');
    const autoOverwrite = config.get<boolean>('autoOverwrite', false);

    const pandocPath = await resolveExecutable(pandocConfigPath, 'pandoc');
    const sofficePath = await resolveExecutable(sofficeConfigPath, 'soffice');

    if (!pandocPath) {
        vscode.window.showErrorMessage('pandoc 未找到，请检查 mdPandocWordPreview.pandocPath 配置或安装 pandoc');
        return;
    }
    if (!sofficePath) {
        vscode.window.showErrorMessage('LibreOffice soffice 未找到，请检查 mdPandocWordPreview.sofficePath 配置');
        return;
    }

    const mdFilePath = mdUri.fsPath;
    const baseName = path.basename(mdFilePath, '.md');
    const dir = path.dirname(mdFilePath);
    const docxPath = path.join(dir, `${baseName}.docx`);
    const pdfPath = path.join(dir, `${baseName}.pdf`);

    // overwrite confirm dialog
    if (!autoOverwrite) {
        if (fs.existsSync(docxPath) || fs.existsSync(pdfPath)) {
            const select = await vscode.window.showWarningMessage(
                `目标文件 ${baseName}.docx / ${baseName}.pdf 已存在，是否覆盖？`,
                { modal: true },
                '覆盖',
                '取消'
            );
            if (select !== '覆盖') {
                outputChannel.appendLine('[buildPdfPreview] user cancelled overwrite');
                return;
            }
        }
    }

    const pandocArgs: string[] = [mdFilePath, '-o', docxPath];
    if (referenceDocPath && fs.existsSync(referenceDocPath)) {
        pandocArgs.push('--reference-doc', referenceDocPath);
    }
    if (pandocExtraArgsRaw.trim()) {
        const extraList = pandocExtraArgsRaw.trim().split(/\s+/);
        pandocArgs.push(...extraList);
    }

    const { execa } = await import('execa');
    outputChannel.appendLine(`\n[pandoc] run: ${pandocPath} ${pandocArgs.join(' ')}`);

    try {
        await execa(pandocPath, pandocArgs);
        vscode.window.showInformationMessage(`Pandoc 已生成 ${baseName}.docx`);
        outputChannel.appendLine(`[pandoc] success, output: ${docxPath}`);
    } catch (err) {
        let msg = '';
        if (isExecaError(err)) {
            msg = err.stderr ?? err.message;
        } else if (err instanceof Error) {
            msg = err.message;
        } else {
            msg = String(err);
        }
        outputChannel.appendLine(`[pandoc] error: ${msg}`);
        vscode.window.showErrorMessage(`Pandoc 转换失败：${msg}`);
        return;
    }

    outputChannel.appendLine(`[soffice] converting docx to pdf: ${sofficePath}`);
    try {
        await execa(sofficePath, [
            '--headless',
            '--convert-to',
            'pdf',
            '--outdir',
            dir,
            docxPath
        ]);
        vscode.window.showInformationMessage(`LibreOffice 已生成 ${baseName}.pdf，预览已更新`);
        outputChannel.appendLine(`[soffice] pdf generated: ${pdfPath}`);
    } catch (err) {
        let msg = '';
        if (isExecaError(err)) {
            msg = err.stderr ?? err.message;
        } else if (err instanceof Error) {
            msg = err.message;
        } else {
            msg = String(err);
        }
        outputChannel.appendLine(`[soffice] error: ${msg}`);
        vscode.window.showErrorMessage(`LibreOffice PDF导出失败：${msg}`);
        return;
    }

    if (previewPanel) {
        const pdfUri = vscode.Uri.file(pdfPath);
        previewPanel.webview.postMessage({
            type: 'updatePdf',
            pdfUrl: previewPanel.webview.asWebviewUri(pdfUri).toString()
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Markdown‑Office‑Preview');
    context.subscriptions.push(outputChannel);

    const openPreviewCmd = vscode.commands.registerCommand(
        'md-pandoc-word-preview.openPreview',
        async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('请先打开 Markdown 文档再执行预览命令');
                    return;
                }
                if (editor.document.languageId !== 'markdown') {
                    vscode.window.showWarningMessage('请先打开 Markdown 文档再执行预览命令');
                    return;
                }
                const doc = editor.document;

                if (previewPanel) {
                    previewPanel.reveal(vscode.ViewColumn.Two);
                } else {
                    previewPanel = vscode.window.createWebviewPanel(
                        'pandocWordPdfPreview',
                        'Pandoc Word Preview(PDF)',
                        vscode.ViewColumn.Two,
                        { enableScripts: true }
                    );
                    previewPanel.onDidDispose(() => {
                        previewPanel = undefined;
                    });
                }

                previewPanel.webview.html = '<!DOCTYPE html><html style="margin:0;padding:0;height:100%;overflow:hidden;"><body style="margin:0;height:100%;"><iframe id="pdfFrame" style="width:100%;height:100%;border:none;"></iframe><script>const vscode = acquireVsCodeApi();window.addEventListener(\'message\',e=>{if(e.data.type === \'updatePdf\'){document.getElementById(\'pdfFrame\').src = e.data.pdfUrl;}});</script></body></html>';

                await buildPdfPreview(doc.uri);
            } catch (err) {
                const errObj = err as Error;
                outputChannel.appendLine(`[command] uncaught exception: ${errObj.stack}`);
                vscode.window.showErrorMessage(`预览命令异常: ${errObj.message}`);
            }
        }
    );

    // debounce on document change ——全部补全大括号 {}
    vscode.workspace.onDidChangeTextDocument((docEvent) => {
        if (!previewPanel) {
            return;
        }
        const doc = docEvent.document;
        if (doc.languageId !== 'markdown') {
            return;
        }

        const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
        const debounceMs = config.get<number>('debounceMs', 800);

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            void buildPdfPreview(doc.uri);
        }, debounceMs);
    }, undefined, context.subscriptions);

    context.subscriptions.push(openPreviewCmd);
}

export function deactivate() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
}
