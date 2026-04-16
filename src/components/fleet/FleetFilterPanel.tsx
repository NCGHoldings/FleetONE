import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";

export interface FleetFilters {
  categories: string[];
  subCategories: string[];
  types: string[];
  models: string[];
  years: number[];
  statuses: string[];
  routes: string[];
  insuranceExpiry: string | null; // 'expired' | 'expiring_30' | 'this_month' | 'valid' | null
  licenseExpiry: string | null;
  mileageMin: string;
  mileageMax: string;
  runningDaysMin: string;
  runningDaysMax: string;
  revenueMin: string;
  revenueMax: string;
}

export const defaultFilters: FleetFilters = {
  categories: [],
  subCategories: [],
  types: [],
  models: [],
  years: [],
  statuses: [],
  routes: [],
  insuranceExpiry: null,
  licenseExpiry: null,
  mileageMin: "",
  mileageMax: "",
  runningDaysMin: "",
  runningDaysMax: "",
  revenueMin: "",
  revenueMax: "",
};

interface CategoryOption {
  id: string;
  name: string;
}

interface FleetFilterPanelProps {
  filters: FleetFilters;
  onFiltersChange: (filters: FleetFilters) => void;
  categories: CategoryOption[];
  subCategories: CategoryOption[];
  distinctTypes: string[];
  distinctModels: string[];
  distinctYears: number[];
  distinctRoutes: string[];
  activeFilterCount: number;
}

const EXPIRY_OPTIONS = [
  { value: "expired", label: "Expired", color: "bg-destructive text-destructive-foreground" },
  { value: "expiring_30", label: "< 30 Days", color: "bg-orange-500 text-white" },
  { value: "this_month", label: "This Month", color: "bg-yellow-500 text-white" },
  { value: "valid", label: "Valid", color: "bg-green-600 text-white" },
];

const STATUS_OPTIONS = ["active", "maintenance", "idle", "retired"];

function MultiSelectBadges({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <Badge
              key={opt}
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer text-xs transition-all ${isActive ? "" : "hover:bg-accent"}`}
              onClick={() => onToggle(opt)}
            >
              {renderLabel ? renderLabel(opt) : opt}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function ExpiryPresetButtons({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {EXPIRY_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Badge
              key={opt.value}
              className={`cursor-pointer text-xs transition-all ${
                isActive ? opt.color : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => onChange(isActive ? null : opt.value)}
            >
              {opt.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function RangeInputs({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder={`Min ${placeholder || ""}`}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          className="h-8 text-xs"
        />
        <span className="text-muted-foreground text-xs">—</span>
        <Input
          type="number"
          placeholder={`Max ${placeholder || ""}`}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function FleetFilterPanel({
  filters,
  onFiltersChange,
  categories,
  subCategories,
  distinctTypes,
  distinctModels,
  distinctYears,
  distinctRoutes,
  activeFilterCount,
}: FleetFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<FleetFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const toggleInArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const toggleInNumberArray = (arr: number[], value: number) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const clearAll = () => onFiltersChange({ ...defaultFilters });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </CollapsibleTrigger>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground text-xs h-8">
            <X className="w-3 h-3" />
            Clear All
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-3">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Row 1: Category, Sub-Category, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MultiSelectBadges
              label="Category"
              options={categories.map((c) => c.id)}
              selected={filters.categories}
              onToggle={(v) => update({ categories: toggleInArray(filters.categories, v) })}
              renderLabel={(id) => categories.find((c) => c.id === id)?.name || id}
            />
            <MultiSelectBadges
              label="Sub-Category"
              options={subCategories.map((c) => c.id)}
              selected={filters.subCategories}
              onToggle={(v) => update({ subCategories: toggleInArray(filters.subCategories, v) })}
              renderLabel={(id) => subCategories.find((c) => c.id === id)?.name || id}
            />
            <MultiSelectBadges
              label="Status"
              options={STATUS_OPTIONS}
              selected={filters.statuses}
              onToggle={(v) => update({ statuses: toggleInArray(filters.statuses, v) })}
              renderLabel={(s) => s.charAt(0).toUpperCase() + s.slice(1)}
            />
          </div>

          {/* Row 2: Type, Model, Route */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MultiSelectBadges
              label="Type"
              options={distinctTypes}
              selected={filters.types}
              onToggle={(v) => update({ types: toggleInArray(filters.types, v) })}
            />
            <MultiSelectBadges
              label="Model"
              options={distinctModels}
              selected={filters.models}
              onToggle={(v) => update({ models: toggleInArray(filters.models, v) })}
            />
            <MultiSelectBadges
              label="Route"
              options={distinctRoutes.slice(0, 20)}
              selected={filters.routes}
              onToggle={(v) => update({ routes: toggleInArray(filters.routes, v) })}
            />
          </div>

          {/* Row 3: Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Year</Label>
              <div className="flex flex-wrap gap-1.5">
                {distinctYears.sort((a, b) => b - a).map((yr) => {
                  const isActive = filters.years.includes(yr);
                  return (
                    <Badge
                      key={yr}
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer text-xs transition-all ${isActive ? "" : "hover:bg-accent"}`}
                      onClick={() => update({ years: toggleInNumberArray(filters.years, yr) })}
                    >
                      {yr}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <ExpiryPresetButtons
              label="Insurance Expiry"
              value={filters.insuranceExpiry}
              onChange={(v) => update({ insuranceExpiry: v })}
            />
            <ExpiryPresetButtons
              label="License Expiry"
              value={filters.licenseExpiry}
              onChange={(v) => update({ licenseExpiry: v })}
            />
          </div>

          {/* Row 4: Range inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RangeInputs
              label="Mileage (km)"
              minValue={filters.mileageMin}
              maxValue={filters.mileageMax}
              onMinChange={(v) => update({ mileageMin: v })}
              onMaxChange={(v) => update({ mileageMax: v })}
            />
            <RangeInputs
              label="Running Days"
              minValue={filters.runningDaysMin}
              maxValue={filters.runningDaysMax}
              onMinChange={(v) => update({ runningDaysMin: v })}
              onMaxChange={(v) => update({ runningDaysMax: v })}
            />
            <RangeInputs
              label="Avg Daily Revenue (₨)"
              minValue={filters.revenueMin}
              maxValue={filters.revenueMax}
              onMinChange={(v) => update({ revenueMin: v })}
              onMaxChange={(v) => update({ revenueMax: v })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
