import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class PopUpManager {
  constructor(private readonly snack: MatSnackBar) {}

  /** Toast de éxito (snackbar) */
  success(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 2500 });
  }

  /** Toast de error (snackbar) */
  error(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 3500 });
  }

  /** SweetAlert de confirmación institucional (warning) */
  confirm(msg: string, confirmText = 'Aceptar', cancelText = 'Cancelar'): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'warning',
      html: `<p style="font-size:15px;line-height:1.5">${msg}</p>`,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      customClass: {
        popup: 'sga-swal-popup',
      },
    });
  }

  /** SweetAlert informativo (success) */
  alertSuccess(msg: string, title = ''): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'success',
      title,
      html: `<p style="font-size:15px;line-height:1.5">${msg}</p>`,
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'sga-swal-popup',
      },
    });
  }

  /** SweetAlert informativo (error) */
  alertError(msg: string, title = ''): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'error',
      title,
      html: `<p style="font-size:15px;line-height:1.5">${msg}</p>`,
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'sga-swal-popup',
      },
    });
  }
}
