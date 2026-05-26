import React from "react";
import { PaymentHistoryCard } from "./sections/PaymentHistoryCard";
import { AdvanceInvoicesCard } from "./sections/AdvanceInvoicesCard";
import { RelatedDocsCard } from "./sections/RelatedDocsCard";
import { ActivityCard } from "./sections/ActivityCard";

interface InvoiceOperationalSectionsProps {
  payments: any[];
  viewModel: any;
  advanceInvoice: any;
  relatedCsrs: any[];
  relatedWaybills: any[];
  sourceDocument: any;
  invoiceId: string;
  invoiceTotal?: number;
  
  onRecordPayment: () => void;
  onVoidPayment: (id: string) => void;
  onCreateAdvance: () => void;
  onViewAdvance: (advance: any) => void;
  onViewDoc: (type: string, id: string) => void;
}

export const InvoiceOperationalSections: React.FC<InvoiceOperationalSectionsProps> = ({
  payments,
  viewModel,
  advanceInvoice,
  relatedCsrs,
  relatedWaybills,
  sourceDocument,
  invoiceId,
  invoiceTotal,
  
  onRecordPayment,
  onVoidPayment,
  onCreateAdvance,
  onViewAdvance,
  onViewDoc,
}) => {
  return (
    <>
      <PaymentHistoryCard 
        payments={payments}
        invoiceTotal={invoiceTotal || viewModel?.invoiceTotal || 0}
        viewModel={viewModel}
        onRecordPayment={onRecordPayment}
        onVoidPayment={onVoidPayment}
      />

      <AdvanceInvoicesCard 
        advanceInvoice={advanceInvoice}
        onCreateAdvance={onCreateAdvance}
        onViewAdvance={onViewAdvance}
      />

      <RelatedDocsCard 
        relatedCsrs={relatedCsrs}
        relatedWaybills={relatedWaybills}
        sourceDocument={sourceDocument}
        onViewDoc={onViewDoc}
      />

      <ActivityCard documentId={invoiceId} />
    </>
  );
};
