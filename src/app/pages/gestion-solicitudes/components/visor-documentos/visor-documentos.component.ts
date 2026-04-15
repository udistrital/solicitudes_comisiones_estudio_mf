import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-visor-documentos',
  templateUrl: './visor-documentos.component.html',
  styleUrls: ['./visor-documentos.component.scss'],
})
export class VisorDocumentosComponent implements OnInit, OnDestroy {
  pdfUrl?: SafeResourceUrl;
  private objectUrl?: string;

  /** Indica si se debe mostrar el formulario FR-010 en lugar del visor PDF */
  get isFR010(): boolean {
    return !!this.data?.isFR010;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    if (this.isFR010 || !this.data?.base64) return;

    const mimeType = this.data?.mimeType;

    if (mimeType !== 'application/pdf') {
      return;
    }

    const blob = this.base64ToBlob(this.data.base64, mimeType);

    this.objectUrl = URL.createObjectURL(blob);

    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.objectUrl
    );
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}
