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

      // Helper function to normalize phone numbers
      const normalizePhone = (phone: string | null | undefined): string => {
        if (!phone) return '';
        return phone.replace(/[\s\-\+]/g, '').replace(/^94/, '0');
      };

      // Helper function to normalize company name
      const normalizeCompanyName = (name: string | null | undefined): string => {
        if (!name || name.trim() === '') return '';
        return name.trim();
      };

      // Process Yutong quotations as primary source for Yutong customers
      yutongQuotations.data?.forEach(quotation => {
        const normalizedPhone = normalizePhone(quotation.customer_phone);
        const normalizedEmail = quotation.customer_email?.toLowerCase().trim() || '';
        
        // Use phone as primary key, fallback to email, then ID
        const key = normalizedPhone || normalizedEmail || quotation.id;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: quotation.id,
            name: quotation.customer_name,
            company_name: normalizeCompanyName(quotation.company_name),
            phone: quotation.customer_phone,
            email: quotation.customer_email,
            address: quotation.customer_address,
            city: '',
            source: 'yutong',
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
          });
        } else {
          // Merge data if key exists (prefer non-empty values)
          const existing = customerMap.get(key)!;
          if (!existing.email && quotation.customer_email) {
            existing.email = quotation.customer_email;
          }
          if (!existing.company_name && quotation.company_name) {
            existing.company_name = normalizeCompanyName(quotation.company_name);
          }
          if (!existing.address && quotation.customer_address) {
            existing.address = quotation.customer_address;
          }
          // Update last interaction if this quotation is newer
          if (new Date(quotation.created_at) > new Date(existing.analytics.last_interaction)) {
            existing.analytics.last_interaction = quotation.created_at;
          }
        }
      });

      // Process Special Hire customers
      specialHireQuotations.data?.forEach(quotation => {
        const normalizedPhone = normalizePhone(quotation.customer_phone);
        const normalizedEmail = quotation.customer_email?.toLowerCase().trim() || '';
        const key = normalizedPhone || normalizedEmail || quotation.customer_name?.toLowerCase().trim() || quotation.id;
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

      // Define revenue statuses constant
      const REVENUE_STATUSES = ['converted_to_order', 'confirmed', 'order_created', 'completed'];

      // Calculate analytics for each customer
      const enrichedCustomers = Array.from(customerMap.values()).map(customer => {
        // Calculate Yutong analytics - use normalized matching
        const normalizedCustomerPhone = normalizePhone(customer.phone);
        const normalizedCustomerEmail = customer.email?.toLowerCase().trim() || '';
        
        const customerYutongQuotations = yutongQuotations.data?.filter(q => {
          const normalizedQuotationPhone = normalizePhone(q.customer_phone);
          const normalizedQuotationEmail = q.customer_email?.toLowerCase().trim() || '';
          
          return normalizedQuotationPhone === normalizedCustomerPhone || 
                 normalizedQuotationEmail === normalizedCustomerEmail ||
                 q.customer_name?.trim().toLowerCase() === customer.name?.trim().toLowerCase();
        }) || [];

        customer.analytics.yutong_purchases = customerYutongQuotations.length;
        
        // Only count revenue from confirmed/converted/completed statuses
        customer.analytics.yutong_revenue = customerYutongQuotations
          .filter(q => q.status && REVENUE_STATUSES.includes(q.status.toLowerCase()))
          .reduce((sum, q) => sum + (Number(q.total_price) || 0), 0);

        // Calculate Special Hire analytics - use normalized matching
        const customerSpecialHireQuotations = specialHireQuotations.data?.filter(q => {
          const normalizedQuotationPhone = normalizePhone(q.customer_phone);
          const normalizedQuotationEmail = q.customer_email?.toLowerCase().trim() || '';
          
          return normalizedQuotationPhone === normalizedCustomerPhone ||
                 normalizedQuotationEmail === normalizedCustomerEmail ||
                 q.customer_name?.trim().toLowerCase() === customer.name?.trim().toLowerCase();
        }) || [];

        customer.analytics.special_hire_bookings = customerSpecialHireQuotations.length;
        // Include completed and confirmed trips in revenue
        customer.analytics.special_hire_revenue = customerSpecialHireQuotations
          .filter(q => q.trip_status && ['completed', 'confirmed'].includes(q.trip_status.toLowerCase()))
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
            description: `${q.bus_model || 'Bus'} - ${q.quantity || 1} units`,
            amount: Number(q.total_price) || 0,
            date: q.created_at,
            status: q.status || 'draft'
          })),
          ...customerSpecialHireQuotations.slice(-5).map(q => ({
            id: q.id,
            type: 'special_hire' as const,
            description: `${q.pickup_location || 'Pickup'} to ${q.drop_location || 'Drop'}`,
            amount: Number(q.gross_revenue) || 0,
            date: q.created_at,
            status: q.trip_status || 'quotation'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        customer.analytics.recent_transactions = recentTransactions;

        // Calculate monthly revenue trend (last 12 months)
        const monthlyData = new Map<string, { revenue: number; transactions: number }>();
        const now = new Date();
        
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
          monthlyData.set(monthKey, { revenue: 0, transactions: 0 });
        }

        // Add Yutong transactions - only revenue statuses
        customerYutongQuotations.forEach(q => {
          const monthKey = q.created_at.slice(0, 7);
          const existing = monthlyData.get(monthKey);
          if (existing && q.status && REVENUE_STATUSES.includes(q.status.toLowerCase())) {
            existing.revenue += Number(q.total_price) || 0;
            existing.transactions += 1;
          }
        });

        // Add Special Hire transactions
        customerSpecialHireQuotations.forEach(q => {
          const monthKey = q.created_at.slice(0, 7);
          const existing = monthlyData.get(monthKey);
          if (existing && q.trip_status && ['completed', 'confirmed'].includes(q.trip_status.toLowerCase())) {
            existing.revenue += Number(q.gross_revenue) || 0;
            existing.transactions += 1;
          }
        });

        customer.analytics.monthly_revenue_trend = Array.from(monthlyData.entries())
          .map(([month, data]) => ({
            month,
            revenue: data.revenue,
            transactions: data.transactions
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

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
    // Aggregate statistics - use filteredCustomers for accurate counts
    stats: {
      total_customers: customers.length,
      filtered_customers: filteredCustomers.length,
      total_revenue: customers.reduce((sum, c) => sum + c.analytics.total_lifetime_value, 0),
      filtered_revenue: filteredCustomers.reduce((sum, c) => sum + c.analytics.total_lifetime_value, 0),
      active_customers: customers.filter(c => {
        const daysSinceLastInteraction = (new Date().getTime() - new Date(c.analytics.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastInteraction <= 90;
      }).length,
      avg_customer_value: customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.analytics.total_lifetime_value, 0) / customers.length 
        : 0,
      yutong_customers: customers.filter(c => c.source === 'yutong' || c.analytics.yutong_purchases > 0).length,
      special_hire_customers: customers.filter(c => c.source === 'special_hire' || c.analytics.special_hire_bookings > 0).length,
      fleet_owners: customers.filter(c => c.source === 'fleet_owner' || c.analytics.owned_buses > 0).length,
      // Data quality metrics
      customers_with_phone: customers.filter(c => c.phone && c.phone.trim()).length,
      customers_with_email: customers.filter(c => c.email && c.email.trim()).length,
      customers_with_complete_contact: customers.filter(c => c.phone && c.phone.trim() && c.email && c.email.trim()).length
    }
  };
}

export function useCustomerProfile(selectedCustomer: { id: string; name: string; phone?: string; email?: string; }) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (!selectedCustomer) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let customerData: any = null;
        
        // First try to find in yutong_customers by ID
        const { data: yutongCustomer, error: yutongError } = await supabase
          .from('yutong_customers')
          .select('*')
          .eq('id', selectedCustomer.id)
          .maybeSingle();

        if (!yutongError && yutongCustomer) {
          customerData = yutongCustomer;
        } else {
          // If not found by ID, try by phone/email
          let query = supabase.from('yutong_customers').select('*');
          
          if (selectedCustomer.phone) {
            query = query.eq('phone', selectedCustomer.phone);
          } else if (selectedCustomer.email) {
            query = query.eq('email', selectedCustomer.email);
          }
          
          const { data: foundCustomer } = await query.maybeSingle();
          if (foundCustomer) {
            customerData = foundCustomer;
          }
        }

        // Fetch all related data using normalized phone/email/name for comprehensive lookup
        // Helper function to normalize phone numbers
        const normalizePhone = (phone: string | null | undefined): string => {
          if (!phone) return '';
          return phone.replace(/[\s\-\+]/g, '').replace(/^94/, '0');
        };

        const normalizedPhone = normalizePhone(selectedCustomer.phone);
        const normalizedEmail = selectedCustomer.email?.toLowerCase().trim() || '';

        const [yutongQuotationsResult, specialHireResult, busesResult] = await Promise.allSettled([
          // Yutong quotations - use normalized matching
          (async () => {
            const { data: allQuotations } = await supabase
              .from('yutong_quotations')
              .select('*');
            
            const filtered = allQuotations?.filter(q => {
              const qPhone = normalizePhone(q.customer_phone);
              const qEmail = q.customer_email?.toLowerCase().trim() || '';
              const qName = q.customer_name?.trim().toLowerCase() || '';
              const sName = selectedCustomer.name?.trim().toLowerCase() || '';
              
              return (normalizedPhone && qPhone === normalizedPhone) ||
                     (normalizedEmail && qEmail === normalizedEmail) ||
                     (qName && sName && qName.includes(sName));
            }) || [];
            
            return { data: filtered, error: null };
          })(),
          
          // Special hire quotations - use normalized matching
          (async () => {
            const { data: allQuotations } = await supabase
              .from('special_hire_quotations')
              .select('*');
            
            const filtered = allQuotations?.filter(q => {
              const qPhone = normalizePhone(q.customer_phone);
              const qEmail = q.customer_email?.toLowerCase().trim() || '';
              const qName = q.customer_name?.trim().toLowerCase() || '';
              const sName = selectedCustomer.name?.trim().toLowerCase() || '';
              
              return (normalizedPhone && qPhone === normalizedPhone) ||
                     (normalizedEmail && qEmail === normalizedEmail) ||
                     (qName && sName && qName.includes(sName));
            }) || [];
            
            return { data: filtered, error: null };
          })(),
          
          // Buses (fleet ownership)
          (async () => {
            if (!selectedCustomer.name) {
              return { data: [], error: null };
            }
            return await supabase
              .from('buses')
              .select('*')
              .ilike('owner_name', `%${selectedCustomer.name.replace(/'/g, "''")}%`);
          })()
        ]);

        const yutongQuotations = yutongQuotationsResult.status === 'fulfilled' ? yutongQuotationsResult.value.data || [] : [];
        const specialHireQuotations = specialHireResult.status === 'fulfilled' ? specialHireResult.value.data || [] : [];
        const ownedBuses = busesResult.status === 'fulfilled' ? busesResult.value.data || [] : [];

        // Create consolidated customer profile
        const consolidatedCustomer: CustomerData = {
          id: customerData?.id || selectedCustomer.id,
          name: customerData?.company_name || selectedCustomer.name,
          company_name: customerData?.company_name || selectedCustomer.name,
          phone: customerData?.phone || selectedCustomer.phone || '',
          email: customerData?.email || selectedCustomer.email || '',
          address: customerData?.address || '',
          city: customerData?.city || '',
          customer_type: customerData?.customer_type || 'individual',
          source: customerData ? 'yutong' : 
                  specialHireQuotations.length > 0 ? 'special_hire' : 
                  ownedBuses.length > 0 ? 'fleet_owner' : 'yutong',
          created_at: customerData?.created_at || new Date().toISOString(),
          analytics: {
            // Financial metrics - use correct status filtering
            total_lifetime_value: [
              ...yutongQuotations.filter(q => q.status && ['converted_to_order', 'confirmed', 'order_created', 'completed'].includes(q.status.toLowerCase())).map(q => q.total_price || 0),
              ...specialHireQuotations.filter(q => q.trip_status && ['completed', 'confirmed'].includes(q.trip_status.toLowerCase())).map(q => q.gross_revenue || 0)
            ].reduce((sum, val) => sum + val, 0),
            
            yutong_revenue: yutongQuotations.filter(q => q.status && ['converted_to_order', 'confirmed', 'order_created', 'completed'].includes(q.status.toLowerCase())).reduce((sum, q) => sum + (q.total_price || 0), 0),
            special_hire_revenue: specialHireQuotations.filter(q => q.trip_status && ['completed', 'confirmed'].includes(q.trip_status.toLowerCase())).reduce((sum, q) => sum + (q.gross_revenue || 0), 0),
            maintenance_revenue: 0, // Would need maintenance records to calculate this
            
            outstanding_balance: specialHireQuotations.reduce((sum, q) => sum + (q.balance_due || 0), 0),
            
            // Transaction counts
            total_transactions: yutongQuotations.length + specialHireQuotations.length,
            yutong_purchases: yutongQuotations.filter(q => q.status && ['converted_to_order', 'confirmed', 'order_created', 'completed'].includes(q.status.toLowerCase())).length,
            special_hire_bookings: specialHireQuotations.length,
            owned_buses: ownedBuses.length,
            
            // Behavioral metrics
            avg_booking_value: (() => {
              const allTransactions = [
                ...yutongQuotations.filter(q => q.status && ['converted_to_order', 'confirmed', 'order_created', 'completed'].includes(q.status.toLowerCase())).map(q => q.total_price || 0),
                ...specialHireQuotations.filter(q => q.trip_status && ['completed', 'confirmed'].includes(q.trip_status.toLowerCase())).map(q => q.gross_revenue || 0)
              ];
              return allTransactions.length > 0 ? allTransactions.reduce((sum, val) => sum + val, 0) / allTransactions.length : 0;
            })(),
            
            first_interaction: customerData?.created_at || new Date().toISOString(),
            
            last_interaction: (() => {
              const allDates = [
                ...yutongQuotations.map(q => q.created_at || q.updated_at),
                ...specialHireQuotations.map(q => q.created_at || q.updated_at)
              ].filter(Boolean).sort().reverse();
              return allDates[0] || new Date().toISOString();
            })(),
            
            months_active: (() => {
              const allDates = [
                ...yutongQuotations.map(q => q.created_at),
                ...specialHireQuotations.map(q => q.created_at)
              ].filter(Boolean);
              
              if (allDates.length === 0) return 0;
              
              const uniqueMonths = new Set(allDates.map(date => {
                const d = new Date(date);
                return `${d.getFullYear()}-${d.getMonth()}`;
              }));
              
              return uniqueMonths.size;
            })(),
            
            booking_frequency: (() => {
              const totalTransactions = yutongQuotations.length + specialHireQuotations.length;
              const firstTransaction = [...yutongQuotations, ...specialHireQuotations]
                .map(q => q.created_at)
                .filter(Boolean)
                .sort()[0];
              
              if (!firstTransaction || totalTransactions === 0) return 0;
              
              const monthsSinceFirst = (new Date().getTime() - new Date(firstTransaction).getTime()) / (1000 * 60 * 60 * 24 * 30);
              return monthsSinceFirst > 0 ? totalTransactions / monthsSinceFirst : 0;
            })(),
            
            // Additional required fields
            preferred_bus_types: [...new Set(yutongQuotations.map(q => q.bus_model).filter(Boolean))],
            common_routes: [],
            payment_methods: [],
            monthly_revenue_trend: [],
            
            // Recent activity
            recent_transactions: [
              ...yutongQuotations.map(q => ({
                id: q.id,
                type: 'yutong_quotation' as const,
                description: `Yutong Bus Purchase - ${q.bus_model || 'Bus'}`,
                amount: q.total_price || 0,
                date: q.created_at || new Date().toISOString(),
                status: q.status || 'draft'
              })),
              ...specialHireQuotations.map(q => ({
                id: q.id,
                type: 'special_hire' as const,
                description: `Special Hire Service - ${q.pickup_location || 'Trip'}`,
                amount: q.gross_revenue || 0,
                date: q.created_at || new Date().toISOString(),
                status: q.trip_status || 'quotation'
              }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
          }
        };

        setCustomer(consolidatedCustomer);
      } catch (err) {
        console.error('Error in fetchCustomerProfile:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerProfile();
  }, [selectedCustomer]);

  return { customer, loading, error };
}