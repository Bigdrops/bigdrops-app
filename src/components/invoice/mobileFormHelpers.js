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
    { key: 'draft', icon: Save, label: 'Save Changes', tone: 'success' },
    { key: 'cancel', icon: XCircle, label: 'Cancel', tone: 'danger' },
    { key: 'columns', icon: Settings2, label: 'Open Column Manager', tone: 'default' },
    { key: 'import', icon: FileInput, label: 'Open Import', tone: 'warning' },
    {
      key: 'qtyUnitMerge',
      icon: Merge,
      label: 'Qty + Unit merge',
      tone: mergeQtyUnit ? 'success' : 'default',
    },
    { key: 'group', icon: Layers3, label: 'Add Group', tone: 'info' },
    { key: 'notes', icon: NotebookText, label: 'Scroll to Notes & Terms', tone: 'info' },
    { key: 'links', icon: Link2, label: 'Scroll to Reference Links', tone: 'success' },
  ]
}

export function getImportHelpSteps() {
  return [
    {
      title: 'Add vs Update',
      description:
        'Add appends new rows to the bottom of your item list. Use this when importing from a quote or external document.\n\nUpdate patches existing rows using row_number. Use this to batch-edit prices or quantities.',
    },
    {
      title: 'Using Import',
      description:
        'Copy a BigDrops AI prompt, paste it into your AI tool, copy the JSON output, then paste it into the JSON input field and tap Apply.',
    },
    {
      title: 'Common Mistakes',
      description:
        '• Missing items key in JSON\n• Using Update when you meant Add\n• Wrong row_number values in Update mode\n• Extra text outside the JSON object',
    },
  ]
}
