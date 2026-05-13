import React from "react";
import { ChevronLeft, Share2, Palette, MoreVertical, Download } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface InvoiceTopNavProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onShare: () => void;
  onCustomize: () => void;
  onMore: () => void;
  onDownload: () => void;
}

export const InvoiceTopNav: React.FC<InvoiceTopNavProps> = ({
  title,
  subtitle,
  onBack,
  onShare,
  onCustomize,
  onMore,
  onDownload,
}) => {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button
          className={styles.topbarIcon}
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div className={styles.topbarText}>
          <span className={styles.topbarTitle}>{title}</span>
          <span className={styles.topbarSub}>{subtitle}</span>
        </div>
      </div>
      <div className={styles.topbarRight}>
        <button
          className={styles.topbarAction}
          onClick={onShare}
          aria-label="Share"
        >
          <Share2 size={18} />
        </button>
        <button
          className={styles.topbarAction}
          onClick={onCustomize}
          aria-label="Customize"
        >
          <Palette size={18} />
        </button>
        <button
          className={styles.topbarAction}
          onClick={onMore}
          aria-label="More"
        >
          <MoreVertical size={18} />
        </button>
        <button
          className={styles.topbarAction}
          onClick={onDownload}
          aria-label="Download"
        >
          <Download size={18} />
        </button>
      </div>
    </header>
  );
};
