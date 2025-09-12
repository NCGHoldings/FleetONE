import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomerData {
  id: string;
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  source: 'yutong' | 'special_hire' | 'fleet_owner';
  customer_type: 'individual' | 'corporate';
  created_at: string;
  
  // Analytics data
  analytics: {
    // Financial metrics
    total_lifetime_value: number;
    yutong_revenue: number;
    special_hire_revenue: number;
    maintenance_revenue: number;
    outstanding_balance: number;
    
    // Behavioral metrics
    total_transactions: number;
    yutong_purchases: number;
    special_hire_bookings: number;
    owned_buses: number;
    avg_booking_value: number;
    
    // Timeline metrics
    first_interaction: string;
    last_interaction: string;
    months_active: number;
    booking_frequency: number;
    
    // Preferences
    preferred_bus_types: string[];
    common_routes: string[];
    payment_methods: string[];
    
    // Recent activity
    recent_transactions: Array<{
      id: string;
      type: 'yutong_quotation' | 'special_hire' | 'maintenance';
      description: string;
      amount: number;
      date: string;
      status: string;
    }>;
    
    // Trends
    monthly_revenue_trend: Array<{
      month: string;
      revenue: number;
      transactions: number;
    }>;
  };
}

export interface CustomerListFilters {
  search: string;
  source: 'all' | 'yutong' | 'special_hire' | 'fleet_owner';
  customer_type: 'all' | 'individual' | 'corporate';
  revenue_range: 'all' | 'high' | 'medium' | 'low';
  activity: 'all' | 'active' | 'inactive';
}

