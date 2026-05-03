/**
 * Utilities for project-wide numeric input formatting with thousands separators (commas).
 * These are used to provide a better UX while keeping internal state as raw numbers.
 */

/**
 * Sanitizes an input string to contain only digits, one decimal point, and an optional minus sign.
 * Removes any other characters including existing commas.
 */
export const sanitizeNumberInput = (value: string): string => {
  // Remove everything except digits, decimal point, and leading minus
  let sanitized = value.replace(/[^\d.-]/g, '');
  
  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Ensure minus sign only at the start
  if (sanitized.includes('-') && sanitized.indexOf('-') !== 0) {
    sanitized = sanitized.replace(/-/g, '');
    if (value.startsWith('-')) {
      sanitized = '-' + sanitized;
    }
  }
  
  return sanitized;
};

/**
 * Formats a raw number or numeric string with thousands separators.
 * Preserves decimal points and trailing zeros while typing.
 */
export const formatNumberInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  
  const stringValue = value.toString();
  
  // If it's just a minus sign or ends with a decimal point, return as is to allow typing
  if (stringValue === '-' || stringValue === '.' || stringValue === '-.') return stringValue;
  
  const parts = stringValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : null;
  
  // Format integer part with commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return decimalPart !== null ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Parses a formatted string back into a raw number.
 * Returns null if the input is not a valid number.
 */
export const parseNumberInput = (value: string): number | null => {
  const sanitized = sanitizeNumberInput(value);
  if (sanitized === '' || sanitized === '-') return null;
  const num = parseFloat(sanitized);
  return isNaN(num) ? null : num;
};
