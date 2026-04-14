import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useCustomerProfile } from "@/hooks/useCustomerData";
import { 
  ArrowLeft, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Bus,
  Truck,
  Receipt,
  Star,
  Clock,
  Target
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface CustomerProfileProps {
  selectedCustomer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  onBack: () => void;
}

export function CustomerProfile({ selectedCustomer, onBack }: CustomerProfileProps) {
  const { customer, loading } = useCustomerProfile(selectedCustomer);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');

  if (loading) return <div className="p-8 text-center">Loading customer profile...</div>;
  if (!customer) return <div className="p-8 text-center">Customer not found</div>;

  const formatCurrency = (amount: number) => {
    return `LKR ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(amount)}`;
  };

  // Use real data from customer analytics
  const revenueChartData = customer.analytics.monthly_revenue_trend.map(item => {
    // Format month as short name (e.g., "Jan 2024")
    const [year, month] = item.month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    
    return {
      month: `${monthName} ${year.slice(2)}`,
      revenue: item.revenue,
      transactions: item.transactions
    };
  });

  const serviceDistributionData = [
    { name: 'Yutong Sales', value: customer.analytics.yutong_revenue, color: '#3b82f6' },
    { name: 'Special Hire', value: customer.analytics.special_hire_revenue, color: '#10b981' },
    { name: 'Maintenance', value: customer.analytics.maintenance_revenue, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
    transactions: {
      label: "Transactions", 
      color: "hsl(var(--muted-foreground))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          <p className="text-muted-foreground">
            Customer since {format(new Date(customer.created_at), 'MMM yyyy')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="yutong">Yutong Sales</TabsTrigger>
          <TabsTrigger value="special-hire">Special Hire</TabsTrigger>
          <TabsTrigger value="fleet">Fleet & Maintenance</TabsTrigger>
          <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Customer Info Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {customer.customer_type === 'corporate' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span>{customer.customer_type === 'corporate' ? 'Corporate' : 'Individual'}</span>
                </div>
                {customer.company_name && (
                  <div className="text-sm font-medium">{customer.company_name}</div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {customer.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {customer.email || 'No email'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {customer.address || customer.city || 'No address'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total Lifetime Value</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(customer.analytics.total_lifetime_value)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Outstanding Balance</div>
                  <div className="text-sm font-semibold text-orange-600">
                    {formatCurrency(customer.analytics.outstanding_balance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg Transaction Value</div>
                  <div className="text-sm font-semibold">
                    {formatCurrency(customer.analytics.avg_booking_value)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Business Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Yutong Purchases</span>
                  <span className="font-semibold text-blue-600">{customer.analytics.yutong_purchases}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Special Hire Bookings</span>
                  <span className="font-semibold text-green-600">{customer.analytics.special_hire_bookings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Owned Buses</span>
                  <span className="font-semibold text-purple-600 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {customer.analytics.owned_buses}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Last Interaction</div>
                  <div className="text-sm font-semibold">
                    {formatDistanceToNow(new Date(customer.analytics.last_interaction))} ago
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Active Months</div>
                  <div className="text-sm font-semibold">{customer.analytics.months_active}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monthly Frequency</div>
                  <div className="text-sm font-semibold">
                    {customer.analytics.booking_frequency.toFixed(1)} transactions/month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and transaction volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="revenue" orientation="left" />
                    <YAxis yAxisId="transactions" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      yAxisId="revenue"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--color-revenue)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-revenue)" }}
                    />
                    <Line 
                      yAxisId="transactions"
                      type="monotone" 
                      dataKey="transactions" 
                      stroke="var(--color-transactions)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: "var(--color-transactions)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Service Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Service Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => {
                          const total = serviceDistributionData.reduce((sum, item) => sum + Number(item.value), 0);
                          const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(0) : '0';
                          return `${name} ${percentage}%`;
                        }}
                      >
                        {serviceDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {customer.analytics.recent_transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {transaction.type === 'yutong_quotation' && <Bus className="w-4 h-4 text-blue-500" />}
                          {transaction.type === 'special_hire' && <Receipt className="w-4 h-4 text-green-500" />}
                          {transaction.type === 'maintenance' && <Truck className="w-4 h-4 text-purple-500" />}
                          <span className="text-sm font-medium">{transaction.description}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(transaction.amount)}</div>
                        <Badge variant={transaction.status === 'completed' || transaction.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yutong">
          <Card>
            <CardHeader>
              <CardTitle>Yutong Sales History</CardTitle>
              <CardDescription>Bus purchases and quotations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Yutong sales data will be displayed here...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special-hire">
          <Card>
            <CardHeader>
              <CardTitle>Special Hire Services</CardTitle>
              <CardDescription>Service bookings and trip history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Special hire service data will be displayed here...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet">
          <Card>
            <CardHeader>
              <CardTitle>Fleet & Maintenance</CardTitle>
              <CardDescription>Owned buses and maintenance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Fleet and maintenance data will be displayed here...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>Predictive insights and detailed metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Advanced analytics will be displayed here...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}