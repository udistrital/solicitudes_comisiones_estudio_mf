import { Component, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent, Subject, takeUntil } from 'rxjs';

const DEFAULT_LANG = 'es';
const COOKIE_KEY = 'lang';

@Component({
    selector: 'mf1',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly translate: TranslateService) {
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang(DEFAULT_LANG);
  }

  ngOnInit(): void {
    // Carga inicial: leer cookie 'lang' que el core persiste
    const initial = this.getCookie(COOKIE_KEY) ?? DEFAULT_LANG;
    this.translate.use(initial);

    // Escuchar el CustomEvent 'lang' que el core dispara en window
    // cuando el usuario cambia idioma en el header
    fromEvent<CustomEvent>(window, 'lang')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const lang = event.detail?.answer;
        if (lang && lang !== this.translate.currentLang) {
          this.translate.use(lang);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCookie(name: string): string | null {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    return match ? match.split('=')[1] : null;
  }
}
