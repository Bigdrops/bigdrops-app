import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { resolveDocumentSignatory } from "@/domain/invoice/previewModel";
import { fetchProjectSummary } from "@/domain/documentRelationships";
import { loadQuotationViewData } from "../pages/viewQuotationActions";

export const defaultPdfOutput: PdfOutputSettingsValue = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: false,
  showAmountInWords: true,
  showVatPercentage: true,
  showWhtPercentage: true,
  showDiscountPercentage: true,
  compact: false,
};

export function useQuotationViewData() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

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
    const loadQuotation = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await loadQuotationViewData(id);
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
            ? await fetchProjectSummary(data.quotation.project_id)
            : null,
        );
      } catch (err) {
        console.error("Failed to load quotation", err);
      } finally {
        setLoading(false);
      }
    };

    void loadQuotation();
  }, [id, navigate]);

  const refreshQuotation = async () => {
    if (!id) return;
    const data = await loadQuotationViewData(id);
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
        ? await fetchProjectSummary(data.quotation.project_id)
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
