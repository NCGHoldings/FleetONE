import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/contexts/CompanyContext";

export const BUSINESS_UNITS = [
  { code: "SBO", label: "School Bus Operations" },
  { code: "YUT", label: "Yutong Sales" },
  { code: "SNT", label: "Sinotruck" },
  { code: "LTV", label: "Light Vehicle" },
  { code: "SPH", label: "Special Hire / Spare Parts" },
];

interface BusinessUnitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showAllOption?: boolean;
}

export const BusinessUnitSelector = ({ value, onChange, showAllOption = false }: BusinessUnitSelectorProps) => {
  const { selectedCompany, isSubCompany } = useCompany();
  
  const isParentView = selectedCompany && !isSubCompany(selectedCompany.id);

  if (!isParentView) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select Business Unit" />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && <SelectItem value="all">All (Consolidated)</SelectItem>}
        {!showAllOption && <SelectItem value="HQ">HQ / Central</SelectItem>}
        {BUSINESS_UNITS.map(bu => (
          <SelectItem key={bu.code} value={bu.code}>{bu.code} — {bu.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
