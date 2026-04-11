import React, { useMemo } from 'react'

import type { TableDocumentColumn, TableDocumentRow, TableDocumentType, TableTemplateId } from '@/domain/table-document/types'

type DocumentLike = {
  title?: string
  notes?: string
  issue_date?: string
  rfq_number?: string
  boq_number?: string
  vendor_name?: string
  vendor_contact?: string
  show_vendor_identity?: boolean
  show_brand_name?: boolean
  brand_name_override?: string
  background_color?: string
  text_color?: string
  border_color?: string
  accent_color?: string
}

type Props = {
  documentType: TableDocumentType
  templateId: TableTemplateId
  document: DocumentLike
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
}

function getDisplayRows(rows: TableDocumentRow[]) {
  return rows.filter((row) => row.row_type === 'section' ? row.section_title.trim() : row.description.trim() || row.specification.trim() || row.notes.trim())
}

function getDocumentNumber(documentType: TableDocumentType, document: DocumentLike) {
  return documentType === 'boq' ? document.boq_number || 'BOQ' : document.rfq_number || 'RFQ'
}

function getDocumentTitle(documentType: TableDocumentType, document: DocumentLike) {
  if (document.title?.trim()) return document.title
  return documentType === 'boq' ? 'BILL OF QUANTITIES' : 'REQUEST FOR QUOTE'
}

