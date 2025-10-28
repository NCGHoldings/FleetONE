import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, RotateCcw } from 'lucide-react';
import { useGovernanceFilters } from '@/hooks/useGovernanceFilters';

interface FilterSidebarProps {
  onClose: () => void;
}

const typeOptions = [
  { value: 'report', label: 'Reports' },
  { value: 'event', label: 'Events' },
];

const statusOptions = [
  { value: 'Planned', label: 'Planned' },
  { value: 'Due', label: 'Due' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Skipped', label: 'Skipped' },
  { value: 'N/A', label: 'N/A' },
];

export const FilterSidebar = ({ onClose }: FilterSidebarProps) => {
  const {
    companies,
    sbus,
    categories,
    selectedCompanies,
    selectedSBUs,
    selectedTypes,
    selectedCategories,
    selectedStatuses,
    toggleCompany,
    toggleSBU,
    toggleType,
    toggleCategory,
    toggleStatus,
    resetFilters,
  } = useGovernanceFilters();

  const hasActiveFilters = 
    selectedCompanies.length > 0 ||
    selectedSBUs.length > 0 ||
    selectedTypes.length > 0 ||
    selectedCategories.length > 0 ||
    selectedStatuses.length > 0;

  return (
    <div className="w-80 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Company Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Company</Label>
            <div className="space-y-2">
              {companies.map(company => (
                <div key={company.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`company-${company.id}`}
                    checked={selectedCompanies.includes(company.id)}
                    onCheckedChange={() => toggleCompany(company.id)}
                  />
                  <label
                    htmlFor={`company-${company.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {company.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* SBU Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">SBU</Label>
            {sbus.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {selectedCompanies.length === 0 
                  ? 'Select a company first'
                  : 'No SBUs available'}
              </p>
            ) : (
              <div className="space-y-2">
                {sbus.map(sbu => (
                  <div key={sbu.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sbu-${sbu.id}`}
                      checked={selectedSBUs.includes(sbu.id)}
                      onCheckedChange={() => toggleSBU(sbu.id)}
                    />
                    <label
                      htmlFor={`sbu-${sbu.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {sbu.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Type Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Type</Label>
            <div className="space-y-2">
              {typeOptions.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={selectedTypes.includes(type.value)}
                    onCheckedChange={() => toggleType(type.value)}
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Category Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Category</Label>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories available</p>
            ) : (
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="space-y-2">
              {statusOptions.map(status => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={selectedStatuses.includes(status.value)}
                    onCheckedChange={() => toggleStatus(status.value)}
                  />
                  <label
                    htmlFor={`status-${status.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {status.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export { useGovernanceFilters };
