import type { ReactNode } from "react";

import styles from "./DocumentPage.module.css";

interface DocumentPageProps {
  topNav?: ReactNode;
  actionRow?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
  floating?: ReactNode;
  overlays?: ReactNode;
}

/**
 * TRUE STRUCTURAL TRANSPLANT
 * Mirrors viewpage.html hierarchy 1:1
 */
export default function DocumentPage({
  topNav,
  actionRow,
  hero,
  children,
  floating,
  overlays,
}: DocumentPageProps) {
  return (
    <div className={styles.workspace}>
      <header className={styles.topbar}>{topNav}</header>

      {actionRow && <div className={styles.actionStrip}>{actionRow}</div>}

      {hero}

      <main className={styles.scrollBody}>
        {children}
      </main>

      {floating && <div className={styles.floating}>{floating}</div>}
      {overlays}
    </div>
  );
}
