"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onMenuToggle={handleMenuToggle} />
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content area */}
      <main className="pt-16 md:pl-[200px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
