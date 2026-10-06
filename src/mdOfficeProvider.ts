import * as vscode from 'vscode';
import * as path from 'path';

export class MdOfficePreview {
    private readonly mdUri: vscode.Uri;
    private webviewPanel: vscode.WebviewPanel | undefined;
    private pdfUri: vscode.Uri;
    private readonly extensionRoot: vscode.Uri;

    constructor(mdUri: vscode.Uri, pdfUri: vscode.Uri, panel: vscode.WebviewPanel, extensionRoot: vscode.Uri) {
        this.mdUri = mdUri;
        this.pdfUri = pdfUri;
        this.webviewPanel = panel;
        this.extensionRoot = extensionRoot;
        this.renderPdfJsViewer();
    }

    // getter 对外只读获取mdUri，不破坏private封装
    public get mdUriValue(): vscode.Uri {
        return this.mdUri;
    }

    // 新增公开方法，供外部调用，封装私有webviewPanel.reveal
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

    // 渲染pdf.js官方viewer，和vscode-pdfviewer逻辑一致
    private renderPdfJsViewer(): void {
        if (!this.webviewPanel) {return;}
        const panel = this.webviewPanel;
        const pdfJsRootUri = vscode.Uri.joinPath(this.extensionRoot, 'node_modules', 'pdfjs-dist');
        const viewerHtmlUri = vscode.Uri.joinPath(pdfJsRootUri, 'web', 'viewer.html');
        const viewerHtmlWebUri = panel.webview.asWebviewUri(viewerHtmlUri);
        const pdfFileWebUri = panel.webview.asWebviewUri(this.pdfUri);
        const fullViewerUrl = `${viewerHtmlWebUri.toString()}#file=${pdfFileWebUri.toString()}`;

        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;height:100vh;overflow:hidden;">
<iframe src="${fullViewerUrl}" style="width:100%;height:100vh;border:none;"></iframe>
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
        // 通过getter访问，不再直接读取私有 p.mdUri
        return this.previews.find(p => p.mdUriValue.toString() === mdUri.toString());
    }

    public createPreview(mdUri: vscode.Uri, pdfUri: vscode.Uri, viewColumn: vscode.ViewColumn): MdOfficePreview {
        const panel = vscode.window.createWebviewPanel(
            'markdownOfficePreview',
            'Markdown Office PDF Preview',
            viewColumn,
            {
                enableScripts: true,
                enableCommandUris: true
            }
        );
        const preview = new MdOfficePreview(mdUri, pdfUri, panel, this.extensionRoot);
        this.previews.push(preview);
        panel.onDidDispose(() => {
            this.previews = this.previews.filter(p => p !== preview);
        });
        return preview;
    }

    public disposeAll(): void {
        this.previews.forEach(p => p.dispose());
        this.previews = [];
    }
}
