import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useInvoiceDetailData } from "@/hooks/useInvoiceDetailData";
import { useDocumentUIState } from "@/components/document-view/hooks/useDocumentUIState";
import { buildInvoiceViewModel } from "@/domain/invoice/viewModel";
import { buildInvoicePreviewModel, resolveDocumentSignatory } from "@/domain/invoice/previewModel";
import { buildBankAccountsProjection } from "@/domain/invoice/projections/partyProjection";
import { 
  parseCustomFields, 
  BUILTIN_COLUMNS,
  DEFAULT_INVOICE_PDF_OUTPUT, 
  getInvoicePdfOutput,
  normalizeInvoicePdfTemplateId 
} from "@/domain/invoice";
import { isAdvanceInvoiceChild } from "@/domain/invoice/advanceMetadata";
import { computeDocument } from "@/lib/Calculations";
import { formatNaira } from "@/lib/formatters/money";
import { getInvoiceSourceDocument } from "@/domain/documentRelationships";
import { resolveCanonicalLogoUrl } from "@/domain/documentMedia";
import { CenteredSpinner } from "@/components/loading/AppLoadingStates";
import DocumentPage from "@/components/document-view/shared/DocumentPage";
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav";
import { PdfBankControls } from "@/components/PdfOutputSettings";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";

import { InvoiceWorkspace } from "@/components/document-view/invoice/InvoiceWorkspace";
import { InvoiceOverlays } from "@/components/document-view/invoice/InvoiceOverlays";
import { useInvoiceActions } from "@/components/document-view/invoice/useInvoiceActions";

import "@/components/document-view/shared/documentViewTheme.css";

