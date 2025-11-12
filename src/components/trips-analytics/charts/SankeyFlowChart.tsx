import { ResponsiveSankey } from '@nivo/sankey';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FINANCIAL_COLORS } from '@/lib/comparison-colors';

interface SankeyFlowChartProps {
  title?: string;
  description?: string;
  data: {
    totalIncome: number;
    fuelCost: number;
    tollCost: number;
    repairCost: number;
    salaries: number;
    permits: number;
    otherExpenses: number;
    netProfit: number;
  };
}

export default function SankeyFlowChart({ 
  title = "Financial Flow Analysis", 
  description = "Visual flow from revenue to net profit through expenses",
  data 
}: SankeyFlowChartProps) {
  // Color mapping for nodes
  const nodeColors: Record<string, string> = {
    'Total Income': FINANCIAL_COLORS.income.primary,
    'Fuel': FINANCIAL_COLORS.categories.fuel,
    'Highway': FINANCIAL_COLORS.categories.highway,
    'Repairs': FINANCIAL_COLORS.categories.repair,
    'Salaries': FINANCIAL_COLORS.categories.salary,
    'Permits': FINANCIAL_COLORS.categories.permits,
    'Other': FINANCIAL_COLORS.categories.other,
    'Net Profit': FINANCIAL_COLORS.profit.primary,
  };
  
  // Transform data into Sankey format
  const sankeyData = {
    nodes: [
      { id: 'Total Income' },
      { id: 'Fuel' },
      { id: 'Highway' },
      { id: 'Repairs' },
      { id: 'Salaries' },
      { id: 'Permits' },
      { id: 'Other' },
      { id: 'Net Profit' },
    ],
    links: [
      { source: 'Total Income', target: 'Fuel', value: data.fuelCost },
      { source: 'Total Income', target: 'Highway', value: data.tollCost },
      { source: 'Total Income', target: 'Repairs', value: data.repairCost },
      { source: 'Total Income', target: 'Salaries', value: data.salaries },
      { source: 'Total Income', target: 'Permits', value: data.permits },
      { source: 'Total Income', target: 'Other', value: data.otherExpenses },
      { source: 'Total Income', target: 'Net Profit', value: data.netProfit },
    ].filter(link => link.value > 0) // Only show non-zero flows
  };

  // Handle empty data
  if (data.totalIncome <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No financial data available for flow analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
            align="justify"
            colors={(node) => nodeColors[node.id] || '#3b82f6'}
            nodeOpacity={1}
            nodeHoverOpacity={0.8}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderRadius={8}
            linkOpacity={0.4}
            linkHoverOpacity={0.8}
            linkContract={4}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 2]]
            }}
            animate={true}
            motionConfig="gentle"
          />
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Income</div>
            <div className="text-lg font-bold text-blue-600">
              ₨{data.totalIncome.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-lg font-bold text-purple-600">
              ₨{(data.fuelCost + data.tollCost + data.repairCost + data.salaries + data.permits + data.otherExpenses).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className={`text-lg font-bold ${data.netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₨{data.netProfit.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Profit Margin</div>
            <div className={`text-lg font-bold ${data.netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : '0'}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
