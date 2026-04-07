import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    CalendarDays, Bus, MapPin, Clock, CheckCircle, XCircle,
    AlertCircle, DollarSign, Users, Eye, Building, Phone,
    TrendingUp, Loader2, FileText, CreditCard, Pause, GitBranch,
    MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { QuotationModal } from './QuotationModal';
import { SpecialHireRemarkDialog } from './SpecialHireRemarkDialog';

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
    version_number?: string;
    parent_quotation_id?: string;
    is_active_version?: boolean;
}

interface GroupedHire {
    groupId: string;
    allVersions: CalendarQuotation[];
    displayQuotation: CalendarQuotation;
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
    if (q.status === 'confirmed') {
        const ts = q.trip_status || 'confirmed';
        const totalAmount = calculateFinalTotal(q);
        const totalPaid = q.total_paid || 0;

        if (ts === 'cancelled') return 'cancelled';
        if (ts === 'completed') return 'completed';
        if (ts === 'on_hold') return 'on_hold';
        if (ts === 'no_bus_allocated') return 'no_bus_allocated';

        if (totalPaid >= totalAmount && totalAmount > 0) return 'fully_paid';
        if ((q.advance_paid || 0) > 0 && totalPaid < totalAmount) return 'advance_paid';
        if (ts === 'paid') return 'paid';
        return 'confirmed';
    }

    return q.status;
};

// Get base quotation number by stripping version suffix
const getBaseQuotationNo = (quotationNo: string): string => {
    return quotationNo.replace(/-v\d+\.\d+$/, '');
};

// Parse version number for sorting
const parseVersion = (version: string | undefined): number => {
    if (!version) return 0;
    const parts = version.split('.');
    return (parseInt(parts[0] || '0') * 1000) + parseInt(parts[1] || '0');
};

