import { useState, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { ThemeDecorations } from "../seasonal/ThemeDecorations";
import { ThemeStyleInjector } from "../seasonal/ThemeStyleInjector";

import { QuickToolsWidget } from "./QuickToolsWidget";
import { GlobalTestBanner } from "./GlobalTestBanner";
import { ExternalSystemContext, ExternalSystem } from "./ExternalSystemContext";
import { ExternalSystemOverlay } from "./ExternalSystemOverlay";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [externalSystem, setExternalSystem] = useState<ExternalSystem | null>(null);

  const openExternalSystem = useCallback((system: ExternalSystem) => {
    setExternalSystem(system);
  }, []);

  return (
    <ExternalSystemContext.Provider value={{ openExternalSystem }}>
      <SidebarProvider>
        <ThemeStyleInjector />
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <ThemeDecorations />
            <GlobalTestBanner />
            <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>

        <QuickToolsWidget />
        {externalSystem && (
          <ExternalSystemOverlay
            system={externalSystem}
            onClose={() => setExternalSystem(null)}
          />
        )}
      </SidebarProvider>
    </ExternalSystemContext.Provider>
  );
}