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
    { key: 'draft', icon: Save, label: 'Save Changes', tone: 'bg-emerald-50 text-emerald-700' },
    { key: 'cancel', icon: XCircle, label: 'Cancel', tone: 'bg-rose-50 text-rose-700' },
    { key: 'columns', icon: Settings2, label: 'Open Column Manager', tone: 'bg-slate-100 text-slate-700' },
    { key: 'import', icon: FileInput, label: 'Open Import', tone: 'bg-amber-50 text-amber-700' },
    {
      key: 'qtyUnitMerge',
      icon: Merge,
      label: 'Qty + Unit merge',
      tone: mergeQtyUnit ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700',
    },
    { key: 'group', icon: Layers3, label: 'Add Group', tone: 'bg-orange-50 text-orange-700' },
    { key: 'notes', icon: NotebookText, label: 'Scroll to Notes & Terms', tone: 'bg-violet-50 text-violet-700' },
    { key: 'links', icon: Link2, label: 'Scroll to Reference Links', tone: 'bg-green-50 text-green-700' },
  ]
}

export function getImportHelpSteps() {
  return []
}
