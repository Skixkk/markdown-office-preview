// 导入vscode扩展API模块，提供窗口、命令、webview、配置等能力
import * as vscode from 'vscode';
// Node.js文件系统模块，用于判断文件是否存在
import fs from 'fs';
// Node.js路径处理模块，处理文件路径拼接、文件名提取
import path from 'path';
// 全局WebviewPanel实例：PDF预览侧边面板，单例，只创建一次
let previewPanel: vscode.WebviewPanel | undefined;
// 防抖定时器，编辑markdown时延迟执行转换，避免频繁调用pandoc
let debounceTimer: NodeJS.Timeout | null = null;
// 输出通道对象，用于在vscode输出面板打印插件运行日志
let outputChannel: vscode.OutputChannel;
// 文件系统监视器，监听磁盘上markdown文件变更
let mdFileWatcher: vscode.FileSystemWatcher | undefined;

/**
 * Try invoke third‑party pdf viewer extension public command
 * Priority: LaTeX‑Workshop(james‑yu.latex‑workshop) > tomoki1207.pdfviewer
 * @param pdfUri target pdf file Uri
 * @returns true if third‑party viewer activated, false fallback to self‑webview
 */
async function tryUseThirdPartyPdfViewer(pdfUri: vscode.Uri): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
    const preferThirdParty = config.get<boolean>('preferThirdPartyViewer', true);
    if (!preferThirdParty) {
        return false;
    }
    const extLatexWorkshop = vscode.extensions.getExtension('james-yu.latex-workshop');
    const extVscodePdf = vscode.extensions.getExtension('tomoki1207.pdfviewer');
    // 检测两个插件同时启用，原生存在PDF CustomEditor抢占冲突，不调用任意第三方查看器
    if(extLatexWorkshop?.isActive && extVscodePdf?.isActive){
        outputChannel.appendLine('[preview] conflict detected: both LaTeX‑Workshop and tomoki1207.pdfviewer active, skip third‑party invoke');
        const select = await vscode.window.showWarningMessage(
            'vscode‑pdf 和 LaTeX‑Workshop 存在PDF编辑器冲突，请禁用其中一个，或使用插件内置预览',
            '使用本插件内置预览'
        );
        if(select !== '使用本插件内置预览'){
            outputChannel.appendLine('[preview] user skip preview after conflict warning');
        }
        return false;
    }
    // Try LaTeX‑Workshop
    if (extLatexWorkshop) {
        if (!extLatexWorkshop.isActive) {
            await extLatexWorkshop.activate();
        }
        try {
            await vscode.commands.executeCommand('latex-workshop.viewer.viewPdf', { uri: pdfUri });
            outputChannel.appendLine('[preview] Use third‑party viewer: LaTeX‑Workshop');
            return true;
        } catch (e) {
            outputChannel.appendLine(`[preview] LaTeX‑Workshop invoke failed: ${String(e)}`);
        }
    }
    // Try tomoki1207/pdfviewer
    if (extVscodePdf) {
        if (!extVscodePdf.isActive) {
            await extVscodePdf.activate();
        }
        try {
            await vscode.commands.executeCommand('pdfviewer.openPdf', pdfUri);
            outputChannel.appendLine('[preview] Use third‑party viewer: tomoki1207.pdfviewer');
            return true;
        } catch (e) {
            outputChannel.appendLine(`[preview] tomoki1207.pdfviewer invoke failed: ${String(e)}`);
        }
    }
    return false;
}

/**
 * 类型守卫：判断错误对象是否属于execa执行产生的运行时错误
 * @param err 捕获到的未知类型错误
 * @returns 类型谓词，true代表是execa错误，可读取stderr/failed字段
 */
function isExecaError(err: unknown): err is { stderr?: string; message: string; failed: boolean } {
    // 判断不为null、是对象，并且拥有failed属性（execa报错标志性字段）
    return typeof err === 'object' && err !== null && 'failed' in err;
}

