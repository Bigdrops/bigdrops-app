import {
  FileInput,
  FileText,
  Layers3,
  Link2,
  Merge,
  NotebookText,
  Save,
  Settings2,
  XCircle,
} from 'lucide-react'

export function getActionsSheetItems({ mergeQtyUnit }) {
  return [
    { key: 'draft', icon: Save, label: 'Save Draft', description: 'Keep progress without sending', tone: 'bg-emerald-50 text-emerald-700' },
    { key: 'cancel', icon: XCircle, label: 'Cancel', description: 'Leave this document editor', tone: 'bg-rose-50 text-rose-700' },
    { key: 'columns', icon: Settings2, label: 'Open Column Manager', description: 'Adjust columns and overrides', tone: 'bg-slate-100 text-slate-700' },
    { key: 'import', icon: FileInput, label: 'Open Import', description: 'Paste JSON items into the table', tone: 'bg-amber-50 text-amber-700' },
    {
      key: 'qtyUnitMerge',
      icon: Merge,
      label: 'Qty + Unit merge',
      description: mergeQtyUnit ? 'Currently on for exports and print views' : 'Currently off for exports and print views',
      tone: mergeQtyUnit ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700',
    },
    { key: 'group', icon: Layers3, label: 'Add Group', description: 'Create a grouped item section', tone: 'bg-orange-50 text-orange-700' },
    { key: 'notes', icon: NotebookText, label: 'Scroll to Notes & Terms', description: 'Jump to rich text sections', tone: 'bg-violet-50 text-violet-700' },
    { key: 'links', icon: Link2, label: 'Scroll to Reference Links', description: 'Jump to link attachments', tone: 'bg-green-50 text-green-700' },
  ]
}

export function getImportHelpSteps() {
  return [
    {
      title: 'Add vs Update',
      description: 'Use Add for new rows. Use Update to patch existing rows with row_number.',
    },
    {
      title: 'Using Import',
      description: 'Copy the prompt, run it in your AI tool, paste JSON back here, then apply.',
    },
    {
      title: 'Common Mistakes',
      description: 'Avoid missing items arrays, invalid JSON, or updates without row_number.',
    },
  ]
}
