import * as vscode from 'vscode';
import { MdOfficePreview } from './mdOfficePreview';

export class MdOfficePreviewProvider {
    private readonly _previews = new Set<MdOfficePreview>();
    private _activePreview: MdOfficePreview | undefined;

    constructor(private readonly extensionRoot: vscode.Uri) {}

    /**
     * 根据mdUri查找已经存在的预览
     */
    public getPreviewByMdUri(mdUri: vscode.Uri): MdOfficePreview | undefined {
        for (const p of this._previews) {
            if (p.mdUri.toString() === mdUri.toString()) {
                return p;
            }
        }
        return undefined;
    }

    /**
     * 创建全新预览面板
     */
    public createPreview(mdUri: vscode.Uri, pdfUri: vscode.Uri, viewColumn: vscode.ViewColumn): MdOfficePreview {
        const panel = vscode.window.createWebviewPanel(
            'mdOfficePdfPreview',
            'Markdown‑Office‑Preview(PDF)',
            viewColumn,
            { enableScripts: true }
        );
        const preview = new MdOfficePreview(this.extensionRoot, mdUri, pdfUri, panel);
        this._previews.add(preview);
        this.setActivePreview(preview);

        panel.onDidDispose(() => {
            preview.dispose();
            this._previews.delete(preview);
            if (this._activePreview === preview) {
                this.setActivePreview(undefined);
            }
        });

        panel.onDidChangeViewState(() => {
            if (panel.active) {
                this.setActivePreview(preview);
            } else if (this._activePreview === preview && !panel.active) {
                this.setActivePreview(undefined);
            }
        });
        return preview;
    }

    public get activePreview(): MdOfficePreview | undefined {
        return this._activePreview;
    }

    private setActivePreview(v: MdOfficePreview | undefined): void {
        this._activePreview = v;
    }

    public disposeAll(): void {
        for (const p of this._previews) {
            p.dispose();
        }
        this._previews.clear();
        this._activePreview = undefined;
    }
}
