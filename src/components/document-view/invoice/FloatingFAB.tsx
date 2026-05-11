import React from "react";
import { Download } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface FloatingFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export const FloatingFAB: React.FC<FloatingFABProps> = ({ onClick, icon }) => {
  return (
    <button className={styles.fab} onClick={onClick} aria-label="Download">
      {icon || <Download size={22} />}
    </button>
  );
};
