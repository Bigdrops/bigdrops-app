import React from "react";
import DocumentTopNav from "../shared/DocumentTopNav";

interface InvoiceTopNavProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onShare: () => void;
  onCustomize: () => void;
  onMore: () => void;
}

export const InvoiceTopNav: React.FC<InvoiceTopNavProps> = ({
  title,
  subtitle,
  onBack,
  onShare,
  onCustomize,
  onMore,
}) => {
  return (
    <DocumentTopNav
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      onShare={onShare}
      onCustomize={onCustomize}
      onMore={onMore}
    />
  );
};
