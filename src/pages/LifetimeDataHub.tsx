import React, { useState } from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import {
  InheritedExportContext,
  ExportCardRegistryItem,
  ExportFormat,
  ExportModuleDomain,
} from '../types/exportHub';
import { ExportDropdownRow } from '../components/export/ExportDropdownRow';
import { getExportData, isValidExportContext, getFilterSummary } from '../services/exportFetchers';
import { useEntity } from '@/lib/tenant/contexts';
import {
  compileToCSV,
  flattenLineItems,
  triggerFileDownload,
  generateExportFilename,
} from '../utils/exportCompilers';

interface LifetimeDataHubProps {
  inheritedContext: InheritedExportContext;
  onNavigateBack: () => void;
  matchingRecordsCount: number;
}

/**
 * Complete registry of all exportable domains within BIGDROPS.
 * Each entry defines the domain's metadata, supported formats, and access requirements.
 */
const EXPORT_REGISTRY: ExportCardRegistryItem[] = [
  {
    id: 'INVOICES',
    title: 'Invoices Ledger',
    subtitle: 'Billing summaries, collections, and layouts',
    supportedFormats: [
      'PDF_LEDGER',
      'CSV_SUMMARY',
      'CSV_FLATTENED_LINE_ITEMS',
      'JSON_RAW',
    ],
    requiredPermission: 'read:sales',
  },
  {
    id: 'QUOTATIONS',
    title: 'Quotations & Estimates',
    subtitle: 'Commercial proposals and item configurations',
    supportedFormats: [
      'PDF_LEDGER',
      'CSV_SUMMARY',
      'CSV_FLATTENED_LINE_ITEMS',
      'JSON_RAW',
    ],
    requiredPermission: 'read:sales',
  },
  {
    id: 'WAYBILLS',
    title: 'Waybills / Delivery Notes',
    subtitle: 'Logistical distribution tracking metrics',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:logistics',
  },
  {
    id: 'PROJECTS',
    title: 'Projects Matrix',
    subtitle: 'Milestone logs and resource allocations',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:projects',
  },
  {
    id: 'RFQS',
    title: 'Requests for Quotation (RFQs)',
    subtitle: 'Procurement tracking and supplier responses',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:procurement',
  },
  {
    id: 'BOQS',
    title: 'Bills of Quantities (BOQs)',
    subtitle: 'Engineering breakdowns and material estimators',
    supportedFormats: ['CSV_SUMMARY', 'CSV_FLATTENED_LINE_ITEMS', 'JSON_RAW'],
    requiredPermission: 'read:engineering',
  },
  {
    id: 'PRICE_HISTORY',
    title: 'Price History Ledger',
    subtitle: 'Historical line-item material rate adjustments',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:analytics',
  },
  {
    id: 'CLIENTS',
    title: 'Clients Directory',
    subtitle: 'Corporate demographic data and contact details',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:clients',
  },
  {
    id: 'CSR',
    title: 'Client Service Records (CSR)',
    subtitle: 'Communication records and logs archive',
    supportedFormats: ['CSV_SUMMARY', 'JSON_RAW'],
    requiredPermission: 'read:support',
  },
];

/**
 * LifetimeDataHub — Central viewport for exporting and analyzing lifetime data.
 *
 * Features:
 * - Parametric filter context inheritance from active module views
 * - Per-card localized processing states (non-blocking)
 * - Touch-optimized responsive layout
 * - Dark mode support
 * - All 9 system domains with exhaustive format support
 *
 * Stage 1 Foundation:
 * - Type-safe contracts ✓
 * - Touch-optimized accordion rendering ✓
 * - Responsive dashboard layout ✓
 * - Filter context integration ✓
 *
 * Stage 2 (Future):
 * - Backend export pipeline integration
 * - Real-time progress tracking
 * - Batch export operations
 * - Export history and scheduling
 */
