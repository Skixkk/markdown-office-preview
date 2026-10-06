import * as vscode from 'vscode';
import path from 'path';
import { Disposable } from './disposable';
type PreviewState = 'Disposed' | 'Visible' | 'Active';
export class MdOfficePreview extends Disposable {
    private _previewState: PreviewState = 'Visible';
    constructor(
        private readonly extensionRoot: vscode.Uri,
        public readonly mdUri: vscode.Uri,
        public pdfUri: vscode.Uri,
        private readonly webviewPanel: vscode.WebviewPanel,
    ) {
        super();
        const webview = webviewPanel.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                // fix: 指向构建输出的 dist/pdfjs 目录，匹配 esbuild 拷贝路径
                vscode.Uri.joinPath(extensionRoot, 'dist/pdfjs'),
                vscode.Uri.file(path.dirname(pdfUri.fsPath)),
            ],
        };
        // webview 消息
        this._register(
            webview.onDidReceiveMessage((msg) => {
                switch (msg.type) {
                    case 'webviewReady':
                        this.reloadPdf();
                        break;
                }
            }),
        );
        // panel 状态
        this._register(
            webviewPanel.onDidChangeViewState(() => this.updateState()),
        );
        this._register(
            webviewPanel.onDidDispose(() => {
                this._previewState = 'Disposed';
            }),
        );
        // 监听生成的pdf磁盘文件变化
        const watcher = this._register(
            vscode.workspace.createFileSystemWatcher(pdfUri.fsPath),
        );
        this._register(
            watcher.onDidChange((e) => {
                if (e.toString() === this.pdfUri.toString()) {
                    this.reloadPdf();
                }
            }),
        );
        this._register(
            watcher.onDidDelete(() => {
                webviewPanel.dispose();
            }),
        );
        webviewPanel.webview.html = this.getWebviewHtml();
        this.updateState();
    }
    private updateState(): void {
        if (this._previewState === 'Disposed') {
            return;
        }
        this._previewState = this.webviewPanel.active ? 'Active' : 'Visible';
    }
    public reloadPdf(): void {
        if (this._previewState === 'Disposed') {
            return;
        }
        this.webviewPanel.webview.postMessage({
            type: 'reloadPdf',
            pdfUrl:
                this.webviewPanel.webview.asWebviewUri(this.pdfUri).toString() +
                `?t=${Date.now()}`,
        });
    }
    public updatePdfUri(newPdfUri: vscode.Uri): void {
        this.pdfUri = newPdfUri;
        this.reloadPdf();
    }
    private getWebviewHtml(): string {
        const webview = this.webviewPanel.webview;
        const cspSource = webview.cspSource;
        // fix: 指向构建输出的 dist/pdfjs，通过 asWebviewUri 转为 vscode-resource 协议
        const pdfJsRoot = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionRoot, 'dist/pdfjs'),
        );
        return `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%;overflow:hidden;">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline' ${cspSource};style-src 'unsafe-inline' ${cspSource};worker-src ${cspSource} blob:;img-src blob: data: ${cspSource};">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{height:100vh;background:#525659;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:16px 0;}
#pdfContainer{max-width:90vw;}
.pdfPage{margin-bottom:16px;box-shadow:0 2px 12px #0005;}
</style>
</head>
<body>
<div id="pdfContainer"></div>
<script src="${pdfJsRoot}/build/pdf.js"></script>
<script>
const vscode = acquireVsCodeApi();
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfJsRoot}/build/pdf.worker.js';
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
    }
}
