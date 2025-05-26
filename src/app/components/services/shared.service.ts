import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private themeSubject = new BehaviorSubject<string>('blue');
  private modeSubject = new BehaviorSubject<string>('light');

  private blueThemeSubject = new BehaviorSubject<boolean>(true);
  private pinkThemeSubject = new BehaviorSubject<boolean>(false);
  private greenThemeSubject = new BehaviorSubject<boolean>(false);
  private darkModeSubject = new BehaviorSubject<boolean>(false);

  blueTheme$ = this.blueThemeSubject.asObservable();
  pinkTheme$ = this.pinkThemeSubject.asObservable();
  greenTheme$ = this.greenThemeSubject.asObservable();
  darkMode$ = this.darkModeSubject.asObservable();

  currentTheme = this.themeSubject.asObservable();
  currentMode = this.modeSubject.asObservable();

  constructor() { }

  setBlueTheme(): void {
    this.blueThemeSubject.next(true);
    this.pinkThemeSubject.next(false);
    this.greenThemeSubject.next(false);
    this.themeSubject.next('blue');
  }

  setPinkTheme(): void {
    this.blueThemeSubject.next(false);
    this.pinkThemeSubject.next(true);
    this.greenThemeSubject.next(false);
    this.themeSubject.next('pink');
  }

  setGreenTheme(): void {
    this.blueThemeSubject.next(false);
    this.pinkThemeSubject.next(false);
    this.greenThemeSubject.next(true);
    this.themeSubject.next('green');
  }

  setDarkMode(value: boolean): void {
    this.darkModeSubject.next(value);
    this.modeSubject.next(value ? 'dark' : 'light');
  }

  getDarkMode(): boolean {
    return this.darkModeSubject.getValue();
  }
}
