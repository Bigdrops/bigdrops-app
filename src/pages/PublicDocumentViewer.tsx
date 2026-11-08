import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchPublicDocumentShare } from '@/domain/documentShare/documentShareService'
import type { DocumentShareRecord, DocumentShareMetadata } from '@/domain/documentShare/types'

export default function PublicDocumentViewer() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<DocumentShareRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      if (!token) {
        setError('Missing document link token.')
        setLoading(false)
        return
      }

      setLoading(true)
      const res = await fetchPublicDocumentShare(token)
      if (!active) return

      if (res.error || !res.record) {
        setError(res.error || 'Document not found.')
        setLoading(false)
        return
      }

      setRecord(res.record)
      setError(null)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [token])

  // Revoke Blob URL on final unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (record?.pdf_url?.startsWith('blob:')) {
        URL.revokeObjectURL(record.pdf_url)
      }
    }
  }, [record?.pdf_url])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] p-4 text-[#1a1815]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1a1815] border-t-transparent" />
          <span className="font-mono text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            Loading document...
          </span>
        </div>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] p-4 text-[#1a1815]">
        <Card className="w-full max-w-md border-bd-border bg-white p-6 shadow-sm">
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={24} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-[#1a1815]">Document Unavailable</h1>
            <p className="text-sm text-muted-foreground">
              {error || 'This link has expired or was revoked by the issuer.'}
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button variant="outline" className="text-xs">
                  Go to BOURXE Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const meta: DocumentShareMetadata = (record.metadata || {}) as DocumentShareMetadata
  const docTypeLabel = (record.document_type || 'Document').toUpperCase()
  const fileName = meta.fileName || `${record.document_number}.pdf`

  const handleDownload = () => {
    if (!record.pdf_url) return
    const a = document.createElement('a')
    a.href = record.pdf_url
    a.download = fileName
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1a1815] antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#e6e3da] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-[#1a1815]">BOURXE</span>
                <span className="rounded bg-[#f0eee6] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6e685f]">
                  Portal
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Verified Document Viewer</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={handleDownload}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span> PDF
            </Button>
            <a
              href={record.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button type="button" size="sm" className="gap-1.5 text-xs font-semibold">
                <ExternalLink size={14} />
                Open
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-8">
        {/* Document Identity Banner */}
        <Card className="border-[#e6e3da] bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 font-mono text-[10px] font-bold text-amber-800">
                    {docTypeLabel}
                  </Badge>
                  <span className="font-mono text-lg font-black tracking-tight text-[#1a1815]">
                    {record.document_number}
                  </span>
                </div>
                {record.document_title && (
                  <h1 className="text-base font-semibold text-[#2c2824]">
                    {record.document_title}
                  </h1>
                )}
              </div>

              {meta.totalFormatted && (
                <div className="rounded-xl border border-[#ebe7de] bg-[#faf9f6] p-3 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </div>
                  <div className="font-mono text-xl font-black text-[#1a1815]">
                    {meta.totalFormatted}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f0eee8] pt-4 text-xs sm:grid-cols-4">
              {meta.issuerName && (
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Building2 size={12} /> Issued By
                  </span>
                  <p className="font-semibold text-[#1a1815] truncate">{meta.issuerName}</p>
                </div>
              )}
              {meta.recipientName && (
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <User size={12} /> Prepared For
                  </span>
                  <p className="font-semibold text-[#1a1815] truncate">{meta.recipientName}</p>
                </div>
              )}
              {meta.issueDate && (
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Calendar size={12} /> Issue Date
                  </span>
                  <p className="font-semibold text-[#1a1815]">{meta.issueDate}</p>
                </div>
              )}
              {meta.dueDate && (
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Calendar size={12} /> Due Date
                  </span>
                  <p className="font-semibold text-[#1a1815]">{meta.dueDate}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Embedded Responsive PDF Viewer */}
        <Card className="overflow-hidden border-[#e6e3da] bg-white shadow-sm">
          <div className="relative w-full h-[75vh] min-h-[500px] bg-[#525659]">
            <object
              data={`${record.pdf_url}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="h-full w-full"
            >
              <iframe
                src={`${record.pdf_url}#toolbar=1`}
                className="h-full w-full border-0"
                title={record.document_number}
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center bg-white text-[#1a1815]">
                  <FileText size={48} className="text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    Your browser does not support embedded PDF preview.
                  </p>
                  <Button type="button" onClick={handleDownload} className="text-xs">
                    Download {fileName}
                  </Button>
                </div>
              </iframe>
            </object>
          </div>
        </Card>

        {/* Verified Badge Footer */}
        <div className="flex items-center justify-center gap-1.5 py-4 text-center text-xs text-muted-foreground">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Issued and verified via <strong>BOURXE</strong> Business Platform</span>
        </div>
      </main>
    </div>
  )
}