function ModernPreview({ documentType, document, rows }: Omit<Props, 'templateId' | 'columns'>) {
  const displayRows = useMemo(() => getDisplayRows(rows), [rows])
  const styles = {
    container: {
      backgroundColor: document.background_color || '#FFFFFF',
      color: document.text_color || '#1F2937',
      borderColor: document.border_color || '#D1D5DB',
    },
    accent: {
      color: document.accent_color || '#1D4ED8',
    },
    accentBg: {
      backgroundColor: document.accent_color || '#1D4ED8',
    },
  }

  return (
    <div className="w-full min-h-[700px] shadow-sm flex flex-col p-8 font-sans overflow-hidden transition-all duration-300 border" style={styles.container}>
      <div className="flex justify-between items-start mb-8 pb-6 border-b" style={{ borderColor: document.border_color || '#D1D5DB' }}>
        <div>
          {document.show_brand_name ? (
            <h1 className="text-xl font-black tracking-tighter uppercase mb-1" style={styles.accent}>
              {document.brand_name_override || 'BIGDROPS'}
            </h1>
          ) : null}
          <div className="text-2xl font-black uppercase tracking-tight">{getDocumentTitle(documentType, document)}</div>
          <div className="text-xs font-mono mt-1 opacity-60 tabular-nums">NO. {getDocumentNumber(documentType, document)}</div>
        </div>

        {document.show_vendor_identity ? (
          <div className="text-right">
            <div className="text-[10px] font-bold opacity-40 uppercase mb-1 tracking-widest">
              {documentType === 'boq' ? 'Project / Vendor' : 'To Vendor'}
            </div>
            <div className="text-base font-black uppercase tracking-tight">{document.vendor_name || 'GUEST VENDOR'}</div>
            <div className="text-xs font-medium opacity-60">{document.vendor_contact}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {document.issue_date ? (
          <div>
            <div className="text-[10px] font-bold opacity-40 uppercase mb-0.5 tracking-widest">Issue Date</div>
            <div className="text-sm font-bold tabular-nums">{document.issue_date}</div>
          </div>
        ) : null}
        {document.notes ? (
          <div className="col-span-2">
            <div className="text-[10px] font-bold opacity-40 uppercase mb-1 tracking-widest">Notes</div>
            <div className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap max-w-2xl">{document.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: document.border_color || '#D1D5DB' }}>
              <th className="py-2 px-1 text-[10px] font-black uppercase tracking-widest opacity-40 w-8">#</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40">Item / Description</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40">Specification</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40 text-right w-16">Qty</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40 w-16">Unit</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center italic opacity-30 text-sm">No rows added yet</td>
              </tr>
            ) : (
              displayRows.map((row, index) => (
                row.row_type === 'section' ? (
                  <tr key={row.id || row._uiKey || `section-${index}`} className="border-b" style={{ borderColor: document.border_color || '#D1D5DB' }}>
                    <td className="py-3 px-1"></td>
                    <td colSpan={4} className="py-3 px-2">
                      <div className="text-xs font-black uppercase tracking-[0.18em]" style={styles.accent}>
                        {row.section_title || `Section ${index + 1}`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <React.Fragment key={row.id || row._uiKey || `row-${index}`}>
                    <tr className="border-b" style={{ borderColor: document.border_color || '#D1D5DB' }}>
                      <td className="py-4 px-1 align-top font-mono text-[11px] opacity-40">{String(index + 1).padStart(2, '0')}</td>
                      <td className="py-4 px-2 align-top">
                        <div className="text-sm font-bold leading-tight">{row.description || 'Untitled Item'}</div>
                      </td>
                      <td className="py-4 px-2 align-top">
                        {row.specification ? <div className="text-[11px] font-medium leading-relaxed opacity-80 whitespace-pre-wrap">{row.specification}</div> : null}
                      </td>
                      <td className="py-4 px-2 align-top text-right font-black tabular-nums text-sm">{row.quantity}</td>
                      <td className="py-4 px-2 align-top text-[10px] font-bold uppercase opacity-60">{row.unit || '-'}</td>
                    </tr>
                    {row.notes ? (
                      <tr className="border-b" style={{ borderColor: document.border_color || '#D1D5DB' }}>
                        <td className="py-2 px-1"></td>
                        <td colSpan={4} className="py-2 px-2 pb-4">
                          <div className="flex items-start gap-2">
                            <div className="h-4 w-0.5 rounded-full mt-0.5" style={styles.accentBg} />
                            <div className="text-[11px] opacity-60 italic leading-snug">{row.notes}</div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BorderedSchedulePreview({ documentType, document, rows, columns }: Props) {
  const displayRows = useMemo(() => getDisplayRows(rows), [rows])
  const visibleColumns = columns.filter((column) => column.visible)

  return (
    <div
      className="w-full min-h-[700px] bg-white border border-slate-400 p-5 text-slate-900"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mb-4 space-y-1">
        <div className="text-center text-sm font-bold uppercase tracking-[0.12em]">{getDocumentTitle(documentType, document)}</div>
        <div className="text-center text-xs">{getDocumentNumber(documentType, document)}</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-[11px]">
        <div><span className="font-bold">Vendor:</span> {document.vendor_name || '-'}</div>
        <div className="text-right"><span className="font-bold">Date:</span> {document.issue_date || '-'}</div>
        {document.notes ? <div className="col-span-2 whitespace-pre-wrap"><span className="font-bold">Notes:</span> {document.notes}</div> : null}
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border border-slate-500 px-2 py-2 text-left font-bold">S/No</th>
            {visibleColumns.map((column) => (
              <th key={column.key} className="border border-slate-500 px-2 py-2 text-left font-bold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length + 1} className="border border-slate-400 px-2 py-6 text-center text-slate-500">
                No rows added yet
              </td>
            </tr>
          ) : displayRows.map((row, index) => (
            row.row_type === 'section' ? (
              <tr key={row.id || row._uiKey || `section-${index}`} className="bg-slate-100">
                <td colSpan={visibleColumns.length + 1} className="border border-slate-500 px-2 py-2 font-bold uppercase tracking-[0.08em]">
                  {row.section_title || `Section ${index + 1}`}
                </td>
              </tr>
            ) : (
              <tr key={row.id || row._uiKey || `row-${index}`}>
                <td className="border border-slate-400 px-2 py-2 align-top">{index + 1}</td>
                {visibleColumns.map((column) => {
                  const value = row[column.key] as string | number
                  return (
                    <td key={column.key} className="border border-slate-400 px-2 py-2 align-top whitespace-pre-wrap">
                      {value || (column.key === 'quantity' ? row.quantity : '') || '-'}
                    </td>
                  )
                })}
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TableDocumentPreview(props: Props) {
  if (props.templateId === 'bordered_schedule') {
    return <BorderedSchedulePreview {...props} />
  }

  return <ModernPreview documentType={props.documentType} document={props.document} rows={props.rows} />
}
