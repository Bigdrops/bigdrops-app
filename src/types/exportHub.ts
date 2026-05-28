// ============================================================================
// EXPORT & LIFETIME DATA HUB — CORE TYPE MANIFEST
// Type-safe contracts for centralized data export operations
// ============================================================================

/**
 * Supported export output formats across all document modules.
 * Each format targets specific use cases and downstream systems.
 */
export type ExportFormat =
  | 'PDF_LEDGER'
  | 'CSV_SUMMARY'
  | 'CSV_FLATTENED_LINE_ITEMS'
  | 'JSON_RAW';

/**
 * All operational document domains within the BIGDROPS system.
 * Each domain represents a distinct data collection with its own
 * export capabilities and permission requirements.
 */
export type ExportModuleDomain =
  | 'INVOICES'
  | 'QUOTATIONS'
  | 'WAYBILLS'
  | 'PROJECTS'
  | 'RFQS'
  | 'BOQS'
  | 'PRICE_HISTORY'
  | 'CLIENTS'
  | 'CSR';

/**
 * Filter context inherited from the active module view toolbar.
 * Explicitly strips out pagination offsets to ensure full-set export operations.
 * This context is passed through the export pipeline to maintain consistency
 * with the user's current filtered view.
 */
export interface InheritedExportContext {
  /** Client ID filter, null if no client filter is active */
  clientId: string | null;

  /** Array of status filters applied in the source view */
  statuses: string[];

  /** Date range filter with ISO string boundaries */
  dateRange: { start: string | null; end: string | null } | null;

  /** Numeric range filter for amount-based fields */
  amountRange: { min: number | null; max: number | null } | null;

  /** Search tokens from the global search input */
  searchTokens: string[];

  /** Current sort field identifier */
  sortBy: string;

  /** Sort direction for the current sort field */
  sortDirection: 'asc' | 'desc';
}

/**
 * Registry entry for a single export module domain.
 * Defines metadata, supported formats, and access control requirements.
 */
export interface ExportCardRegistryItem {
  /** Unique identifier matching ExportModuleDomain */
  id: ExportModuleDomain;

  /** Display title for the export card */
  title: string;

  /** Subtitle describing the domain's content */
  subtitle: string;

  /** Array of export formats supported by this domain */
  supportedFormats: ExportFormat[];

  /** Permission string required to access this export domain */
  requiredPermission: string;
}

/**
 * Processing state for a single export operation.
 * Tracks the async lifecycle of an export request.
 */
export interface ExportProcessingState {
  /** Whether an export operation is currently in progress */
  isProcessing: boolean;

  /** Error message if the export failed, null if successful or pending */
  error: string | null;

  /** Timestamp of the last export attempt */
  lastAttemptAt: number | null;
}

/**
 * Complete export operation request payload.
 * Sent to the backend export pipeline for processing.
 */
export interface ExportOperationRequest {
  /** Target domain for export */
  domain: ExportModuleDomain;

  /** Desired output format */
  format: ExportFormat;

  /** Inherited filter context from source view */
  context: InheritedExportContext;

  /** Optional user-provided export name/label */
  exportLabel?: string;
}

/**
 * Response from a successful export operation.
 * Contains download URL and metadata about the generated file.
 */
export interface ExportOperationResponse {
  /** Unique export operation ID for tracking */
  operationId: string;

  /** Downloadable file URL (signed, time-limited) */
  downloadUrl: string;

  /** MIME type of the exported file */
  mimeType: string;

  /** Suggested filename for the download */
  filename: string;

  /** Total records included in the export */
  recordCount: number;

  /** Timestamp when the export was generated */
  generatedAt: string;

  /** Expiration timestamp for the download URL */
  expiresAt: string;
}
