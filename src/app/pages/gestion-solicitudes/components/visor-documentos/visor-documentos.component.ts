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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    if (!this.data?.base64) {
      return;
    }

    const mimeType = this.data?.mimeType || 'application/pdf';
    const blob = this.base64ToBlob(this.data.base64, mimeType);

    this.objectUrl = URL.createObjectURL(blob);
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
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