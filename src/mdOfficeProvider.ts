import * as vscode from 'vscode';

export class MdOfficePreview {
    private readonly mdUri: vscode.Uri;
    private webviewPanel: vscode.WebviewPanel | undefined;
    private pdfUri: vscode.Uri;

    constructor(mdUri: vscode.Uri, pdfUri: vscode.Uri, panel: vscode.WebviewPanel) {
        this.mdUri = mdUri;
        this.pdfUri = pdfUri;
        this.webviewPanel = panel;
    }

    // getter 对外只读获取mdUri，不破坏private封装
    public get getMdUri(): vscode.Uri {
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
        // your existing update logic
    }

    public dispose(): void {
        this.webviewPanel?.dispose();
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
        return this.previews.find(p => p.getMdUri.toString() === mdUri.toString());
    }

    public createPreview(mdUri: vscode.Uri, pdfUri: vscode.Uri, viewColumn: vscode.ViewColumn): MdOfficePreview {
        const panel = vscode.window.createWebviewPanel(
            'markdownOfficePreview',
            'Markdown Office PDF Preview',
            viewColumn,
            { enableScripts: true }
        );
        const preview = new MdOfficePreview(mdUri, pdfUri, panel);
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
