import React from 'react'
import { FolderKanban, Copy, Building2, MapPin, Hash, Calendar, DollarSign, Pencil } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROJECT_STATUS_CONFIG, formatCurrency, formatDate, cardClassName, inputClassName } from '@/domain/projectDetailUtils'
import { feedback } from '@/lib/feedback'
import { NumericInput } from '@/components/ui/numeric-input'

export default function ProjectDetailHeader({
  project,
  editing,
  setEditing,
  editForm,
  setEditForm,
  saving,
  onSave,
}) {
  const projectStatus = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.active

  if (!editing) {
    return (
      <div className={`${cardClassName} border-l-4 border-l-emerald-500 p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <FolderKanban size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${projectStatus.className}`}>
                {projectStatus.label}
              </span>
            </div>

            {project.project_code ? (
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-slate-700 ring-1 ring-slate-200">
                  {project.project_code}
                </span>
                <button
                  type="button"
                  title="Copy project code"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(project.project_code)
                      feedback.success('Copied', {
                        description: `${project.project_code} copied to clipboard.`,
                      })
                    } catch {
                      feedback.error('Copy failed')
                    }
                  }}
                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Copy size={12} />
                </button>
              </div>
            ) : null}

            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {project.client_name ? (
                <span className="inline-flex items-center gap-2">
                  <Building2 size={14} className="text-muted-foreground" />
                  <span className="font-semibold text-slate-800">{project.client_name}</span>
                </span>
              ) : null}

              {project.location ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span>{project.location}</span>
                </span>
              ) : null}

              {String(project.po_number || '').trim() ? (
                <span className="inline-flex items-center gap-2">
                  <Hash size={14} className="text-muted-foreground" />
                  <span>
                    PO: <span className="font-semibold text-slate-700">{String(project.po_number || '').trim()}</span>
                  </span>
                </span>
              ) : null}

              {project.start_date ? (
                <span className="inline-flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span>Started {formatDate(project.start_date)}</span>
                </span>
              ) : null}
            </div>

            {project.project_value ? (
              <div className="mb-1 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
                <DollarSign size={13} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(project.project_value)}</span>
              </div>
            ) : null}

            {project.notes ? <p className="text-sm italic text-muted-foreground">{project.notes}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardClassName} border-l-4 border-l-emerald-500 p-5 sm:p-6`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Name
            </label>
            <input
              className={inputClassName}
              value={editForm.name}
              onChange={(e) => setEditForm((form) => ({ ...form, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select value={editForm.status} onValueChange={(value) => setEditForm((form) => ({ ...form, status: value }))}>
              <SelectTrigger className={`${inputClassName} cursor-pointer`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              className={inputClassName}
              value={editForm.start_date}
              onChange={(e) => setEditForm((form) => ({ ...form, start_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Value (₦)
            </label>
            <NumericInput
              className={inputClassName}
              value={editForm.project_value}
              onChange={(val) => setEditForm((form) => ({ ...form, project_value: val }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              P.O. Number
            </label>
            <input
              className={inputClassName}
              value={editForm.po_number}
              onChange={(e) => setEditForm((form) => ({ ...form, po_number: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Site / Location
            </label>
            <input
              className={inputClassName}
              value={editForm.location}
              onChange={(e) => setEditForm((form) => ({ ...form, location: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <textarea
              className={`${inputClassName} min-h-[96px] resize-y`}
              value={editForm.notes}
              onChange={(e) => setEditForm((form) => ({ ...form, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
