import React, { useState, useEffect } from 'react';
import { Download, Table, FileJson, X, ChevronRight, HelpCircle, RefreshCw } from 'lucide-react';
import { ExportModuleDomain, ExportFormat, InheritedExportContext } from '../../types/exportHub';
import { fetchExportDataset } from '../../services/exportFetchers';
import { compileToCSV, flattenLineItems, triggerFileDownload } from '../../utils/exportCompilers';

interface ContextualExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  domain: ExportModuleDomain;
  activeContext: InheritedExportContext;
  supportedFormats: ExportFormat[];
  recordCount: number; // Injected to provide explicit, dynamic data scope numbers
}

export const ContextualExportSheet: React.FC<ContextualExportSheetProps> = ({
  isOpen,
  onClose,
  domain,
  activeContext,
  supportedFormats,
  recordCount
}) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  // Check LocalStorage to see if user has already viewed the onboarding tour
  useEffect(() => {
    if (isOpen) {
      const hasSeenTour = localStorage.getItem(`has_seen_export_tour_${domain.toLowerCase()}`);
      if (!hasSeenTour) {
        setTutorialStep(1); // Auto-trigger tutorial card stack for first-time use
      } else {
        setTutorialStep(null); // Direct layout view for recurring users
      }
    }
  }, [isOpen, domain]);

  if (!isOpen) return null;

  const dismissTutorialPermanently = () => {
    localStorage.setItem(`has_seen_export_tour_${domain.toLowerCase()}`, 'true');
    setTutorialStep(null);
  };

  const handleDownloadTrigger = async (format: ExportFormat) => {
    setIsCompiling(true);
    try {
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
      console.error('Export execution failure:', err);
      alert('An error occurred during background data compilation.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={!isCompiling ? onClose : undefined} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-2xl p-5 shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        
        {/* Dynamic Descriptive Header Block */}
        <div className="flex items-start justify-between mb-4 text-left">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Export {domain.charAt(0) + domain.slice(1).toLowerCase()} Records
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              ⚡ You are downloading <span className="text-emerald-600 dark:text-emerald-400 font-bold">{recordCount} records</span> fully customized to your active filter parameters.
            </p>
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

        {/* 📖 FIRST-TIME WALKTHROUGH TUTORIAL CAROUSEL MODAL PANEL */}
        {tutorialStep !== null ? (
          <div className="mb-4 bg-sky-50/80 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-100 dark:border-sky-900/50 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase bg-sky-100 dark:bg-sky-900 px-2 py-0.5 rounded-md">
                Guide Step {tutorialStep} of 2
              </span>
              <button 
                type="button" 
                onClick={dismissTutorialPermanently}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Skip Guide
              </button>
            </div>

            {tutorialStep === 1 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How Data Flattening Works</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Choosing **Flattened Line-Items** splits complex child details into their own separate rows inside Excel, while cleanly duplicating the top parent identifiers on the left.
                </p>
                <button
                  type="button"
                  onClick={() => setTutorialStep(2)}
                  className="mt-3 h-9 px-3 w-full flex items-center justify-center gap-1 bg-sky-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  <span>Next Feature Overview</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {tutorialStep === 2 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Real-Time Context Filter Preservation</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Your search bar entries, selected client parameters, and status tags apply directly to this export file. What you isolate on the screen is exactly what gets compiled.
                </p>
                <button
                  type="button"
                  onClick={dismissTutorialPermanently}
                  className="mt-3 h-9 w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Got It, Let's Export!
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Small action link to trigger the overview tutorial manually */
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setTutorialStep(1)}
              className="text-[11px] font-semibold text-slate-500 hover:text-sky-600 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Show Feature Guide</span>
            </button>
          </div>
        )}

        {/* Action Options Loop Container */}
        <div className="space-y-2">
          {supportedFormats.map((format) => (
            <button
              key={format}
              type="button"
              disabled={isCompiling}
              onClick={() => handleDownloadTrigger(format)}
              className="w-full px-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-left transition-all duration-150 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 shadow-xs"
              style={{ minHeight: '48px' }} // Strict mobile thumb safety standard hitboxes
            >
              <div className="flex items-center gap-3">
                {format === 'JSON_RAW' && <FileJson className="w-5 h-5 text-amber-500" />}
                {format === 'CSV_SUMMARY' && <Table className="w-5 h-5 text-emerald-500" />}
                {format === 'CSV_FLATTENED_LINE_ITEMS' && <Table className="w-5 h-5 text-sky-500" />}
                <div className="flex flex-col">
                  <span>
                    {format === 'JSON_RAW' && 'Export Raw JSON Schema Tree'}
                    {format === 'CSV_SUMMARY' && 'Download standard CSV Summary Matrix'}
                    {format === 'CSV_FLATTENED_LINE_ITEMS' && 'Download flattened Line-Items Grid'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                    {format === 'JSON_RAW' && 'Nested relational file representation'}
                    {format === 'CSV_SUMMARY' && 'One row entry per single document record'}
                    {format === 'CSV_FLATTENED_LINE_ITEMS' && 'Denormalized ledger for deep reporting spreadsheet apps'}
                  </span>
                </div>
              </div>
              {isCompiling ? (
                <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
