import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class PopUpManager {
  constructor(private snack: MatSnackBar) {}

  success(msg: string) {
    this.snack.open(msg, 'OK', { duration: 2500 });
  }

  error(msg: string) {
    this.snack.open(msg, 'OK', { duration: 3500 });
  }
}
