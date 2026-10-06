import * as vscode from 'vscode';
import * as path from 'path';
export class MdOfficePreview {
    private readonly mdUri: vscode.Uri;
    private webviewPanel: vscode.WebviewPanel | undefined;
    private pdfUri: vscode.Uri;
    private readonly extensionRoot: vscode.Uri;
    constructor(
        mdUri: vscode.Uri,
        pdfUri: vscode.Uri,
        panel: vscode.WebviewPanel,
        extensionRoot: vscode.Uri,
    ) {
        this.mdUri = mdUri;
        this.pdfUri = pdfUri;
        this.webviewPanel = panel;
        this.extensionRoot = extensionRoot;
        this.renderPdfJsViewer();
    }
    public get mdUriValue(): vscode.Uri {
        return this.mdUri;
    }
    public revealPanel(): void {
        if (this.webviewPanel) {
            this.webviewPanel.reveal(vscode.ViewColumn.Two);
        }
    }
    public updatePdfUri(pdfUri: vscode.Uri): void {
        this.pdfUri = pdfUri;
        this.renderPdfJsViewer();
    }
    public dispose(): void {
        this.webviewPanel?.dispose();
    }
    private renderPdfJsViewer(): void {
        if (!this.webviewPanel) {
            return;
        }
        const panel = this.webviewPanel;
        // ✅ 从dist目录读取，不再读取node_modules
        const pdfJsRootUri = vscode.Uri.joinPath(
            this.extensionRoot,
            'dist',
            'pdfjs',
        );
        const pdfJsBuildUri = vscode.Uri.joinPath(pdfJsRootUri, 'build');
        const pdfJsWebUri = vscode.Uri.joinPath(pdfJsRootUri, 'web');
        const pdfJsUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(pdfJsBuildUri, 'pdf.js'),
        );
        const pdfJsWorkerUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(pdfJsBuildUri, 'pdf.worker.js'),
        );
        const pdfFileWebUri = panel.webview.asWebviewUri(this.pdfUri);
        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Markdown Office PDF Preview</title>
<style>
html,body{margin:0;padding:0;height:100vh;overflow:auto;background:#eeeeee;}
#container{width:100%;padding:16px;box-sizing:border-box;}
canvas{display:block;margin:12px auto;background:#fff;box-shadow:0 2px 8px #00000022;}
</style>
</head>
<body>
<div id="container"></div>
<script src="${pdfJsUri}"></script>
<script>
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfJsWorkerUri}';
const pdfUrl = '${pdfFileWebUri}';
(async function renderPdf() {
    try {
        // withCredentials:false bypass vscode‑resource virtual origin cross‑origin restriction
        const pdfDoc = await pdfjsLib.getDocument({
            url: pdfUrl,
            withCredentials: false
        }).promise;
        const pageCount = pdfDoc.numPages;
        const container = document.getElementById('container');
        for(let i=1;i<=pageCount;i++){
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({scale:1.5});
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            container.appendChild(canvas);
            await page.render({canvasContext:ctx, viewport}).promise;
        }
    } catch(err) {
        console.error('PDF render error', err);
        document.body.innerText = 'PDF Render Error: ' + err.message;
    }
})();
</script>
</body>
</html>
        `;
    }
}
export class MdOfficePreviewProvider {
    private readonly extensionRoot: vscode.Uri;
    private previews: MdOfficePreview[] = [];
    constructor(extensionRoot: vscode.Uri) {
        this.extensionRoot = extensionRoot;
    }
    public getPreviewByMdUri(mdUri: vscode.Uri): MdOfficePreview | undefined {
        return this.previews.find(
            (p) => p.mdUriValue.toString() === mdUri.toString(),
        );
    }
    public createPreview(
        mdUri: vscode.Uri,
        pdfUri: vscode.Uri,
        viewColumn: vscode.ViewColumn,
    ): MdOfficePreview {
        const panel = vscode.window.createWebviewPanel(
            'markdownOfficePreview',
            'Markdown Office PDF Preview',
            viewColumn,
            {
                enableScripts: true,
            },
        );
        const preview = new MdOfficePreview(
            mdUri,
            pdfUri,
            panel,
            this.extensionRoot,
        );
        this.previews.push(preview);
        panel.onDidDispose(() => {
            this.previews = this.previews.filter((p) => p !== preview);
        });
        return preview;
    }
    public disposeAll(): void {
        this.previews.forEach((p) => p.dispose());
        this.previews = [];
    }
}
