import { Pipe, PipeTransform } from '@angular/core';

/**
 * Shortens a name to the first two letters. For example "John Doe" becomes "JD".
 * Used primarily for user initials in avatars.
 */
@Pipe({
  name: 'shortName',
  standalone: true
})
export class ShortNamePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return '';
    }

    const parts = value.split(' ');
    
    // For single word, take first two letters
    if (parts.length === 1) {
      return value.substring(0, 2).toUpperCase();
    }
    
    // For multiple words, take first letter of first and last words
    const firstLetter = parts[0].charAt(0);
    const lastLetter = parts[parts.length - 1].charAt(0);
    
    return (firstLetter + lastLetter).toUpperCase();
  }
}
