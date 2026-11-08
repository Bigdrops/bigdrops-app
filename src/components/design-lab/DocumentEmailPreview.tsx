import * as React from 'react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Send,
  FileText,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  ArrowLeft,
  Smartphone,
  Monitor,
  AlertCircle,
  Info,
  Paperclip,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { buildDocumentEmailHtml } from '@/domain/documentShare/documentEmailHtml'

// Exact extracted data from C:\Users\DELL\Downloads\Mobile Devices\SASINV-000130.pdf
const INVOICE_130_DATA = {
  documentType: 'Invoice',
  documentNumber: 'SASINV-000130',
  documentTitle: 'For Generator Repairs and Replacement of Parts',
  issuerName: 'Sun & Shield Power Solutions',
  issuerEmail: 'sunandshieldpowersolutions@gmail.com',
  issuerPhone: '+234-8033695304',
  issuerAddress: '43 Oshola street, Ifako-Ijaiye, Lagos State, Nigeria',
  issuerTin: '1063045858',
  bankName: 'U.B.A',
  bankAccountName: 'Sun and shield power solutions',
  bankAccountNumber: '1024829598',
  recipientName: 'Tecno Power Solutions',
  recipientEmail: 'billing@tecnopower.ng',
  recipientAddress: '26 Ademola street, Ikoyi, Lagos',
  issueDate: '05/11/2026',
  dueDate: '19/11/2026',
  paymentStatus: 'UNPAID',
  totalFormatted: '₦980,400.00',
  subtotal: '₦822,000.00',
  vat: '₦63,400.00',
  workmanship: '₦95,000.00',
  fileName: 'SASINV-000130.pdf',
  fileSize: '508 KB',
  equipment: 'Diesel Engine, 40kVA (S/N: R7100LN0073)',
  location: 'Kresta Laurel Building, No. 6 Lateef Jakande Road, Agidingbi, Ikeja, Lagos',
  lineItems: [
    { desc: 'Rear Crankshaft Oil Seal Carrier and Gasket', qty: '1 Set', price: '₦120,000.00' },
    { desc: 'Engine Oil', qty: '3 Gallons', price: '₦105,000.00' },
    { desc: 'Machinist Service (Removal of broken flywheel bolts & re-threading)', qty: '1 Job', price: '₦40,000.00' },
    { desc: 'Rear Oil Seal', qty: '1 Pc', price: '₦32,000.00' },
    { desc: 'MK VII Controller Module', qty: '1 Pc', price: '₦450,000.00' },
    { desc: 'Air Filter (Part No.: R-1100-1109101)', qty: '1 Pc', price: '₦18,000.00' },
    { desc: 'Oil Filter (Part No.: R5000-1012240DF1)', qty: '1 Pc', price: '₦22,000.00' },
    { desc: 'Oil Pressure Sensor', qty: '1 Pc', price: '₦35,000.00' },
  ],
}

