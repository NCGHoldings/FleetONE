import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, GitCompare } from 'lucide-react';
import { YutongReportFilters as FilterType } from '@/hooks/useYutongExecutiveReport';
import { Badge } from '@/components/ui/badge';

interface Props {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  availableBusModels: string[];
}

const presets = [
  { label: 'All Time', start: null, end: null },
  { label: 'This Month', start: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }, end: () => new Date().toISOString().slice(0, 10) },
  { label: 'Last 30 Days', start: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }, end: () => new Date().toISOString().slice(0, 10) },
  { label: 'Last Quarter', start: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }, end: () => new Date().toISOString().slice(0, 10) },
  { label: 'This Year', start: () => `${new Date().getFullYear()}-01-01`, end: () => new Date().toISOString().slice(0, 10) },
  { label: 'Last Year', start: () => `${new Date().getFullYear() - 1}-01-01`, end: () => `${new Date().getFullYear() - 1}-12-31` },
];

export function YutongReportFilters({ filters, onFiltersChange, availableBusModels }: Props) {
  const activePreset = presets.find(p => {
    if (!p.start && !filters.startDate) return true;
    if (p.start && filters.startDate === (typeof p.start === 'function' ? p.start() : p.start)) return true;
    return false;
  });

  const handlePreset = (preset: typeof presets[0]) => {
    onFiltersChange({
      ...filters,
      startDate: preset.start ? (typeof preset.start === 'function' ? preset.start() : preset.start) : null,
      endDate: preset.end ? (typeof preset.end === 'function' ? preset.end() : preset.end) : null,
    });
  };

  const toggleModel = (model: string) => {
    const current = filters.busModels;
    const next = current.includes(model) ? current.filter(m => m !== model) : [...current, model];
    onFiltersChange({ ...filters, busModels: next });
  };

  return (
    <Card className="border-0 shadow-md print:hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: Date presets + Compare toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
            {presets.map(p => (
              <Button
                key={p.label}
                size="sm"
                variant={activePreset?.label === p.label ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => handlePreset(p)}
              >
                {p.label}
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="compare" className="text-xs">Compare Previous</Label>
              <Switch
                id="compare"
                checked={filters.compareWithPrevious}
                onCheckedChange={(v) => onFiltersChange({ ...filters, compareWithPrevious: v })}
                disabled={!filters.startDate}
              />
            </div>
          </div>

          {/* Row 2: Bus models + Payment mode */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-1">Model:</span>
            {availableBusModels.length > 0 ? availableBusModels.map(model => (
              <Badge
                key={model}
                variant={filters.busModels.includes(model) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleModel(model)}
              >
                {model}
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground">No models</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Payment:</span>
              <Select value={filters.paymentMode} onValueChange={(v: any) => onFiltersChange({ ...filters, paymentMode: v })}>
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters summary */}
          {(filters.startDate || filters.busModels.length > 0 || filters.paymentMode !== 'all') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {filters.startDate && <Badge variant="secondary" className="text-xs">{filters.startDate} → {filters.endDate}</Badge>}
              {filters.busModels.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
              {filters.paymentMode !== 'all' && <Badge variant="secondary" className="text-xs capitalize">{filters.paymentMode}</Badge>}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onFiltersChange({ startDate: null, endDate: null, compareWithPrevious: false, busModels: [], paymentMode: 'all' })}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
