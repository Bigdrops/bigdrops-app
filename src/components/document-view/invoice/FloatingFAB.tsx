import React from "react";
import { Plus } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface FloatingFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export const FloatingFAB: React.FC<FloatingFABProps> = ({ onClick, icon }) => {
  return (
    <button className={styles.fab} onClick={onClick} aria-label="Add">
      {icon || <Plus size={22} />}
    </button>
  );
};