// Status config for badges
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    draft: { label: 'Draft', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800', icon: FileText },
    sent: { label: 'Sent', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', icon: FileText },
    accepted: { label: 'Accepted', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: XCircle },
    declined: { label: 'Declined', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: XCircle },
    confirmed: { label: 'Confirmed', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', icon: Clock },
    advance_paid: { label: 'Advance Paid', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900/40', icon: CreditCard },
    fully_paid: { label: 'Fully Paid', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', icon: DollarSign },
    paid: { label: 'Paid', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', icon: DollarSign },
    completed: { label: 'Completed', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: XCircle },
    on_hold: { label: 'On Hold', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40', icon: Pause },
    no_bus_allocated: { label: 'No Bus', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', icon: AlertCircle },
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
    const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<'hires' | 'created'>('hires');
    const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
    const [remarkTarget, setRemarkTarget] = useState<{ id: string; quotationNo: string; customerName: string } | null>(null);

    const safeParseJSON = <T,>(value: any, fallback: T): T => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'object') return value as T;
        try { return JSON.parse(value); }
        catch { return fallback; }
    };

    // Load ALL versions for a specific date (no is_active_version filter)
    const loadQuotationsForDate = async (date: Date) => {
        setLoading(true);
        try {
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

            const filterColumn = viewMode === 'hires' ? 'pickup_datetime' : 'created_at';

            const { data, error } = await supabase
                .from('special_hire_quotations')
                .select(`
          *,
          bus_types!bus_type_id (
            name,
            capacity
          )
        `)
                .gte(filterColumn, dayStart.toISOString())
                .lt(filterColumn, dayEnd.toISOString())
                .order(filterColumn, { ascending: true });

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

    // Load dates that have hires for the current month (deduplicated by parent)
    const loadMonthDates = async (month: Date) => {
        setMonthLoading(true);
        try {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            const filterColumn = viewMode === 'hires' ? 'pickup_datetime' : 'created_at';

            const { data, error } = await supabase
                .from('special_hire_quotations')
                .select(`${filterColumn}, parent_quotation_id, id, is_active_version`)
                .gte(filterColumn, start.toISOString())
                .lte(filterColumn, end.toISOString());

            if (error) throw error;

            const dateParentMap = new Map<string, Set<string>>();
            (data || []).forEach((item: any) => {
                const d = format(new Date(item[filterColumn]), 'yyyy-MM-dd');
                const groupId = item.parent_quotation_id || item.id;
                if (!dateParentMap.has(d)) dateParentMap.set(d, new Set());
                dateParentMap.get(d)!.add(groupId);
            });

            const dates = new Set<string>();
            dateParentMap.forEach((_, dateStr) => dates.add(dateStr));
            setMonthDates(dates);
        } catch (error: any) {
            console.error('Error loading month dates:', error);
        } finally {
            setMonthLoading(false);
        }
    };

    useEffect(() => {
        loadQuotationsForDate(selectedDate);
    }, [selectedDate, viewMode]);

    useEffect(() => {
        loadMonthDates(currentMonth);
    }, [currentMonth, viewMode]);

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

    // Group quotations by parent (deduplicate versions)
    const groupedHires = useMemo((): GroupedHire[] => {
        const groups = new Map<string, CalendarQuotation[]>();

        quotations.forEach(q => {
            const groupId = q.parent_quotation_id || q.id;
            if (!groups.has(groupId)) groups.set(groupId, []);
            groups.get(groupId)!.push(q);
        });

        const result: GroupedHire[] = [];
        groups.forEach((versions, groupId) => {
            // Sort by version number descending (latest first)
            versions.sort((a, b) => parseVersion(b.version_number) - parseVersion(a.version_number));

            // Determine which version to display
            const selectedId = selectedVersions[groupId];
            let displayQuotation: CalendarQuotation;

            if (selectedId) {
                displayQuotation = versions.find(v => v.id === selectedId) || versions[0];
            } else {
                // Default: active version, or latest
                const active = versions.find(v => v.is_active_version);
                displayQuotation = active || versions[0];
            }

            result.push({ groupId, allVersions: versions, displayQuotation });
        });

        // Sort groups by pickup time
        result.sort((a, b) =>
            new Date(a.displayQuotation.pickup_datetime).getTime() -
            new Date(b.displayQuotation.pickup_datetime).getTime()
        );

        return result;
    }, [quotations, selectedVersions]);

    // Stats based on deduplicated hires
    const stats = useMemo(() => {
        const total = groupedHires.length;
        const counts: Record<string, number> = {};
        groupedHires.forEach(g => {
            const status = getDisplayStatus(g.displayQuotation);
            counts[status] = (counts[status] || 0) + 1;
        });
        const totalRevenue = groupedHires.reduce((sum, g) => sum + calculateFinalTotal(g.displayQuotation), 0);
        return { total, counts, totalRevenue };
    }, [groupedHires]);

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

    const handleVersionChange = (groupId: string, versionId: string) => {
        setSelectedVersions(prev => ({ ...prev, [groupId]: versionId }));
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

    const statCards = [
        { key: 'total', label: 'Total Hires', value: stats.total, icon: CalendarDays, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
        { key: 'confirmed', label: 'Confirmed', value: stats.counts['confirmed'] || 0, icon: Clock, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
        { key: 'advance_paid', label: 'Advance Paid', value: stats.counts['advance_paid'] || 0, icon: CreditCard, bg: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300' },
        { key: 'fully_paid', label: 'Fully Paid', value: stats.counts['fully_paid'] || 0, icon: DollarSign, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
        { key: 'completed', label: 'Completed', value: stats.counts['completed'] || 0, icon: CheckCircle, bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
        { key: 'cancelled', label: 'Cancelled', value: stats.counts['cancelled'] || 0, icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
        { key: 'on_hold', label: 'On Hold', value: stats.counts['on_hold'] || 0, icon: Pause, bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' },
    ];

    const visibleStatCards = statCards.filter(s => s.key === 'total' || s.value > 0);

    return (
        <div className="space-y-4">
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
                        <CardContent className="p-2 space-y-3">
                            {/* View Mode Toggle */}
                            <div className="flex rounded-lg bg-muted p-1 mx-1">
                                <button
                                    onClick={() => setViewMode('hires')}
                                    className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${
                                        viewMode === 'hires'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Hires on Date
                                </button>
                                <button
                                    onClick={() => setViewMode('created')}
                                    className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${
                                        viewMode === 'created'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Created on Date
                                </button>
                            </div>

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
                            {viewMode === 'hires' ? 'Hires on ' : 'Created on '}
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </h2>
                        <Badge variant="outline" className="text-sm">
                            {stats.total} {viewMode === 'hires' ? 'hire' : 'quotation'}{stats.total !== 1 ? 's' : ''}
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
                    {!loading && groupedHires.length === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="py-16">
                                <div className="text-center space-y-3">
                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                                        <CalendarDays className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-base">
                                            {viewMode === 'hires' ? 'No hires scheduled' : 'No quotations created'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {viewMode === 'hires'
                                                ? `There are no special hires for ${format(selectedDate, 'MMMM d, yyyy')}`
                                                : `No quotations were created on ${format(selectedDate, 'MMMM d, yyyy')}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Hire Cards — Deduplicated */}
                    {!loading && groupedHires.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {groupedHires.map((group) => {
                                const q = group.displayQuotation;
                                const displayStatus = getDisplayStatus(q);
                                const finalTotal = calculateFinalTotal(q);
                                const totalPaid = q.total_paid || 0;
                                const advancePaid = q.advance_paid || 0;
                                const hasMultipleVersions = group.allVersions.length > 1;
                                const baseNo = getBaseQuotationNo(q.quotation_no);

                                return (
                                    <Card
                                        key={group.groupId}
                                        className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-l-4"
                                        style={{
                                            borderLeftColor: `var(--${displayStatus}-border, hsl(var(--border)))`,
                                        }}
                                        onClick={() => handleViewQuotation(q)}
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm truncate">{baseNo}</span>
                                                        {renderStatusBadge(displayStatus)}
                                                    </div>

                                                    {/* Version Selector */}
                                                    {hasMultipleVersions ? (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <GitBranch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                            <Select
                                                                value={q.id}
                                                                onValueChange={(val) => handleVersionChange(group.groupId, val)}
                                                            >
                                                                <SelectTrigger className="h-6 text-[11px] w-auto min-w-[100px] max-w-[160px] px-2 py-0 border-dashed">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {group.allVersions.map(v => (
                                                                        <SelectItem key={v.id} value={v.id} className="text-xs">
                                                                            v{v.version_number || '1.0'}
                                                                            {v.is_active_version && ' (active)'}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    ) : (
                                                        q.version_number && (
                                                            <span className="text-[10px] text-muted-foreground">v{q.version_number}</span>
                                                        )
                                                    )}

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
                                                        <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                                                            LKR {totalPaid.toLocaleString()}
                                                        </p>
                                                        {advancePaid > 0 && totalPaid < finalTotal && (
                                                            <p className="text-[10px] text-teal-600 dark:text-teal-400">
                                                                Advance: LKR {advancePaid.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {totalPaid === 0 && q.status === 'confirmed' && (
                                                    <div className="text-right">
                                                        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">
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