export default function DocumentEmailPreview() {
  const navigate = useNavigate()

  // View state
  const [activeTab, setActiveTab] = useState<'composer' | 'recipient' | 'split' | 'audit'>('split')
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop')

  // Interactive composer fields (prefilled with realistic invoice 130 data)
  const [recipient, setRecipient] = useState(INVOICE_130_DATA.recipientEmail)
  const [subject, setSubject] = useState(
    `Invoice ${INVOICE_130_DATA.documentNumber} for Generator Repairs from ${INVOICE_130_DATA.issuerName}`
  )
  const [message, setMessage] = useState(
`Hi ${INVOICE_130_DATA.recipientName},

Please find attached invoice ${INVOICE_130_DATA.documentNumber} for ${INVOICE_130_DATA.documentTitle}.

Invoice No: ${INVOICE_130_DATA.documentNumber}
Invoice Date: ${INVOICE_130_DATA.issueDate}
Billed To: ${INVOICE_130_DATA.recipientName}
Amount Due: ${INVOICE_130_DATA.totalFormatted}
Equipment: ${INVOICE_130_DATA.equipment}

Payment Details:
Bank: ${INVOICE_130_DATA.bankName}
Account Name: ${INVOICE_130_DATA.bankAccountName}
Account Number: ${INVOICE_130_DATA.bankAccountNumber}

Thank you for your business.

Warm regards,
${INVOICE_130_DATA.issuerName}
${INVOICE_130_DATA.issuerAddress}
Phone: ${INVOICE_130_DATA.issuerPhone}`
  )

  // Simulation states
  const [attachPdf, setAttachPdf] = useState(true)
  const [includePublicLink, setIncludePublicLink] = useState(true)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Mock share URL
  const mockShareUrl = 'https://bouxre.vercel.app/shared/sh_sas130_demo980400'

  // Dynamic email HTML build based on active form state
  const renderedEmailHtml = useMemo(() => {
    return buildDocumentEmailHtml({
      documentType: INVOICE_130_DATA.documentType,
      documentNumber: INVOICE_130_DATA.documentNumber,
      documentTitle: INVOICE_130_DATA.documentTitle,
      issuerName: INVOICE_130_DATA.issuerName,
      issuerEmail: INVOICE_130_DATA.issuerEmail,
      recipientName: INVOICE_130_DATA.recipientName,
      totalFormatted: INVOICE_130_DATA.totalFormatted,
      issueDate: INVOICE_130_DATA.issueDate,
      dueDate: INVOICE_130_DATA.dueDate,
      shareUrl: mockShareUrl,
      message: message,
      fileName: INVOICE_130_DATA.fileName,
      replyTo: INVOICE_130_DATA.issuerEmail,
    })
  }, [message, mockShareUrl])

  const handleSimulateSend = () => {
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 5000)
    }, 800)
  }

  const handleSimulateCopyLink = () => {
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/design-lab')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Design Lab
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-stone-900 dark:text-white">
                  Document Email & Sharing Experience
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  SASINV-000130 Real Data
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Refrens-inspired compact workflow · Resend executive HTML delivery · Diagnostic audit
              </p>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center gap-2">
            {/* Viewport switch */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewportMode === 'desktop'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Desktop Viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewportMode === 'mobile'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="Mobile Viewport (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile (390px)</span>
              </button>
            </div>

            {/* Stage tabs */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
              <button
                onClick={() => setActiveTab('split')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  activeTab === 'split'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Dual View
              </button>
              <button
                onClick={() => setActiveTab('composer')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  activeTab === 'composer'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Composer
              </button>
              <button
                onClick={() => setActiveTab('recipient')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  activeTab === 'recipient'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Delivered Email
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  activeTab === 'audit'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
                }`}
              >
                System Audit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Audit banner / Status alert */}
          {activeTab !== 'audit' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Contextual Prototype:</span> Rendering real data from{' '}
                  <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">
                    SASINV-000130.pdf
                  </code>{' '}
                  (Sun & Shield Power Solutions · ₦980,400.00). Modify the subject and message on the left to watch
                  the delivered executive HTML update in real-time on the right.
                </div>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="whitespace-nowrap px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium transition-colors"
              >
                View Failure Root Causes →
              </button>
            </div>
          )}

          {/* Interactive Workspace Area */}
          {activeTab !== 'audit' ? (
            <div
              className={`transition-all duration-300 mx-auto ${
                viewportMode === 'mobile'
                  ? 'max-w-[420px] p-2 bg-stone-200 dark:bg-stone-900 rounded-3xl border-4 border-stone-300 dark:border-stone-800 shadow-2xl'
                  : 'w-full'
              }`}
            >
              <div
                className={`grid gap-6 ${
                  viewportMode === 'mobile' || activeTab === 'composer' || activeTab === 'recipient'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 lg:grid-cols-12'
                }`}
              >
                {/* LEFT / COMPOSER: Refrens-Inspired Compact Modal/Sheet */}
                {(activeTab === 'split' || activeTab === 'composer') && (
                  <div
                    className={`${
                      viewportMode === 'mobile' || activeTab === 'composer' ? 'w-full' : 'lg:col-span-5'
                    } flex flex-col`}
                  >
                    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col h-full">
                      {/* Modal Title bar */}
                      <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                            <h2 className="text-sm font-bold text-stone-900 dark:text-white">Email Invoice</h2>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Invoice #{INVOICE_130_DATA.documentNumber} · {INVOICE_130_DATA.totalFormatted}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Refrens Streamlined
                        </span>
                      </div>

                      {/* Composer Body */}
                      <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
                        {/* Recipient */}
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            Recipient Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="recipient@example.com"
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 text-xs"
                          />
                          <p className="text-[10px] text-stone-400 mt-1">
                            Auto-filled from Client: {INVOICE_130_DATA.recipientName}
                          </p>
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            Email Subject
                          </label>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 text-xs font-medium"
                          />
                        </div>

                        {/* Rich Prefilled Message */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                              Personalized Message
                            </label>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              Rich Text Format
                            </span>
                          </div>
                          <textarea
                            rows={8}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 text-xs font-sans leading-relaxed resize-y"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400">
                            <span>Includes line items, equipment, and UBA bank details</span>
                            <button
                              type="button"
                              onClick={() =>
                                setMessage(
                                  `Hi ${INVOICE_130_DATA.recipientName},\n\nPlease find attached invoice ${INVOICE_130_DATA.documentNumber}.\nTotal Due: ${INVOICE_130_DATA.totalFormatted}.\n\nThank you,\n${INVOICE_130_DATA.issuerName}`
                                )
                              }
                              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline"
                            >
                              Reset to Short
                            </button>
                          </div>
                        </div>

                        {/* Attachment Callout (Refrens style) */}
                        <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                              PDF
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                {INVOICE_130_DATA.fileName}
                                <span className="text-[10px] font-normal text-stone-500">
                                  ({INVOICE_130_DATA.fileSize})
                                </span>
                              </div>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ Authoritative PDF will be attached to email
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={attachPdf}
                            onChange={(e) => setAttachPdf(e.target.checked)}
                            className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 w-4 h-4"
                          />
                        </div>

                        {/* Refrens-inspired toggle options */}
                        <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={includePublicLink}
                              onChange={(e) => setIncludePublicLink(e.target.checked)}
                              className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 w-3.5 h-3.5"
                            />
                            <span className="text-[11px] text-stone-700 dark:text-stone-300">
                              Include secure "View & Download Online" link in email
                            </span>
                          </label>
                        </div>

                        {/* Simulated Direct Delivery Notice */}
                        {sendSuccess && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-xs flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                                  Simulation
                                </span>
                                Resend Dispatch Simulated (Mock ID: msg_sim_sas130)
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                                Payload constructed for {recipient} with {INVOICE_130_DATA.fileName} (508 KB) attachment. Design Lab preview mode — no external network request dispatched.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Composer Footer Actions */}
                      <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 flex flex-col sm:flex-row items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleSimulateSend}
                          disabled={isSending}
                          className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#2b2621] hover:bg-[#1a1714] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
                        >
                          {isSending ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending via Resend...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Email</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSimulateCopyLink}
                          className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RIGHT / RECIPIENT: Delivered HTML Email Preview */}
                {(activeTab === 'split' || activeTab === 'recipient') && (
                  <div
                    className={`${
                      viewportMode === 'mobile' || activeTab === 'recipient' ? 'w-full' : 'lg:col-span-7'
                    } flex flex-col`}
                  >
                    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col h-full">
                      {/* Recipient Inbox Header Bar */}
                      <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-xs">
                        <div className="flex items-center justify-between text-stone-500 mb-2">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            Recipient Inbox Simulation
                          </span>
                          <span className="text-[10px] bg-stone-200 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-600 dark:text-stone-400">
                            Resend HTML Transmission
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-300 font-mono">
                          <div className="flex">
                            <span className="w-16 text-stone-400">From:</span>
                            <span className="font-semibold text-stone-900 dark:text-white">
                              {INVOICE_130_DATA.issuerName} &lt;billing@bourxe.com&gt;
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-16 text-stone-400">To:</span>
                            <span>{recipient || '(no recipient specified)'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-16 text-stone-400">Reply-To:</span>
                            <span>{INVOICE_130_DATA.issuerEmail}</span>
                          </div>
                          <div className="flex">
                            <span className="w-16 text-stone-400">Subject:</span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">{subject}</span>
                          </div>
                          {attachPdf && (
                            <div className="flex items-center gap-1.5 pt-1 text-emerald-600 dark:text-emerald-400">
                              <Paperclip className="w-3 h-3" />
                              <span className="font-semibold">{INVOICE_130_DATA.fileName} (508 KB)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rendered HTML Container */}
                      <div className="p-4 bg-stone-100 dark:bg-stone-950 flex-1 overflow-y-auto">
                        <div className="max-w-[620px] mx-auto bg-white rounded-xl shadow-md overflow-hidden text-stone-900">
                          {/* Live Rendered HTML iframe or innerHTML */}
                          <div
                            dangerouslySetInnerHTML={{ __html: renderedEmailHtml }}
                            className="bourxe-email-preview-wrapper"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* AUDIT & ROOT CAUSE SECTION */
            <div className="space-y-6">
              {/* Failure 1: Edge Function 404 */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      Root Cause Audit 1: "Failed to send a request to the Edge Function"
                    </h3>
                    <p className="text-xs text-stone-500">
                      Why direct email delivery fails on bouxre.vercel.app with SASINV-000130
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
                    <span className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider text-[10px]">
                      The Problem in Code & Deployment
                    </span>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      1. In <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">DocumentShareSheet.tsx</code>,
                      clicking "Send Email" calls{' '}
                      <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">
                        supabase.functions.invoke('send-document-email')
                      </code>.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      2. The Edge Function <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">supabase/functions/send-document-email/index.ts</code> exists locally in the repository, but <strong>has NEVER been deployed to the remote Supabase project</strong>.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      3. When the browser on Vercel sends an HTTP POST to{' '}
                      <code className="font-mono text-[10px] break-all bg-stone-200 dark:bg-stone-700 px-1 rounded">
                        https://&lt;project&gt;.supabase.co/functions/v1/send-document-email
                      </code>, Supabase's Edge Gateway returns a <strong>404 Not Found</strong> / CORS error.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      4. <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">@supabase/functions-js</code> catches the failed fetch and wraps it into{' '}
                      <code className="font-mono text-rose-600 font-semibold">FunctionsFetchError: Failed to send a request to the Edge Function</code>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                      The Exact Production Fix
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      Deploy the Edge Function and set the production Resend secrets in Supabase:
                    </p>
                    <div className="p-3 bg-stone-900 rounded-lg text-emerald-400 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                      <div># 1. Set Resend API key and Verified Sender in Supabase</div>
                      <div>supabase secrets set RESEND_API_KEY="re_..." DOCUMENT_EMAIL_FROM="billing@bourxe.com"</div>
                      <div className="pt-1.5"># 2. Deploy Edge Function to remote project</div>
                      <div>supabase functions deploy send-document-email --no-verify-jwt</div>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-2">
                      Once deployed, direct transactional delivery will immediately succeed without any client-side bundle change.
                    </p>
                  </div>
                </div>
              </div>

              {/* Failure 2: Copy Link failure */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      Root Cause Audit 2: "Get Link" / "Copy Link" Failure on Mobile
                    </h3>
                    <p className="text-xs text-stone-500">
                      Why tapping "Get Link" in the share sheet fails on mobile browsers (Chrome / Safari)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
                    <span className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider text-[10px]">
                      The Problem: Async User Gesture Expiry & RLS
                    </span>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      1. In <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">DocumentShareSheet.tsx</code>, tapping "Get Link" initiates{' '}
                      <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">handleGenerateLink()</code>, which calls{' '}
                      <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">createOrGetDocumentShare()</code>.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      2. That function generates the PDF blob using React-PDF in-memory (taking 2–4 seconds) and uploads it to Supabase Storage before returning the link.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      3. Modern mobile browsers enforce strict transient user activation timeouts (&lt; 1,000ms). When{' '}
                      <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">navigator.clipboard.writeText(shareUrl)</code> is called after 3 seconds, the browser rejects it with{' '}
                      <code className="font-mono text-rose-600 font-semibold">DOMException: Document is not focused / user gesture required</code>.
                    </p>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      4. In addition, in <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">InvoiceOverlays.tsx</code>, the payload passed to the share sheet does not specify <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">tenantId</code>, which causes an RLS violation on insert if <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">tenant_id</code> is null.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                      The Exact Production Fix
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      1. <strong>Synchronous Deterministic Link Token:</strong> Instead of waiting for PDF rendering before giving the link, generate the share token deterministically or immediately, copy it to clipboard in &lt;50ms, and render/upload the PDF in the background.
                    </p>
                    <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      2. <strong>Capacitor Clipboard Fallback:</strong> Use <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">@capacitor/clipboard</code> or textarea fallback when running in mobile contexts.
                    </p>
                    <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      3. <strong>Explicit Tenant ID:</strong> Supply <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">tenantId: invoice.tenant_id</code> in <code className="font-mono bg-stone-200 dark:bg-stone-700 px-1 rounded">InvoiceOverlays.tsx</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Architecture: Refrens vs BOUXRE */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      Workflow Comparison: Refrens Benchmark vs BOUXRE Architecture
                    </h3>
                    <p className="text-xs text-stone-500">
                      How BOUXRE can achieve Refrens-level speed while keeping its superior PDFCN & executive email quality
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800 dark:text-stone-200">Refrens Workflow</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        Observed in Screenshots
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-stone-600 dark:text-stone-300">
                      <li>• Share button directly exposes "Send Email", "Send WhatsApp", "Copy Link".</li>
                      <li>• "Send Email" immediately opens the rich composer with prefilled client details.</li>
                      <li>• Rich prefilled message contains customer name, invoice no, date, and amount due.</li>
                      <li>• Notice affirms PDF is attached and online link is inserted.</li>
                      <li>• One-tap "Send Email" fires immediately.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800 dark:text-stone-200">BOUXRE Enhanced Target</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Recommended Implementation
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-stone-600 dark:text-stone-300">
                      <li>• Retain BOUXRE Share bottom sheet, but allow direct 1-tap "Compose Email".</li>
                      <li>• Prefill rich message with Nigerian SME context: items summary, UBA bank account, and equipment details.</li>
                      <li>• Deliver via Resend with authoritative PDFCN attachment directly from Supabase Storage.</li>
                      <li>• Provide robust fallback to Mailto / Web Share API if Edge Function is offline.</li>
                      <li>• Full parity with Design Lab preview.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
