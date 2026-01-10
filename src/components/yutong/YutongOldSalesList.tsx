import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Eye, FileText, ShoppingCart, Truck, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useYutongOldSalesManagement, OldSalesRecord } from '@/hooks/useYutongOldSalesManagement';
import { YutongOldSalesDetailModal } from './YutongOldSalesDetailModal';
import { format } from 'date-fns';

export const YutongOldSalesList: React.FC = () => {
  const { 
    loading, 
    records, 
    fetchOldSales, 
    convertToQuotation, 
    createOrderFromOldSale,
    deleteOldSale 
  } = useYutongOldSalesManagement();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<OldSalesRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchOldSales();
  }, [fetchOldSales]);

  const handleSearch = () => {
    fetchOldSales({
      search,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleRefresh = () => {
    setSearch('');
    setStatusFilter('all');
    fetchOldSales();
  };

  const handleViewDetails = (record: OldSalesRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleConvertToQuotation = async (id: string) => {
    await convertToQuotation(id);
    fetchOldSales();
  };

  const handleCreateOrder = async (id: string) => {
    await createOrderFromOldSale(id);
    fetchOldSales();
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteOldSale(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchOldSales();
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirm') || statusLower.includes('complete') || statusLower.includes('done')) {
      return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
    }
    if (statusLower.includes('pending') || statusLower.includes('wait')) {
      return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Get unique statuses for filter
  const uniqueStatuses = [...new Set(records.map(r => r.quotation_status).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, quotation ID, company, or model..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status || ''}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Old Sales Records ({records.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Quotation ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Final Price</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No records found. Import data using the Import tab above.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.row_number}</TableCell>
                      <TableCell className="font-mono text-sm">{record.quotation_no || '-'}</TableCell>
                      <TableCell>
                        {record.quoted_date 
                          ? format(new Date(record.quoted_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={record.customer_name}>
                        {record.customer_name}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={record.company_name || ''}>
                        {record.company_name || '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={record.bus_model || ''}>
                        {record.bus_model || '-'}
                      </TableCell>
                      <TableCell className="text-center">{record.quantity || 1}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.final_price)}
                      </TableCell>
                      <TableCell>{record.sales_person || '-'}</TableCell>
                      <TableCell>{getStatusBadge(record.quotation_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {record.converted_to_quotation_id && (
                            <Badge variant="secondary" className="text-xs">Q</Badge>
                          )}
                          {record.converted_to_order_id && (
                            <Badge variant="secondary" className="text-xs">O</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => record.id && handleConvertToQuotation(record.id)}
                              disabled={!!record.converted_to_quotation_id}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Convert to Quotation
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => record.id && handleCreateOrder(record.id)}
                              disabled={!!record.converted_to_order_id}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Create Order
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Truck className="h-4 w-4 mr-2" />
                              Link to Shipment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => record.id && setDeleteConfirmId(record.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedRecord && (
        <YutongOldSalesDetailModal
          record={selectedRecord}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecord(null);
          }}
          onConvert={() => {
            if (selectedRecord.id) {
              handleConvertToQuotation(selectedRecord.id);
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this old sales record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
