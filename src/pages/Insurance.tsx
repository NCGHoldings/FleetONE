import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Plus, AlertTriangle, CheckCircle, Calendar, FileText, Clock, Car, RefreshCw, MoreHorizontal, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO, differenceInDays } from "date-fns";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { AccidentInsurance } from "@/components/accident/AccidentInsurance";
import { InsuranceFinanceSettings } from "@/components/insurance/InsuranceFinanceSettings";
import { useInsuranceFinanceSettings, usePostInsurancePremiumToGL } from "@/hooks/useInsuranceFinance";

interface InsuranceRecord {
  id: string;
  bus_id: string;
  policy_number: string;
  insurance_company: string;
  policy_type: string;
  issue_date: string;
  expiry_date: string;
  premium_amount: number;
  coverage_amount: number;
  status: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  driver_id?: string;
  bus?: {
    bus_no: string;
    registration_number: string;
  };
  driver?: {
    first_name: string;
    last_name: string;
  };
}

export default function Insurance() {
  const { hasRole } = useAuth();
  const [insuranceRecords, setInsuranceRecords] = useState<InsuranceRecord[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unsyncedBuses, setUnsyncedBuses] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: financeSettings } = useInsuranceFinanceSettings();
  const postInsuranceToGL = usePostInsurancePremiumToGL();
  
  // Form states
  const [formData, setFormData] = useState({
    bus_id: '',
    policy_number: '',
    insurance_company: '',
    policy_type: 'comprehensive',
    issue_date: '',
    expiry_date: '',
    premium_amount: '',
    coverage_amount: '',
    agent_name: '',
    agent_phone: '',
    agent_email: '',
    driver_id: ''
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  const fetchInsuranceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_records')
        .select(`
          *,
          buses(bus_no, registration_number),
          driver:profiles!insurance_records_driver_id_fkey(first_name, last_name)
        `)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setInsuranceRecords(data || []);
    } catch (error) {
      console.error('Error fetching insurance records:', error);
      toast.error('Failed to load insurance records');
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_no, registration_number, insurance_expiry, insurance_company')
        .eq('status', 'active')
        .order('bus_no');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, employee_id')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsuranceRecords();
    fetchBuses();
    fetchDrivers();
  }, []);

  useEffect(() => {
    // Calculate unsynced buses from the loaded fleet data
    const existingBusIds = new Set(insuranceRecords.map(r => r.bus_id));
    const unsynced = buses.filter(b => b.insurance_expiry && !existingBusIds.has(b.id));
    setUnsyncedBuses(unsynced);
  }, [buses, insuranceRecords]);

  const handleSyncFleetData = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    try {
      const recordsToInsert = unsyncedBuses.map(bus => ({
        policy_number: `AUTO-${bus.bus_no}-${Date.now().toString().slice(-6)}`,
        bus_id: bus.id,
        insurance_company: bus.insurance_company || 'Fleet Master Sync',
        policy_type: 'comprehensive',
        premium_amount: 0,
        coverage_amount: 0,
        expiry_date: bus.insurance_expiry,
        status: getExpiryStatus(bus.insurance_expiry),
        issue_date: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase.from('insurance_records').insert(recordsToInsert);
      
      if (error) throw error;

      toast.success(`Successfully synced ${unsyncedBuses.length} policies from Fleet Master`);
      fetchInsuranceRecords();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error(error.message || 'Failed to sync fleet data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const { data: newRecord, error } = await supabase
        .from('insurance_records')
        .insert({
          ...formData,
          premium_amount: parseFloat(formData.premium_amount) || null,
          coverage_amount: parseFloat(formData.coverage_amount) || null
        })
        .select()
        .single();

      if (error) throw error;

      // Sync back to buses master data
      if (formData.bus_id && formData.expiry_date) {
         try {
           await supabase
             .from('buses')
             .update({ 
               insurance_expiry: formData.expiry_date,
               insurance_company: formData.insurance_company
             })
             .eq('id', formData.bus_id);
         } catch (syncError) {
           console.error('Error syncing to bus master:', syncError);
         }
      }

      // Auto-post to GL if setting is enabled
      if (financeSettings?.auto_post_premium && newRecord?.premium_amount > 0) {
        try {
          const selectedBus = buses.find(b => b.id === newRecord.bus_id);
          
          let coverageMonths = 12;
          if (newRecord.issue_date && newRecord.expiry_date) {
            const start = new Date(newRecord.issue_date);
            const end = new Date(newRecord.expiry_date);
            coverageMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          }

          await postInsuranceToGL.mutateAsync({
            premium: {
              policyId: newRecord.id,
              policyNumber: newRecord.policy_number,
              vehicleNo: selectedBus?.bus_no,
              insuranceProvider: newRecord.insurance_company,
              premiumAmount: newRecord.premium_amount,
              premiumDate: newRecord.issue_date || new Date().toISOString().split('T')[0],
              coverageStartDate: newRecord.issue_date || new Date().toISOString().split('T')[0],
              coverageEndDate: newRecord.expiry_date || new Date().toISOString().split('T')[0],
              coverageMonths,
              insuranceType: newRecord.policy_type,
            },
            settings: financeSettings,
          });
        } catch (glError) {
          console.error('Error posting premium to GL:', glError);
          // Non-blocking error
        }
      }

      toast.success('Insurance record created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchInsuranceRecords();
    } catch (error: any) {
      console.error('Error creating insurance record:', error);
      toast.error(error.message || 'Failed to create insurance record');
    }
  };

  const resetForm = () => {
    setFormData({
      bus_id: '',
      policy_number: '',
      insurance_company: '',
      policy_type: 'comprehensive',
      issue_date: '',
      expiry_date: '',
      premium_amount: '',
      coverage_amount: '',
      agent_name: '',
      agent_phone: '',
      agent_email: '',
      driver_id: ''
    });
  };

  const handleRenewPolicy = (record: InsuranceRecord) => {
    setFormData({
      bus_id: record.bus_id,
      policy_number: '', 
      insurance_company: record.insurance_company || '',
      policy_type: record.policy_type || 'comprehensive',
      issue_date: '',
      expiry_date: '',
      premium_amount: '',
      coverage_amount: record.coverage_amount?.toString() || '',
      agent_name: record.agent_name || '',
      agent_phone: record.agent_phone || '',
      agent_email: record.agent_email || '',
      driver_id: record.driver_id || ''
    });
    setIsDialogOpen(true);
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return 'unknown';
    try {
      const parsedDate = parseISO(expiryDate);
      if (isNaN(parsedDate.getTime())) return 'unknown';
      const days = differenceInDays(parsedDate, new Date());
      if (days < 0) return 'expired';
      if (days <= 30) return 'expiring-soon';
      return 'active';
    } catch (error) {
      return 'unknown';
    }
  };

  const columns: ColumnDef<InsuranceRecord>[] = [
    {
      accessorKey: "policy_number",
      header: "Policy Number",
    },
    {
      accessorKey: "bus.bus_no",
      header: "Bus No",
    },
    {
      accessorKey: "driver",
      header: "Driver",
      cell: ({ row }) => {
        const driver = row.original.driver;
        return driver ? `${driver.first_name} ${driver.last_name}` : '-';
      },
    },
    {
      accessorKey: "insurance_company",
      header: "Insurance Company",
    },
    {
      accessorKey: "policy_type",
      header: "Policy Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue("policy_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "expiry_date",
      header: "Expiry Date",
      cell: ({ row }) => {
        const expiryDate = row.getValue("expiry_date") as string;
        const status = getExpiryStatus(expiryDate);
        
        if (!expiryDate || status === 'unknown') {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Invalid Date</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          );
        }
        
        try {
          const parsedDate = parseISO(expiryDate);
          if (isNaN(parsedDate.getTime())) {
            return (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Invalid Date</span>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            );
          }
          
          return (
            <div className="flex items-center gap-2">
              {format(parsedDate, 'MMM dd, yyyy')}
              {status === 'expired' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              {status === 'expiring-soon' && <Calendar className="h-4 w-4 text-yellow-500" />}
              {status === 'active' && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          );
        } catch (error) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Invalid Date</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          );
        }
      },
    },
    {
      accessorKey: "premium_amount",
      header: "Premium",
      cell: ({ row }) => {
        const amount = row.getValue("premium_amount") as number;
        return amount ? `LKR ${amount.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: "expiry_date",
      header: "Days Remaining",
      cell: ({ row }) => {
        const expiryDate = row.original.expiry_date;
        const status = getExpiryStatus(expiryDate);
        
        if (!expiryDate || status === 'unknown') {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Invalid Date</span>
            </div>
          );
        }
        
        try {
          const parsedDate = parseISO(expiryDate);
          if (isNaN(parsedDate.getTime())) {
            return (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Invalid Date</span>
              </div>
            );
          }
          
          const daysRemaining = differenceInDays(parsedDate, new Date());
          
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={
                status === 'expired' ? 'text-red-600 font-semibold' :
                status === 'expiring-soon' ? 'text-yellow-600 font-semibold' :
                'text-green-600'
              }>
                {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 
                 daysRemaining === 0 ? 'Expires today' :
                 `${daysRemaining} days`}
              </span>
            </div>
          );
        } catch (error) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Invalid Date</span>
            </div>
          );
        }
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const expiryDate = row.original.expiry_date;
        const status = getExpiryStatus(expiryDate);
        
        return (
          <Badge 
            variant={
              status === 'expired' ? 'destructive' : 
              status === 'expiring-soon' ? 'secondary' : 
              status === 'unknown' ? 'outline' :
              'default'
            }
          >
            {status === 'expired' ? 'Expired' : 
             status === 'expiring-soon' ? 'Expiring Soon' : 
             status === 'unknown' ? 'Invalid Date' :
             'Active'}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const record = row.original;
        const status = getExpiryStatus(record.expiry_date);
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(status === 'expired' || status === 'expiring-soon') && isAdmin && (
                <DropdownMenuItem 
                  onClick={() => handleRenewPolicy(record)}
                  className="text-primary font-medium cursor-pointer gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Renew Policy
                </DropdownMenuItem>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                    <FileText className="h-4 w-4" />
                    View Documents
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Insurance Documents - Policy #{record.policy_number}</DialogTitle>
                  </DialogHeader>
                  <DocumentUpload 
                    linkedTable="insurance_records" 
                    linkedRowId={record.id}
                  />
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const totalPolicies = insuranceRecords.length;
  const activePolicies = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'active').length;
  const expiringSoon = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'expiring-soon').length;
  const expired = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'expired').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning via-warning to-primary p-8 text-warning-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <Shield className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Insurance Management
              </h1>
              <p className="text-warning-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Comprehensive insurance policy tracking and management
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex gap-3">
              {unsyncedBuses.length > 0 && (
                <Button 
                  onClick={handleSyncFleetData}
                  disabled={isSyncing}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: '0.1s' }}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync {unsyncedBuses.length} from Fleet Data
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in"
                    style={{ animationDelay: '0.2s' }}
                  >
                    <Plus className="h-4 w-4 mr-2 animate-pulse-subtle" />
                    Add Insurance Policy
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Insurance Policy</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bus_id">Bus</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.bus_id}
                    onChange={(e) => setFormData(prev => ({...prev, bus_id: e.target.value}))}
                  >
                    <option value="">Select Bus</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_no} - {bus.registration_number}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    value={formData.policy_number}
                    onChange={(e) => setFormData(prev => ({...prev, policy_number: e.target.value}))}
                    placeholder="POL-2024-001"
                  />
                </div>
                
                <div>
                  <Label htmlFor="insurance_company">Insurance Company</Label>
                  <Input
                    id="insurance_company"
                    value={formData.insurance_company}
                    onChange={(e) => setFormData(prev => ({...prev, insurance_company: e.target.value}))}
                    placeholder="SLIC, Janashakthi, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="policy_type">Policy Type</Label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.policy_type}
                    onChange={(e) => setFormData(prev => ({...prev, policy_type: e.target.value}))}
                  >
                    <option value="comprehensive">Comprehensive</option>
                    <option value="third_party">Third Party</option>
                    <option value="passenger">Passenger Insurance</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({...prev, issue_date: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({...prev, expiry_date: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="premium_amount">Premium Amount (LKR)</Label>
                  <Input
                    id="premium_amount"
                    type="number"
                    value={formData.premium_amount}
                    onChange={(e) => setFormData(prev => ({...prev, premium_amount: e.target.value}))}
                    placeholder="50000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="coverage_amount">Coverage Amount (LKR)</Label>
                  <Input
                    id="coverage_amount"
                    type="number"
                    value={formData.coverage_amount}
                    onChange={(e) => setFormData(prev => ({...prev, coverage_amount: e.target.value}))}
                    placeholder="2000000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="agent_name">Agent Name</Label>
                  <Input
                    id="agent_name"
                    value={formData.agent_name}
                    onChange={(e) => setFormData(prev => ({...prev, agent_name: e.target.value}))}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="agent_phone">Agent Phone</Label>
                  <Input
                    id="agent_phone"
                    value={formData.agent_phone}
                    onChange={(e) => setFormData(prev => ({...prev, agent_phone: e.target.value}))}
                    placeholder="+94 77 123 4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="driver_id">Assigned Driver</Label>
                  <select
                    id="driver_id"
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                    value={formData.driver_id}
                    onChange={(e) => setFormData(prev => ({...prev, driver_id: e.target.value}))}
                  >
                    <option value="">Select Driver (Optional)</option>
                    {drivers.map(driver => (
                      <option key={driver.user_id} value={driver.user_id}>
                        {driver.first_name} {driver.last_name} - {driver.employee_id}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="agent_email">Agent Email</Label>
                  <Input
                    id="agent_email"
                    type="email"
                    value={formData.agent_email}
                    onChange={(e) => setFormData(prev => ({...prev, agent_email: e.target.value}))}
                    placeholder="agent@insurance.com"
                  />
                </div>
                
                <div className="col-span-2">
                  <Button onClick={handleSubmit} className="w-full">
                    Add Insurance Policy
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
            </div>
          )}
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="Total Policies"
              value={totalPolicies.toString()}
              icon={<Shield className="h-4 w-4 group-hover:animate-bounce-subtle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Active Policies"
              value={activePolicies.toString()}
              icon={<CheckCircle className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="Expiring Soon"
              value={expiringSoon.toString()}
              icon={<Calendar className="h-4 w-4 group-hover:animate-wiggle" />}
              change="0"
              changeType="neutral"
              description="next 30 days"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-destructive transition-all duration-500 group">
            <KPICard
              title="Expired"
              value={expired.toString()}
              icon={<AlertTriangle className="h-4 w-4 group-hover:animate-bounce-notification" />}
              change="0"
              changeType="neutral"
              description="needs renewal"
            />
          </div>
        </div>
      </div>

      {/* Tabbed Interface for Insurance Management */}
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Insurance Policies
          </TabsTrigger>
          <TabsTrigger value="accidents" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Accident Insurance
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Finance Settings
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>
                Track all vehicle insurance policies and their expiry dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={insuranceRecords} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="accidents" className="space-y-4">
          <AccidentInsurance />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="finance" className="space-y-4">
            <InsuranceFinanceSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}