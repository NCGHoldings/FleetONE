import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineItem {
  name: string;
  account_code?: string;
  category: string;
  subcategory: string;
  department: string;
  default_amount?: number;
}

interface TemplateSpreadsheetViewProps {
  lineItems: LineItem[];
}

export function TemplateSpreadsheetView({ lineItems }: TemplateSpreadsheetViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Revenue', 'Expense']));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Group items by category and subcategory
  const groupedItems = useMemo(() => {
    const groups: Record<string, Record<string, LineItem[]>> = {};
    
    lineItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = {};
      }
      if (!groups[item.category][item.subcategory]) {
        groups[item.category][item.subcategory] = [];
      }
      groups[item.category][item.subcategory].push(item);
    });

    return groups;
  }, [lineItems]);

  // Calculate totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(groupedItems).forEach(category => {
      totals[category] = Object.values(groupedItems[category])
        .flat()
        .reduce((sum, item) => sum + (item.default_amount || 0), 0);
    });
    return totals;
  }, [groupedItems]);

  const subcategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(groupedItems).forEach(([category, subcats]) => {
      Object.entries(subcats).forEach(([subcat, items]) => {
        const key = `${category}-${subcat}`;
        totals[key] = items.reduce((sum, item) => sum + (item.default_amount || 0), 0);
      });
    });
    return totals;
  }, [groupedItems]);

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const toggleSubcategory = (key: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedSubcategories(newSet);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Revenue':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Expense':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'Cash Flow':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const totalRevenue = categoryTotals['Revenue'] || 0;
  const totalExpenses = categoryTotals['Expense'] || 0;
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm">
        <div className="col-span-1 text-center">Code</div>
        <div className="col-span-5">Account Name</div>
        <div className="col-span-2">Department</div>
        <div className="col-span-2 text-right">Budget Amount</div>
        <div className="col-span-2 text-right">Annual Total</div>
      </div>

      {/* Body */}
      <div className="divide-y">
        {Object.entries(groupedItems).map(([category, subcategories]) => (
          <div key={category}>
            {/* Category Header */}
            <div
              className={cn(
                'grid grid-cols-12 gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors font-semibold border-l-4',
                getCategoryColor(category)
              )}
              onClick={() => toggleCategory(category)}
            >
              <div className="col-span-6 flex items-center gap-2">
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-base">{category}</span>
              </div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-right font-bold">
                {formatCurrency(categoryTotals[category] || 0)}
              </div>
            </div>

            {/* Subcategories and Items */}
            {expandedCategories.has(category) && (
              <div className="bg-muted/20">
                {Object.entries(subcategories).map(([subcategory, items]) => {
                  const subcatKey = `${category}-${subcategory}`;
                  return (
                    <div key={subcatKey}>
                      {/* Subcategory Header */}
                      <div
                        className="grid grid-cols-12 gap-2 p-2 px-6 cursor-pointer hover:bg-muted/60 transition-colors font-medium text-sm bg-muted/40"
                        onClick={() => toggleSubcategory(subcatKey)}
                      >
                        <div className="col-span-6 flex items-center gap-2">
                          {expandedSubcategories.has(subcatKey) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span className="text-muted-foreground">{subcategory}</span>
                          <span className="text-xs text-muted-foreground">({items.length} items)</span>
                        </div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2 text-right font-semibold">
                          {formatCurrency(subcategoryTotals[subcatKey] || 0)}
                        </div>
                      </div>

                      {/* Line Items */}
                      {expandedSubcategories.has(subcatKey) && (
                        <div className="divide-y">
                          {items.map((item, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-12 gap-2 p-2 px-8 hover:bg-background transition-colors text-sm"
                            >
                              <div className="col-span-1 text-center font-mono text-xs text-muted-foreground">
                                {item.account_code || '---'}
                              </div>
                              <div className="col-span-5 font-medium">{item.name}</div>
                              <div className="col-span-2 text-sm text-muted-foreground">{item.department}</div>
                              <div className="col-span-2 text-right font-medium">
                                {item.default_amount ? formatCurrency(item.default_amount) : '-'}
                              </div>
                              <div className="col-span-2 text-right font-medium">
                                {item.default_amount ? formatCurrency(item.default_amount * 12) : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Net Profit/Loss Footer */}
      <div className="grid grid-cols-12 gap-2 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold border-t-4 border-white">
        <div className="col-span-6 text-lg">NET PROFIT / LOSS</div>
        <div className="col-span-2"></div>
        <div className="col-span-2"></div>
        <div className={cn(
          'col-span-2 text-right text-lg',
          netProfit >= 0 ? 'text-emerald-200' : 'text-red-200'
        )}>
          {formatCurrency(netProfit)}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground">Total Revenue</div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Total Expenses</div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Net Profit Margin</div>
          <div className={cn(
            'text-xl font-bold',
            netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
