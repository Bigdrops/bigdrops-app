import React from 'react';
import { Download, FileText, Table, FileJson, X } from 'lucide-react';
import { ExportModuleDomain, ExportFormat, InheritedExportContext } from '../../types/exportHub';
import { fetchExportDataset } from '../../services/exportFetchers';
import { compileToCSV, flattenLineItems, triggerFileDownload } from '../../utils/exportCompilers';

interface ContextualExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  domain: ExportModuleDomain;
  activeContext: InheritedExportContext;
  supportedFormats: ExportFormat[];
}

export const ContextualExportSheet: React.FC<ContextualExportSheetProps> = ({
  isOpen,
  onClose,
  domain,
  activeContext,
  supportedFormats
}) => {
  const [isCompiling, setIsCompiling] = React.useState(false);

  if (!isOpen) return null;

  const handleDownloadTrigger = async (format: ExportFormat) => {
    setIsCompiling(true);
    try {
      // Fetch data directly adhering to active, un-paginated filter arrays
      const data = await fetchExportDataset(domain, activeContext);
      if (!data || data.length === 0) {
        alert('No matching records found within the current filter boundaries.');
        return;
      }

      const stamp = new Date().toISOString().split('T')[0];
      const filename = `${domain.toLowerCase()}_export_${stamp}`;

      switch (format) {
        case 'JSON_RAW':
          triggerFileDownload(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
          break;
        case 'CSV_SUMMARY':
          triggerFileDownload(compileToCSV(data), `${filename}_summary.csv`, 'text/csv');
          break;
        case 'CSV_FLATTENED_LINE_ITEMS':
          const flat = flattenLineItems(data, domain);
          triggerFileDownload(compileToCSV(flat), `${filename}_items.csv`, 'text/csv');
          break;
      }
      onClose();
    } catch (err) {
      console.error('Export compilation error:', err);
      alert('An error occurred during data compilation.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop Click Dismiss Gate */}
      <div className="absolute inset-0" onClick={!isCompiling ? onClose : undefined} />
      
      {/* Bottom Sheet UI Panel - Optimized Touch Hitboxes */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl p-4 shadow-xl border-t border-slate-200 dark:border-slate-800 transform translate-y-0 transition-transform duration-300 pb-safe">
        {/* Drag Indicator Bar */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Export Matching Dataset</h3>
            <p className="text-xs text-slate-500">Filters are automatically synchronized from your active view.</p>
          </div>
          <button 
            type="button" 
            disabled={isCompiling}
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Format Loop Container */}
        <div className="space-y-2">
          {supportedFormats.map((format) => (
            <button
              key={format}
              type="button"
              disabled={isCompiling}
              onClick={() => handleDownloadTrigger(format)}
              className="w-full h-12 px-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-left transition-colors duration-150 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                {format === 'JSON_RAW' && <FileJson className="w-5 h-5 text-amber-500" />}
                {format === 'CSV_SUMMARY' && <Table className="w-5 h-5 text-emerald-500" />}
                {format === 'CSV_FLATTENED_LINE_ITEMS' && <Table className="w-5 h-5 text-sky-500" />}
                <span>
                  {format === 'JSON_RAW' && 'Export Raw JSON Schema'}
                  {format === 'CSV_SUMMARY' && 'Download standard CSV Summary'}
                  {format === 'CSV_FLATTENED_LINE_ITEMS' && 'Download flattened Line-Items CSV'}
                </span>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
