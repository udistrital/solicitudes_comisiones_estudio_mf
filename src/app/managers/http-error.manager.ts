import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HttpErrorManager {
  handleError(err: HttpErrorResponse) {
    return throwError(() => err);
  }
}
