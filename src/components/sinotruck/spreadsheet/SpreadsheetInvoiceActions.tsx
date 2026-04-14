import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    FileText, Download, Printer, Eye, FileCheck, FilePlus, MoreHorizontal,
    Loader2, CheckCircle, Clock, Receipt, ExternalLink, Truck, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (val: number) => val ? `LKR ${val.toLocaleString()}` : '-';

interface InvoiceRecord {
    id: string;
    invoice_no: string;
    invoice_amount: number;
    status: string;
    invoice_category: string;
    created_at: string;
    documents: Array<{
        id: string;
        file_name: string;
        file_path: string;
        document_status: string;
    }>;
}

// ─── Invoice Panel (click on Invoice column) ───
interface SpreadsheetInvoicePanelProps {
    orderId: string;
    orderNo: string;
    invoiceCount: number;
}

export function SpreadsheetInvoicePanel({ orderId, orderNo, invoiceCount }: SpreadsheetInvoicePanelProps) {
    const [open, setOpen] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (open) {
            setFetching(true);
            loadInvoices();
        }
    }, [open, orderId]);

    const loadInvoices = async () => {
        try {
            const { data: records, error } = await supabase
                .from('sinotruck_invoice_records')
                .select('id, invoice_no, invoice_amount, status, invoice_category, created_at')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get documents for each invoice
            const invoicesWithDocs: InvoiceRecord[] = [];
            for (const rec of (records || [])) {
                const { data: docs } = await supabase
                    .from('sinotruck_invoice_documents')
                    .select('id, file_name, file_path, document_status')
                    .eq('invoice_record_id', rec.id);

                invoicesWithDocs.push({
                    ...rec,
                    invoice_category: rec.invoice_category || 'direct_invoice',
                    documents: docs || [],
                });
            }

            setInvoices(invoicesWithDocs);
        } catch (err: any) {
            console.error('Error loading invoices:', err);
        } finally {
            setFetching(false);
        }
    };

    const handleViewDocument = async (filePath: string) => {
        try {
            const { data } = await supabase.storage
                .from('sinotruck-invoices')
                .createSignedUrl(filePath, 300);
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            toast.error('Failed to open document');
        }
    };

    const handleDownloadDocument = async (filePath: string, fileName: string) => {
        try {
            const { data } = await supabase.storage
                .from('sinotruck-invoices')
                .download(filePath);
            if (data) {
                const url = URL.createObjectURL(data);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Downloaded: ' + fileName);
            }
        } catch (err) {
            toast.error('Failed to download');
        }
    };

    const handlePrintDocument = async (filePath: string) => {
        try {
            const { data } = await supabase.storage
                .from('sinotruck-invoices')
                .createSignedUrl(filePath, 300);
            if (data?.signedUrl) {
                const printWindow = window.open(data.signedUrl, '_blank');
                if (printWindow) {
                    printWindow.onload = () => printWindow.print();
                }
            }
        } catch (err) {
            toast.error('Failed to print');
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'proforma_invoice': return 'Proforma';
            case 'tax_invoice': return 'Tax Invoice';
            default: return 'Invoice';
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'proforma_invoice': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'tax_invoice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'draft': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 text-xs text-left transition-colors flex items-center gap-1 min-h-[28px] w-full"
                    title="Click to manage invoices"
                >
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{invoiceCount > 0 ? `${invoiceCount} doc${invoiceCount > 1 ? 's' : ''}` : '-'}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-3" align="start">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Invoices & Documents</h4>
                        <span className="text-[10px] text-muted-foreground">{orderNo}</span>
                    </div>

                    {fetching ? (
                        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-4 space-y-2">
                            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-xs text-muted-foreground">No invoices generated yet</p>
                            <p className="text-[10px] text-muted-foreground">Go to Order Details → Invoice tab to create</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {invoices.map(inv => (
                                <div key={inv.id} className="border rounded-lg p-2.5 text-xs space-y-2 bg-card">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-semibold">{inv.invoice_no}</span>
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(inv.invoice_category)}`}>
                                                {getCategoryLabel(inv.invoice_category)}
                                            </span>
                                        </div>
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(inv.status)}`}>
                                            {inv.status === 'approved' ? <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> : <Clock className="h-2.5 w-2.5 mr-0.5" />}
                                            {inv.status}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-muted-foreground">
                                        {formatCurrency(inv.invoice_amount)} • {new Date(inv.created_at).toLocaleDateString()}
                                    </div>

                                    {/* Document Actions */}
                                    {inv.documents.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1 border-t">
                                            {inv.documents.map(doc => (
                                                <div key={doc.id} className="flex gap-0.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-[10px] gap-0.5 px-1.5"
                                                        onClick={() => handleViewDocument(doc.file_path)}
                                                        title="View PDF"
                                                    >
                                                        <Eye className="h-3 w-3" /> View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-[10px] gap-0.5 px-1.5"
                                                        onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                                                        title="Download PDF"
                                                    >
                                                        <Download className="h-3 w-3" /> Download
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-[10px] gap-0.5 px-1.5"
                                                        onClick={() => handlePrintDocument(doc.file_path)}
                                                        title="Print PDF"
                                                    >
                                                        <Printer className="h-3 w-3" /> Print
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ─── Row Actions Dropdown ───
interface SpreadsheetRowActionsProps {
    orderId: string;
    orderNo: string;
    quotationId?: string;
    hasInvoices: boolean;
    onViewOrder?: (orderId: string) => void;
    onDeleteOrder?: (orderId: string) => void;
}

export function SpreadsheetRowActions({ orderId, orderNo, quotationId, hasInvoices, onViewOrder, onDeleteOrder }: SpreadsheetRowActionsProps) {
    const handleOpenInSinotruk = () => {
        // Navigate to full Sinotruk order details page
        window.location.href = `/sinotruck?tab=orders&orderId=${orderId}`;
    };

    const handleViewQuotation = () => {
        if (quotationId) {
            window.location.href = `/sinotruck?tab=quotations&quotationId=${quotationId}`;
        }
    };

    const handleGenerateInvoice = () => {
        // Open order in Sinotruk with invoice tab active
        window.location.href = `/sinotruck?tab=orders&orderId=${orderId}&action=invoice`;
    };

    const handleViewPayments = () => {
        window.location.href = `/sinotruck?tab=finance&orderId=${orderId}`;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleOpenInSinotruk} className="text-xs gap-2">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Full Order
                </DropdownMenuItem>
                {quotationId && (
                    <DropdownMenuItem onClick={handleViewQuotation} className="text-xs gap-2">
                        <FileText className="h-3.5 w-3.5" /> View Quotation
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGenerateInvoice} className="text-xs gap-2">
                    <FilePlus className="h-3.5 w-3.5" /> Generate Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewPayments} className="text-xs gap-2">
                    <CreditCard className="h-3.5 w-3.5" /> Payment Tracking
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onDeleteOrder && (
                    <DropdownMenuItem onClick={() => onDeleteOrder(orderId)} className="text-xs gap-2 text-destructive focus:text-destructive">
                        <Receipt className="h-3.5 w-3.5" /> Delete Order
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
