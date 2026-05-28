import React, { useState } from 'react';
import { FileText, Table, FileJson, ChevronDown, Download } from 'lucide-react';
import { ExportFormat, ExportCardRegistryItem } from '../../types/exportHub';

interface ExportDropdownRowProps {
  item: ExportCardRegistryItem;
  onExecuteExport: (format: ExportFormat) => Promise<void>;
  isProcessing: boolean;
}

/**
 * ExportDropdownRow — Interactive accordion row for export module options.
 *
 * Features:
 * - Touch-optimized 44px minimum hitbox for all interactive elements
 * - Pure SVG vector icons (no text emojis)
 * - Native Tailwind hardware-accelerated animations
 * - Responsive dark mode support
 * - Per-format processing state management
 */
export const ExportDropdownRow: React.FC<ExportDropdownRowProps> = ({
  item,
  onExecuteExport,
  isProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Maps export format to its corresponding icon and color.
   * Uses semantic color coding for format types.
   */
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'PDF_LEDGER':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'CSV_SUMMARY':
      case 'CSV_FLATTENED_LINE_ITEMS':
        return <Table className="w-5 h-5 text-emerald-500" />;
      case 'JSON_RAW':
        return <FileJson className="w-5 h-5 text-amber-500" />;
    }
  };

  /**
   * Generates user-facing label for each export format.
   */
  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'PDF_LEDGER':
        return 'Download as PDF';
      case 'CSV_SUMMARY':
        return 'Download CSV';
      case 'CSV_FLATTENED_LINE_ITEMS':
        return 'Download CSV with Line Items';
      case 'JSON_RAW':
        return 'Export JSON Schema';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200 mb-3 shadow-sm">
      {/* Accordion Toggle Header — Touch safety height wrapper (56px) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-14 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 text-left"
        style={{ minHeight: '56px' }}
      >
        <div className="flex flex-col pr-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.title}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {item.subtitle}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Actions Grid — Native Tailwind transform animation */}
      <div
        className={`transition-all duration-200 ease-in-out border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden ${
          isOpen
            ? 'max-h-64 opacity-100 visible'
            : 'max-h-0 opacity-0 invisible'
        }`}
      >
        {item.supportedFormats.map((format) => (
          <button
            key={format}
            type="button"
            disabled={isProcessing}
            onClick={() => onExecuteExport(format)}
            className="w-full h-12 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-left"
            style={{ minHeight: '44px' }}
          >
            <div className="flex items-center gap-3">
              {getFormatIcon(format)}
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {getFormatLabel(format)}
              </span>
            </div>
            <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
