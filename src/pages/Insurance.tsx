import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Shield, Plus, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO, differenceInDays } from "date-fns";

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
  bus?: {
    bus_no: string;
    registration_number: string;
  };
}

export default function Insurance() {
  const { hasRole } = useAuth();
  const [insuranceRecords, setInsuranceRecords] = useState<InsuranceRecord[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
    agent_email: ''
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  const fetchInsuranceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_records')
        .select(`
          *,
          buses(bus_no, registration_number)
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
        .select('id, bus_no, registration_number')
        .eq('status', 'active')
        .order('bus_no');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsuranceRecords();
    fetchBuses();
  }, []);

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const { error } = await supabase
        .from('insurance_records')
        .insert({
          ...formData,
          premium_amount: parseFloat(formData.premium_amount) || null,
          coverage_amount: parseFloat(formData.coverage_amount) || null
        });

      if (error) throw error;

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
      agent_email: ''
    });
  };

  const getExpiryStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring-soon';
    return 'active';
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
        return (
          <div className="flex items-center gap-2">
            {format(parseISO(expiryDate), 'MMM dd, yyyy')}
            {status === 'expired' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {status === 'expiring-soon' && <Calendar className="h-4 w-4 text-yellow-500" />}
            {status === 'active' && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        );
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
              'default'
            }
          >
            {status === 'expired' ? 'Expired' : 
             status === 'expiring-soon' ? 'Expiring Soon' : 
             'Active'}
          </Badge>
        );
      },
    },
  ];

  const totalPolicies = insuranceRecords.length;
  const activePolicies = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'active').length;
  const expiringSoon = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'expiring-soon').length;
  const expired = insuranceRecords.filter(r => getExpiryStatus(r.expiry_date) === 'expired').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Management</h1>
          <p className="text-muted-foreground">Track and manage vehicle insurance policies</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
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
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Policies"
          value={totalPolicies.toString()}
          icon={<Shield className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Active Policies"
          value={activePolicies.toString()}
          icon={<CheckCircle className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Expiring Soon"
          value={expiringSoon.toString()}
          icon={<Calendar className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="next 30 days"
        />
        <KPICard
          title="Expired"
          value={expired.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="needs renewal"
        />
      </div>

      {/* Insurance Table */}
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
    </div>
  );
}