import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    CalendarDays, Bus, MapPin, Clock, CheckCircle, XCircle,
    AlertCircle, DollarSign, Users, Eye, Building, Phone,
    TrendingUp, Loader2, FileText, CreditCard, Pause
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuotationModal } from './QuotationModal';

interface CalendarQuotation {
    id: string;
    quotation_no: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    company_name?: string;
    hire_type: string;
    number_of_buses: number;
    bus_type: string;
    seating_capacity?: number;
    pickup_location: string;
    drop_location: string;
    pickup_datetime: string;
    drop_datetime?: string;
    gross_revenue: number;
    net_profit: number;
    fuel_cost_fuel_only?: number;
    hire_charge?: number;
    status: string;
    trip_status?: string;
    total_paid?: number;
    advance_paid?: number;
    balance_due?: number;
    percentage_adjustment?: number;
    discount_amount_lkr?: number;
    commission_pass_through_amount?: number;
    total_additional_charges?: number;
    number_of_passengers: number;
    intermediate_stops?: string;
    route_description?: string;
    valid_until: string;
    created_at: string;
    created_by?: string;
    extra_charges?: number;
    commission_amount?: number;
    km_parking_to_pickup?: number;
    km_trip?: number;
    km_drop_to_parking?: number;
    total_distance_km?: number;
    discount_percentage?: number;
    discount_type?: string;
    additional_charges?: any;
    contact_number?: string;
    approval_status?: string;
    bus_fleet_details?: any;
}

// Calculate the Final Total (matches QuotationPreview logic)
const calculateFinalTotal = (q: CalendarQuotation): number => {
    const hireAll = q.gross_revenue || 0;
    const fuelAll = q.fuel_cost_fuel_only || 0;
    const commission = q.commission_pass_through_amount || 0;
    const additional = q.total_additional_charges || 0;
    const discount = q.discount_amount_lkr || 0;
    const base = hireAll + fuelAll + commission + additional - discount;
    const adjustmentPct = q.percentage_adjustment || 0;
    return Math.round(base + base * (adjustmentPct / 100));
};

// Derive the combined status label for display
const getDisplayStatus = (q: CalendarQuotation): string => {
    // If the quotation is confirmed, use trip_status for more detail
    if (q.status === 'confirmed') {
        const ts = q.trip_status || 'confirmed';
        const totalAmount = calculateFinalTotal(q);
        const totalPaid = q.total_paid || 0;

        // Check payment-based statuses
        if (ts === 'cancelled') return 'cancelled';
        if (ts === 'completed') return 'completed';
        if (ts === 'on_hold') return 'on_hold';
        if (ts === 'no_bus_allocated') return 'no_bus_allocated';

        // Payment-based
        if (totalPaid >= totalAmount && totalAmount > 0) return 'fully_paid';
        if ((q.advance_paid || 0) > 0 && totalPaid < totalAmount) return 'advance_paid';
        if (ts === 'paid') return 'paid';
        return 'confirmed';
    }

    return q.status; // draft, sent, accepted, rejected, declined
};

