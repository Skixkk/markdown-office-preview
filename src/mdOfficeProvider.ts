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

        this.configureWebview();
        this.renderPdfJsViewer();

        panel.onDidDispose(() => {
            this.webviewPanel = undefined;
        });
    }

    public get mdUriValue(): vscode.Uri {
        return this.mdUri;
    }

    public revealPanel(): void {
        this.webviewPanel?.reveal(vscode.ViewColumn.Two);
    }

    public updatePdfUri(pdfUri: vscode.Uri): void {
        this.pdfUri = pdfUri;
        this.renderPdfJsViewer();
    }

    public dispose(): void {
        this.webviewPanel?.dispose();
    }

    private configureWebview(): void {
        if (!this.webviewPanel) {
            return;
        }

        this.webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionRoot, 'dist', 'pdfjs'),
                vscode.Uri.file(path.dirname(this.pdfUri.fsPath)),
            ],
        };
    }

    private renderPdfJsViewer(): void {
        if (!this.webviewPanel) {
            return;
        }

        const webview = this.webviewPanel.webview;

        const pdfJsBuildUri = vscode.Uri.joinPath(
            this.extensionRoot,
            'dist',
            'pdfjs',
            'build',
        );

        const pdfJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(pdfJsBuildUri, 'pdf.mjs'),
        );

        const pdfJsWorkerUri = webview.asWebviewUri(
            vscode.Uri.joinPath(pdfJsBuildUri, 'pdf.worker.mjs'),
        );

        const pdfFileWebUri = webview.asWebviewUri(this.pdfUri);

        const nonce = this.createNonce();

        webview.html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'none';
        script-src 'nonce-${nonce}';
        style-src 'unsafe-inline';
        worker-src ${webview.cspSource} blob:;
        connect-src ${webview.cspSource};
        img-src ${webview.cspSource} blob: data:;
    "
>

<title>Markdown Office PDF Preview</title>

<style>
html,
body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #eeeeee;
}

#container {
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
}

canvas {
    display: block;
    margin: 12px auto;
    background: #ffffff;
    box-shadow: 0 2px 8px #00000022;
}
</style>
</head>

<body>

<div id="container"></div>

<script type="module" nonce="${nonce}">
import * as pdfjsLib from '${pdfJsUri}';

pdfjsLib.GlobalWorkerOptions.workerSrc =
    '${pdfJsWorkerUri}';

const pdfUrl = '${pdfFileWebUri}';

async function renderPdf() {
    const container =
        document.getElementById('container');

    try {
        container.innerHTML =
            '<div>Loading PDF...</div>';

        const pdfDoc =
            await pdfjsLib.getDocument({
                url: pdfUrl,
                withCredentials: false,
            }).promise;

        container.innerHTML = '';

        for (
            let pageNumber = 1;
            pageNumber <= pdfDoc.numPages;
            pageNumber++
        ) {
            const page =
                await pdfDoc.getPage(pageNumber);

            const viewport =
                page.getViewport({
                    scale: 1.5,
                });

            const canvas =
                document.createElement('canvas');

            canvas.width =
                viewport.width;

            canvas.height =
                viewport.height;

            container.appendChild(canvas);

            const context =
                canvas.getContext('2d');

            if (!context) {
                throw new Error(
                    'Unable to create canvas context',
                );
            }

            await page.render({
                canvasContext: context,
                viewport,
            }).promise;
        }
    } catch (error) {
        console.error(
            'PDF render error:',
            error,
        );

        container.innerHTML = '';

        const errorElement =
            document.createElement('pre');

        errorElement.style.padding = '20px';
        errorElement.style.color = '#c62828';

        errorElement.textContent =
            error instanceof Error
                ? error.stack ?? error.message
                : String(error);

        container.appendChild(errorElement);
    }
}

renderPdf();
</script>

</body>
</html>
`;
    }

    private createNonce(): string {
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let result = '';

        for (let i = 0; i < 32; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length),
            );
        }

        return result;
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
            (preview) => preview.mdUriValue.toString() === mdUri.toString(),
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
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionRoot, 'dist', 'pdfjs'),
                    vscode.Uri.file(path.dirname(pdfUri.fsPath)),
                ],
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
            this.previews = this.previews.filter((item) => item !== preview);
        });

        return preview;
    }

    public disposeAll(): void {
        this.previews.forEach((preview) => preview.dispose());

        this.previews = [];
    }
}
