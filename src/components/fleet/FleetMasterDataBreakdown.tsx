import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Bus, FileCheck, FileX, Activity, Filter, X, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export function FleetMasterDataBreakdown() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterPermit, setFilterPermit] = useState<string>('all'); // 'all', 'yes', 'no'

  const { data: fleetData, isLoading } = useQuery({
    queryKey: ['fleet-master-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          id,
          bus_no,
          status,
          permit_no,
          vehicle_brand,
          model,
          bus_categories (name),
          bus_sub_categories (name)
        `);
      
      if (error) throw error;
      return data;
    }
  });

  // Extract unique filter options directly from master data
  const filterOptions = useMemo(() => {
    if (!fleetData) return { categories: [], types: [], brands: [] };
    
    const categories = new Set<string>();
    const types = new Set<string>();
    const brands = new Set<string>();

    fleetData.forEach(bus => {
      categories.add((bus.bus_categories as any)?.name || 'Uncategorized');
      types.add((bus.bus_sub_categories as any)?.name || 'Standard');
      brands.add(bus.vehicle_brand || 'Unknown');
    });

    return {
      categories: Array.from(categories).sort(),
      types: Array.from(types).sort(),
      brands: Array.from(brands).sort()
    };
  }, [fleetData]);

  // Apply filters and aggregate data
  const processedData = useMemo(() => {
    if (!fleetData) return null;

    // 1. FILTERING
    const filteredFleet = fleetData.filter(bus => {
      const cat = (bus.bus_categories as any)?.name || 'Uncategorized';
      const type = (bus.bus_sub_categories as any)?.name || 'Standard';
      const brand = bus.vehicle_brand || 'Unknown';
      const hasPermit = bus.permit_no && bus.permit_no.trim() !== '';

      if (filterCategory !== 'all' && cat !== filterCategory) return false;
      if (filterType !== 'all' && type !== filterType) return false;
      if (filterBrand !== 'all' && brand !== filterBrand) return false;
      if (filterPermit === 'yes' && !hasPermit) return false;
      if (filterPermit === 'no' && hasPermit) return false;

      return true;
    });

    const total = filteredFleet.length;
    
    // 2. AGGREGATION (Only on filtered set)
    const operationsCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const brandCount: Record<string, number> = {};
    let withPermit = 0;
    let withoutPermit = 0;
    let active = 0;
    let offline = 0;
    let maintenance = 0;

    filteredFleet.forEach(bus => {
      // Grouping
      const cat = (bus.bus_categories as any)?.name || 'Uncategorized';
      const type = (bus.bus_sub_categories as any)?.name || 'Standard';
      const brand = bus.vehicle_brand || 'Unknown';

      operationsCount[cat] = (operationsCount[cat] || 0) + 1;
      typeCount[type] = (typeCount[type] || 0) + 1;
      brandCount[brand] = (brandCount[brand] || 0) + 1;

      // Statuses
      if (bus.permit_no && bus.permit_no.trim() !== '') withPermit++;
      else withoutPermit++;

      if (bus.status === 'active' || bus.status === 'moving') active++;
      else if (bus.status === 'maintenance') maintenance++;
      else offline++;
    });

    const operationsData = Object.entries(operationsCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const typeData = Object.entries(typeCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const brandData = Object.entries(brandCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    return { total, operationsData, typeData, brandData, withPermit, withoutPermit, active, offline, maintenance };
  }, [fleetData, filterCategory, filterType, filterBrand, filterPermit]);

  const resetFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setFilterBrand('all');
    setFilterPermit('all');
  };

  const activeFiltersCount = [filterCategory, filterType, filterBrand, filterPermit].filter(v => v !== 'all').length;

  if (isLoading || !processedData) {
    return <div className="h-[250px] flex items-center justify-center animate-pulse bg-slate-100 rounded-xl">Loading fleet master data...</div>;
  }

  const { total, operationsData, typeData, brandData, withPermit, withoutPermit, active } = processedData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded shadow-md p-2 text-sm font-medium">
          <p>{`${payload[0].name} : ${payload[0].value} buses`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Bus className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-bold text-slate-800">Fleet Master Data Distribution</h2>
        </div>
      </div>

      {/* Interactive Filter Ribbon */}
      <Card className="bg-slate-50 border-dashed border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row flex-wrap items-end gap-4">
            <div className="space-y-1.5 w-full md:w-auto flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white h-10">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-auto flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-500 uppercase">Comfort Class</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white h-10">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {filterOptions.types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-auto flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-500 uppercase">Brand</label>
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="bg-white h-10">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {filterOptions.brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-auto flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-500 uppercase">Permit Status</label>
              <Select value={filterPermit} onValueChange={setFilterPermit}>
                <SelectTrigger className="bg-white h-10">
                  <SelectValue placeholder="All Permits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="yes">Has Permit</SelectItem>
                  <SelectItem value="no">No Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" className="h-10 text-slate-500 hover:text-slate-800" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" /> Reset
              </Button>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-600 font-medium">
                Filtering applied. Showing <strong>{total}</strong> exact matches out of {fleetData?.length || 0} total fleet.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-md transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Filtered Fleet</p>
              <h3 className="text-3xl font-bold mt-1">{total}</h3>
            </div>
            <div className="bg-blue-400/30 p-3 rounded-full">
              <Bus className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-md transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Active Permits</p>
              <h3 className="text-3xl font-bold mt-1">{withPermit}</h3>
            </div>
            <div className="bg-emerald-400/30 p-3 rounded-full">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-md transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">No Permit Data</p>
              <h3 className="text-3xl font-bold mt-1">{withoutPermit}</h3>
            </div>
            <div className="bg-amber-400/30 p-3 rounded-full">
              <FileX className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-md transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Daily Running</p>
              <h3 className="text-3xl font-bold mt-1">{active}</h3>
            </div>
            <div className="bg-indigo-400/30 p-3 rounded-full">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Area */}
      {total > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Operations Category</CardTitle>
              <CardDescription>SBS vs Public vs Special</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={operationsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={true}>
                      {operationsData.map((entry, index) => <Cell key={`op-cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Brand Breakdown */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Brand Distribution</CardTitle>
              <CardDescription>Top vehicle brands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={true}>
                      {brandData.map((entry, index) => <Cell key={`brand-cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Category Breakdown */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Comfort Classification</CardTitle>
              <CardDescription>Luxury vs Semi vs Standard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive={true}>
                      {typeData.map((entry, index) => <Cell key={`type-cell-${entry.name}`} fill={COLORS[(index + 4) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-slate-50 border-dashed border-2 py-12 text-center text-slate-500">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No buses found matching all filters</h3>
          <p className="mt-1">Try broadening your search or resetting some filters.</p>
          <Button variant="outline" className="mt-4" onClick={resetFilters}>Clear All Filters</Button>
        </Card>
      )}
    </div>
  );
}
