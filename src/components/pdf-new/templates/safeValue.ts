/**
 * Safely converts any value to a string for PDF rendering.
 * Prevents [object Object] and ensures null/undefined don't crash the renderer.
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toLocaleDateString();
    
    // Prefer label, name, or text properties
    const preferredValue = value.label ?? value.name ?? value.text ?? value.value;
    if (preferredValue !== undefined && preferredValue !== null) {
      return safeString(preferredValue);
    }
    
    return ''; // Better to show nothing than [object Object] in a PDF
  }
  return String(value);
}