export function useCustomerData() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerListFilters>({
    search: '',
    source: 'all',
    customer_type: 'all',
    revenue_range: 'all',
    activity: 'all'
  });

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from all sources
      const [yutongCustomers, yutongQuotations, specialHireQuotations, buses] = await Promise.all([
        supabase.from('yutong_customers').select('*'),
        supabase.from('yutong_quotations').select('*'),
        supabase.from('special_hire_quotations').select('*'),
        supabase.from('buses').select('*')
      ]);

      if (yutongCustomers.error) throw yutongCustomers.error;
      if (yutongQuotations.error) throw yutongQuotations.error;
      if (specialHireQuotations.error) throw specialHireQuotations.error;
      if (buses.error) throw buses.error;

      // Create a map to consolidate customers
      const customerMap = new Map<string, CustomerData>();

      // Process Yutong customers
      yutongCustomers.data?.forEach(customer => {
        const key = customer.phone || customer.email || customer.id;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: customer.id,
            name: customer.contact_person || customer.company_name,
            company_name: customer.company_name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            city: customer.city,
            source: 'yutong',
            customer_type: customer.company_name ? 'corporate' : 'individual',
            created_at: customer.created_at,
            analytics: {
              total_lifetime_value: 0,
              yutong_revenue: 0,
              special_hire_revenue: 0,
              maintenance_revenue: 0,
              outstanding_balance: 0,
              total_transactions: 0,
              yutong_purchases: 0,
              special_hire_bookings: 0,
              owned_buses: 0,
              avg_booking_value: 0,
              first_interaction: customer.created_at,
              last_interaction: customer.updated_at || customer.created_at,
              months_active: 0,
              booking_frequency: 0,
              preferred_bus_types: [],
              common_routes: [],
              payment_methods: [],
              recent_transactions: [],
              monthly_revenue_trend: []
            }
          });
        }
      });

      // Process Special Hire customers
      specialHireQuotations.data?.forEach(quotation => {
        const key = quotation.customer_phone || quotation.customer_email || quotation.customer_name;
        let customer = customerMap.get(key);
        
        if (!customer) {
          customer = {
            id: quotation.id,
            name: quotation.customer_name,
            company_name: quotation.company_name,
            phone: quotation.customer_phone,
            email: quotation.customer_email,
            address: quotation.pickup_location, // Using pickup as address fallback
            city: '',
            source: 'special_hire',
            customer_type: quotation.company_name ? 'corporate' : 'individual',
            created_at: quotation.created_at,
            analytics: {
              total_lifetime_value: 0,
              yutong_revenue: 0,
              special_hire_revenue: 0,
              maintenance_revenue: 0,
              outstanding_balance: 0,
              total_transactions: 0,
              yutong_purchases: 0,
              special_hire_bookings: 0,
              owned_buses: 0,
              avg_booking_value: 0,
              first_interaction: quotation.created_at,
              last_interaction: quotation.updated_at || quotation.created_at,
              months_active: 0,
              booking_frequency: 0,
              preferred_bus_types: [],
              common_routes: [],
              payment_methods: [],
              recent_transactions: [],
              monthly_revenue_trend: []
            }
          };
          customerMap.set(key, customer);
        }
      });

      // Process Fleet Owners from buses
      const fleetOwners = new Map<string, any>();
      buses.data?.forEach(bus => {
        if (bus.owner_name && bus.owner_name.trim()) {
          const key = bus.owner_nic || bus.owner_name;
          if (!fleetOwners.has(key)) {
            fleetOwners.set(key, {
              name: bus.owner_name,
              address: bus.owner_address,
              nic: bus.owner_nic,
              buses: []
            });
          }
          fleetOwners.get(key)?.buses.push(bus);
        }
      });

      fleetOwners.forEach((owner, key) => {
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            name: owner.name,
            company_name: '',
            phone: '',
            email: '',
            address: owner.address,
            city: '',
            source: 'fleet_owner',
            customer_type: 'individual',
            created_at: owner.buses[0]?.created_at || new Date().toISOString(),
            analytics: {
              total_lifetime_value: 0,
              yutong_revenue: 0,
              special_hire_revenue: 0,
              maintenance_revenue: 0,
              outstanding_balance: 0,
              total_transactions: 0,
              yutong_purchases: 0,
              special_hire_bookings: 0,
              owned_buses: owner.buses.length,
              avg_booking_value: 0,
              first_interaction: owner.buses[0]?.created_at || new Date().toISOString(),
              last_interaction: owner.buses[0]?.updated_at || new Date().toISOString(),
              months_active: 0,
              booking_frequency: 0,
              preferred_bus_types: [],
              common_routes: [],
              payment_methods: [],
              recent_transactions: [],
              monthly_revenue_trend: []
            }
          });
        }
      });

      // Calculate analytics for each customer
      const enrichedCustomers = Array.from(customerMap.values()).map(customer => {
        // Calculate Yutong analytics
        const customerYutongQuotations = yutongQuotations.data?.filter(q => 
          q.customer_phone === customer.phone || 
          q.customer_email === customer.email ||
          q.customer_name === customer.name
        ) || [];

        customer.analytics.yutong_purchases = customerYutongQuotations.length;
        customer.analytics.yutong_revenue = customerYutongQuotations
          .filter(q => q.status === 'confirmed' || q.status === 'delivered')
          .reduce((sum, q) => sum + (Number(q.total_price) || 0), 0);

        // Calculate Special Hire analytics
        const customerSpecialHireQuotations = specialHireQuotations.data?.filter(q =>
          q.customer_phone === customer.phone ||
          q.customer_email === customer.email ||
          q.customer_name === customer.name
        ) || [];

        customer.analytics.special_hire_bookings = customerSpecialHireQuotations.length;
        customer.analytics.special_hire_revenue = customerSpecialHireQuotations
          .filter(q => q.trip_status === 'completed')
          .reduce((sum, q) => sum + (Number(q.gross_revenue) || 0), 0);

        // Calculate total metrics
        customer.analytics.total_lifetime_value = 
          customer.analytics.yutong_revenue + 
          customer.analytics.special_hire_revenue + 
          customer.analytics.maintenance_revenue;

        customer.analytics.total_transactions = 
          customer.analytics.yutong_purchases + 
          customer.analytics.special_hire_bookings;

        customer.analytics.avg_booking_value = customer.analytics.total_transactions > 0 
          ? customer.analytics.total_lifetime_value / customer.analytics.total_transactions 
          : 0;

        // Calculate time-based metrics
        const firstDate = new Date(customer.analytics.first_interaction);
        const lastDate = new Date(customer.analytics.last_interaction);
        const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        customer.analytics.months_active = Math.max(1, Math.round(monthsDiff));
        customer.analytics.booking_frequency = customer.analytics.total_transactions / customer.analytics.months_active;

        // Get preferred bus types
        const busTypes = [...customerYutongQuotations.map(q => q.bus_model), 
                         ...customerSpecialHireQuotations.map(q => q.pickup_location)].filter(Boolean); // Using pickup_location as type fallback
        customer.analytics.preferred_bus_types = [...new Set(busTypes)];

        // Get recent transactions
        const recentTransactions = [
          ...customerYutongQuotations.slice(-5).map(q => ({
            id: q.id,
            type: 'yutong_quotation' as const,
            description: `${q.bus_model} - ${q.quantity} units`,
            amount: Number(q.total_price) || 0,
            date: q.created_at,
            status: q.status || 'draft'
          })),
          ...customerSpecialHireQuotations.slice(-5).map(q => ({
            id: q.id,
            type: 'special_hire' as const,
            description: `${q.pickup_location} to ${q.drop_location}`,
            amount: Number(q.gross_revenue) || 0,
            date: q.created_at,
            status: q.trip_status || 'quotation'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        customer.analytics.recent_transactions = recentTransactions;

        return customer;
      });

      setCustomers(enrichedCustomers);
    } catch (err: any) {
      console.error("Error fetching customer data:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.company_name?.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Source filter
    if (filters.source !== 'all' && customer.source !== filters.source) {
      return false;
    }

    // Customer type filter
    if (filters.customer_type !== 'all' && customer.customer_type !== filters.customer_type) {
      return false;
    }

    // Revenue range filter
    if (filters.revenue_range !== 'all') {
      const revenue = customer.analytics.total_lifetime_value;
      if (filters.revenue_range === 'high' && revenue < 1000000) return false;
      if (filters.revenue_range === 'medium' && (revenue < 100000 || revenue >= 1000000)) return false;
      if (filters.revenue_range === 'low' && revenue >= 100000) return false;
    }

    // Activity filter
    if (filters.activity !== 'all') {
      const daysSinceLastInteraction = (new Date().getTime() - new Date(customer.analytics.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
      if (filters.activity === 'active' && daysSinceLastInteraction > 90) return false;
      if (filters.activity === 'inactive' && daysSinceLastInteraction <= 90) return false;
    }

    return true;
  });

  useEffect(() => {
    fetchCustomerData();
  }, []);

  return {
    customers: filteredCustomers,
    allCustomers: customers,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchCustomerData,
    // Aggregate statistics
    stats: {
      total_customers: customers.length,
      total_revenue: customers.reduce((sum, c) => sum + c.analytics.total_lifetime_value, 0),
      active_customers: customers.filter(c => {
        const daysSinceLastInteraction = (new Date().getTime() - new Date(c.analytics.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastInteraction <= 90;
      }).length,
      avg_customer_value: customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.analytics.total_lifetime_value, 0) / customers.length 
        : 0,
      yutong_customers: customers.filter(c => c.source === 'yutong' || c.analytics.yutong_purchases > 0).length,
      special_hire_customers: customers.filter(c => c.source === 'special_hire' || c.analytics.special_hire_bookings > 0).length,
      fleet_owners: customers.filter(c => c.source === 'fleet_owner' || c.analytics.owned_buses > 0).length
    }
  };
}

export function useCustomerProfile(customerId: string) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        setLoading(true);
        // This would fetch detailed customer profile
        // For now, we'll use the same logic as above but for a single customer
        // Implementation would be similar but focused on one customer's detailed data
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerProfile();
    }
  }, [customerId]);

  return { customer, loading, error };
}