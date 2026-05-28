import React, { useState } from 'react';
import { Download, Table, FileJson, Loader2 } from 'lucide-react';
import type { ExportModuleDomain, ExportFormat } from '../../types/exportHub';
import { compileToCSV, flattenLineItems, triggerFileDownload, hasLineItems } from '../../utils/exportCompilers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContextualExportDropdownProps {
  domain: ExportModuleDomain;
  data: Record<string, unknown>[];
  supportedFormats: ExportFormat[];
  recordCount: number;
}

export const ContextualExportDropdown: React.FC<ContextualExportDropdownProps> = ({
  domain,
  data,
  supportedFormats,
  recordCount,
}) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const showLineItemsOption = supportedFormats.includes('CSV_FLATTENED_LINE_ITEMS') && hasLineItems(data);

  const handleExportExecution = async (format: ExportFormat) => {
    if (isCompiling) return;
    setIsCompiling(true);
    try {
      if (!data || data.length === 0) {
        alert('No matching records found for your current filters.');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${domain.toLowerCase()}_export_${timestamp}`;

      switch (format) {
        case 'JSON_RAW':
          triggerFileDownload(
            JSON.stringify(data, null, 2),
            `${baseFilename}_all_data.json`,
            'application/json',
          );
          break;
        case 'CSV_SUMMARY':
          triggerFileDownload(
            compileToCSV(data, domain),
            `${baseFilename}_summary.csv`,
            'text/csv',
          );
          break;
        case 'CSV_FLATTENED_LINE_ITEMS': {
          const flatRows = flattenLineItems(data, domain);
          triggerFileDownload(
            compileToCSV(flatRows),
            `${baseFilename}_line_items.csv`,
            'text/csv',
          );
          break;
        }
        default:
          console.warn('Unsupported format:', format);
      }
    } catch (error) {
      console.error('Export compilation error:', error);
      alert('Failed to compile export data. Check console for details.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isCompiling}
          className="flex items-center justify-center rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))] transition-colors duration-150 disabled:opacity-50 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
          style={{ minWidth: '44px', minHeight: '44px', width: '36px', height: '36px' }}
          aria-label="Export data"
        >
          {isCompiling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          Export Scope ({recordCount} items)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedFormats.includes('CSV_SUMMARY') && (
          <DropdownMenuItem
            onClick={() => void handleExportExecution('CSV_SUMMARY')}
            className="gap-2 text-xs font-semibold cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <Table className="w-4 h-4 text-emerald-500" />
            <span>CSV Summary</span>
          </DropdownMenuItem>
        )}
        {showLineItemsOption && (
          <DropdownMenuItem
            onClick={() => void handleExportExecution('CSV_FLATTENED_LINE_ITEMS')}
            className="gap-2 text-xs font-semibold cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <Table className="w-4 h-4 text-sky-500" />
            <span>CSV with Line Items</span>
          </DropdownMenuItem>
        )}
        {supportedFormats.includes('JSON_RAW') && (
          <DropdownMenuItem
            onClick={() => void handleExportExecution('JSON_RAW')}
            className="gap-2 text-xs font-semibold cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <FileJson className="w-4 h-4 text-amber-500" />
            <span>JSON (raw)</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
