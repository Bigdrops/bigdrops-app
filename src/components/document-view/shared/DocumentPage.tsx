import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { getActiveTab } from "@/components/layout/navData";
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
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const onTabClick = (key: string) => {
    const pathByKey: Record<string, string> = {
      home: "/",
      projects: "/projects",
      sales: "/invoices",
      clients: "/clients",
      more: "/reports",
    };
    navigate(pathByKey[key] || "/");
  };

  return (
    <div className={styles.workspace}>
      <header className={styles.topbar}>{topNav}</header>

      {actionRow && <div className={styles.actionStripNoGutter}>{actionRow}</div>}

      {hero}

      <main className={styles.scrollBody}>
        {children}
      </main>

      {overlays}
      {floating && <div className={styles.floating}>{floating}</div>}

      <div className="md:hidden">
        <MobileBottomNav active={activeTab} onSelect={onTabClick} />
      </div>
    </div>
  );
}
