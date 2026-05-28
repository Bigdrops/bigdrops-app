import React, { useState } from 'react';
import { Download, Table, FileJson, Loader2 } from 'lucide-react';
import type { ExportModuleDomain, ExportFormat, InheritedExportContext } from '../../types/exportHub';
import { fetchExportDataset } from '../../services/exportFetchers';
import { compileToCSV, flattenLineItems, triggerFileDownload } from '../../utils/exportCompilers';
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
  activeContext: InheritedExportContext;
  supportedFormats: ExportFormat[];
  recordCount: number;
}

export const ContextualExportDropdown: React.FC<ContextualExportDropdownProps> = ({
  domain,
  activeContext,
  supportedFormats,
  recordCount,
}) => {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleExportExecution = async (format: ExportFormat) => {
    if (isCompiling) return;
    setIsCompiling(true);
    try {
      const data = await fetchExportDataset(domain, activeContext);
      if (!data || data.length === 0) {
        alert('No matching dataset records found for your active filters.');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${domain.toLowerCase()}_export_${timestamp}`;

      switch (format) {
        case 'JSON_RAW':
          triggerFileDownload(JSON.stringify(data, null, 2), `${baseFilename}_all_data.json`, 'application/json');
          break;
        case 'CSV_SUMMARY':
          triggerFileDownload(compileToCSV(data), `${baseFilename}_summary.csv`, 'text/csv');
          break;
        case 'CSV_FLATTENED_LINE_ITEMS': {
          const flatRows = flattenLineItems(data, domain);
          triggerFileDownload(compileToCSV(flatRows), `${baseFilename}_line_items.csv`, 'text/csv');
          break;
        }
      }
    } catch (error) {
      console.error('Data compilation pipeline error:', error);
      alert('Background compilation failed. Verify your network dataset parameters.');
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
          className="flex items-center justify-center rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))] transition-colors duration-150 disabled:opacity-50"
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
      <DropdownMenuContent align="end" className="w-64">
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
        {supportedFormats.includes('CSV_FLATTENED_LINE_ITEMS') && (
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
            <span>JSON (Full Data)</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