/**
 * 公共防抖封装：统一处理内存编辑变更 / 磁盘文件变更
 * @param uri 待转换markdown文件uri
 */
function triggerDebounceBuild(uri: vscode.Uri): void {
    if (!previewPanel) {
        return;
    }
    // 只处理markdown类型文件
    if (uri.fsPath.endsWith('.md') === false) {
        return;
    }
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
    const debounceMs = config.get<number>('debounceMs', 800);
    // 清除上一轮等待中的定时器
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    outputChannel.appendLine(`[debounce] schedule rebuild after ${debounceMs}ms, file:${uri.fsPath}`);
    debounceTimer = setTimeout(() => {
        void buildPdfPreview(uri);
    }, debounceMs);
}

/**
 * 解析可执行程序真实路径
 * 优先级：用户配置文件路径 > 系统PATH环境变量查找
 * @param configPath 用户settings中配置的二进制路径
 * @param binName 程序二进制名称(pandoc / soffice)
 * @returns 可用的可执行路径，找不到返回空字符串
 */
async function resolveExecutable(configPath: string, binName: string): Promise<string> {
    // 如果用户配置不为空，并且文件真实存在，直接返回配置路径
    if (configPath && fs.existsSync(configPath)) {
        outputChannel.appendLine(`[resolveExecutable] use configured path: ${configPath}`);
        return configPath;
    }
    try {
        // 动态导入execa（解决execa8为ESM模块，commonjs不能直接import问题）
        const { execa } = await import('execa');
        // 执行--version测试命令，校验PATH下是否可以直接调用该程序
        await execa(binName, ['--version']);
        outputChannel.appendLine(`[resolveExecutable] found in PATH: ${binName}`);
        // PATH可以直接调用，直接返回程序名即可
        return binName;
    } catch {
        // 执行失败：PATH找不到该程序
        outputChannel.appendLine(`[resolveExecutable] not found: ${binName}`);
        return '';
    }
}

/**
 * 核心业务函数：执行完整转换链路 md -> docx -> pdf，并且通知webview刷新PDF预览
 * @param mdUri 当前markdown文档uri对象
 */
