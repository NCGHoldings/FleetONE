import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnhancedSearch } from "@/components/ui/enhanced-search";
import { KPICard } from "@/components/dashboard/KPICard";
import { CustomerProfile } from "@/components/customer/CustomerProfile";
import { useCustomerData, CustomerListFilters } from "@/hooks/useCustomerData";
import { DataExportMenu } from "@/components/ui/DataExportMenu";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Building2,
  User,
  Truck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CustomerManagement() {
  const { customers, loading, stats, filters, setFilters } = useCustomerData();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleFilterChange = (key: keyof CustomerListFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomerView = (customer: any) => {
    setSelectedCustomer(customer);
    setActiveTab("profile");
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(amount)}`;
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, JSX.Element> = {
      yutong: <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">🔵 Yutong</Badge>,
      sinotruck: <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">🟢 Sinotruck</Badge>,
      special_hire: <Badge variant="default" className="bg-amber-100 text-amber-800 hover:bg-amber-100">🟡 Special Hire</Badge>,
      school_bus: <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-100">🟣 School Bus</Badge>,
      light_vehicle: <Badge variant="default" className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">🔵 Light Vehicle</Badge>,
      fleet_owner: <Badge variant="default" className="bg-violet-100 text-violet-800 hover:bg-violet-100">🚛 Fleet Owner</Badge>,
      accounting: <Badge variant="default" className="bg-gray-100 text-gray-800 hover:bg-gray-100">⚪ Accounting</Badge>,
    };
    return badges[source] || <Badge variant="outline">{source}</Badge>;
  };

  const getCustomerTypeBadge = (type: string) => {
    return type === 'corporate' 
      ? <Badge variant="outline" className="text-blue-600 border-blue-200"><Building2 className="w-3 h-3 mr-1" />{type}</Badge>
      : <Badge variant="outline" className="text-gray-600 border-gray-200"><User className="w-3 h-3 mr-1" />{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading customer data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Comprehensive customer analytics and profile management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="customers">Customer List</TabsTrigger>
          <TabsTrigger value="profile" disabled={!selectedCustomer}>Customer Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Customers"
              value={stats.total_customers.toString()}
              change="+12%"
              changeType="positive"
              icon={<Users className="w-5 h-5" />}
              description="Active customer base"
            />
            <KPICard
              title="Total Revenue"
              value={formatCurrency(stats.total_revenue)}
              change="+8.5%"
              changeType="positive"  
              icon={<DollarSign className="w-5 h-5" />}
              description="Lifetime customer value"
            />
            <KPICard
              title="Active Customers"
              value={stats.active_customers.toString()}
              change="-2%"
              changeType="negative"
              icon={<Activity className="w-5 h-5" />}
              description="Active in last 90 days"
            />
            <KPICard
              title="Avg Customer Value"
              value={formatCurrency(stats.avg_customer_value)}
              change="+15%"
              changeType="positive"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Average lifetime value"
            />
          </div>

          {/* Business Line Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Yutong Customers</CardTitle>
                <div className="text-2xl font-bold text-blue-600">{stats.yutong_customers}</div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Bus sales customers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Special Hire Customers</CardTitle>
                <div className="text-2xl font-bold text-green-600">{stats.special_hire_customers}</div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Service booking customers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Fleet Owners</CardTitle>
                <div className="text-2xl font-bold text-purple-600">{stats.fleet_owners}</div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Bus owners using maintenance</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <EnhancedSearch
                  onSearch={(query) => handleFilterChange('search', query)}
                  placeholder="Search customers..."
                  searchKeys={['name', 'company', 'phone', 'email']}
                  className="flex-1 min-w-[300px]"
                />
                <Select value={filters.source} onValueChange={(value) => handleFilterChange('source', value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Source Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="yutong">🔵 Yutong</SelectItem>
                    <SelectItem value="sinotruck">🟢 Sinotruck</SelectItem>
                    <SelectItem value="special_hire">🟡 Special Hire</SelectItem>
                    <SelectItem value="school_bus">🟣 School Bus</SelectItem>
                    <SelectItem value="light_vehicle">🔵 Light Vehicle</SelectItem>
                    <SelectItem value="fleet_owner">🚛 Fleet Owner</SelectItem>
                    <SelectItem value="accounting">⚪ Accounting</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.customer_type} onValueChange={(value) => handleFilterChange('customer_type', value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.revenue_range} onValueChange={(value) => handleFilterChange('revenue_range', value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Revenue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Revenue</SelectItem>
                    <SelectItem value="high">High (&gt;1M)</SelectItem>
                    <SelectItem value="medium">Medium (100K-1M)</SelectItem>
                    <SelectItem value="low">Low (&lt;100K)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.activity} onValueChange={(value) => handleFilterChange('activity', value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer List ({customers.length} customers)</CardTitle>
                  <CardDescription>
                    Complete customer database with analytics
                    {stats.customers_with_complete_contact < stats.total_customers && (
                      <span className="text-orange-600 ml-2">
                        • {stats.total_customers - stats.customers_with_complete_contact} with incomplete contact info
                      </span>
                    )}
                  </CardDescription>
                </div>
                {filters.search || filters.source !== 'all' || filters.customer_type !== 'all' || 
                 filters.revenue_range !== 'all' || filters.activity !== 'all' ? (
                  <Badge variant="secondary">
                    Filtered: {customers.length} of {stats.total_customers}
                  </Badge>
                ) : null}
                <DataExportMenu 
                  data={customers}
                  title="Customer Master Data"
                  filename="Customers"
                  headers={["Name", "Company", "Type", "Source", "Phone", "Email", "Active"]}
                  transformData={(data) => data.map(c => [
                    c.name || 'N/A',
                    c.company || 'N/A',
                    c.customer_type || 'N/A',
                    c.source || 'N/A',
                    c.phone || 'N/A',
                    c.email || 'N/A',
                    c.is_active ? 'Yes' : 'No'
                  ])}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.map((customer) => {
                  const hasIncompleteData = !customer.phone || !customer.email;
                  
                  return (
                  <div key={customer.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{customer.name}</h3>
                          {customer.company_name && (
                            <span className="text-sm text-muted-foreground">({customer.company_name})</span>
                          )}
                          {getSourceBadge(customer.source)}
                          {getCustomerTypeBadge(customer.customer_type)}
                          {hasIncompleteData && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Incomplete Data
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {customer.phone || 'No phone'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {customer.email || 'No email'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {customer.city || customer.address || 'No address'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDistanceToNow(new Date(customer.analytics.last_interaction))} ago
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 pt-3 border-t">
                          <div>
                            <div className="text-xs text-muted-foreground">Lifetime Value</div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(customer.analytics.total_lifetime_value)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Transactions</div>
                            <div className="font-semibold">{customer.analytics.total_transactions}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Yutong Purchases</div>
                            <div className="font-semibold text-blue-600">{customer.analytics.yutong_purchases}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Special Hire</div>
                            <div className="font-semibold text-green-600">{customer.analytics.special_hire_bookings}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Owned Buses</div>
                            <div className="font-semibold text-purple-600 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {customer.analytics.owned_buses}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCustomerView(customer)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                );
                })}
                
                {customers.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-4">
                      {stats.total_customers === 0 
                        ? "No customers in the database yet."
                        : "No customers found matching your filters."}
                    </div>
                    {stats.total_customers > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setFilters({
                          search: '',
                          source: 'all',
                          customer_type: 'all',
                          revenue_range: 'all',
                          activity: 'all'
                        })}
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          {selectedCustomer && (
            <CustomerProfile 
              selectedCustomer={selectedCustomer} 
              onBack={() => setActiveTab("customers")}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}