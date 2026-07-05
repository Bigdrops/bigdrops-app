import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { MobileMoreSheet } from "@/components/layout/MobileMoreSheet";
import { getActiveTab } from "@/components/layout/navData";
import { supabase } from "@/supabase";
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
  const [moreOpen, setMoreOpen] = useState(false);

  const onTabClick = (key: string) => {
    if (key === "more") return setMoreOpen(true);
    const pathByKey: Record<string, string> = {
      home: "/",
      projects: "/projects",
      sales: "/invoices",
      clients: "/clients",
    };
    navigate(pathByKey[key] || "/");
  };

  const handleMorePick = async (key: string) => {
    if (key === "signout") {
      setMoreOpen(false);
      await supabase.auth.signOut();
      navigate("/login");
      return;
    }
    const pathByKey: Record<string, string> = {
      rfqs: "/rfqs",
      boqs: "/boqs",
      reports: "/reports",
      compliance: "/compliance",
      "item-library": "/item-library",
      settings: "/settings",
    };
    setMoreOpen(false);
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
        <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} handleMorePick={handleMorePick} />
      </div>
    </div>
  );
}
