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

export default function DocumentPage({
  topNav,
  actionRow,
  hero,
  children,
  floating,
  overlays,
}: DocumentPageProps) {
  return (
    <div className={styles.page}>
      {(topNav || actionRow) && (
        <div className={styles.topContainer}>
          {topNav}
          {actionRow && <div className={styles.actionRow}>{actionRow}</div>}
        </div>
      )}
      <main className={styles.content}>
        {hero ? <div className={styles.hero}>{hero}</div> : null}
        {children}
      </main>
      {floating ? (
        <div className={styles.floatingDock}>
          <div className={styles.floatingInner}>{floating}</div>
        </div>
      ) : null}
      {overlays}
    </div>
  );
}
