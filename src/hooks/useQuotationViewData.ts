import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { resolveDocumentSignatory } from "@/domain/invoice/previewModel";
import { fetchProjectSummary } from "@/domain/documentRelationships";
import { useEntity } from "@/lib/tenant/contexts";
import { loadQuotationViewData } from "../pages/view-quotation-actions";

export const defaultPdfOutput: PdfOutputSettingsValue = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: false,
  showAmountInWords: true,
  compact: false,
};

export function useQuotationViewData() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { tenantClient } = useEntity();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [resolvedSignatory, setResolvedSignatory] =
    useState<ReturnType<typeof resolveDocumentSignatory>>(null);
  const [pdfOutput, setPdfOutput] =
    useState<PdfOutputSettingsValue>(defaultPdfOutput);
  const [linkedProject, setLinkedProject] = useState<{
    id: string;
    name?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!tenantClient.isReady) return;

    const loadQuotation = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await loadQuotationViewData(id, tenantClient);
        if (!data) {
          navigate("/quotations");
          return;
        }

        setQuotation(data.quotation);
        setItems(data.items);
        setTotals(data.totals);
        setClient(data.client);
        setSettings(data.settings);
        setBankAccounts(data.bankAccounts);
        setResolvedSignatory(data.signatory || null);
        setCustomFields(data.customFields);
        setPdfOutput({
          ...defaultPdfOutput,
          ...(data.customFields?.pdfOutput || {}),
          showBalanceDue: false,
        });
        setLinkedProject(
          data.quotation?.project_id
            ? await fetchProjectSummary(data.quotation.project_id, tenantClient)
            : null,
        );
      } catch (err) {
        console.error("Failed to load quotation", err);
      } finally {
        setLoading(false);
      }
    };

    void loadQuotation();
  }, [id, navigate, tenantClient]);

  const refreshQuotation = async () => {
    if (!id) return;
    const data = await loadQuotationViewData(id, tenantClient);
    if (!data) return;
    setQuotation(data.quotation);
    setItems(data.items);
    setTotals(data.totals);
    setClient(data.client);
    setSettings(data.settings);
    setBankAccounts(data.bankAccounts);
    setResolvedSignatory(data.signatory || null);
    setCustomFields(data.customFields);
    setLinkedProject(
      data.quotation?.project_id
        ? await fetchProjectSummary(data.quotation.project_id, tenantClient)
        : null,
    );
  };

  return {
    id,
    navigate,
    loading,
    quotation,
    setQuotation,
    items,
    totals,
    client,
    settings,
    bankAccounts,
    customFields,
    setCustomFields,
    resolvedSignatory,
    pdfOutput,
    setPdfOutput,
    linkedProject,
    refreshQuotation,
  };
}