// Status config for badges
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: FileText },
    sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-100', icon: FileText },
    accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    declined: { label: 'Declined', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    confirmed: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
    advance_paid: { label: 'Advance Paid', color: 'text-teal-700', bg: 'bg-teal-100', icon: CreditCard },
    fully_paid: { label: 'Fully Paid', color: 'text-green-700', bg: 'bg-green-100', icon: DollarSign },
    paid: { label: 'Paid', color: 'text-green-700', bg: 'bg-green-100', icon: DollarSign },
    completed: { label: 'Completed', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    on_hold: { label: 'On Hold', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Pause },
    no_bus_allocated: { label: 'No Bus', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle },
};

export function SpecialHireCalendarView() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [quotations, setQuotations] = useState<CalendarQuotation[]>([]);
    const [monthDates, setMonthDates] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [monthLoading, setMonthLoading] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
    const [showModal, setShowModal] = useState(false);

    // safeParseJSON helper
    const safeParseJSON = <T,>(value: any, fallback: T): T => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'object') return value as T;
        try { return JSON.parse(value); }
        catch { return fallback; }
    };

    // Load quotations for a specific date
    const loadQuotationsForDate = async (date: Date) => {
        setLoading(true);
        try {
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

            const { data, error } = await supabase
                .from('special_hire_quotations')
                .select(`
          *,
          bus_types!bus_type_id (
            name,
            capacity
          )
        `)
                .eq('is_active_version', true)
                .gte('pickup_datetime', dayStart.toISOString())
                .lt('pickup_datetime', dayEnd.toISOString())
                .order('pickup_datetime', { ascending: true });

            if (error) throw error;

            const transformed: CalendarQuotation[] = (data || []).map((item: any) => ({
                ...item,
                bus_type: (() => {
                    const fleetDetails = safeParseJSON(item.bus_fleet_details, null);
                    return fleetDetails?.buses?.[0]?.bus_type_name || item.bus_types?.name || 'Unknown';
                })(),
                seating_capacity: item.bus_types?.capacity || 54,
                total_distance_km: (item.km_parking_to_pickup || 0) + (item.km_trip || 0) + (item.km_drop_to_parking || 0),
                intermediate_stops: typeof item.intermediate_stops === 'string'
                    ? item.intermediate_stops
                    : JSON.stringify(item.intermediate_stops || []),
                additional_charges: typeof item.additional_charges === 'string'
                    ? item.additional_charges
                    : JSON.stringify(item.additional_charges || []),
                bus_fleet_details: safeParseJSON(item.bus_fleet_details, null),
            }));

            setQuotations(transformed);
        } catch (error: any) {
            console.error('Error loading quotations for date:', error);
            toast.error('Failed to load hires for selected date');
        } finally {
            setLoading(false);
        }
    };

    // Load dates that have hires for the current month (dot indicators)
    const loadMonthDates = async (month: Date) => {
        setMonthLoading(true);
        try {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            const { data, error } = await supabase
                .from('special_hire_quotations')
                .select('pickup_datetime')
                .eq('is_active_version', true)
                .gte('pickup_datetime', start.toISOString())
                .lte('pickup_datetime', end.toISOString());

            if (error) throw error;

            const dates = new Set<string>();
            (data || []).forEach((item: any) => {
                const d = new Date(item.pickup_datetime);
                dates.add(format(d, 'yyyy-MM-dd'));
            });
            setMonthDates(dates);
        } catch (error: any) {
            console.error('Error loading month dates:', error);
        } finally {
            setMonthLoading(false);
        }
    };

    // Load data on mount and when date/month changes
    useEffect(() => {
        loadQuotationsForDate(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        loadMonthDates(currentMonth);
    }, [currentMonth]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('calendar-quotation-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'special_hire_quotations'
                },
                () => {
                    loadQuotationsForDate(selectedDate);
                    loadMonthDates(currentMonth);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedDate, currentMonth]);

    // Group quotations by display status
    const groupedQuotations = useMemo(() => {
        const groups: Record<string, CalendarQuotation[]> = {};
        quotations.forEach(q => {
            const status = getDisplayStatus(q);
            if (!groups[status]) groups[status] = [];
            groups[status].push(q);
        });
        return groups;
    }, [quotations]);

    // Stats for the selected date
    const stats = useMemo(() => {
        const total = quotations.length;
        const counts: Record<string, number> = {};
        quotations.forEach(q => {
            const status = getDisplayStatus(q);
            counts[status] = (counts[status] || 0) + 1;
        });
        const totalRevenue = quotations.reduce((sum, q) => sum + calculateFinalTotal(q), 0);
        return { total, counts, totalRevenue };
    }, [quotations]);

    // Calendar modifiers — highlight dates with hires
    const hasHiresDates = useMemo(() => {
        return Array.from(monthDates).map(d => new Date(d + 'T00:00:00'));
    }, [monthDates]);

    const handleViewQuotation = (quotation: CalendarQuotation) => {
        setSelectedQuotation(quotation);
        setShowModal(true);
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (date) setSelectedDate(date);
    };

    const renderStatusBadge = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        const Icon = config.icon;
        return (
            <Badge variant="secondary" className={`${config.bg} ${config.color} text-xs`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    // Stat cards to display
    const statCards = [
        { key: 'total', label: 'Total Hires', value: stats.total, icon: CalendarDays, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
        { key: 'confirmed', label: 'Confirmed', value: stats.counts['confirmed'] || 0, icon: Clock, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
        { key: 'advance_paid', label: 'Advance Paid', value: stats.counts['advance_paid'] || 0, icon: CreditCard, bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700' },
        { key: 'fully_paid', label: 'Fully Paid', value: stats.counts['fully_paid'] || 0, icon: DollarSign, bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
        { key: 'completed', label: 'Completed', value: stats.counts['completed'] || 0, icon: CheckCircle, bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
        { key: 'cancelled', label: 'Cancelled', value: stats.counts['cancelled'] || 0, icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
        { key: 'on_hold', label: 'On Hold', value: stats.counts['on_hold'] || 0, icon: Pause, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
    ];

    // Only show stat cards with values > 0 (except total always shows)
    const visibleStatCards = statCards.filter(s => s.key === 'total' || s.value > 0);

    return (
        <div className="space-y-4">
            {/* Layout: Calendar + Hire Details */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 lg:gap-6">

                {/* Left Panel — Calendar */}
                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                Select Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                month={currentMonth}
                                onMonthChange={setCurrentMonth}
                                modifiers={{
                                    hasHires: hasHiresDates,
                                }}
                                modifiersStyles={{
                                    hasHires: {
                                        fontWeight: 'bold',
                                        textDecoration: 'underline',
                                        textDecorationColor: 'hsl(var(--primary))',
                                        textUnderlineOffset: '4px',
                                    },
                                }}
                                className="rounded-md"
                            />
                            {monthLoading && (
                                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Loading...
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Revenue Card */}
                    {stats.total > 0 && (
                        <Card className="shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                                        <p className="text-lg font-bold">LKR {stats.totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel — Hire Details */}
                <div className="space-y-4">
                    {/* Date Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </h2>
                        <Badge variant="outline" className="text-sm">
                            {stats.total} hire{stats.total !== 1 ? 's' : ''}
                        </Badge>
                    </div>

                    {/* Status Summary Cards */}
                    {stats.total > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {visibleStatCards.map(stat => {
                                const Icon = stat.icon;
                                return (
                                    <div
                                        key={stat.key}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stat.bg} transition-all`}
                                    >
                                        <Icon className={`h-4 w-4 ${stat.text}`} />
                                        <span className={`text-xs font-medium ${stat.text}`}>{stat.label}</span>
                                        <span className={`text-sm font-bold ${stat.text}`}>{stat.value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                            <p className="text-sm text-muted-foreground">Loading hires...</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && quotations.length === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="py-16">
                                <div className="text-center space-y-3">
                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                                        <CalendarDays className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-base">No hires scheduled</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            There are no special hires for {format(selectedDate, 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Hire Cards */}
                    {!loading && quotations.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {quotations.map((q) => {
                                const displayStatus = getDisplayStatus(q);
                                const finalTotal = calculateFinalTotal(q);
                                const totalPaid = q.total_paid || 0;
                                const advancePaid = q.advance_paid || 0;

                                return (
                                    <Card
                                        key={q.id}
                                        className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-l-4"
                                        style={{
                                            borderLeftColor: `var(--${displayStatus}-border, hsl(var(--border)))`,
                                        }}
                                        onClick={() => handleViewQuotation(q)}
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm">{q.quotation_no}</span>
                                                        {renderStatusBadge(displayStatus)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-medium">{q.customer_name}</span>
                                                    </div>
                                                    {q.company_name && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Building className="h-3 w-3" />
                                                            <span>{q.company_name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewQuotation(q);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Route */}
                                            <div className="flex items-start gap-2 text-xs">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <span className="text-muted-foreground">
                                                    {q.pickup_location} → {q.drop_location}
                                                </span>
                                            </div>

                                            {/* Details Row */}
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Bus className="h-3 w-3" />
                                                    <span>{q.bus_type}</span>
                                                    {q.number_of_buses > 1 && <span className="font-medium">×{q.number_of_buses}</span>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{format(new Date(q.pickup_datetime), 'h:mm a')}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                                        {q.hire_type}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Financial Row */}
                                            <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Amount</p>
                                                    <p className="font-bold text-sm">LKR {finalTotal.toLocaleString()}</p>
                                                </div>
                                                {totalPaid > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Paid</p>
                                                        <p className="font-semibold text-sm text-green-600">
                                                            LKR {totalPaid.toLocaleString()}
                                                        </p>
                                                        {advancePaid > 0 && totalPaid < finalTotal && (
                                                            <p className="text-[10px] text-teal-600">
                                                                Advance: LKR {advancePaid.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {totalPaid === 0 && q.status === 'confirmed' && (
                                                    <div className="text-right">
                                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">
                                                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                                            No Payments
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Quotation Detail Modal */}
            {showModal && selectedQuotation && (
                <QuotationModal
                    quotation={selectedQuotation}
                    open={showModal}
                    onOpenChange={(open) => {
                        setShowModal(open);
                        if (!open) setSelectedQuotation(null);
                    }}
                />
            )}
        </div>
    );
}