export const LifetimeDataHub: React.FC<LifetimeDataHubProps> = ({
  inheritedContext,
  onNavigateBack,
  matchingRecordsCount,
}) => {
  const { tenantClient } = useEntity()
  /**
   * Localized map tracking processing flags separately per component card domain.
   * Allows independent async operations without blocking the UI.
   */
  const [processingStates, setProcessingStates] = useState<
    Partial<Record<ExportModuleDomain, boolean>>
  >({});

  /**
   * Executes an export operation for a specific domain and format.
   * Manages per-card processing state and error handling.
   *
   * Pipeline:
   * 1. Validate context
   * 2. Fetch full dataset from database (no pagination)
   * 3. Apply format-specific transformations
   * 4. Trigger client-side download
   */
  const handleExecuteExport = async (
    domain: ExportModuleDomain,
    format: ExportFormat
  ) => {
    setProcessingStates((prev) => ({ ...prev, [domain]: true }));
    try {
      // Validate context before attempting fetch
      if (!isValidExportContext(inheritedContext)) {
        throw new Error('Invalid export context: check filter parameters');
      }

      console.log(
        `[EXPORT] Starting ${domain} export in ${format} format`,
        `Filters: ${getFilterSummary(inheritedContext)}`
      );

      // Step 1: Extract complete dataset without pagination overrides
      const rawData = await getExportData(domain, inheritedContext, tenantClient);

      if (!rawData || rawData.length === 0) {
        alert(
          'No matching records found for the selected criteria boundaries.'
        );
        return;
      }

      console.log(
        `[EXPORT] Retrieved ${rawData.length} records from ${domain}`
      );

      // Step 2: Route through the targeted compiler format pipelines
      let fileContent: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'JSON_RAW': {
          fileContent = JSON.stringify(rawData, null, 2);
          filename = generateExportFilename(domain, format, 'json');
          mimeType = 'application/json';
          break;
        }

        case 'CSV_SUMMARY': {
          fileContent = compileToCSV(
            rawData as Record<string, unknown>[]
          );
          filename = generateExportFilename(domain, format, 'csv');
          mimeType = 'text/csv';
          break;
        }

        case 'CSV_FLATTENED_LINE_ITEMS': {
          const flatData = flattenLineItems(
            rawData as Record<string, unknown>[],
            domain
          );
          fileContent = compileToCSV(flatData);
          filename = generateExportFilename(domain, 'CSV_FLATTENED', 'csv');
          mimeType = 'text/csv';
          break;
        }

        case 'PDF_LEDGER': {
          // PDF generation is handled by Stage 3 PDF engine
          console.log(
            '[EXPORT] PDF ledger compilation context ready for Stage 3'
          );
          alert(
            'PDF export is coming in Stage 3. JSON or CSV export available now.'
          );
          return;
        }

        default: {
          const _exhaustive: never = format;
          throw new Error(`Unknown export format: ${_exhaustive}`);
        }
      }

      // Step 3: Trigger client-side download
      triggerFileDownload(fileContent, filename, mimeType);

      console.log(
        `[EXPORT] Successfully downloaded ${filename} (${fileContent.length} bytes)`
      );
    } catch (error) {
      console.error('[EXPORT] Data compilation error encountered:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setProcessingStates((prev) => ({ ...prev, [domain]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col pb-safe">
      {/* Navigation Header Section */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-3 sticky top-0 z-40">
        <button
          type="button"
          onClick={onNavigateBack}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors duration-200"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-tight">
            Export & Lifetime Data
          </h1>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Analytical Integration Center
          </span>
        </div>
      </header>

      {/* Main Container Body */}
      <div className="flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Parametric Filter Synchronization Meta Banner */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md mb-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Active Criteria Filter Sync
            </h2>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            The reporting core has inherited your active search tokens. Export
            actions operate strictly across the isolated query scope.
          </p>
          <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50">
            <span className="text-xs font-medium text-slate-300">
              Matched Population Profile:{' '}
              <strong className="text-white">{matchingRecordsCount} records found</strong>
            </span>
          </div>
        </div>

        {/* Dashboard Accordion Items Grid */}
        <div className="w-full">
          {EXPORT_REGISTRY.map((item) => (
            <ExportDropdownRow
              key={item.id}
              item={item}
              isProcessing={!!processingStates[item.id]}
              onExecuteExport={(format) =>
                handleExecuteExport(item.id, format)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};
