/*
 * @Author: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @Date: 2026-10-06 16:26:06
 * @LastEditors: Skixkk <166358870+Skixkk@users.noreply.github.com>
 * @LastEditTime: 2026-10-06 16:26:57
 * @FilePath: \markdown-office-preview\src\converter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';

export function isExecaError(err: unknown): err is { stderr?: string; message: string; failed: boolean } {
    return typeof err === 'object' && err !== null && 'failed' in err;
}

/**
 * 解析二进制路径 pandoc / soffice
 */
export async function resolveExecutable(configPath: string, binName: string): Promise<string> {
    if (configPath && fs.existsSync(configPath)) {
        return configPath;
    }
    try {
        const { execa } = await import('execa');
        await execa(binName, ['--version']);
        return binName;
    } catch {
        return '';
    }
}

/**
 * md -> docx -> pdf，返回生成pdf Uri，失败返回 undefined
 */
export async function buildMdToPdf(mdUri: vscode.Uri, outputChannel: vscode.OutputChannel): Promise<vscode.Uri | undefined> {
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
    const pandocConfigPath = config.get<string>('pandocPath', '');
    const sofficeConfigPath = config.get<string>('sofficePath', '');
    const referenceDocPath = config.get<string>('referenceDocPath', '');
    const pandocExtraArgsRaw = config.get<string>('pandocExtraArgs', '');

    const pandocPath = await resolveExecutable(pandocConfigPath, 'pandoc');
    const sofficePath = await resolveExecutable(sofficeConfigPath, 'soffice');

    if (!pandocPath) {
        vscode.window.showErrorMessage('pandoc 未找到，请检查 mdPandocWordPreview.pandocPath');
        return undefined;
    }
    if (!sofficePath) {
        vscode.window.showErrorMessage('LibreOffice soffice 未找到，请检查 mdPandocWordPreview.sofficePath');
        return undefined;
    }

    const mdFilePath = mdUri.fsPath;
    const baseName = path.basename(mdFilePath, '.md');
    const dir = path.dirname(mdFilePath);
    const docxPath = path.join(dir, `${baseName}.docx`);
    const pdfPath = path.join(dir, `${baseName}.pdf`);

    const pandocArgs: string[] = [mdFilePath, '-o', docxPath];
    if (referenceDocPath && fs.existsSync(referenceDocPath)) {
        pandocArgs.push('--reference-doc', referenceDocPath);
    }
    if (pandocExtraArgsRaw.trim()) {
        pandocArgs.push(...pandocExtraArgsRaw.trim().split(/\s+/));
    }

    const { execa } = await import('execa');
    outputChannel.appendLine(`[pandoc] ${pandocPath} ${pandocArgs.join(' ')}`);
    try {
        await execa(pandocPath, pandocArgs);
    } catch (err) {
        let msg = '';
        if (isExecaError(err)) {msg = err.stderr ?? err.message;}
        else if (err instanceof Error) {msg = err.message;}
        outputChannel.appendLine(`[pandoc] error: ${msg}`);
        vscode.window.showErrorMessage(`Pandoc转换失败: ${msg}`);
        return undefined;
    }

    outputChannel.appendLine(`[soffice] convert ${docxPath} to pdf`);
    try {
        await execa(sofficePath, [
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', dir,
            docxPath
        ]);
    } catch (err) {
        let msg = '';
        if (isExecaError(err)) {msg = err.stderr ?? err.message;}
        else if (err instanceof Error) {msg = err.message;}
        outputChannel.appendLine(`[soffice] error: ${msg}`);
        vscode.window.showErrorMessage(`LibreOffice PDF导出失败: ${msg}`);
        return undefined;
    }

    if (!fs.existsSync(pdfPath)) {
        outputChannel.appendLine(`[converter] pdf file not generated: ${pdfPath}`);
        return undefined;
    }
    return vscode.Uri.file(pdfPath);
}