async function buildPdfPreview(mdUri: vscode.Uri) {
    // 读取插件配置，读取package.json定义的所有configuration配置项
    const config = vscode.workspace.getConfiguration('mdPandocWordPreview');
    // 获取用户配置：pandoc可执行文件路径
    const pandocConfigPath = config.get<string>('pandocPath', '');
    // 获取用户配置：LibreOffice soffice可执行路径
    const sofficeConfigPath = config.get<string>('sofficePath', '');
    // 获取用户配置：pandoc reference‑doc参考docx模板路径
    const referenceDocPath = config.get<string>('referenceDocPath', '');
    // 获取用户配置：pandoc额外命令行参数字符串
    const pandocExtraArgsRaw = config.get<string>('pandocExtraArgs', '');
    // 获取用户配置：是否自动覆盖已存在docx/pdf文件
    const autoOverwrite = config.get<boolean>('autoOverwrite', false);
    // 解析得到最终可调用的pandoc路径
    const pandocPath = await resolveExecutable(pandocConfigPath, 'pandoc');
    // 解析得到最终可调用的soffice路径
    const sofficePath = await resolveExecutable(sofficeConfigPath, 'soffice');
    // pandoc路径为空，提示报错，终止转换流程
    if (!pandocPath) {
        vscode.window.showErrorMessage('pandoc 未找到，请检查 mdPandocWordPreview.pandocPath 配置或安装 pandoc');
        return;
    }
    // soffice路径为空，提示报错，终止转换流程
    if (!sofficePath) {
        vscode.window.showErrorMessage('LibreOffice soffice 未找到，请检查 mdPandocWordPreview.sofficePath 配置');
        return;
    }
    // 获取markdown本地磁盘完整路径
    const mdFilePath = mdUri.fsPath;
    // 获取不带后缀的文件名（去掉.md后缀）
    const baseName = path.basename(mdFilePath, '.md');
    // 获取markdown文件所在文件夹目录
    const dir = path.dirname(mdFilePath);
    // 拼接输出docx完整路径：同目录下同名docx
    const docxPath = path.join(dir, `${baseName}.docx`);
    // 拼接输出pdf完整路径：同目录下同名pdf
    const pdfPath = path.join(dir, `${baseName}.pdf`);

    // ========== 修复：预览打开状态下，自动强制覆盖，不再弹窗阻断实时更新 ==========
    // 判断当前预览面板存在，则代表实时预览模式，直接跳过覆盖确认弹窗，强制覆盖
    const isLivePreviewMode = !!previewPanel;
    if (!autoOverwrite && !isLivePreviewMode) {
        // autoOverwrite关闭状态，并且非实时预览模式，弹出模态确认弹窗询问是否覆盖旧文件
        if (fs.existsSync(docxPath) || fs.existsSync(pdfPath)) {
            // 弹出模态警告弹窗，提供两个选项：覆盖 / 取消
            const select = await vscode.window.showWarningMessage(
                `目标文件 ${baseName}.docx / ${baseName}.pdf 已存在，是否覆盖？`,
                { modal: true },
                '覆盖',
                '取消'
            );
            // 用户选择不是覆盖，则记录日志直接退出函数，不执行转换
            if (select !== '覆盖') {
                outputChannel.appendLine('[buildPdfPreview] user cancelled overwrite');
                return;
            }
        }
    }

    // 初始化pandoc命令参数数组：输入md文件，输出docx
    const pandocArgs: string[] = [mdFilePath, '-o', docxPath];
    // 如果reference‑doc模板路径配置有效且文件存在，追加参考文档参数，固定word样式
    if (referenceDocPath && fs.existsSync(referenceDocPath)) {
        pandocArgs.push('--reference-doc', referenceDocPath);
    }
    // 用户填写了额外pandoc参数，按空白字符分割字符串，追加进参数列表
    if (pandocExtraArgsRaw.trim()) {
        const extraList = pandocExtraArgsRaw.trim().split(/\s+/);
        pandocArgs.push(...extraList);
    }
    // 动态导入execa执行子进程
    const { execa } = await import('execa');
    // 输出日志：打印完整pandoc执行命令
    outputChannel.appendLine(`\n[pandoc] run: ${pandocPath} ${pandocArgs.join(' ')}`);
    try {
        // 调用pandoc子进程，md转docx
        await execa(pandocPath, pandocArgs);
        // 弹窗提示：docx生成成功，仅在非实时预览模式展示，避免频繁弹窗
        if (!isLivePreviewMode) {
            vscode.window.showInformationMessage(`Pandoc 已生成 ${baseName}.docx`);
        }
        outputChannel.appendLine(`[pandoc] success, output: ${docxPath}`);
    } catch (err) {
        // 捕获pandoc执行异常
        let msg = '';
        // 判断是execa错误，优先读取stderr标准错误输出
        if (isExecaError(err)) {
            msg = err.stderr ?? err.message;
        } else if (err instanceof Error) {
            // 普通JS Error实例，读取message
            msg = err.message;
        } else {
            // 未知类型错误，直接转字符串
            msg = String(err);
        }
        // 日志打印错误信息
        outputChannel.appendLine(`[pandoc] error: ${msg}`);
        // vscode弹窗提示转换失败
        vscode.window.showErrorMessage(`Pandoc 转换失败：${msg}`);
        return;
    }

    outputChannel.appendLine(`[soffice] converting docx to pdf: ${sofficePath}`);
    try {
        // 调用LibreOffice headless无头模式，docx转pdf
        await execa(sofficePath, [
            '--headless',       // 无头模式，不弹出GUI窗口，后台执行
            '--convert-to',     // 指定转换输出格式
            'pdf',              // 输出格式pdf
            '--outdir',         // 指定输出目录
            dir,                // 和原md同目录输出pdf
            docxPath            // 待转换docx文件路径
        ]);
        // 弹窗提示pdf生成完成，预览更新，仅在非实时预览模式展示
        if (!isLivePreviewMode) {
            vscode.window.showInformationMessage(`LibreOffice 已生成 ${baseName}.pdf，预览已更新`);
        }
        outputChannel.appendLine(`[soffice] pdf generated: ${pdfPath}`);
    } catch (err) {
        // 捕获LibreOffice执行异常
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

    // 如果预览面板实例存在，发送消息给webview前端，通知pdfjs重新加载pdf
    if (previewPanel) {
        const pdfUri = vscode.Uri.file(pdfPath);
        previewPanel.webview.postMessage({
            type: 'reloadPdf',
            pdfUrl: `${previewPanel.webview.asWebviewUri(pdfUri).toString()}?t=${Date.now()}`
        });
    }
}

/**
 * 插件激活入口，vscode启动插件时执行
 * @param context 插件上下文对象，用于注册命令、注册事件、资源销毁
 */
export function activate(context: vscode.ExtensionContext) {
    // 创建插件专属输出日志面板
    outputChannel = vscode.window.createOutputChannel('Markdown‑Office‑Preview');
    // 将输出通道注册到订阅列表，插件卸载时自动释放资源
    context.subscriptions.push(outputChannel);

    // -------------------------- 文件监视器：监听磁盘md文件修改（外部编辑器修改也生效） --------------------------
    mdFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    // 文件磁盘发生变更触发防抖更新
    mdFileWatcher.onDidChange((uri) => {
        outputChannel.appendLine(`[watcher] disk file changed: ${uri.fsPath}`);
        triggerDebounceBuild(uri);
    }, undefined, context.subscriptions);

    // 注册命令：package.json中定义的command id
    const openPreviewCmd = vscode.commands.registerCommand(
        'md-pandoc-word-preview.openPreview',
        async () => {
            try {
                // 获取当前激活编辑器实例
                const editor = vscode.window.activeTextEditor;
                // 当前没有打开编辑器窗口，弹窗警告
                if (!editor) {
                    vscode.window.showWarningMessage('请先打开 Markdown 文档再执行预览命令');
                    return;
                }
                // 判断当前打开文档语言id不是markdown，弹窗警告
                if (editor.document.languageId !== 'markdown') {
                    vscode.window.showWarningMessage('请先打开 Markdown 文档再执行预览命令');
                    return;
                }
                const doc = editor.document;
                const mdFilePath = doc.uri.fsPath;
                const baseName = path.basename(mdFilePath, '.md');
                const dir = path.dirname(mdFilePath);
                const pdfPath = path.join(dir, `${baseName}.pdf`);
                const pdfUri = vscode.Uri.file(pdfPath);

                // Try reuse third‑party pdf viewer first
                const usedThirdParty = await tryUseThirdPartyPdfViewer(pdfUri);
                if (usedThirdParty) {
                    // third‑party viewer take over rendering, conversion still keep running for file watcher live‑update
                    await buildPdfPreview(doc.uri);
                    return;
                }

                // If preview panel already exists, reveal panel to second editor group
                if (previewPanel) {
                    previewPanel.reveal(vscode.ViewColumn.Two);
                } else {
                    // Not exists, create new webview panel on view‑column two, enable javascript
                    previewPanel = vscode.window.createWebviewPanel(
                        'pandocWordPdfPreview',
                        'Pandoc Word Preview(PDF)',
                        vscode.ViewColumn.Two,
                        {
                            enableScripts: true,
                            // 指向项目内resources/pdfjs
                            localResourceRoots: [
                                vscode.Uri.joinPath(context.extensionUri, 'resources/pdfjs')
                            ]
                        }
                    );
                    // Listen webview dispose event, reset global variable to avoid memory leak
                    previewPanel.onDidDispose(() => {
                        previewPanel = undefined;
                        // Clear debounce timer when webview panel closed to avoid orphan background task
                        if (debounceTimer) {
                            clearTimeout(debounceTimer);
                            debounceTimer = null;
                        }
                    });
                }

                // Wait webview DOMContentLoaded event before send postMessage, avoid message lost by race condition
                const waitWebviewReady = new Promise<void>((resolve) => {
                    if (!previewPanel) {
                        resolve();
                        return;
                    }
                    const disposable = previewPanel.webview.onDidReceiveMessage(msg => {
                        if (msg.type === 'webviewReady') {
                            disposable.dispose();
                            resolve();
                        }
                    });
                });
                // 改为读取项目resources/pdfjs
                const pdfJsBuildUri = previewPanel.webview.asWebviewUri(
                    vscode.Uri.joinPath(context.extensionUri, 'resources/pdfjs')
                );

                // ========= Webview HTML：pdfjs‑dist 渲染PDF（参考tomoki1207/vscode‑pdfviewer实现思路） =========
                previewPanel.webview.html = `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%;overflow:hidden;">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline' ${pdfJsBuildUri};style-src 'unsafe-inline';worker-src ${pdfJsBuildUri} blob:;data:;">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{height:100vh;background:#525659;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:16px 0;}
#pdfContainer{max-width:90vw;}
.pdfPage{margin-bottom:16px;box-shadow:0 2px 12px #0005;}
</style>
</head>
<body>
<div id="pdfContainer"></div>
<script src="${pdfJsBuildUri}/pdf.min.js"></script>
<script>
const vscode = acquireVsCodeApi();
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfJsBuildUri}/pdf.worker.min.js';

let pdfDoc = null;
const container = document.getElementById('pdfContainer');

async function renderPdf(pdfUrl){
    container.innerHTML = '<div style="color:white;">Rendering PDF...</div>';
    try{
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        container.innerHTML = '';
        for(let i=1;i<=pdfDoc.numPages;i++){
            const page = await pdfDoc.getPage(i);
            const scale = 1.5;
            const viewport = page.getViewport({scale});
            const canvas = document.createElement('canvas');
            canvas.className = 'pdfPage';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            await page.render({canvasContext:ctx,viewport}).promise;
        }
    }catch(e){
        container.innerHTML = '<div style="color:#ff7777;padding:20px;">PDF render error：'+e.message+'</div>';
        console.error(e);
    }
}

window.addEventListener('message',async e=>{
    if(e.data.type === 'reloadPdf'){
        await renderPdf(e.data.pdfUrl);
    }
});

document.addEventListener('DOMContentLoaded',()=>{
    vscode.postMessage({type:'webviewReady'});
});
</script>
</body>
</html>`;

                // Waiting webview script ready, then start pdf convert workflow
                await waitWebviewReady;
                // 调用转换函数，执行md->docx->pdf并且刷新预览
                await buildPdfPreview(doc.uri);
            } catch (err) {
                // 捕获整个命令回调内部未捕获异常，打印堆栈日志，弹窗报错
                const errObj = err as Error;
                outputChannel.appendLine(`[command] uncaught exception: ${errObj.stack}`);
                vscode.window.showErrorMessage(`预览命令异常: ${errObj.message}`);
            }
        }
    );

    // 监听内存中文本编辑修改事件：vscode内部编辑markdown
    vscode.workspace.onDidChangeTextDocument((docEvent) => {
        triggerDebounceBuild(docEvent.document.uri);
    }, undefined, context.subscriptions);

    // 将命令注册对象加入订阅列表，插件卸载自动注销命令
    context.subscriptions.push(openPreviewCmd);
}

/**
 * 插件销毁回调，插件禁用/关闭窗口触发，清理定时器释放资源
 */
export function deactivate() {
    // 存在防抖定时器，清除定时器，避免后台继续执行
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    if (mdFileWatcher) {
        mdFileWatcher.dispose();
    }
}
