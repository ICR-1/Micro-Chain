"use client";

import { Building2, ChartNoAxesColumnIncreasing, Database, FlaskConical, LayoutGrid, Network, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DemoProvider } from "@/lib/demo-context";
import { Brand } from "./brand";

const routes = [
  { href: "/dashboard", label: "Ringkasan", mobileLabel: "Ringkasan", icon: LayoutGrid },
  { href: "/network", label: "Jaringan Pasok", mobileLabel: "Jaringan", icon: Network },
  { href: "/simulator", label: "Simulator", mobileLabel: "Simulator", icon: FlaskConical },
  { href: "/comparison", label: "Perbandingan", mobileLabel: "Bandingkan", accessibleLabel: "Bandingkan skenario (Perbandingan)", icon: ChartNoAxesColumnIncreasing },
  { href: "/data", label: "Data Usaha", mobileLabel: "Data Usaha", icon: Database },
];

export function Workspace({ children }: { children: ReactNode }) {
  const path = usePathname().replace(/\/$/, "");
  const current = routes.find(({ href }) => href === path);
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">Lewati ke isi</a>
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <div className="sidebar-business"><span className="business-mark"><Store size={18} aria-hidden="true" /></span><span>Dapur Sari<small>Ruang kerja demo</small></span></div>
        <nav className="workspace-nav" aria-label="Navigasi ruang kerja">
          {routes.map(({ href, label, mobileLabel, accessibleLabel, icon: Icon }) => (
            <Link key={href} href={href} aria-current={href === path ? "page" : undefined} aria-label={accessibleLabel ?? label}>
              <Icon size={18} aria-hidden="true" />
              <span className="workspace-nav-desktop">{label}</span>
              <span className="workspace-nav-mobile">{mobileLabel}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-end"><span className="sidebar-live" />Data simulasi</div>
      </aside>
      <div className="workspace-area">
        <header className="workspace-bar">
          <div className="desktop-context"><Building2 size={17} aria-hidden="true" /><span>Dapur Sari</span><span className="context-divider" aria-hidden="true">/</span><strong>{current?.label}</strong></div>
          <div className="mobile-brand"><Brand /></div>
          <span className="workspace-mode"><FlaskConical size={15} aria-hidden="true" /> Data simulasi</span>
        </header>
        <main id="workspace-main" tabIndex={-1} className="workspace-main">
          <DemoProvider>{children}</DemoProvider>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{children}</p></div>{action && <div className="page-header-action">{action}</div>}</header>;
}
