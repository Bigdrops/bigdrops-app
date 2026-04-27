/**
 * Safely converts any value to a string for PDF rendering.
 * Prevents [object Object] and ensures null/undefined don't crash the renderer.
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // If it's an object, we try to see if it's a date or has a toString, 
    // otherwise we return empty or a specific placeholder to avoid [object Object]
    if (value instanceof Date) return value.toLocaleDateString();
    return ''; // Better to show nothing than [object Object] in a PDF
  }
  return String(value);
}
