import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * El backend ahora exige sesión para servir /uploads/* (antes era estático
 * y público). Un <img [src]="..."> normal no manda el token — este
 * directive pide el archivo vía HttpClient (que sí pasa por authInterceptor)
 * y lo asigna como blob URL.
 */
@Directive({
  selector: 'img[appAuthSrc]',
  standalone: true,
})
export class AuthSrcDirective implements OnChanges, OnDestroy {
  @Input('appAuthSrc') src = '';

  private readonly http = inject(HttpClient);
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private objectUrl: string | null = null;

  ngOnChanges(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private load(): void {
    this.revoke();
    if (!this.src) {
      this.el.nativeElement.removeAttribute('src');
      return;
    }
    this.http.get(this.src, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.el.nativeElement.src = this.objectUrl;
      },
      error: () => this.el.nativeElement.removeAttribute('src'),
    });
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
