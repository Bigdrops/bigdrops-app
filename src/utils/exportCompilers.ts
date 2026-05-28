/**
 * EXPORT COMPILERS — Pure Data Transformation Engines
 *
 * This module contains isolated, pure transformation functions for converting
 * raw database records into standardized export formats. All functions are:
 * - Pure (no side effects, deterministic output)
 * - Type-safe (no `any` types)
 * - Composable (can be chained for complex pipelines)
 * - Testable (no external dependencies beyond types)
 *
 * These functions run outside the React rendering thread and handle:
 * - CSV serialization with proper escaping
 * - Nested line-item flattening for relational data
 * - File download triggering
 */

import type { ExportModuleDomain } from '../types/exportHub';

/**
 * Safely escapes and formats a single CSV cell value.
 * Handles strings, numbers, dates, null values, and nested objects.
 *
 * CSV Escaping Rules:
 * - Wrap all values in double quotes
 * - Escape internal quotes by doubling them
 * - Convert objects to JSON strings
 * - Preserve numeric precision
 */
function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }

  // Convert objects to JSON strings
  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value);
    const escaped = jsonStr.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  // String values: escape quotes and wrap
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts a flat array of objects into a standard, secure CSV string format.
 *
 * Features:
 * - Automatic header extraction from first row
 * - Consistent column ordering
 * - Proper escaping for all cell values
 * - Handles empty datasets gracefully
 * - Preserves data types (numbers, dates, booleans)
 *
 * @param data - Array of objects to serialize
 * @returns CSV string with headers and data rows
 */
export function compileToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Extract headers from first row
  const headers = Object.keys(data[0]);

  // Build header row
  const csvRows: string[] = [headers.map((h) => formatCsvCell(h)).join(',')];

  // Build data rows
  for (const row of data) {
    const values = headers.map((header) => formatCsvCell(row[header]));
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Flattens nested transaction rows into a single row ledger grid.
 * Maps parent invoice/quotation attributes down to individual line items.
 *
 * This is essential for business analysis tools that expect flat, denormalized data.
 * Each line item row includes all parent document metadata for context.
 *
 * @param records - Array of parent documents with nested line items
 * @param domain - Export domain (INVOICES or QUOTATIONS)
 * @returns Flattened array where each row represents one line item
 */
export function flattenLineItems(
  records: Record<string, unknown>[],
  domain: ExportModuleDomain
): Record<string, unknown>[] {
  if (!records || records.length === 0) {
    return [];
  }

  const flattened: Record<string, unknown>[] = [];

  // Map domain to the correct nested items key
  const itemsKey =
    domain === 'INVOICES'
      ? 'invoice_items'
      : domain === 'QUOTATIONS'
        ? 'quotation_items'
        : domain === 'BOQS'
          ? 'boq_items'
          : 'items';

  for (const record of records) {
    // Extract line items array from the parent record
    const items = (record[itemsKey] as Record<string, unknown>[]) || [];

    // Build parent metadata to attach to each line
    const parentMeta: Record<string, unknown> = {
      parent_id: record.id || '',
      document_number:
        (record.invoice_number as string) ||
        (record.quotation_number as string) ||
        (record.boq_number as string) ||
        '',
      client_name: (record.client_name as string) || '',
      created_at: record.created_at || '',
      status: record.status || '',
      grand_total: record.total || record.grand_total || 0,
    };

    // If no items, still include parent metadata with placeholder
    if (items.length === 0) {
      flattened.push({
        ...parentMeta,
        item_description: 'No items recorded',
        quantity: 0,
        unit_price: 0,
        item_subtotal: 0,
        tax_rate: 0,
      });
    } else {
      // Flatten each line item with parent context
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;

        flattened.push({
          ...parentMeta,
          item_id: (item.id as string) || '',
          item_description: (item.description as string) || '',
          quantity,
          unit_price: unitPrice,
          item_subtotal: quantity * unitPrice,
          tax_rate: Number(item.tax_rate) || 0,
          tax_amount: (quantity * unitPrice * (Number(item.tax_rate) || 0)) / 100,
        });
      }
    }
  }

  return flattened;
}

/**
 * Triggers a native client-side web browser file download.
 * Creates a blob, generates a temporary download link, and simulates a click.
 *
 * This is the standard pattern for client-side file downloads in modern browsers.
 * The file is downloaded to the user's default Downloads folder.
 *
 * @param content - File content as string
 * @param filename - Suggested filename for the download
 * @param mimeType - MIME type (e.g., 'text/csv', 'application/json')
 */
export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  // Create blob from content
  const blob = new Blob([content], { type: mimeType });

  // Generate temporary object URL
  const url = window.URL.createObjectURL(blob);

  // Create temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);

  // Append to DOM (required for some browsers)
  document.body.appendChild(link);

  // Trigger download
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generates a timestamped filename for exports.
 * Format: `{domain}_{format}_{YYYY-MM-DD}.{ext}`
 *
 * @param domain - Export domain
 * @param format - Export format
 * @param extension - File extension (csv, json, pdf)
 * @returns Formatted filename
 */
export function generateExportFilename(
  domain: string,
  format: string,
  extension: string
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const domainLower = domain.toLowerCase();
  const formatLower = format.toLowerCase().replace(/_/g, '-');
  return `${domainLower}_${formatLower}_${timestamp}.${extension}`;
}
