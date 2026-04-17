import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useItems } from "@/hooks/useAccountingData";

// Category detection helper
const getItemCategory = (item: any): string => {
  const desc = (item.description || "").toLowerCase();
  const code = (item.item_code || "").toLowerCase();
  if (desc.includes("yutong") || code.startsWith("zk") || code.startsWith("ytg")) return "Yutong";
  if (desc.includes("sinotruck") || desc.includes("sinotruk") || code.startsWith("snt-")) return "Sinotruk";
  if (desc.includes("lightvehicle") || desc.includes("light vehicle") || code.startsWith("lv-")) return "Light Vehicle";
  if (item.item_type === "vehicle") return "Vehicle";
  return "Other";
};

const categoryColors: Record<string, string> = {
  Yutong: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Sinotruk: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Light Vehicle": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Vehicle: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface SearchableItemSelectorProps {
  value: string;
  onValueChange: (itemId: string) => void;
  placeholder?: string;
  categoryFilter?: string;
}

export const SearchableItemSelector = ({
  value,
  onValueChange,
  placeholder = "Select item",
  categoryFilter = "all",
}: SearchableItemSelectorProps) => {
  const { data: items } = useItems();
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    return (items || []).filter((item: any) => {
      const matchesCategory = categoryFilter === "all" || getItemCategory(item) === categoryFilter;
      const matchesSearch = !s ||
        item.item_code?.toLowerCase().includes(s) ||
        item.item_name?.toLowerCase().includes(s) ||
        item.description?.toLowerCase().includes(s);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, categoryFilter]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* Search bar */}
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-7 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {filteredItems.map((item: any) => {
          const cat = getItemCategory(item);
          return (
            <SelectItem key={item.id} value={item.id}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[cat] || categoryColors.Other}`}>
                  {cat}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{item.item_code}</span>
                <span className="truncate">{item.item_name}</span>
              </div>
            </SelectItem>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No items match your filter
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export { getItemCategory, categoryColors };
