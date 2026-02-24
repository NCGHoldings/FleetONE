import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  searchKeys?: string[];
  className?: string;
}

export function EnhancedSearch({ 
  onSearch, 
  placeholder = "Search...", 
  searchKeys = [],
  className = "" 
}: EnhancedSearchProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  const displayPlaceholder = searchKeys.length > 0 
    ? `Search ${searchKeys.join(", ")}...` 
    : placeholder;

  return (
    <div className={`relative flex-1 max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder={displayPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-10"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}