export default function ViewInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ui = useDocumentUIState();

  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    invoice, items, payments, advanceInvoiceProjection, relatedCsrs, relatedWaybills,
    invoiceFinancials, client, settings, bankAccounts,
    signatories, linkedProject, loading, refresh, setInvoice
  } = useInvoiceDetailData(id) as any;

  const [pdfOutput, setPdfOutput] = useState(DEFAULT_INVOICE_PDF_OUTPUT);

  useEffect(() => {
    if (invoice?.custom_fields) {
      setPdfOutput(getInvoicePdfOutput(invoice.custom_fields));
    }
  }, [invoice?.custom_fields]);

  const customFields = useMemo(() => parseCustomFields(invoice?.custom_fields), [invoice?.custom_fields]);
  const pdfTemplateId = normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry";
  const sourceDocument = useMemo(() => getInvoiceSourceDocument(invoice), [invoice]);
  
   const viewModel = useMemo(() => buildInvoiceViewModel({
     invoice, items: items || [], payments: payments || [], relatedCsrs: relatedCsrs || [],
     relatedWaybills: relatedWaybills || [], financials: invoiceFinancials || null,
     project: linkedProject || null, sourceDocument: sourceDocument || null
   }), [invoice, items, payments, relatedCsrs, relatedWaybills, invoiceFinancials, linkedProject, sourceDocument]);

  const resolvedSignatory = useMemo(() => resolveDocumentSignatory(
    (customFields as any)?.signatoryId, signatories || []
  ), [customFields, signatories]);

  const documentTotals = useMemo(() => {
    const savedColumns = Array.isArray((customFields as any)?.columnConfig)
      ? (customFields as any).columnConfig
      : BUILTIN_COLUMNS;
    return computeDocument({
      items: Array.isArray(items) ? items : [],
      document: invoice || {},
      cf: (customFields as any) || {},
      columns: savedColumns as any,
    });
  }, [invoice, items, customFields]);

  const previewModel = useMemo(() => buildInvoicePreviewModel({
    invoice: invoice || {}, items: items || [], client: client || undefined,
    settings: settings || undefined, bankAccounts: bankAccounts || [],
    customFieldObject: customFields as any, pdfOutput, signatory: resolvedSignatory,
    poNumber: String(invoice?.po_number || ""),
    invoiceTotal: documentTotals.totalPayable || invoice?.total || 0,
    cashReceived: viewModel.cashReceived || 0,
    balanceDue: viewModel.balanceDue || 0,
    totals: {
      rawSubtotal: documentTotals.subtotal,
      vatAmount: documentTotals.vat,
      discountAmount: documentTotals.discount,
      whtAmount: documentTotals.wht,
      installRateTotal: documentTotals.installRateTotal,
    },
    formatMoney: (v) => formatNaira(v, { preserveFraction: true })
  }), [invoice, items, client, settings, bankAccounts, customFields, pdfOutput, resolvedSignatory, viewModel, documentTotals]);

  // Quarantine: Prevent direct access to advance child invoices (legacy or canonical)
  // They should only be viewed in the context of their parent invoice.
  useEffect(() => {
    if (loading || !invoice || isRedirecting) return;

    if (isAdvanceInvoiceChild(invoice)) {
      const advanceConfig = (invoice.custom_fields as any)?.advance_invoice;
      const parentId = advanceConfig?.parentId;
      if (parentId) {
        setIsRedirecting(true);
        navigate(`/invoices/view/${parentId}`, { replace: true });
      } else {
        // Orphan child - no parent to redirect to, go to invoice list
        setIsRedirecting(true);
        navigate('/invoices', { state: { error: 'Advance invoice is not accessible directly' } });
      }
    }
  }, [invoice, loading, navigate, isRedirecting]);

  const actions = useInvoiceActions({
    invoice, items, payments, client, settings, bankAccounts,
    signatories, advanceInvoiceProjection, viewModel, ui, refresh, setInvoice,
    pdfOutput, setPdfOutput, pdfTemplateId, settingsData: settings
  });

  const handleInlinePdfOutputChange = useCallback(
    (nextPdfOutput: PdfOutputSettingsValue) => { void actions.handleSaveCustomization(nextPdfOutput); },
    [actions.handleSaveCustomization],
  );

  const logoUrl = useMemo(() => resolveCanonicalLogoUrl(settings), [settings]);

  if (loading) return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate("/invoices")} />}><CenteredSpinner /></DocumentPage>;
  if (!invoice) return null;

  const previewBankAccounts = buildBankAccountsProjection(bankAccounts || []);

  const previewControls = useMemo(
    () => (
      <PdfBankControls 
        value={pdfOutput} 
        onChange={handleInlinePdfOutputChange} 
        bankAccounts={previewBankAccounts} 
      />
    ),
    [handleInlinePdfOutputChange, pdfOutput, previewBankAccounts],
  );

  return (
    <InvoiceWorkspace
      invoice={invoice}
      items={items || []}
      payments={payments || []}
      bankAccounts={bankAccounts || []}
      advanceInvoice={advanceInvoiceProjection}
      relatedCsrs={relatedCsrs || []}
      relatedWaybills={relatedWaybills || []}
      sourceDocument={sourceDocument}
      previewModel={previewModel}
      viewModel={viewModel}
      pdfOutput={pdfOutput}
      mergeQtyUnit={customFields?.mergeQtyUnit === true}
      logoUrl={logoUrl}
      companyName={settings?.company_name || ""}
      companySub={settings?.company_tagline || ""}
      settings={settings}
      previewControls={previewControls}
      
      onBack={() => navigate("/invoices")}
      onShare={actions.handleShare}
      onRecordPayment={() => ui.openSheet("record-payment")}
      onEdit={() => navigate(`/invoices/edit/${id}`)}
      onDownload={actions.handleDownload}
      onMore={() => ui.openSheet("more-actions")}
      onVoidPayment={actions.confirmVoidPayment}
      onCreateAdvance={actions.openCreateAdvanceSheet}
      onViewAdvance={(adv) => actions.openAdvanceDetails(adv, "view")}
      onViewDoc={(type, docId) => navigate(`/${type === 'quotation' ? 'quotations' : type === 'csr' ? 'csr' : 'waybills'}/${docId}`)}
      onOutputChange={actions.handleSaveCustomization}
      onToggleMergeQtyUnit={actions.handleToggleMergeQtyUnit}
      onCustomize={() => ui.openSheet("customize-output")}
      onFabClick={actions.handleDownload}
      overlays={
        <InvoiceOverlays 
          invoice={invoice}
          ui={ui}
          viewModel={viewModel}
          pdfOutput={pdfOutput}
          pdfTemplateId={pdfTemplateId}
          previewBankAccounts={previewBankAccounts}
          settingsData={settings}
          customFields={customFields}
          id={id!}
          contractValue={invoice.total || 0}
          refresh={refresh}
          closeAdvanceSheet={(next: boolean) => {
            if (next) ui.openSheet("advance");
            else ui.closeSheet();
          }}
          {...actions}
        />
      }
    />
  );
}
