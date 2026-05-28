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
import { domainSchemas, lineItemSchema, formatDate, combineAddress, DATE_FIELDS } from './exportSchemas';
import type { Domain } from './exportSchemas';

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
 * When a domain is provided, applies schema-based field whitelisting and
 * human-readable column header renaming. Strips internal IDs and formats dates.
 *
 * @param data - Array of objects to serialize
 * @param domain - Optional domain for schema-based field mapping
 * @returns CSV string with headers and data rows
 */
export function compileToCSV(data: Record<string, unknown>[], domain?: ExportModuleDomain): string {
  if (!data || data.length === 0) {
    return '';
  }

  const schemaDomain = domain as Domain | undefined;
  const schema = schemaDomain ? domainSchemas[schemaDomain] : null;

  // If we have a schema, apply field whitelisting and renaming
  if (schema) {
    const allowedFields = Object.keys(schema);
    const sanitized = data.map((row) => {
      const newRow: Record<string, unknown> = {};
      for (const field of allowedFields) {
        let value = row[field];
        if (DATE_FIELDS.has(field)) {
          value = formatDate(value);
        }
        newRow[schema[field]] = value ?? '';
      }
      // Add combined address for CLIENTS
      if (schemaDomain === 'CLIENTS') {
        newRow['Address'] = combineAddress(row);
      }
      return newRow;
    });
    return arrayToCSV(sanitized);
  }

  // Fallback: raw data without schema mapping
  return arrayToCSV(data);
}

/**
 * Serializes an array of objects to CSV without schema transformation.
 */
function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [headers.map((h) => formatCsvCell(h)).join(',')];
  for (const row of data) {
    const values = headers.map((header) => formatCsvCell(row[header]));
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

/**
 * Checks whether any record in the data array contains nested line items.
 * Used to conditionally show/hide the "CSV with Line Items" export option.
 */
export function hasLineItems(data: Record<string, unknown>[]): boolean {
  if (!data || data.length === 0) return false;

  // Check first few records for common line-item property names
  const sample = data.slice(0, 5);
  const possibleItemProps = ['items', 'line_items', 'invoice_items', 'quotation_items', 'boq_items', 'lineItems'];

  for (const record of sample) {
    for (const prop of possibleItemProps) {
      const items = record[prop];
      if (Array.isArray(items) && items.length > 0) return true;
    }

    // Also check inside custom_fields JSON string
    const customFields = record.custom_fields;
    if (customFields && typeof customFields === 'string') {
      try {
        const parsed = JSON.parse(customFields) as Record<string, unknown>;
        const nestedItems = parsed.items || parsed.lineItems || parsed.invoice_items;
        if (Array.isArray(nestedItems) && nestedItems.length > 0) return true;
      } catch { /* ignore malformed JSON */ }
    }
  }

  return false;
}

/**
 * Flattens nested transaction rows into a single row ledger grid.
 * Uses domain schema for parent fields and lineItemSchema for item fields.
 * Parents with zero line items are omitted entirely (no placeholder rows).
 *
 * @param records - Array of parent documents with nested line items
 * @param domain - Export domain (INVOICES, QUOTATIONS, BOQS)
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
  const schemaDomain = domain as Domain;
  const parentSchema = domainSchemas[schemaDomain] || {};

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
    const items = (record[itemsKey] as Record<string, unknown>[]) || [];

    // Skip parents with no line items entirely
    if (items.length === 0) {
      continue;
    }

    for (const item of items) {
      const flatRow: Record<string, unknown> = {};

      // Copy parent fields using domain schema (human-readable headers)
      for (const [dbField, header] of Object.entries(parentSchema)) {
        let value = record[dbField];
        if (DATE_FIELDS.has(dbField)) {
          value = formatDate(value);
        }
        flatRow[header] = value ?? '';
      }

      // Copy line-item fields using lineItemSchema
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;

      flatRow[lineItemSchema.item_description] = (item.description as string) || '';
      flatRow[lineItemSchema.quantity] = quantity;
      flatRow[lineItemSchema.unit_price] = unitPrice;
      flatRow[lineItemSchema.item_subtotal] = quantity * unitPrice;

      flattened.push(flatRow);
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
