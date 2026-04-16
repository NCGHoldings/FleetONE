import { useCompany } from "@/contexts/CompanyContext";
import { FlaskConical } from "lucide-react";

export function GlobalTestBanner() {
  try {
    const { isTestCompany } = useCompany();
    
    if (!isTestCompany) return null;

    return (
      <div className="w-full bg-orange-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-sm font-medium">
        <FlaskConical className="h-4 w-4" />
        <span>🧪 TEST MODE — You are working in the test environment. Data is isolated from live.</span>
      </div>
    );
  } catch {
    return null;
  }
}
